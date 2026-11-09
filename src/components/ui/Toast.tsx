import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl bg-white shadow-card-hover border p-3.5 animate-slide-up',
              t.type === 'success' && 'border-success-200',
              t.type === 'error' && 'border-error-200',
              t.type === 'info' && 'border-accent-200'
            )}
          >
            {t.type === 'success' && <CheckCircle size={20} className="text-success-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle size={20} className="text-error-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info size={20} className="text-accent-600 shrink-0 mt-0.5" />}
            <p className="text-sm text-neutral-700 flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-neutral-400 hover:text-neutral-600">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
