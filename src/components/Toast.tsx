import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    if (toast.persistent) return;
    // If action is present, stay a bit longer (6s) to let user tap
    const duration = toast.action ? 6000 : 3000;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.action, toast.persistent, onClose]);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colors = { success: 'text-green-500', error: 'text-red-500', info: 'text-[#6600FF] dark:text-[#A855F7]' };
  const Icon = icons[toast.type];

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`rounded-2xl px-4 py-3 flex items-center gap-3 bg-white/95 dark:bg-[#1C1A29]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] shadow-lg transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-90'
      }`}
    >
      <Icon className={`w-5 h-5 ${colors[toast.type]} shrink-0 animate-pop`} />
      <p className="text-sm font-medium text-[#1A1A2E] dark:text-white flex-1">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onClose(toast.id);
          }}
          className="px-3 py-1 rounded-xl bg-[#6600FF] hover:bg-[#5500DD] text-white text-xs font-bold active:scale-95 transition-all shadow-xs"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Fermer la notification"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-0 right-0 z-[60] px-4 flex flex-col items-center gap-2 pointer-events-none">
      <div className="w-full max-w-md flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => <Toast key={toast.id} toast={toast} onClose={onClose} />)}
      </div>
    </div>
  );
}
