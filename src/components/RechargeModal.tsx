import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  CreditPack,
  fetchRazorpayConfig,
  initiateRazorpayRecharge,
  RazorpayConfigResponse,
} from '../utils/creditManager';
import { trackPurchase } from '../utils/metaPixel';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onCreditsUpdated: (newBalance: number) => void;
  reasonMessage?: string;
}

export function RechargeModal({
  isOpen,
  onClose,
  currentCredits,
  onCreditsUpdated,
  reasonMessage,
}: RechargeModalProps) {
  const [config, setConfig] = useState<RazorpayConfigResponse | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string>('pack_100_50');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      fetchRazorpayConfig().then((cfg) => {
        if (cfg) setConfig(cfg);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const packs: CreditPack[] = config?.packs || [
    {
      id: 'pack_100_50',
      name: 'Starter Creator',
      amountInr: 100,
      credits: 50,
      description: '50 AI generation credits (~5 complete storyboards)',
      popular: true,
      badge: 'Most Popular',
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

  const selectedPack = packs.find((p) => p.id === selectedPackId) || packs[0];

  const handlePay = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await initiateRazorpayRecharge({
        packId: selectedPack.id,
        onSuccess: (newBalance, creditsAdded) => {
          setIsProcessing(false);
          setSuccessMsg(`🎉 Recharge Successful! Added +${creditsAdded} credits.`);
          onCreditsUpdated(newBalance);
          trackPurchase({
            content_name: `Credit Recharge - ${selectedPack.name}`,
            content_type: 'product',
            value: selectedPack.amountInr,
            currency: 'INR',
          });
          setTimeout(() => {
            onClose();
          }, 1800);
        },
        onError: (err) => {
          setIsProcessing(false);
          setErrorMsg(err);
        },
        onDismiss: () => {
          setIsProcessing(false);
        },
      });
    } catch (e: any) {
      setIsProcessing(false);
      setErrorMsg(e?.message || 'Payment could not be started.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-[#1b1822] border border-[#2f2a3a] shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f2a3a] bg-[#17141f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d9a042]/15 border border-[#d9a042]/30 flex items-center justify-center text-[#d9a042]">
              <Zap className="w-4 h-4 fill-[#d9a042]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#ece8de]">Recharge AI Credits</h2>
              <p className="text-xs text-[#8a8399]">
                Current Balance:{' '}
                <span className={`font-semibold ${currentCredits > 0 ? 'text-[#d9a042]' : 'text-rose-400'}`}>
                  {currentCredits} Credits
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8a8399] hover:text-[#ece8de] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason banner if triggered by insufficient balance */}
        {reasonMessage && (
          <div className="px-6 pt-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#d9a042] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">Recharge Required: </span>
                {reasonMessage}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#b4adc4] leading-relaxed">
            1 Credit generates 1 full scene or character visual with zero prompt setup. Recharge instantly using{' '}
            <strong className="text-[#ece8de]">UPI (Google Pay, PhonePe, Paytm), Cards, or NetBanking</strong> via Razorpay.
          </p>

          {/* Pricing Options */}
          <div className="grid gap-2.5">
            {packs.map((pack) => {
              const isSelected = pack.id === selectedPackId;
              return (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`relative p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#251f33] border-[#d9a042] shadow-md shadow-[#d9a042]/10 ring-1 ring-[#d9a042]'
                      : 'bg-[#14101c] border-[#262033] hover:border-[#3d364f]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#ece8de]">{pack.name}</span>
                      {pack.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase rounded-full bg-[#d9a042]/15 text-[#d9a042] border border-[#d9a042]/30">
                          {pack.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8a8399]">{pack.description}</p>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <div className="text-base font-bold text-[#d9a042]">₹{pack.amountInr}</div>
                    <div className="text-[11px] text-[#9b93af]">{pack.credits} Credits</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live / Sandbox Notice */}
          {config?.test_mode && (
            <div className="p-2.5 rounded-lg bg-[#14101c] border border-[#2f2a3a] text-[11px] text-[#8a8399] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#d9a042]" />
                <span>Test Simulator Active (instant simulation without gateway keys)</span>
              </span>
              <span className="text-[10px] text-[#6b6579]">Ready for live keys</span>
            </div>
          )}

          {/* Status feedback */}
          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMsg}</span>
            </p>
          )}

          {/* Payment action button */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-[#1b1408] bg-gradient-to-r from-[#d9a042] via-[#e2af58] to-[#d9a042] hover:brightness-105 active:scale-[0.99] transition-all shadow-lg shadow-[#d9a042]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1b1408]" />
                  <span>Opening Razorpay Secure Checkout...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-[#1b1408]" />
                  <span>
                    Pay ₹{selectedPack.amountInr} for {selectedPack.credits} Credits via Razorpay
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-[#6b6579] px-1">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>256-Bit SSL Encrypted by Razorpay</span>
              </span>
              <span>UPI · Cards · NetBanking</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[#2f2a3a] bg-[#14101c] flex items-center justify-between text-xs text-[#8a8399]">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Unused credits never expire</span>
          </span>
          <span className="text-[11px] text-[#8a8399] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#d9a042]" />
            <span>Instant Auto-Credit</span>
          </span>
        </div>
      </div>
    </div>
  );
}
