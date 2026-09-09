/**
 * Meta Pixel Tracking Utility
 * 
 * Centralized tracking module for Meta (Facebook) Pixel.
 * Handles safe initialization, missing ID fallbacks, duplicate event prevention,
 * and dev-mode testing logs.
 * 
 * Website: https://storycreation.ai.studio
 */

// ============================================================================
// META PIXEL CONFIGURATION
// Paste your Meta Pixel / Dataset ID here or set VITE_META_PIXEL_ID in .env
// ============================================================================
export const META_PIXEL_ID = (
  import.meta.env.VITE_META_PIXEL_ID || 
  '' // <-- [CONFIG POINT] ENTER YOUR META PIXEL / DATASET ID HERE
).trim();

// Global types for Window.fbq
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

// Module-level guard flags to prevent duplicate events during React re-renders
let isInitialized = false;
let hasTrackedPageView = false;
const PURCHASE_STORAGE_KEY = 'storyframe_purchase_tracked';

// List of sensitive keywords that must NEVER be passed into Meta Pixel event parameters
const DISALLOWED_SENSITIVE_KEYS = [
  'email',
  'mail',
  'phone',
  'mobile',
  'password',
  'passcode',
  'code',
  'access_pass',
  'api_key',
  'gemini_key',
  'elevenlabs_key',
  'token',
  'secret',
  'card',
  'cvv',
  'pan',
  'auth',
];

/**
 * Strips any sensitive fields before dispatching to Meta Pixel.
 */
function sanitizeParams<T extends Record<string, unknown>>(params?: T): T | undefined {
  if (!params || typeof params !== 'object') return params;
  const sanitized: Record<string, unknown> = { ...params };
  for (const key of Object.keys(sanitized)) {
    const lower = key.toLowerCase();
    if (DISALLOWED_SENSITIVE_KEYS.some((disallowed) => lower.includes(disallowed))) {
      delete sanitized[key];
    }
  }
  return sanitized as T;
}

/**
 * Formats development-only console output.
 * Never logs in production.
 */
function devLog(eventName: string, params?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    if (params) {
      console.log(`[Meta Pixel] ${eventName}`, params);
    } else {
      console.log(`[Meta Pixel] ${eventName}`);
    }
  }
}

/**
 * Initializes Meta Pixel script and registers the dataset ID.
 * Safe against missing IDs (runs in dry-run mode without throwing errors).
 */
export function initMetaPixel(): boolean {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;

  if (!META_PIXEL_ID) {
    if (import.meta.env.DEV) {
      console.info('[Meta Pixel] Pixel ID is not configured yet. Running in dry-run mode (events are logged to console).');
    }
    isInitialized = true;
    return false;
  }

  // Load the official Meta Pixel script if not already present
  if (!window.fbq) {
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
  }

  try {
    if (typeof window.fbq === 'function') {
      window.fbq('init', META_PIXEL_ID);
    }
    isInitialized = true;
    return true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Meta Pixel] Initialization error:', err);
    }
    return false;
  }
}

/**
 * Standard PageView event
 * Trigger: When a visitor loads the website.
 * Guarded against duplicate calls across React mountings / re-renders.
 */
export function trackPageView(): void {
  if (hasTrackedPageView) return;
  hasTrackedPageView = true;

  devLog('PageView');

  if (!META_PIXEL_ID || typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return;
  }

  try {
    window.fbq('track', 'PageView');
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Meta Pixel] PageView tracking error:', err);
    }
  }
}

export interface ViewContentParams {
  content_name: string;
  content_type: string;
  value: number;
  currency: string;
  [key: string]: unknown;
}

/**
 * Standard ViewContent event
 * Trigger: When a visitor reaches / views the ₹99 Storyframe Studio offer/product section.
 */
