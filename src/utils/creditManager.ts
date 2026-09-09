import { safeFetchJson, postJson } from './apiClient';

export interface CreditBalanceData {
  userId: number;
  credits: number;
  totalRechargedCredits: number;
  transactions?: {
    id: string;
    type: 'initial' | 'recharge' | 'deduction' | 'manual';
    amount: number;
    description: string;
    timestamp: number;
    paymentId?: string;
  }[];
}

export interface CreditPack {
  id: string;
  name: string;
  amountInr: number;
  credits: number;
  description: string;
  badge?: string;
  popular?: boolean;
}

export interface RazorpayConfigResponse {
  enabled: boolean;
  key_id: string | null;
  test_mode: boolean;
  packs: CreditPack[];
}

// Load official Razorpay Checkout JS dynamically
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function fetchCreditBalance(): Promise<CreditBalanceData | null> {
  try {
    const res = await safeFetchJson<CreditBalanceData>('/api/credits/balance');
    if (res.ok && res.data) {
      return res.data;
    }
  } catch (err) {
    console.error('Failed to fetch credit balance:', err);
  }
  return null;
}

export async function fetchRazorpayConfig(): Promise<RazorpayConfigResponse | null> {
  try {
    const res = await safeFetchJson<RazorpayConfigResponse>('/api/payment/razorpay/config');
    if (res.ok && res.data) {
      return res.data;
    }
  } catch (err) {
    console.error('Failed to fetch Razorpay config:', err);
  }
  return null;
}

export async function initiateRazorpayRecharge(params: {
  packId: string;
  userEmail?: string;
  userName?: string;
  onSuccess: (newBalance: number, creditsAdded: number) => void;
  onError: (errorMsg: string) => void;
  onDismiss?: () => void;
}) {
  // 1. Create order on server
  const orderRes = await postJson<{
    success: boolean;
    mode: 'live' | 'sandbox';
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    pack: CreditPack;
    notice?: string;
  }>('/api/payment/razorpay/create-order', {
    packId: params.packId,
    userEmail: params.userEmail,
    userName: params.userName,
  });

  if (!orderRes.ok || !orderRes.data?.success) {
    params.onError(orderRes.error || 'Failed to initialize payment order.');
    return;
  }

  const orderData = orderRes.data;

  // 2. Handle Sandbox / Simulated Test Mode
  if (orderData.mode === 'sandbox' || orderData.key_id === 'rzp_test_sandbox_placeholder') {
    // Complete instant simulation for testing when gateway keys aren't configured yet
    const simPaymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const verifyRes = await postJson<{ success: boolean; newBalance: number; message: string }>(
      '/api/payment/razorpay/verify-payment',
      {
        orderId: orderData.order_id,
        paymentId: simPaymentId,
        packId: params.packId,
      }
    );

    if (verifyRes.ok && verifyRes.data?.success) {
      params.onSuccess(verifyRes.data.newBalance, orderData.pack.credits);
    } else {
      params.onError(verifyRes.data?.message || 'Sandbox verification failed.');
    }
    return;
  }

  // 3. Handle Live Razorpay Checkout
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !(window as any).Razorpay) {
    params.onError('Unable to load Razorpay payment window. Please check your internet connection or ad blocker.');
    return;
  }

  const options = {
    key: orderData.key_id,
    amount: orderData.amount,
    currency: orderData.currency,
    name: 'Storyframe Studio',
    description: `${orderData.pack.name} (${orderData.pack.credits} AI Credits)`,
    order_id: orderData.order_id,
    prefill: {
      email: params.userEmail || '',
      name: params.userName || '',
    },
    theme: {
      color: '#d9a042',
    },
    handler: async function (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) {
      try {
        const verifyRes = await postJson<{ success: boolean; newBalance: number; message: string }>(
          '/api/payment/razorpay/verify-payment',
          {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            packId: params.packId,
          }
        );

        if (verifyRes.ok && verifyRes.data?.success) {
          params.onSuccess(verifyRes.data.newBalance, orderData.pack.credits);
        } else {
          params.onError(verifyRes.data?.message || 'Payment received but verification failed. Please contact support.');
        }
      } catch (e: any) {
        params.onError(e?.message || 'Network error verifying payment.');
      }
    },
    modal: {
      ondismiss: function () {
        if (params.onDismiss) params.onDismiss();
      },
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err: any) {
    params.onError(err?.message || 'Failed to open Razorpay payment popup.');
  }
}
