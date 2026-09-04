import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colors = { success: 'text-green-500', error: 'text-red-500', info: 'text-[#6600FF]' };
  const Icon = icons[toast.type];

  return (
    <div className={`glass-surface rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-90'}`}>
      <Icon className={`w-5 h-5 ${colors[toast.type]} shrink-0 animate-pop`} />
      <p className="text-sm font-medium text-[#1A1A2E] flex-1">{toast.message}</p>
      <button onClick={() => onClose(toast.id)} className="text-gray-400"><X className="w-4 h-4" /></button>
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
