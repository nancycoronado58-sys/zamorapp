import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ size = 24, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin text-primary-600', className)} />;
}

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Spinner size={32} />
      {label && <p className="text-sm text-neutral-500">{label}</p>}
    </div>
  );
}
