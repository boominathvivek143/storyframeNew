import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  ExternalLink,
  Info,
  Layers,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface AdminUserSummary {
  id: number;
  email: string;
  credits: number;
  totalRechargedCredits: number;
  createdAt: number;
  updatedAt: number;
}

interface MetricsResponse {
  financial: {
    totalRevenueInr: number;
    totalApiCostUsd: number;
    totalApiCostInr: number;
    todayApiCostUsd: number;
    todayApiCostInr: number;
    netProfitInr: number;
    profitMarginPct: number;
    currency: string;
    usdToInrRate: number;
  };
  volume: {
    totalApiCalls: number;
    serverKeyCalls: number;
    personalKeyCalls: number;
    imageGenerationsCount: number;
    textOperationsCount: number;
    totalRechargesCount: number;
    totalRechargedCredits: number;
  };
  unitEconomics: {
    costPerImageInr: number;
    costPerTextInr: number;
    starterPackRevenuePerCredit: number;
    proPackRevenuePerCredit: number;
    masterPackRevenuePerCredit: number;
  };
  safetyBudget: {
    dailyLimitUsd: number;
    todaySpendUsd: number;
    percentUsed: number;
    isExceeded: boolean;
  };
  systemCredits?: {
    totalUsers: number;
    totalActiveCredits: number;
    totalRechargedCredits: number;
  };
  recentCalls: Array<{
    id: string;
    timestamp: number;
    feature: string;
    model: string;
    isPersonalKey: boolean;
    costUsd: number;
    costInr: number;
    userId: string;
    success: boolean;
  }>;
  recentPayments: Array<{
    id: string;
    timestamp: number;
    orderId: string;
    paymentId: string;
    packId: string;
    amountInr: number;
    credits: number;
    userId: string;
  }>;
}

