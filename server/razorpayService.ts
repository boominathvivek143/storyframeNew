import crypto from 'crypto';
import Razorpay from 'razorpay';
import { addCredits, hasProcessedPayment } from './creditService';
import { recordRechargePayment } from './apiConsumptionTracker';

export interface CreditPack {
  id: string;
  name: string;
  amountInr: number; // In Rupees (e.g., 100)
  credits: number;   // In Credits (e.g., 50)
  description: string;
  badge?: string;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_100_50',
    name: 'Starter Creator',
    amountInr: 100,
    credits: 50,
    description: '50 AI generation credits (₹2 / generation)',
    popular: true,
    badge: 'Popular',
  },
  {
    id: 'pack_200_110',
    name: 'Pro Storyteller',
    amountInr: 200,
    credits: 110,
    description: '110 AI generation credits (+10 bonus credits)',
    badge: 'Save 10%',
  },
  {
    id: 'pack_500_300',
    name: 'Studio Master',
    amountInr: 500,
    credits: 300,
    description: '300 AI generation credits (+50 bonus credits)',
    badge: 'Best Value',
  },
];

let razorpayClient: Razorpay | null = null;

export function getRazorpayClient(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!key_id || !key_secret) {
    return null;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayClient;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

export function getRazorpayPublicConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || null;
  const isConfigured = Boolean(keyId && process.env.RAZORPAY_KEY_SECRET?.trim());

  return {
    enabled: isConfigured,
    key_id: keyId,
    test_mode: !isConfigured, // If not configured yet, provides sandbox test mode
    packs: CREDIT_PACKS,
  };
}

export async function createPaymentOrder(params: {
  packId: string;
  userId: number;
  userEmail?: string;
  userName?: string;
}) {
  const pack = CREDIT_PACKS.find((p) => p.id === params.packId) || CREDIT_PACKS[0];
  const client = getRazorpayClient();

  // If Razorpay live/test keys are configured in environment variables:
  if (client && process.env.RAZORPAY_KEY_ID) {
    const amountInPaise = pack.amountInr * 100;
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `sf_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      notes: {
        userId: params.userId,
        packId: pack.id,
        credits: pack.credits,
      },
    };

    const order = await client.orders.create(options);
    return {
      success: true,
      mode: 'live',
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID.trim(),
      pack,
    };
  }

  // Sandbox / Test Simulator Mode (when RAZORPAY_KEY_ID is not configured in .env yet)
  const mockOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  return {
    success: true,
    mode: 'sandbox',
    order_id: mockOrderId,
    amount: pack.amountInr * 100,
    currency: 'INR',
    key_id: 'rzp_test_sandbox_placeholder',
    pack,
    notice: 'Razorpay keys not set in environment. Running in developer sandbox test mode.',
  };
}

export async function verifyPaymentAndCredit(params: {
  orderId: string;
  paymentId: string;
  signature?: string;
  packId: string;
  userId: number;
}): Promise<{ success: boolean; newBalance?: number; error?: string; message: string }> {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  // A replayed/duplicated call for a payment already credited -- report
  // success without touching the ledger again. The unique index in
  // creditService.addCredits is the real guarantee; this is just a cheap
  // short-circuit that skips a redundant Razorpay API round-trip below.
  if (hasProcessedPayment(params.paymentId)) {
    return { success: true, message: 'This payment was already processed.' };
  }

  // If live Razorpay is configured, verify cryptographic signature
  if (secret) {
    if (!params.signature) {
      return { success: false, error: 'MISSING_SIGNATURE', message: 'Payment verification failed: Signature missing.' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    if (expectedSignature !== params.signature) {
      return { success: false, error: 'INVALID_SIGNATURE', message: 'Payment verification failed: Invalid cryptographic signature.' };
    }

    // The signature only proves this orderId+paymentId pair is genuine and
    // paid -- it says nothing about which pack was actually ordered. Never
    // trust the client's packId for a live payment: fetch the order back
    // from Razorpay and credit whatever pack *the server itself* recorded
    // in that order's notes at creation time (createPaymentOrder above),
    // which the client has no way to have tampered with. Without this, a
    // client could pay for the cheapest pack and simply claim a bigger one
    // in the verify-payment request body.
    const client = getRazorpayClient();
    if (!client) {
      return { success: false, error: 'RAZORPAY_NOT_CONFIGURED', message: 'Razorpay is not configured on this server.' };
    }

    let order: any;
    try {
      order = await client.orders.fetch(params.orderId);
    } catch (err: any) {
      return { success: false, error: 'ORDER_FETCH_FAILED', message: err?.message || 'Could not verify order with Razorpay.' };
    }

    const orderPackId = order?.notes?.packId;
    const pack = CREDIT_PACKS.find((p) => p.id === orderPackId);
    if (!pack) {
      return { success: false, error: 'PACK_MISMATCH', message: 'Could not resolve the credit pack for this order.' };
    }
    if (order.amount !== pack.amountInr * 100) {
      return { success: false, error: 'AMOUNT_MISMATCH', message: 'Order amount does not match the expected pack price.' };
    }
    if (order.status !== 'paid') {
      return { success: false, error: 'ORDER_NOT_PAID', message: `Order status is "${order.status}", expected "paid".` };
    }

    return creditPack(params.userId, pack, params.orderId, params.paymentId);
  }

  // Sandbox mode (no live keys configured yet) -- no real order to verify
  // against, so the client-supplied pack is trusted for local testing only.
  const pack = CREDIT_PACKS.find((p) => p.id === params.packId) || CREDIT_PACKS[0];
  return creditPack(params.userId, pack, params.orderId, params.paymentId);
}

function creditPack(
  userId: number,
  pack: CreditPack,
  orderId: string,
  paymentId: string
): { success: boolean; newBalance?: number; error?: string; message: string } {
  const result = addCredits(userId, pack.credits, `Razorpay Recharge (${pack.name} - ₹${pack.amountInr})`, paymentId);

  if (!result.success) {
    // alreadyProcessed is the only failure path addCredits can hit here --
    // a race where two verify-payment calls for the same paymentId landed
    // concurrently. Report it the same as the early idempotency check.
    return { success: true, newBalance: result.newBalance, message: 'This payment was already processed.' };
  }

  recordRechargePayment({
    orderId,
    paymentId,
    packId: pack.id,
    amountInr: pack.amountInr,
    credits: pack.credits,
    userId: String(userId),
  });

  return {
    success: true,
    newBalance: result.newBalance,
    message: `Payment verified! Successfully added ${pack.credits} Credits to your account.`,
  };
}
