import fs from 'fs';
import path from 'path';

export interface ApiCallRecord {
  id: string;
  timestamp: number;
  feature: 'scene_image' | 'character_sheet' | 'storyboard_planner' | 'title_generation' | 'prompt_refine' | 'translation';
  model: string;
  isPersonalKey: boolean;
  costUsd: number;
  costInr: number;
  userId: string;
  success: boolean;
}

export interface PaymentRechargeRecord {
  id: string;
  timestamp: number;
  orderId: string;
  paymentId: string;
  packId: string;
  amountInr: number;
  credits: number;
  userId: string;
}

interface ConsumptionStorage {
  apiCalls: ApiCallRecord[];
  payments: PaymentRechargeRecord[];
  dailyBudgetLimitUsd: number;
  usdToInrRate: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CONSUMPTION_FILE = path.join(DATA_DIR, 'api_consumption.json');

// Standard Pricing benchmarks for Google GenAI / Vertex APIs (as of 2025/2026)
export const PRICING_RATES = {
  // Image generation models (gemini-3.1-flash-image / imagen-3) ~$0.030 / image
  IMAGE_GENERATION_USD: 0.030,
  // Storyboard planning (gemini-3.7-flash, ~1,500 input + 1,200 output tokens) ~$0.0006
  STORYBOARD_PLANNER_USD: 0.0006,
  // Title generation (gemini-3.7-flash, ~400 input + 100 output tokens) ~$0.00015
  TITLE_GENERATION_USD: 0.00015,
  // Prompt refinement (gemini-3.7-flash, ~300 input + 100 output tokens) ~$0.00012
  PROMPT_REFINE_USD: 0.00012,
  // Translation (gemini-3.7-flash, ~500 input + 400 output tokens) ~$0.00020
  TRANSLATION_USD: 0.00020,
  // Current USD to INR benchmark
  USD_TO_INR: 86.0,
  // Default daily safety limit for owner's key
  DEFAULT_DAILY_BUDGET_USD: 25.0,
};

let store: ConsumptionStorage = {
  apiCalls: [],
  payments: [],
  dailyBudgetLimitUsd: PRICING_RATES.DEFAULT_DAILY_BUDGET_USD,
  usdToInrRate: PRICING_RATES.USD_TO_INR,
};

function ensureFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(CONSUMPTION_FILE)) {
      const raw = fs.readFileSync(CONSUMPTION_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      store = {
        apiCalls: parsed.apiCalls || [],
        payments: parsed.payments || [],
        dailyBudgetLimitUsd: parsed.dailyBudgetLimitUsd || PRICING_RATES.DEFAULT_DAILY_BUDGET_USD,
        usdToInrRate: parsed.usdToInrRate || PRICING_RATES.USD_TO_INR,
      };
    } else {
      fs.writeFileSync(CONSUMPTION_FILE, JSON.stringify(store, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('Failed to load api_consumption.json:', e);
  }
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CONSUMPTION_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write api_consumption.json:', e);
  }
}

ensureFile();

/**
 * Record a backend API call
 */
export function recordApiCall(params: {
  feature: ApiCallRecord['feature'];
  model: string;
  isPersonalKey: boolean;
  userId?: string;
  success?: boolean;
}): ApiCallRecord {
  let costUsd = 0;

  // Only server-side key calls incur cost to the owner!
  if (!params.isPersonalKey) {
    switch (params.feature) {
      case 'scene_image':
      case 'character_sheet':
        costUsd = PRICING_RATES.IMAGE_GENERATION_USD;
        break;
      case 'storyboard_planner':
        costUsd = PRICING_RATES.STORYBOARD_PLANNER_USD;
        break;
      case 'title_generation':
        costUsd = PRICING_RATES.TITLE_GENERATION_USD;
        break;
      case 'prompt_refine':
        costUsd = PRICING_RATES.PROMPT_REFINE_USD;
        break;
      case 'translation':
        costUsd = PRICING_RATES.TRANSLATION_USD;
        break;
    }
  }

  const costInr = Number((costUsd * store.usdToInrRate).toFixed(3));

  const record: ApiCallRecord = {
    id: `api_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    feature: params.feature,
    model: params.model,
    isPersonalKey: params.isPersonalKey,
    costUsd: Number(costUsd.toFixed(5)),
    costInr,
    userId: params.userId || 'anonymous',
    success: params.success !== false,
  };

  store.apiCalls.unshift(record);

  // Retain last 2,000 calls to prevent memory overflow
  if (store.apiCalls.length > 2000) {
    store.apiCalls = store.apiCalls.slice(0, 2000);
  }

  persist();
  return record;
}

/**
 * Record a successful Razorpay recharge payment
 */
export function recordRechargePayment(params: {
  orderId: string;
  paymentId: string;
  packId: string;
  amountInr: number;
  credits: number;
  userId: string;
}): PaymentRechargeRecord {
  const record: PaymentRechargeRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    orderId: params.orderId,
    paymentId: params.paymentId,
    packId: params.packId,
    amountInr: params.amountInr,
    credits: params.credits,
    userId: params.userId,
  };

  store.payments.unshift(record);
  if (store.payments.length > 1000) {
    store.payments = store.payments.slice(0, 1000);
  }

  persist();
  return record;
}

/**
 * Set daily budget limit
 */
export function setDailyBudgetLimit(limitUsd: number) {
  store.dailyBudgetLimitUsd = Math.max(1, limitUsd);
  persist();
}

/**
 * Check if the owner's daily API limit is reached
 */
export function checkDailyBudgetCap(): { isExceeded: boolean; todayCostUsd: number; limitUsd: number } {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTimestamp = startOfDay.getTime();

  const todayCostUsd = store.apiCalls
    .filter((c) => !c.isPersonalKey && c.timestamp >= startTimestamp)
    .reduce((sum, c) => sum + c.costUsd, 0);

  return {
    isExceeded: todayCostUsd >= store.dailyBudgetLimitUsd,
    todayCostUsd: Number(todayCostUsd.toFixed(3)),
    limitUsd: store.dailyBudgetLimitUsd,
  };
}

/**
 * Compute the complete Financial & Consumption Reconciliation Report
 */
export function getReconciliationMetrics() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTimestamp = startOfDay.getTime();

  // 1. Revenue totals
  const totalRevenueInr = store.payments.reduce((acc, p) => acc + p.amountInr, 0);
  const totalRechargesCount = store.payments.length;
  const totalRechargedCredits = store.payments.reduce((acc, p) => acc + p.credits, 0);

  // 2. API Expense totals (only counting server key)
  const serverCalls = store.apiCalls.filter((c) => !c.isPersonalKey);
  const personalCalls = store.apiCalls.filter((c) => c.isPersonalKey);

  const totalApiCostUsd = Number(serverCalls.reduce((acc, c) => acc + c.costUsd, 0).toFixed(3));
  const totalApiCostInr = Number((totalApiCostUsd * store.usdToInrRate).toFixed(2));

  const todayServerCalls = serverCalls.filter((c) => c.timestamp >= startTimestamp);
  const todayApiCostUsd = Number(todayServerCalls.reduce((acc, c) => acc + c.costUsd, 0).toFixed(3));
  const todayApiCostInr = Number((todayApiCostUsd * store.usdToInrRate).toFixed(2));

  // 3. Margin & Profit
  const netProfitInr = Number((totalRevenueInr - totalApiCostInr).toFixed(2));
  const profitMarginPct =
    totalRevenueInr > 0
      ? Number((((totalRevenueInr - totalApiCostInr) / totalRevenueInr) * 100).toFixed(1))
      : 0;

  // 4. Feature Call Counts
  const imageCallsCount = serverCalls.filter((c) => c.feature === 'scene_image' || c.feature === 'character_sheet').length;
  const textCallsCount = serverCalls.length - imageCallsCount;

  // 5. Unit Economics Benchmarks
  const costPerImageInr = Number((PRICING_RATES.IMAGE_GENERATION_USD * store.usdToInrRate).toFixed(2));
  const costPerTextInr = Number((PRICING_RATES.TITLE_GENERATION_USD * store.usdToInrRate).toFixed(2));

  return {
    financial: {
      totalRevenueInr,
      totalApiCostUsd,
      totalApiCostInr,
      todayApiCostUsd,
      todayApiCostInr,
      netProfitInr,
      profitMarginPct,
      currency: 'INR',
      usdToInrRate: store.usdToInrRate,
    },
    volume: {
      totalApiCalls: store.apiCalls.length,
      serverKeyCalls: serverCalls.length,
      personalKeyCalls: personalCalls.length,
      imageGenerationsCount: imageCallsCount,
      textOperationsCount: textCallsCount,
      totalRechargesCount,
      totalRechargedCredits,
    },
    unitEconomics: {
      costPerImageInr,
      costPerTextInr,
      starterPackRevenuePerCredit: 2.0, // ₹100 / 50 = ₹2.00
      proPackRevenuePerCredit: 1.81,    // ₹200 / 110 = ₹1.81
      masterPackRevenuePerCredit: 1.67, // ₹500 / 300 = ₹1.67
    },
    safetyBudget: {
      dailyLimitUsd: store.dailyBudgetLimitUsd,
      todaySpendUsd: todayApiCostUsd,
      percentUsed: Math.min(100, Math.round((todayApiCostUsd / store.dailyBudgetLimitUsd) * 100)),
      isExceeded: todayApiCostUsd >= store.dailyBudgetLimitUsd,
    },
    recentCalls: store.apiCalls.slice(0, 30),
    recentPayments: store.payments.slice(0, 15),
  };
}
