import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        id="confirmation-modal-dialog"
        className="w-full max-w-md bg-white rounded-sm shadow-2xl border border-black/20 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-black/10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm border ${isDangerous ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-[#f4f0ea] border-black/15 text-[#1a1a1a]'}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-base font-serif font-bold text-[#1a1a1a]">{title}</h3>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-black/40 hover:text-black p-1 rounded-sm hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-4">
            <p className="text-xs text-black/70 leading-relaxed font-light">{message}</p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-black/10">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-black/70 bg-[#f4f0ea] hover:bg-black/10 rounded-sm transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-[10px] uppercase tracking-wider font-semibold rounded-sm transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2 ${
                isDangerous
                  ? 'bg-rose-800 hover:bg-rose-900 text-white'
                  : 'bg-[#1a1a1a] hover:bg-black text-[#fcfaf7]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
