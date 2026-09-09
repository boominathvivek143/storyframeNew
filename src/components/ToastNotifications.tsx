import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastAlert } from '../types';

const ICONS: Record<ToastAlert['type'], React.ReactNode> = {
  error: <AlertCircle className="w-4 h-4 text-red-400" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-400" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  info: <Info className="w-4 h-4 text-teal-400" />,
};

const BORDERS: Record<ToastAlert['type'], string> = {
  error: 'border-red-500/40',
  warning: 'border-amber-500/40',
  success: 'border-emerald-500/40',
  info: 'border-teal-500/40',
};

export function ToastNotifications({ toasts, onDismiss }: { toasts: ToastAlert[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
      {toasts.map((t) => (
        <div key={t.id} className={`animate-fade-in bg-[#1b1822] border ${BORDERS[t.type]} rounded-xl shadow-lg shadow-black/40 p-3 flex gap-2.5`}>
          <div className="pt-0.5 shrink-0">{ICONS[t.type]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#ece8de]">{t.title}</div>
            <div className="text-xs text-[#9d97ab] mt-0.5">{t.message}</div>
          </div>
          <button onClick={() => onDismiss(t.id)} className="shrink-0 text-[#6b6579] hover:text-[#ece8de] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
