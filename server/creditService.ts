import { db, UserRow } from './db';

export interface CreditTransaction {
  id: number;
  type: 'initial' | 'recharge' | 'deduction' | 'manual';
  amount: number;
  description: string;
  timestamp: number;
  paymentId?: string;
}

export interface UserCreditAccount {
  userId: number;
  credits: number;
  totalRechargedCredits: number;
  transactions: CreditTransaction[];
}

export const DEFAULT_INITIAL_CREDITS = 10;

function loadTransactions(userId: number, limit = 50): CreditTransaction[] {
  const rows = db
    .prepare('SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?')
    .all(userId, limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    description: r.description,
    timestamp: r.timestamp,
    paymentId: r.payment_id || undefined,
  }));
}

/**
 * Look up a user's credit account. The account itself is always created at
 * signup (server/authService.ts) -- this just reads the current balance and
 * recent ledger, it never creates a user record.
 */
export function getUserCredits(userId: number): UserCreditAccount {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
  if (!user) throw new Error(`No such user: ${userId}`);
  return {
    userId: user.id,
    credits: user.credits,
    totalRechargedCredits: user.total_recharged_credits,
    transactions: loadTransactions(user.id),
  };
}

export function deductCredits(userId: number, amount: number, description: string): { success: boolean; remaining: number; error?: string } {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
  if (!user) return { success: false, remaining: 0, error: 'No such user' };
  if (user.credits < amount) {
    return { success: false, remaining: user.credits, error: `Insufficient credits. Required: ${amount}, Remaining: ${user.credits}` };
  }

  const remaining = Math.max(0, user.credits - amount);
  const now = Date.now();
  db.prepare('UPDATE users SET credits = ?, updated_at = ? WHERE id = ?').run(remaining, now, userId);
  db.prepare(
    'INSERT INTO credit_transactions (user_id, type, amount, description, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, 'deduction', -amount, description, now);

  return { success: true, remaining };
}

/**
 * Whether a Razorpay payment id has already been credited -- used to make
 * verify-payment idempotent against retries/replays of the same successful
 * payment (the unique index below is the actual hard guarantee; this is
 * just for surfacing a clean "already processed" response instead of an
 * unhandled constraint-violation error).
 */
export function hasProcessedPayment(paymentId: string): boolean {
  const row = db.prepare('SELECT 1 FROM credit_transactions WHERE payment_id = ?').get(paymentId);
  return Boolean(row);
}

export function addCredits(
  userId: number,
  amount: number,
  description: string,
  paymentId?: string
): { success: boolean; newBalance: number; alreadyProcessed?: boolean } {
  const isRecharge = Boolean(paymentId);
  const now = Date.now();

  // Insert-then-update in one transaction: the payment_id uniqueness check
  // happens on the insert, so a replayed paymentId throws and rolls back
  // before the balance is ever touched -- never credit-then-fail.
  const run = db.transaction(() => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
    if (!user) throw new Error(`No such user: ${userId}`);

    db.prepare(
      'INSERT INTO credit_transactions (user_id, type, amount, description, timestamp, payment_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, isRecharge ? 'recharge' : 'manual', amount, description, now, paymentId || null);

    const newBalance = user.credits + amount;
    db.prepare(
      isRecharge
        ? 'UPDATE users SET credits = ?, total_recharged_credits = total_recharged_credits + ?, updated_at = ? WHERE id = ?'
        : 'UPDATE users SET credits = ?, updated_at = ? WHERE id = ?'
    ).run(...(isRecharge ? [newBalance, amount, now, userId] : [newBalance, now, userId]));

    return newBalance;
  });

  try {
    const newBalance = run();
    return { success: true, newBalance };
  } catch (err: any) {
    if (paymentId && err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId) as { credits: number } | undefined;
      return { success: false, newBalance: user?.credits ?? 0, alreadyProcessed: true };
    }
    throw err;
  }
}

/**
 * Aggregate credit statistics across all users, for the owner-facing
 * financial reconciliation ledger.
 */
export function getSystemCreditsSummary() {
  const row = db
    .prepare('SELECT COUNT(*) as totalUsers, COALESCE(SUM(credits), 0) as totalActiveCredits, COALESCE(SUM(total_recharged_credits), 0) as totalRechargedCredits FROM users')
    .get() as { totalUsers: number; totalActiveCredits: number; totalRechargedCredits: number };
  return row;
}
