import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  chatRefineScenePrompt,
  expandStoryboardFromSynopsis,
  generateAiStoryTitles,
  generateCharacterSheet,
  generateSceneImage,
  refineCharacterPrompt,
  resolveCaptionConfigFromStyleHint,
  sanitizeAndNormalizeStory,
  translateVoiceLineToLanguage,
} from './server/geminiService';
import { generateSoundEffectAudio } from './server/soundEffectService';
import { fetchElevenLabsVoicesList, generateSpeechAudio } from './server/ttsService';
import { transcodeWebmFileToMp4, transcodeWebmToMp4 } from './server/videoExportService';
import { ASPECT_RATIOS, VOICE_OPTIONS } from './src/data/presets';
import { DEFAULT_CAPTION_CONFIG, DEFAULT_WATERMARK_CONFIG } from './src/data/captionPresets';
import { getLanguageOption } from './src/data/languages';
import { SOUND_EFFECT_CATALOG } from './src/data/soundEffects';
import { SAMPLE_STORY_TWO_MONKEYS_JSON } from './src/data/sampleStoryTwoMonkeys';
import { AspectRatio, Story, ThumbnailConfig } from './src/types';
import {
  getUserCredits,
  deductCredits,
  addCredits,
  getSystemCreditsSummary,
} from './server/creditService';
import {
  getRazorpayPublicConfig,
  createPaymentOrder,
  verifyPaymentAndCredit,
  CREDIT_PACKS,
} from './server/razorpayService';
import {
  recordApiCall,
  getReconciliationMetrics,
  setDailyBudgetLimit,
  checkDailyBudgetCap,
} from './server/apiConsumptionTracker';
import {
  signup,
  login,
  resetPassword,
  createSession,
  getSessionUser,
  getUserById,
  destroySession,
  listAllUsers,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_MS,
  PublicUser,
} from './server/authService';
import { sendWelcomeCredentialsEmail, sendPasswordResetEmail } from './server/emailService';

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

// This file's own directory -- deliberately not process.cwd(), since a
// launcher may start this process from an arbitrary working directory (its
// own cwd, this repo's root, an absolute path elsewhere). In dev this is
// storyframe/ itself; in the bundled build it's storyframe/dist/ (where
// server.cjs and the built index.html/assets all land side by side), which
// the frontend-serving block below accounts for.
//
// __dirname is checked first because the production build is bundled to
// CommonJS (esbuild --format=cjs): `import.meta.url` compiles to an empty
// value in that output (esbuild warns about exactly this), while __dirname
// is a real CJS runtime global there. In dev, server.ts runs directly as
// an ES module via tsx, where the reverse is true -- __dirname doesn't
// exist, so it falls through to import.meta.url. `typeof __dirname` never
// throws even where __dirname is undeclared, so this is safe in both.
const SOURCE_ROOT_DIR = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  source_type: 'scene',
  source_scene_index: 0,
  title: '',
  theme: 'ink',
  text_position: 'bottom_safe',
  show_safe_zone_guides: false,
  show_shadow_scrim: true,
  font_size_scale: 1,
};

