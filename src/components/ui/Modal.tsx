import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={cn(
              'relative w-full bg-white rounded-2xl shadow-card-hover max-h-[90vh] flex flex-col',
              sizeClasses[size]
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
                <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="overflow-y-auto scrollbar-thin p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
