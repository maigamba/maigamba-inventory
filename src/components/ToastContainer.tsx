import React from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useInventory();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed bottom-5 right-5 z-50 flex w-full max-w-md flex-col gap-2.5 px-4 pointer-events-none sm:px-0"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${isSuccess
              ? 'border-emerald-500/50 bg-slate-950 text-white'
              : isError
                ? 'border-rose-500/50 bg-slate-950 text-white'
                : isWarning
                  ? 'border-amber-500/50 bg-slate-950 text-white'
                  : 'border-slate-700 bg-slate-950 text-white'
              }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
              {isError && (
                <AlertCircle className="h-4 w-4 text-rose-400" />
              )}
              {isWarning && (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
              {!isSuccess && !isError && !isWarning && (
                <Info className="h-4 w-4 text-sky-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {toast.title && (
                <h4 className="font-serif text-[10px] font-semibold uppercase tracking-wider text-white">
                  {toast.title}
                </h4>
              )}

              <p className="break-words text-xs font-light leading-relaxed text-white/80">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded-lg p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