export function trackViewContent(customParams?: Partial<ViewContentParams>): void {
  const params: ViewContentParams = {
    content_name: 'Storyframe Studio VIP Creator Edition',
    content_type: 'product',
    value: 99,
    currency: 'INR',
    ...customParams,
  };

  const safeParams = sanitizeParams(params);
  devLog('ViewContent', safeParams);

  if (!META_PIXEL_ID || typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return;
  }

  try {
    window.fbq('track', 'ViewContent', safeParams);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Meta Pixel] ViewContent tracking error:', err);
    }
  }
}

export interface InitiateCheckoutParams {
  content_name: string;
  value: number;
  currency: string;
  [key: string]: unknown;
}

/**
 * Standard InitiateCheckout event
 * Trigger: When the user clicks the ₹99 purchase / checkout button.
 */
export function trackInitiateCheckout(customParams?: Partial<InitiateCheckoutParams>): void {
  const params: InitiateCheckoutParams = {
    content_name: 'Storyframe Studio VIP Creator Edition',
    value: 99,
    currency: 'INR',
    ...customParams,
  };

  const safeParams = sanitizeParams(params);
  devLog('InitiateCheckout', safeParams);

  if (!META_PIXEL_ID || typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return;
  }

  try {
    window.fbq('track', 'InitiateCheckout', safeParams);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Meta Pixel] InitiateCheckout tracking error:', err);
    }
  }
}

export interface PurchaseParams {
  content_name: string;
  content_type: string;
  value: number;
  currency: string;
  [key: string]: unknown;
}

/**
 * Standard Purchase event
 * 
 * CRITICAL PURCHASE RULES:
 * 1. ONLY fires after the application has confirmed a legitimate successful transaction / valid license.
 * 2. Never fires simply because someone visits a URL.
 * 3. Prevents duplicate Purchase events if the user refreshes or re-enters the code.
 */
export function trackPurchase(customParams?: Partial<PurchaseParams>): boolean {
  // Check localStorage to ensure duplicate events are not fired on refresh or re-opening
  try {
    if (localStorage.getItem(PURCHASE_STORAGE_KEY) === 'true') {
      if (import.meta.env.DEV) {
        console.log('[Meta Pixel] Purchase already recorded for this session/device. Duplicate skipped.');
      }
      return false;
    }
  } catch {
    // Continue safely if localStorage is unavailable
  }

  const params: PurchaseParams = {
    content_name: 'Storyframe Studio VIP Creator Edition',
    content_type: 'product',
    value: 99,
    currency: 'INR',
    ...customParams,
  };

  const safeParams = sanitizeParams(params);
  devLog('Purchase', safeParams);

  // Mark as recorded immediately in persistent storage
  try {
    localStorage.setItem(PURCHASE_STORAGE_KEY, 'true');
  } catch {}

  if (!META_PIXEL_ID || typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return true;
  }

  try {
    window.fbq('track', 'Purchase', safeParams);
    return true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Meta Pixel] Purchase tracking error:', err);
    }
    return false;
  }
}

/**
 * Generic standard event dispatcher (backwards-compatible)
 */
export function trackPixelEvent(eventName: string, params?: Record<string, unknown>): void {
  const safeParams = sanitizeParams(params);
  devLog(eventName, safeParams);

  if (!META_PIXEL_ID || typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return;
  }

  try {
    if (safeParams) {
      window.fbq('track', eventName, safeParams);
    } else {
      window.fbq('track', eventName);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[Meta Pixel] Error tracking ${eventName}:`, err);
    }
  }
}

/**
 * Generic custom event dispatcher (backwards-compatible)
 */
export function trackPixelCustomEvent(eventName: string, params?: Record<string, unknown>): void {
  const safeParams = sanitizeParams(params);
  devLog(`Custom: ${eventName}`, safeParams);

  if (!META_PIXEL_ID || typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return;
  }

  try {
    if (safeParams) {
      window.fbq('trackCustom', eventName, safeParams);
    } else {
      window.fbq('trackCustom', eventName);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[Meta Pixel] Error tracking custom event ${eventName}:`, err);
    }
  }
}