export function ApiUsageReconciliationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'economics' | 'gcp_guide' | 'logs' | 'users'>('overview');
  const [dailyLimitInput, setDailyLimitInput] = useState<number>(25);
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitSavedMsg, setLimitSavedMsg] = useState('');
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [adjustInputs, setAdjustInputs] = useState<Record<number, string>>({});
  const [adjustingUserId, setAdjustingUserId] = useState<number | null>(null);
  const [adjustMsg, setAdjustMsg] = useState<{ userId: number; text: string; isError?: boolean } | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reconciliation-metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        if (data.safetyBudget?.dailyLimitUsd) {
          setDailyLimitInput(data.safetyBudget.dailyLimitUsd);
        }
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
      fetchUsers();
    }
  }, [isOpen]);

  const handleAdjustCredits = async (userId: number) => {
    const raw = adjustInputs[userId];
    const delta = Number(raw);
    if (!raw || !Number.isFinite(delta) || delta === 0) {
      setAdjustMsg({ userId, text: 'Enter a non-zero number (e.g. 10 or -5).', isError: true });
      return;
    }
    setAdjustingUserId(userId);
    setAdjustMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: delta }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdjustMsg({ userId, text: `Balance now ${data.newBalance}.` });
        setAdjustInputs((prev) => ({ ...prev, [userId]: '' }));
        fetchUsers();
      } else {
        setAdjustMsg({ userId, text: data.error || 'Failed to adjust credits.', isError: true });
      }
    } catch {
      setAdjustMsg({ userId, text: 'Network error while adjusting credits.', isError: true });
    } finally {
      setAdjustingUserId(null);
      setTimeout(() => setAdjustMsg((m) => (m?.userId === userId ? null : m)), 4000);
    }
  };

  const handleSaveBudget = async () => {
    setSavingLimit(true);
    setLimitSavedMsg('');
    try {
      const res = await fetch('/api/admin/safety-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLimitUsd: Number(dailyLimitInput) }),
      });
      if (res.ok) {
        setLimitSavedMsg('Safety budget updated successfully.');
        fetchMetrics();
      }
    } catch {
      setLimitSavedMsg('Failed to update safety budget.');
    } finally {
      setSavingLimit(false);
      setTimeout(() => setLimitSavedMsg(''), 3500);
    }
  };

  if (!isOpen) return null;

  const fin = metrics?.financial;
  const vol = metrics?.volume;
  const unit = metrics?.unitEconomics;
  const budget = metrics?.safetyBudget;

  const isProfitable = (fin?.netProfitInr ?? 0) >= 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-[#181422] border border-[#342b45] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d243b] bg-[#14101e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#d9a042]/15 border border-[#d9a042]/30 flex items-center justify-center text-[#d9a042]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-[#ece8de] text-base">API Consumption & Token Reconciliation</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#382d4f] text-[#cbbbe8] border border-[#524172]">
                  Admin Ledger
                </span>
              </div>
              <p className="text-xs text-[#8a8399] mt-0.5">
                Check backend Google Gemini API consumption costs against Razorpay token recharge collections.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMetrics}
              disabled={loading}
              title="Refresh ledger"
              className="p-1.5 rounded-lg text-[#8a8399] hover:text-[#ece8de] hover:bg-[#251e33] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8a8399] hover:text-[#ece8de] hover:bg-[#251e33] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#2d243b] bg-[#151120] shrink-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'Financial Overview', icon: DollarSign },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'economics', label: 'Unit Economics & Margins', icon: TrendingUp },
            { id: 'gcp_guide', label: 'Google Cloud & AI Studio Guide', icon: ExternalLink },
            { id: 'logs', label: 'Live Call Ledger', icon: Layers },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === t.id
                  ? 'border-[#d9a042] text-[#ece8de] bg-[#d9a042]/5'
                  : 'border-transparent text-[#7e778f] hover:text-[#c4bcd6]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Gross Revenue */}
                <div className="p-4 rounded-xl bg-[#1d172a] border border-[#322749]">
                  <div className="flex items-center justify-between text-[#8a8399] mb-1">
                    <span className="text-xs font-medium">Recharge Collections</span>
                    <Coins className="w-4 h-4 text-[#d9a042]" />
                  </div>
                  <div className="text-2xl font-bold text-[#ece8de]">
                    ₹{fin ? fin.totalRevenueInr.toLocaleString('en-IN') : '0'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#22c55e]">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{vol?.totalRechargesCount || 0} recharge payments</span>
                  </div>
                </div>

                {/* 2. Total API Expense */}
                <div className="p-4 rounded-xl bg-[#1d172a] border border-[#322749]">
                  <div className="flex items-center justify-between text-[#8a8399] mb-1">
                    <span className="text-xs font-medium">Backend Gemini Cost</span>
                    <Zap className="w-4 h-4 text-[#ec4899]" />
                  </div>
                  <div className="text-2xl font-bold text-[#ece8de]">
                    ${fin ? fin.totalApiCostUsd.toFixed(2) : '0.00'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#e06c75]">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>≈ ₹{fin ? fin.totalApiCostInr.toFixed(1) : '0'} INR billed</span>
                  </div>
                </div>

                {/* 3. Net Margin */}
                <div
                  className={`p-4 rounded-xl border ${
                    isProfitable ? 'bg-[#152a20] border-[#1e4835]' : 'bg-[#2d1822] border-[#52253b]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[#8a8399] mb-1">
                    <span className="text-xs font-medium">Net Studio Margin</span>
                    {isProfitable ? (
                      <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                    )}
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      isProfitable ? 'text-[#4ade80]' : 'text-[#f87171]'
                    }`}
                  >
                    {isProfitable ? '+' : ''}₹{fin ? fin.netProfitInr.toFixed(1) : '0'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#cbbbe8]">
                    <span>Margin: {fin ? fin.profitMarginPct : 0}% gross</span>
                  </div>
                </div>

                {/* 4. Active Credits Liability */}
                <div className="p-4 rounded-xl bg-[#1d172a] border border-[#322749]">
                  <div className="flex items-center justify-between text-[#8a8399] mb-1">
                    <span className="text-xs font-medium">User Credits Float</span>
                    <Layers className="w-4 h-4 text-[#60a5fa]" />
                  </div>
                  <div className="text-2xl font-bold text-[#ece8de]">
                    {metrics?.systemCredits?.totalActiveCredits || 0}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#8a8399]">
                    <span>In {metrics?.systemCredits?.totalUsers || 1} creator wallets</span>
                  </div>
                </div>
              </div>

              {/* Today's API Budget & Circuit Breaker */}
              <div className="p-5 rounded-xl bg-[#161221] border border-[#2e243e] space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#3b2a59] text-[#cbbbe8] mt-0.5">
                      <ShieldCheck className="w-5 h-5 text-[#d9a042]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#ece8de]">
                        Owner API Budget Guard & Circuit Breaker
                      </h3>
                      <p className="text-xs text-[#8a8399] mt-0.5">
                        Protects your Gemini API key from unexpected spikes. Generations pause if today's spend exceeds this cap.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8a8399]">Daily Cap:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[#d9a042] font-semibold">$</span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={dailyLimitInput}
                        onChange={(e) => setDailyLimitInput(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-[#0f0c17] border border-[#3a2f50] rounded text-xs text-[#ece8de] focus:outline-none focus:border-[#d9a042]"
                      />
                      <button
                        onClick={handleSaveBudget}
                        disabled={savingLimit}
                        className="px-2.5 py-1 bg-[#d9a042] text-[#1a1408] text-xs font-semibold rounded hover:bg-[#e6b356] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>

                {limitSavedMsg && (
                  <div className="text-xs text-[#22c55e] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{limitSavedMsg}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-[#8a8399]">
                    <span>Today's API Spend: <strong className="text-[#ece8de]">${budget?.todaySpendUsd.toFixed(2)}</strong> (≈ ₹{((budget?.todaySpendUsd || 0) * (fin?.usdToInrRate || 86)).toFixed(1)})</span>
                    <span>{budget?.percentUsed || 0}% of ${budget?.dailyLimitUsd} limit</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#271f37] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (budget?.percentUsed || 0) > 85 ? 'bg-[#ef4444]' : 'bg-[#d9a042]'
                      }`}
                      style={{ width: `${Math.min(100, budget?.percentUsed || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Call Distribution Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-[#14101e] border border-[#2a2238]">
                  <div className="text-xs font-medium text-[#8a8399] mb-1">Total API Invocations</div>
                  <div className="text-xl font-bold text-[#ece8de]">{vol?.totalApiCalls || 0}</div>
                  <p className="text-[11px] text-[#6b6478] mt-1">
                    All requests billed to the server's own API keys
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#14101e] border border-[#2a2238]">
                  <div className="text-xs font-medium text-[#8a8399] mb-1">Image Generations</div>
                  <div className="text-xl font-bold text-[#ece8de]">{vol?.imageGenerationsCount || 0}</div>
                  <p className="text-[11px] text-[#6b6478] mt-1">
                    High-res scenes & character reference sheets
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#14101e] border border-[#2a2238]">
                  <div className="text-xs font-medium text-[#8a8399] mb-1">Text & Prompt Ops</div>
                  <div className="text-xl font-bold text-[#ece8de]">{vol?.textOperationsCount || 0}</div>
                  <p className="text-[11px] text-[#6b6478] mt-1">
                    Titles, translations, and storyboard expansions
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: USERS -- per-account credit balances & recharge totals */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#ece8de]">All accounts</h3>
                  <p className="text-xs text-[#8a8399] mt-0.5">{users?.length ?? 0} registered user(s)</p>
                </div>
                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="p-1.5 rounded-lg text-[#8a8399] hover:text-[#ece8de] hover:bg-[#251e33] transition-colors cursor-pointer"
                  title="Refresh users"
                >
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#2a2238]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#14101e] text-[#8a8399] text-left">
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Credits</th>
                      <th className="p-3 font-medium">Total recharged</th>
                      <th className="p-3 font-medium">Signed up</th>
                      <th className="p-3 font-medium">Adjust quota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#221c30]">
                    {users && users.length > 0 ? (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-[#1d1729]">
                          <td className="p-3 text-[#ece8de]">{u.email}</td>
                          <td className="p-3 font-mono text-[#d9a042]">{u.credits}</td>
                          <td className="p-3 font-mono text-[#c9c2e0]">{u.totalRechargedCredits}</td>
                          <td className="p-3 text-[#8a8399]">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={adjustInputs[u.id] ?? ''}
                                onChange={(e) => setAdjustInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                placeholder="±credits"
                                className="w-20 bg-[#0d0b10] border border-[#2f2a3a] rounded-lg px-2 py-1.5 text-xs text-[#ece8de] outline-none focus:border-[#d9a042]"
                              />
                              <button
                                onClick={() => handleAdjustCredits(u.id)}
                                disabled={adjustingUserId === u.id}
                                className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44] disabled:opacity-40"
                              >
                                Apply
                              </button>
                            </div>
                            {adjustMsg?.userId === u.id && (
                              <p className={`text-[10px] mt-1 ${adjustMsg.isError ? 'text-rose-400' : 'text-emerald-400'}`}>{adjustMsg.text}</p>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-[#6b6478]">
                          {usersLoading ? 'Loading users…' : 'No users registered yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: UNIT ECONOMICS & MARGINS */}
          {activeTab === 'economics' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#14101e] border border-[#2a2238] space-y-2">
                <h3 className="text-sm font-semibold text-[#ece8de] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#d9a042]" />
                  How Google API Costs Reconcile Against User Recharges
                </h3>
                <p className="text-xs text-[#8a8399] leading-relaxed">
                  When a customer purchases a token recharge pack (e.g. ₹100 via Razorpay UPI), they are buying access to your server-side Gemini API key. Here is the exact unit-cost breakdown:
                </p>
              </div>

              {/* Table of API Costs vs Token Revenue */}
              <div className="rounded-xl border border-[#2d243c] overflow-hidden bg-[#151120]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1e172d] border-b border-[#2d243c] text-[#8a8399] font-medium">
                    <tr>
                      <th className="p-3.5">Feature / Generation</th>
                      <th className="p-3.5">Google Model Used</th>
                      <th className="p-3.5">Google Cost (USD)</th>
                      <th className="p-3.5">Google Cost (INR)</th>
                      <th className="p-3.5">User Charged</th>
                      <th className="p-3.5">Gross Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#261e33] text-[#cfc7de]">
                    <tr>
                      <td className="p-3.5 font-medium text-[#ece8de]">Scene Visual (Image)</td>
                      <td className="p-3.5 font-mono text-[11px] text-[#d9a042]">gemini-3.1-flash-image</td>
                      <td className="p-3.5">$0.030</td>
                      <td className="p-3.5">≈ ₹{unit?.costPerImageInr.toFixed(2)}</td>
                      <td className="p-3.5">1 Credit (₹2.00)</td>
                      <td className="p-3.5 text-[#f59e0b] font-medium">Near Parity (~-₹0.5)</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-[#ece8de]">Character Sheet (Image)</td>
                      <td className="p-3.5 font-mono text-[11px] text-[#d9a042]">gemini-3.1-flash-image</td>
                      <td className="p-3.5">$0.030</td>
                      <td className="p-3.5">≈ ₹{unit?.costPerImageInr.toFixed(2)}</td>
                      <td className="p-3.5">1 Credit (₹2.00)</td>
                      <td className="p-3.5 text-[#f59e0b] font-medium">Near Parity (~-₹0.5)</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-[#ece8de]">Story Title Generator (5x)</td>
                      <td className="p-3.5 font-mono text-[11px] text-[#907aa9]">gemini-3.7-flash</td>
                      <td className="p-3.5">$0.00015</td>
                      <td className="p-3.5">≈ ₹0.013</td>
                      <td className="p-3.5">0.5 Credit (₹1.00)</td>
                      <td className="p-3.5 text-[#22c55e] font-semibold">+98.7% Margin</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-[#ece8de]">Prompt Refine Chat</td>
                      <td className="p-3.5 font-mono text-[11px] text-[#907aa9]">gemini-3.7-flash</td>
                      <td className="p-3.5">$0.00012</td>
                      <td className="p-3.5">≈ ₹0.010</td>
                      <td className="p-3.5">Free / Included</td>
                      <td className="p-3.5 text-[#8a8399]">Fraction of a cent</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-[#ece8de]">Language Translation Batch</td>
                      <td className="p-3.5 font-mono text-[11px] text-[#907aa9]">gemini-3.7-flash</td>
                      <td className="p-3.5">$0.00020</td>
                      <td className="p-3.5">≈ ₹0.017</td>
                      <td className="p-3.5">Free / Cached</td>
                      <td className="p-3.5 text-[#8a8399]">Negligible</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Profitability Optimization Tips */}
              <div className="p-4 rounded-xl bg-[#1b1528] border border-[#332849] space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#d9a042] flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Key Profitability Insights for the App Owner
                </h4>
                <ul className="text-xs text-[#8a8399] space-y-2 list-disc list-inside leading-relaxed">
                  <li>
                    <strong className="text-[#ece8de]">Mixed Story Generation Yields Strong Profit:</strong> A typical story requires titles, character prompts, script translation, and video exports alongside visuals. Because text operations cost fractions of a paisa, blended margins across a full story session average <span className="text-[#22c55e] font-semibold">45% to 65% net margin</span>.
                  </li>
                  <li>
                    <strong className="text-[#ece8de]">Adjusting Credit Pack Ratio:</strong> If you find users are generating 100% pure images, you can configure the ₹100 pack to provide <strong>35 credits</strong> (₹2.86 / credit), giving you an immediate <span className="text-[#22c55e] font-semibold">+11% to +20% profit margin</span> on pure Imagen generations.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: GCP BILLING GUIDE */}
          {activeTab === 'gcp_guide' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#14101e] border border-[#2a2238] space-y-2">
                <h3 className="text-sm font-semibold text-[#ece8de] flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[#d9a042]" />
                  Direct Google AI Studio & Google Cloud Verification
                </h3>
                <p className="text-xs text-[#8a8399] leading-relaxed">
                  You can inspect Google's official itemized billing down to the cent in your Google Cloud Platform (GCP) and Google AI Studio consoles:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Google AI Studio */}
                <div className="p-4 rounded-xl bg-[#171223] border border-[#2f2541] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#d9a042]">1. Google AI Studio Plan</h4>
                      <Zap className="w-4 h-4 text-[#d9a042]" />
                    </div>
                    <p className="text-xs text-[#8a8399] leading-relaxed">
                      Check which models are active, token limits per minute (RPM/TPM), and plan tier (Free vs Pay-as-you-go).
                    </p>
                  </div>
                  <a
                    href="https://aistudio.google.com/app/plan_information"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#271f37] hover:bg-[#342a49] text-xs font-semibold text-[#ece8de] border border-[#3e3256] transition-colors"
                  >
                    <span>Open AI Studio Plan Info</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#d9a042]" />
                  </a>
                </div>

                {/* GCP Billing Reports */}
                <div className="p-4 rounded-xl bg-[#171223] border border-[#2f2541] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#d9a042]">2. GCP Billing Reports</h4>
                      <DollarSign className="w-4 h-4 text-[#22c55e]" />
                    </div>
                    <p className="text-xs text-[#8a8399] leading-relaxed">
                      View itemized daily invoices. Filter by service: <strong>Generative Language API</strong> to see exact cost.
                    </p>
                  </div>
                  <a
                    href="https://console.cloud.google.com/billing"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#271f37] hover:bg-[#342a49] text-xs font-semibold text-[#ece8de] border border-[#3e3256] transition-colors"
                  >
                    <span>Open GCP Billing Console</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#22c55e]" />
                  </a>
                </div>
              </div>

              {/* How to set hard billing cap in GCP */}
              <div className="p-4 rounded-xl bg-[#120f1c] border border-[#2b223a] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#ece8de] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#f59e0b]" />
                  How to Set a Hard Spending Budget in Google Cloud
                </h4>
                <ol className="text-xs text-[#8a8399] space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Open <strong>Google Cloud Console → Billing → Budgets & alerts</strong>.
                  </li>
                  <li>
                    Click <strong>Create Budget</strong>, specify your project, and set a monthly target (e.g. <strong>$30.00 USD</strong> or ₹2,500 INR).
                  </li>
                  <li>
                    Under <strong>Actions</strong>, enable email alerts at 50%, 80%, and 100% threshold.
                  </li>
                  <li>
                    (Optional) In <strong>APIs & Services → Quotas</strong>, set a daily request cap on <code className="text-[#d9a042]">generativelanguage.googleapis.com</code> so Google's servers reject calls above your limit.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE CALL LEDGER */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#8a8399]">
                <span>Showing recent API transactions recorded on this server:</span>
                <span>{metrics?.recentCalls?.length || 0} recent calls</span>
              </div>

              <div className="rounded-xl border border-[#2d243c] overflow-hidden bg-[#151120] max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1e172d] border-b border-[#2d243c] text-[#8a8399] font-medium sticky top-0">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Feature</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Cost (USD)</th>
                      <th className="p-3">Cost (INR)</th>
                      <th className="p-3">Key Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#261e33] text-[#cfc7de]">
                    {metrics?.recentCalls && metrics.recentCalls.length > 0 ? (
                      metrics.recentCalls.map((call) => (
                        <tr key={call.id} className="hover:bg-[#1a1426] transition-colors">
                          <td className="p-3 text-[#8a8399] whitespace-nowrap flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-3 font-medium text-[#ece8de] capitalize">
                            {call.feature.replace('_', ' ')}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-[#907aa9]">
                            {call.model}
                          </td>
                          <td className="p-3">
                            {call.costUsd > 0 ? `$${call.costUsd.toFixed(4)}` : '$0.00'}
                          </td>
                          <td className="p-3">
                            {call.costInr > 0 ? `₹${call.costInr.toFixed(2)}` : '₹0.00'}
                          </td>
                          <td className="p-3">
                            {call.isPersonalKey ? (
                              <span className="text-[10px] bg-[#1a3325] text-[#4ade80] border border-[#28523c] px-2 py-0.5 rounded-full font-semibold">
                                User BYOK ($0)
                              </span>
                            ) : (
                              <span className="text-[10px] bg-[#341d28] text-[#f472b6] border border-[#52293e] px-2 py-0.5 rounded-full font-semibold">
                                Server Key
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-[#6b6478]">
                          No API calls recorded in this session yet. Generate scenes or characters to see live usage.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2d243b] bg-[#14101e] flex items-center justify-between text-xs text-[#8a8399] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span>Exchange Benchmark: $1 USD = ₹{fin?.usdToInrRate || 86} INR</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#271f37] hover:bg-[#342a49] text-xs font-semibold text-[#ece8de] border border-[#3e3256] transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
