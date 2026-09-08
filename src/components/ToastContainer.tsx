import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useInventory();

  if (toasts.length === 0) return null;

  return (
    <div id="toast-container" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-sm shadow-xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
              isSuccess
                ? 'bg-[#1a1a1a] border-emerald-500/50 text-[#fcfaf7]'
                : isError
                ? 'bg-[#1a1a1a] border-rose-500/50 text-[#fcfaf7]'
                : isWarning
                ? 'bg-[#1a1a1a] border-amber-500/50 text-[#fcfaf7]'
                : 'bg-[#1a1a1a] border-black/20 text-[#fcfaf7]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-sky-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="text-[10px] uppercase tracking-wider font-semibold font-serif text-white">{toast.title}</h4>}
              <p className="text-xs text-white/80 leading-relaxed break-words font-light">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-sm hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
