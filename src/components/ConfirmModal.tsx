import { AlertTriangle, Download, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  showExportButton?: boolean;
  onExport?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'danger',
  showExportButton,
  onExport,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a1626] border border-[#2f2a3a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-[#ece8de]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2a3a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3a2830] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
            </div>
            <h3 className="font-semibold text-sm text-[#ece8de]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            type="button"
            className="p-1 rounded-lg text-[#6b6579] hover:text-[#ece8de] hover:bg-[#231e2e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 text-xs text-[#a49db3] leading-relaxed">
          {message}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3.5 bg-[#14111d] border-t border-[#2f2a3a]">
          {showExportButton && onExport && (
            <button
              onClick={onExport}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#c9c2e0] hover:bg-[#231e2e] transition-colors mr-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export backup</span>
            </button>
          )}
          <button
            onClick={onCancel}
            type="button"
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#c9c2e0] bg-[#231e2e] hover:bg-[#2c2637] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            type="button"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                : 'bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
