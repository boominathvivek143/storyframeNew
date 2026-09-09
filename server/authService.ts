import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, UserRow } from './db';

export const SIGNUP_FREE_CREDITS = 10;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface PublicUser {
  id: number;
  email: string;
  credits: number;
  isAdmin: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Admin access is env-configured (a fixed allowlist), not a DB flag -- it's
// the app operator's own account(s), set once via ADMIN_EMAILS and never
// exposed for a user to grant themselves.
export function isAdminEmail(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return false;
  const allowed = raw.split(',').map((e) => normalizeEmail(e)).filter(Boolean);
  return allowed.includes(normalizeEmail(email));
}

function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, credits: row.credits, isAdmin: isAdminEmail(row.email) };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Human-friendly random password -- avoids visually ambiguous characters
// (0/O, 1/l/I) since this is read out of an email and typed back in by hand.
function generatePassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email)) as UserRow | undefined;
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export async function signup(email: string): Promise<{ user: PublicUser; plainPassword: string } | { error: string }> {
  const cleanEmail = normalizeEmail(email || '');
  if (!isValidEmail(cleanEmail)) return { error: 'Please enter a valid email address.' };
  if (getUserByEmail(cleanEmail)) return { error: 'An account with this email already exists. Please log in instead.' };

  const plainPassword = generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const now = Date.now();

  const result = db
    .prepare(
      'INSERT INTO users (email, password_hash, credits, total_recharged_credits, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)'
    )
    .run(cleanEmail, passwordHash, SIGNUP_FREE_CREDITS, now, now);

  const userId = Number(result.lastInsertRowid);
  db.prepare(
    'INSERT INTO credit_transactions (user_id, type, amount, description, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, 'initial', SIGNUP_FREE_CREDITS, 'Welcome gift: 10 free credits to explore Storyframe', now);

  const user = getUserById(userId)!;
  return { user: toPublicUser(user), plainPassword };
}

export async function login(email: string, password: string): Promise<PublicUser | null> {
  const user = getUserByEmail(email);
  if (!user) return null;
  const matches = await bcrypt.compare(password || '', user.password_hash);
  if (!matches) return null;
  return toPublicUser(user);
}

export async function resetPassword(email: string): Promise<{ plainPassword: string } | { error: string }> {
  const user = getUserByEmail(email);
  if (!user) return { error: 'No account found for this email.' };
  const plainPassword = generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, Date.now(), user.id);
  return { plainPassword };
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

export function getSessionUser(token: string | undefined): PublicUser | null {
  if (!token) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as
    | { token: string; user_id: number; expires_at: number }
    | undefined;
  if (!session || session.expires_at < Date.now()) return null;
  const user = getUserById(session.user_id);
  return user ? toPublicUser(user) : null;
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export const SESSION_COOKIE_NAME = 'sid';
export const SESSION_COOKIE_MAX_AGE_MS = SESSION_TTL_MS;

export interface AdminUserSummary {
  id: number;
  email: string;
  credits: number;
  totalRechargedCredits: number;
  createdAt: number;
  updatedAt: number;
}

// Full per-user roster for the admin dashboard -- deliberately excludes
// password_hash, this is a read-only ledger view, never an auth path.
export function listAllUsers(): AdminUserSummary[] {
  const rows = db
    .prepare('SELECT id, email, credits, total_recharged_credits, created_at, updated_at FROM users ORDER BY created_at DESC')
    .all() as any[];
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    credits: r.credits,
    totalRechargedCredits: r.total_recharged_credits,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