// Builds and configures the Express app (all middleware + routes) without
// starting it -- the caller decides how to run it:
//   - Local dev / a persistent host: the bottom-of-file block calls .listen().
//   - Vercel Serverless Functions: api/index.ts imports this and hands the
//     resulting app Vercel's (req, res) pair directly, since an Express app
//     is itself a valid Node request handler.
// Real accounts, backed by a signed session cookie (server/authService.ts +
// server/db.ts) -- every credits/generation/payment route below is gated by
// requireAuth. The app's own Gemini/ElevenLabs keys (env vars) are the only
// ones ever used; there is no bring-your-own-key path anymore.
export async function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));
  app.use(cookieParser());

  function getGeminiKey(): string | null {
    return process.env.GEMINI_API_KEY?.trim() || null;
  }
  function getElevenKey(): string | null {
    return process.env.ELEVENLABS_API_KEY?.trim() || null;
  }

  function setSessionCookie(res: express.Response, token: string) {
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });
  }

  // Resolves the session cookie to a real account and attaches it as
  // req.user; every route that touches credits, generation, or payments
  // requires this instead of trusting a client-supplied id header.
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    const user = getSessionUser(token);
    if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please log in to continue.' });
    req.user = user;
    next();
  }

  // Must run after requireAuth -- gates the owner-only financial ledger and
  // per-user credit roster to whichever account(s) ADMIN_EMAILS lists.
  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required.' });
    next();
  }

  // Bounds compute abuse on generation endpoints while allowing generous headroom
  // for multi-scene batch operations (scene rendering, narration synthesis, SFX, and translation).
  const generationRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV !== 'production',
    message: { error: 'Too many generation requests. Please slow down and try again shortly.' },
  });

  // ----------------------------------------------------
  // Config / capability routes
  // ----------------------------------------------------

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/aspect-ratios', (_req, res) => res.json(ASPECT_RATIOS));
  app.get('/api/voice-options', (_req, res) => res.json(VOICE_OPTIONS));

  // ----------------------------------------------------
  // Accounts
  // ----------------------------------------------------

  app.post('/api/auth/signup', async (req, res) => {
    const { email } = req.body || {};
    const result = await signup(typeof email === 'string' ? email : '');
    if ('error' in result) return res.status(400).json({ error: result.error });

    try {
      await sendWelcomeCredentialsEmail(result.user.email, result.plainPassword);
    } catch (err: any) {
      console.error('Failed to send welcome email:', err);
    }

    const token = createSession(result.user.id);
    setSessionCookie(res, token);
    res.status(201).json({ user: result.user });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await login(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = createSession(user.id);
    setSessionCookie(res, token);
    res.json({ user });
  });

  app.post('/api/auth/logout', (req, res) => {
    destroySession(req.cookies?.[SESSION_COOKIE_NAME]);
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/auth/resend-password', async (req, res) => {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'Email is required.' });
    const result = await resetPassword(email);
    if ('error' in result) return res.status(404).json({ error: result.error });
    try {
      await sendPasswordResetEmail(email.trim().toLowerCase(), result.plainPassword);
    } catch (err: any) {
      console.error('Failed to send password reset email:', err);
      return res.status(500).json({ error: 'Password was reset but the email could not be sent. Please try again.' });
    }
    res.json({ success: true, message: 'A new password has been emailed to you.' });
  });

  // ----------------------------------------------------
  // Credits & Token Ledger Routes
  // ----------------------------------------------------

  app.get('/api/credits/balance', requireAuth, (req, res) => {
    const account = getUserCredits(req.user!.id);
    res.json({
      userId: account.userId,
      credits: account.credits,
      totalRechargedCredits: account.totalRechargedCredits,
      transactions: account.transactions.slice(0, 15),
    });
  });

  app.post('/api/credits/deduct', requireAuth, (req, res) => {
    const { amount = 1, description = 'AI Generation' } = req.body || {};
    const result = deductCredits(req.user!.id, amount, description);
    if (!result.success) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: result.error || 'You have used all your credit points. Please recharge ₹100 for 50 credits to continue.',
        remaining: result.remaining,
      });
    }
    res.json(result);
  });

  // ----------------------------------------------------
  // Razorpay Payment Integration Routes
  // ----------------------------------------------------

  app.get('/api/payment/razorpay/config', (_req, res) => {
    res.json(getRazorpayPublicConfig());
  });

  app.post('/api/payment/razorpay/create-order', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { packId = 'pack_100_50', userEmail, userName } = req.body || {};
      const order = await createPaymentOrder({ packId, userId, userEmail: userEmail || req.user!.email, userName });
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to initialize Razorpay payment order' });
    }
  });

  app.post('/api/payment/razorpay/verify-payment', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { orderId, paymentId, signature, packId = 'pack_100_50' } = req.body || {};
      if (!orderId || !paymentId) {
        return res.status(400).json({ success: false, message: 'Missing orderId or paymentId from payment response' });
      }

      const result = await verifyPaymentAndCredit({
        orderId,
        paymentId,
        signature,
        packId,
        userId,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Payment verification failed' });
    }
  });

  // ----------------------------------------------------
  // Admin & Financial Telemetry Reconciliation
  // ----------------------------------------------------

  app.get('/api/admin/reconciliation-metrics', requireAuth, requireAdmin, (_req, res) => {
    try {
      const metrics = getReconciliationMetrics();
      const systemCredits = getSystemCreditsSummary();
      res.json({
        ...metrics,
        systemCredits,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch reconciliation metrics' });
    }
  });

  app.post('/api/admin/safety-budget', requireAuth, requireAdmin, (req, res) => {
    try {
      const { dailyLimitUsd } = req.body || {};
      if (typeof dailyLimitUsd === 'number' && dailyLimitUsd > 0) {
        setDailyBudgetLimit(dailyLimitUsd);
        return res.json({ success: true, newLimitUsd: dailyLimitUsd });
      }
      res.status(400).json({ error: 'Valid dailyLimitUsd number is required' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update safety budget limit' });
    }
  });

  // Per-user credit roster for the admin dashboard -- every account's
  // balance, lifetime recharge total, and signup date.
  app.get('/api/admin/users', requireAuth, requireAdmin, (_req, res) => {
    try {
      res.json({ users: listAllUsers() });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list users' });
    }
  });

  // Manual credit-quota adjustment for a single user (positive or negative
  // delta) -- the admin's lever for comping, correcting, or clawing back
  // credits outside the normal signup/recharge/deduction flows.
  app.post('/api/admin/users/:id/credits', requireAuth, requireAdmin, (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid user id' });

      const { amount, description } = req.body || {};
      const delta = Number(amount);
      if (!Number.isFinite(delta) || delta === 0) {
        return res.status(400).json({ error: 'amount must be a non-zero number' });
      }

      const target = getUserById(userId);
      if (!target) return res.status(404).json({ error: 'User not found' });

      const result = addCredits(
        userId,
        delta,
        description?.trim() || `Admin adjustment by ${req.user!.email} (${delta > 0 ? '+' : ''}${delta})`
      );
      res.json({ success: true, newBalance: result.newBalance });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to adjust credits' });
    }
  });

  app.post('/api/elevenlabs/voices', async (req, res) => {
    try {
      const voices = await fetchElevenLabsVoicesList(getElevenKey() || undefined);
      res.json({ voices });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to fetch ElevenLabs voices' });
    }
  });

  // ----------------------------------------------------
  // Story: upload / storyboard expansion
  // ----------------------------------------------------

  // Returns the exact standard Two Monkeys sample story JSON template
  app.get('/api/story/sample', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="sample-story-template.json"');
    res.json(SAMPLE_STORY_TWO_MONKEYS_JSON);
  });

  // Accepts a raw uploaded story JSON, normalizes it, and -- only if it
  // didn't already include a full scenes[] array -- expands the
  // synopsis + cast into an ordered scene list via Gemini. Returns a
  // fully-formed Story object; the frontend owns it entirely from here
  // (React state + localStorage), the server never sees this story again
  // as a whole, only its individual scenes/characters on later calls.
  app.post('/api/story/storyboard', requireAuth, generationRateLimiter, async (req, res) => {
    const userId = req.user!.id;
    let creditDeducted = false;
    try {
      const { story_json, aspect_ratio = '9:16' } = req.body || {};
      if (!story_json) return res.status(400).json({ error: 'story_json is required' });

      const geminiApiKey = getGeminiKey();
      const normalized = sanitizeAndNormalizeStory(story_json);

      // Only the synopsis-expansion path actually calls Gemini -- a fully
      // authored story_json (already has scenes[]) builds for free, same as
      // /api/story/normalize.
      let scenes = normalized.scenes;
      if (!scenes) {
        const deduction = deductCredits(userId, 1, 'AI Storyboard Expansion');
        if (!deduction.success) {
          return res.status(402).json({
            error: 'INSUFFICIENT_CREDITS',
            message: 'You have used all your credit points. Please recharge to continue creating.',
            remaining: deduction.remaining,
          });
        }
        creditDeducted = true;
        scenes = await expandStoryboardFromSynopsis(
          normalized.story_title,
          normalized.synopsis || '',
          normalized.art_style_prompt,
          normalized.characters,
          geminiApiKey
        );
      }

      // The file's own declared aspect ratio (e.g. video_format.aspect_ratio)
      // wins when present -- it's the author's explicit intent baked into
      // the story itself; the request's aspect_ratio (from the upload
      // screen's picker, defaulting to 9:16) is only the fallback for a
      // file that doesn't say.
      const effectiveAspectRatio = normalized.aspect_ratio || (aspect_ratio as AspectRatio);
      const ratioPreset = ASPECT_RATIOS.find((r) => r.id === effectiveAspectRatio) || ASPECT_RATIOS[0];

      const story: Story = {
        id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_at: Date.now(),
        story_title: normalized.story_title,
        synopsis: normalized.synopsis,
        art_style_prompt: normalized.art_style_prompt,
        aspect_ratio: effectiveAspectRatio,
        dimensions: { width: ratioPreset.width, height: ratioPreset.height },
        voice_name: story_json.voice_name || 'narrator',
        language: normalized.primaryLang,
        available_languages: normalized.jobLanguages,
        mood: 'natural',
        music_track: 'none',
        music_volume: 0.18,
        characters: normalized.characters,
        scenes,
        end_card: {
          enabled: true,
          voice_line: normalized.end_card.voice_line || `And that's the story of ${normalized.story_title}.`,
          voice_line_i18n: normalized.end_card.voice_line_i18n,
          cta_text: normalized.end_card.cta_text || 'Follow for the next story.',
          cta_text_i18n: normalized.end_card.cta_text_i18n,
        },
        caption_config: resolveCaptionConfigFromStyleHint(normalized.caption_style_hint, DEFAULT_CAPTION_CONFIG),
        watermark_config: { ...DEFAULT_WATERMARK_CONFIG },
        thumbnail: { ...DEFAULT_THUMBNAIL_CONFIG, title: normalized.story_title },
        current_turn_index: 0,
        auto_approve: false,
      };

      res.status(201).json({ story, credits_remaining: getUserCredits(userId).credits });
    } catch (err: any) {
      if (creditDeducted) addCredits(userId, 1, 'Refund: storyboard generation failure');
      console.error('Storyboard error:', err);
      res.status(500).json({ error: err.message || 'Failed to build storyboard' });
    }
  });

  // Translates one line of narration on demand -- called when the language
  // dropdown switches to a language this story doesn't have cached yet.
  // The result is cached onto the scene/card by the caller (client-side),
  // so this is only ever paid once per line per language.
  app.post('/api/story/translate-language', requireAuth, generationRateLimiter, async (req, res) => {
    try {
      const { text, source_language = 'en', target_language } = req.body || {};
      if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' });
      if (!target_language) return res.status(400).json({ error: 'target_language is required' });

      const translated = await translateVoiceLineToLanguage(text, source_language, target_language, getGeminiKey());
      recordApiCall({
        feature: 'translation',
        model: 'gemini-3.7-flash',
        isPersonalKey: false,
        userId: String(req.user!.id),
        success: true,
      });
      res.json({ translated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Translation failed' });
    }
  });

  // Parses a story JSON into normalized scenes without expanding a missing
  // scenes[] array via Gemini and without building a full Story object --
  // used to import narration for another language from a second file (a
  // translated copy of the same story), matched back onto the open
  // story's scenes by scene_number on the client. Free and instant: no
  // model call, no API key needed.
  app.post('/api/story/normalize', (req, res) => {
    try {
      const { story_json } = req.body || {};
      if (!story_json) return res.status(400).json({ error: 'story_json is required' });
      const normalized = sanitizeAndNormalizeStory(story_json);
      res.json({ story_title: normalized.story_title, scenes: normalized.scenes || [], end_card: normalized.end_card });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to parse story JSON' });
    }
  });

  // Generates 5 compelling, diverse AI story titles using Gemini
  app.post('/api/story/generate-titles', requireAuth, async (req, res) => {
    const userId = req.user!.id;
    let creditDeducted = false;

    const deduction = deductCredits(userId, 0.5, 'AI Story Title Generation');
    if (!deduction.success) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: 'You have used all your credit points. Please recharge ₹100 for 50 credits to continue creating.',
        remaining: deduction.remaining,
      });
    }
    creditDeducted = true;

    try {
      const { synopsis = '', scenes = [], current_title = '', art_style_prompt = '' } = req.body || {};
      const sceneSnippets: string[] = Array.isArray(scenes)
        ? scenes.map((s: any) => s.caption_text || s.voice_line || s.visual_prompt || '').filter(Boolean)
        : [];
      const result = await generateAiStoryTitles(synopsis, sceneSnippets, current_title, art_style_prompt, getGeminiKey());
      recordApiCall({
        feature: 'title_generation',
        model: 'gemini-3.7-flash',
        isPersonalKey: false,
        userId: String(userId),
        success: true,
      });
      res.json({ ...result, credits_remaining: getUserCredits(userId).credits });
    } catch (err: any) {
      if (creditDeducted) addCredits(userId, 0.5, 'Refund: title generation failure');
      res.status(500).json({ error: err.message || 'Failed to generate story titles' });
    }
  });

  // ----------------------------------------------------
  // Characters
  // ----------------------------------------------------

  app.post('/api/character/refine-prompt', requireAuth, async (req, res) => {
    const userId = req.user!.id;
    let creditDeducted = false;

    const deduction = deductCredits(userId, 0.5, 'AI Character Prompt Refinement');
    if (!deduction.success) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: 'You have used all your credit points. Please recharge to continue creating.',
        remaining: deduction.remaining,
      });
    }
    creditDeducted = true;

    try {
      const { character_name = 'Character', current_description = '', user_instruction = '', art_style_prompt = '' } = req.body || {};
      if (!user_instruction) {
        if (creditDeducted) addCredits(userId, 0.5, 'Refund: missing refinement instruction');
        return res.status(400).json({ error: 'user_instruction is required' });
      }

      const result = await refineCharacterPrompt(character_name, current_description, user_instruction, art_style_prompt, getGeminiKey());
      recordApiCall({
        feature: 'prompt_refine',
        model: 'gemini-3.7-flash',
        isPersonalKey: false,
        userId: String(userId),
        success: true,
      });
      res.json({ ...result, credits_remaining: getUserCredits(userId).credits });
    } catch (err: any) {
      if (creditDeducted) addCredits(userId, 0.5, 'Refund: character prompt refinement failure');
      res.status(500).json({ error: err.message || 'Failed to refine character prompt' });
    }
  });

  app.post('/api/character/sheet', requireAuth, generationRateLimiter, async (req, res) => {
    const userId = req.user!.id;
    let creditDeducted = false;

    const budgetCheck = checkDailyBudgetCap();
    if (budgetCheck.isExceeded) {
      return res.status(429).json({
        error: 'DAILY_BUDGET_CAP_REACHED',
        message: 'Studio daily generation limit reached. Please try again tomorrow.',
      });
    }

    const deduction = deductCredits(userId, 1, `Character visual: ${req.body?.character?.name || 'Character'}`);
    if (!deduction.success) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: 'You have used all your credit points. Please recharge ₹100 for 50 credits to continue creating.',
        remaining: deduction.remaining,
      });
    }
    creditDeducted = true;

    try {
      const { character, art_style_prompt, aspect_ratio = '9:16' } = req.body || {};
      if (!character?.description) {
        if (creditDeducted) addCredits(userId, 1, 'Refund: missing character description');
        return res.status(400).json({ error: 'character.description is required' });
      }

      const result = await generateCharacterSheet(character, art_style_prompt || '', aspect_ratio, getGeminiKey());
      recordApiCall({
        feature: 'character_sheet',
        model: result.modelUsed || 'gemini-3.1-flash-image',
        isPersonalKey: false,
        userId: String(userId),
        success: result.isAiGenerated,
      });
      res.json({
        image_url: result.imageUrl,
        is_ai_generated: result.isAiGenerated,
        model_used: result.modelUsed,
        error: result.lastError,
        credits_remaining: getUserCredits(userId).credits,
      });
    } catch (err: any) {
      if (creditDeducted) addCredits(userId, 1, 'Refund: character sheet generation failure');
      res.status(500).json({ error: err.message || 'Character sheet generation failed' });
    }
  });

  // ----------------------------------------------------
  // Scenes
  // ----------------------------------------------------

  app.post('/api/scene/generate', requireAuth, generationRateLimiter, async (req, res) => {
    const userId = req.user!.id;
    let creditDeducted = false;

    const budgetCheck = checkDailyBudgetCap();
    if (budgetCheck.isExceeded) {
      return res.status(429).json({
        error: 'DAILY_BUDGET_CAP_REACHED',
        message: 'Studio daily generation limit reached. Please try again tomorrow.',
      });
    }

    const deduction = deductCredits(userId, 1, `Scene visual #${req.body?.scene?.scene_number || ''}`);
    if (!deduction.success) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: 'You have used all your credit points. Please recharge ₹100 for 50 credits to continue creating.',
        remaining: deduction.remaining,
      });
    }
    creditDeducted = true;

    try {
      const { scene, art_style_prompt, aspect_ratio = '9:16', character_reference_urls = [], continuity_reference_url } = req.body || {};
      if (!scene?.visual_prompt) {
        if (creditDeducted) addCredits(userId, 1, 'Refund: missing visual prompt');
        return res.status(400).json({ error: 'scene.visual_prompt is required' });
      }

      const result = await generateSceneImage(scene, art_style_prompt || '', aspect_ratio, character_reference_urls, continuity_reference_url, getGeminiKey());
      recordApiCall({
        feature: 'scene_image',
        model: result.modelUsed || 'gemini-3.1-flash-image',
        isPersonalKey: false,
        userId: String(userId),
        success: result.isAiGenerated,
      });
      res.json({
        image_url: result.imageUrl,
        is_ai_generated: result.isAiGenerated,
        model_used: result.modelUsed,
        error: result.lastError,
        credits_remaining: getUserCredits(userId).credits,
      });
    } catch (err: any) {
      if (creditDeducted) addCredits(userId, 1, 'Refund: scene generation failure');
      res.status(500).json({ error: err.message || 'Scene image generation failed' });
    }
  });

  app.post('/api/scene/refine-prompt', requireAuth, async (req, res) => {
    const userId = req.user!.id;
    let creditDeducted = false;

    const deduction = deductCredits(userId, 0.5, 'AI Scene Prompt Refinement');
    if (!deduction.success) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: 'You have used all your credit points. Please recharge to continue creating.',
        remaining: deduction.remaining,
      });
    }
    creditDeducted = true;

    try {
      const { visual_prompt, chat_history = [], message } = req.body || {};
      if (!message || typeof message !== 'string') {
        if (creditDeducted) addCredits(userId, 0.5, 'Refund: missing refinement message');
        return res.status(400).json({ error: 'message string is required' });
      }

      const { refinedPrompt, replyMessage } = await chatRefineScenePrompt(chat_history, visual_prompt || '', message, getGeminiKey());
      recordApiCall({
        feature: 'prompt_refine',
        model: 'gemini-3.7-flash',
        isPersonalKey: false,
        userId: String(userId),
        success: true,
      });
      res.json({ refined_prompt: refinedPrompt, reply_message: replyMessage, credits_remaining: getUserCredits(userId).credits });
    } catch (err: any) {
      if (creditDeducted) addCredits(userId, 0.5, 'Refund: scene prompt refinement failure');
      res.status(500).json({ error: err.message || 'Prompt refinement failed' });
    }
  });

  // ----------------------------------------------------
  // Narration
  // ----------------------------------------------------

  // `is_preview` marks a Voice Studio sample/test playback (choosing a
  // narrator before committing to it) -- those never cost credits, only
  // narration actually attached to a scene or end card does.
  app.post('/api/voice/generate', requireAuth, generationRateLimiter, async (req, res) => {
    const userId = req.user!.id;
    const { text, voice_name = 'narrator', language, is_preview } = req.body || {};
    let creditDeducted = false;

    if (!is_preview) {
      const deduction = deductCredits(userId, 0.25, 'AI Narration Generation');
      if (!deduction.success) {
        return res.status(402).json({
          error: 'INSUFFICIENT_CREDITS',
          message: 'You have used all your credit points. Please recharge to continue creating.',
          remaining: deduction.remaining,
        });
      }
      creditDeducted = true;
    }

    try {
      if (!text || typeof text !== 'string' || !text.trim()) {
        if (creditDeducted) addCredits(userId, 0.25, 'Refund: missing narration text');
        return res.status(400).json({ error: 'text is required' });
      }

      // Only the neural-fallback tier (Google Translate TTS) needs this --
      // ElevenLabs/Gemini's multilingual voices read the text's own script
      // correctly without a language hint, but the fallback synthesizer
      // defaults to English pronunciation unless told otherwise, which
      // mangles non-English narration whenever it's the tier that ends up
      // serving the request (no keys configured, or the others failed).
      const ttsLangCode = getLanguageOption(typeof language === 'string' ? language : undefined).ttsLangCode;
      const result = await generateSpeechAudio(text, voice_name, getElevenKey() || undefined, getGeminiKey(), ttsLangCode);
      res.json({
        audio_url: `data:${result.mimeType};base64,${result.audioBase64}`,
        provider: result.provider,
        voice_name: result.voiceName,
        used_fallback: result.usedFallback,
        fallback_reason: result.fallbackReason,
        credits_remaining: getUserCredits(userId).credits,
      });
    } catch (err: any) {
      if (creditDeducted) addCredits(userId, 0.25, 'Refund: narration generation failure');
      res.status(500).json({ error: err.message || 'Narration generation failed' });
    }
  });

  // ----------------------------------------------------
  // Sound effects
  // ----------------------------------------------------

  app.post('/api/sound-effect/generate', requireAuth, generationRateLimiter, async (req, res) => {
    const userId = req.user!.id;
    let creditDeducted = false;

    const deduction = deductCredits(userId, 0.1, 'AI Sound Effect Generation');
    if (deduction.success) creditDeducted = true;
    // No credits left just means the AI tier is skipped -- the caller
    // (src/App.tsx's generateSoundEffect) already falls back to the free
    // procedural synthesizer on any non-2xx response, insufficient credits
    // included, so a scene never ends up with zero sound rather than
    // forcing a hard stop for what's a minor cosmetic layer.
    if (!deduction.success) {
      return res.status(402).json({ error: 'INSUFFICIENT_CREDITS', message: deduction.error, remaining: deduction.remaining });
    }

    try {
      const { cue, custom_prompt } = req.body || {};

      // A free-text description (no catalog cue) for when nothing in the
      // fixed list fits -- sent straight through as the generation prompt.
      let prompt: string;
      if (typeof custom_prompt === 'string' && custom_prompt.trim()) {
        prompt = custom_prompt.trim().slice(0, 300);
      } else {
        const definition = SOUND_EFFECT_CATALOG.find((d) => d.id === cue);
        if (!definition) {
          if (creditDeducted) addCredits(userId, 0.1, 'Refund: unknown sound effect cue');
          return res.status(400).json({ error: `Unknown sound effect: ${cue}` });
        }
        prompt = definition.prompt;
      }

      const result = await generateSoundEffectAudio(prompt, getElevenKey() || undefined);
      res.json({ audio_url: `data:${result.mimeType};base64,${result.audioBase64}`, credits_remaining: getUserCredits(userId).credits });
    } catch (err: any) {
      if (creditDeducted) addCredits(userId, 0.1, 'Refund: sound effect generation failure');
      res.status(500).json({ error: err.message || 'Sound effect generation failed' });
    }
  });

  // ----------------------------------------------------
  // Video export
  // ----------------------------------------------------

  // The browser records the whole story live (canvas + Web Audio ->
  // MediaRecorder, see src/utils/videoExport.ts) since that's the only
  // way to actually capture animated captions/overlays/motion into a
  // video file at all -- MediaRecorder can only ever produce WebM in
  // Chrome/Firefox, so this is the one purely mechanical step left:
  // transcode that WebM into an MP4 real players and platforms accept.
  // express.raw() (not the global express.json() above) reads this
  // route's body, since the payload is the raw video bytes, not JSON --
  // safe to layer after express.json() because that middleware only
  // parses requests whose content-type it recognizes and otherwise
  // leaves the body stream untouched for a later middleware to consume.
  app.post('/api/export/to-mp4', requireAuth, express.raw({ type: () => true, limit: '300mb' }), async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'Request body must be the raw WebM video bytes.' });
      }
      const mp4Buffer = await transcodeWebmToMp4(req.body);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="story.mp4"');
      res.send(mp4Buffer);
    } catch (err: any) {
      console.error('Video export error:', err);
      res.status(500).json({ error: err.message || 'Video export failed' });
    }
  });

  // Chunked upload route: safely bypasses Cloud Run and reverse-proxy 32MB request body
  // caps by streaming raw video slices (e.g. 10MB each), reassembling, and transcoding.
  app.post('/api/export/to-mp4-chunk', requireAuth, express.raw({ type: () => true, limit: '30mb' }), async (req, res) => {
    let tmpDir = os.tmpdir();
    let safeUploadId = '';
    let chunkDir = '';
    try {
      const uploadId = req.headers['x-upload-id'] as string;
      const chunkIndex = parseInt(req.headers['x-chunk-index'] as string, 10);
      const totalChunks = parseInt(req.headers['x-total-chunks'] as string, 10);

      if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
        return res.status(400).json({ error: 'Missing x-upload-id, x-chunk-index, or x-total-chunks headers' });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'Chunk body is empty' });
      }

      safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
      chunkDir = path.join(tmpDir, `storyframe_chunks_${safeUploadId}`);
      await fs.promises.mkdir(chunkDir, { recursive: true });

      const chunkPath = path.join(chunkDir, `chunk_${chunkIndex.toString().padStart(5, '0')}.part`);
      await fs.promises.writeFile(chunkPath, req.body);

      // If this is the final chunk, assemble and transcode
      if (chunkIndex === totalChunks - 1) {
        const assembledPath = path.join(tmpDir, `storyframe_assembled_${safeUploadId}.webm`);
        const writeStream = fs.createWriteStream(assembledPath);

        for (let i = 0; i < totalChunks; i++) {
          const partFile = path.join(chunkDir, `chunk_${i.toString().padStart(5, '0')}.part`);
          const partData = await fs.promises.readFile(partFile);
          writeStream.write(partData);
        }
        await new Promise<void>((resolve, reject) => {
          writeStream.end((err?: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Clean up parts dir
        await fs.promises.rm(chunkDir, { recursive: true, force: true }).catch(() => {});

        try {
          const mp4Buffer = await transcodeWebmFileToMp4(assembledPath);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', 'attachment; filename="story.mp4"');
          return res.send(mp4Buffer);
        } finally {
          await fs.promises.unlink(assembledPath).catch(() => {});
        }
      }

      // Intermediate chunk acknowledgment
      res.json({ status: 'ok', chunkIndex, totalChunks });
    } catch (err: any) {
      console.error('Chunked video export error:', err);
      if (chunkDir) {
        await fs.promises.rm(chunkDir, { recursive: true, force: true }).catch(() => {});
      }
      res.status(500).json({ error: err.message || 'Chunked video export failed' });
    }
  });

  // ----------------------------------------------------
  app.all('/api/*', (req, res) => res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` }));

  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    console.error('Express request error:', err);
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({ error: 'Payload too large.', details: err.message });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON request payload.', details: err.message });
    }
    res.status(err.status || err.statusCode || 500).json({ error: err.message || 'Internal server error' });
  });

  // ----------------------------------------------------
  // Frontend serving
  //   - Production build present (dist/index.html exists): serve it as a
  //     static SPA.
  //   - Otherwise: run Vite itself in middleware mode, so `tsx server.ts`
  //     alone is the entire dev environment -- one process, one port,
  //     full HMR, no separate frontend dev server or proxy config needed.
  //   - Skipped entirely on Vercel: static assets are served by Vercel's
  //     CDN directly from dist/, this app instance only ever handles /api.
  // ----------------------------------------------------
  if (!process.env.VERCEL) {
    // Resolved from this file's own location, not process.cwd() -- a
    // launcher can start this process from any working directory (its own
    // cwd, an absolute path elsewhere). Only the bundled build
    // (SOURCE_ROOT_DIR's basename is literally "dist", since that's where
    // server.cjs and the built index.html/assets land side by side) is
    // treated as production; the dev source tree also has its own
    // index.html one level up (the Vite entry template), which must NOT be
    // mistaken for a build output or it'd be served as a static file
    // instead of transformed by Vite.
    const isBundledBuild = path.basename(SOURCE_ROOT_DIR) === 'dist';
    const distIndexPath = path.join(SOURCE_ROOT_DIR, 'index.html');
    if (isBundledBuild && fs.existsSync(distIndexPath)) {
      const distPath = path.dirname(distIndexPath);
      app.use(express.static(distPath));
      app.get('*', (_req, res) => res.sendFile(distIndexPath));
    } else {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({ root: SOURCE_ROOT_DIR, server: { middlewareMode: true }, appType: 'spa' });
      app.use(vite.middlewares);
    }
  }

  return app;
}

if (!process.env.VERCEL) {
  createApp().then((app) => {
    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Storyframe running on http://localhost:${PORT}/`);
    });
  });
}
