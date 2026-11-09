import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  count?: number;
  className?: string;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export function StarRating({
  rating,
  size = 16,
  showValue = false,
  count,
  className,
  interactive = false,
  onChange,
}: StarRatingProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(star)}
            className={cn(
              interactive && 'cursor-pointer hover:scale-110 transition-transform',
              !interactive && 'cursor-default'
            )}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={cn(
                star <= Math.round(rating)
                  ? 'fill-secondary-400 text-secondary-400'
                  : 'fill-neutral-200 text-neutral-200'
              )}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-neutral-700">
          {rating > 0 ? rating.toFixed(1) : '—'}
        </span>
      )}
      {count !== undefined && (
        <span className="text-xs text-neutral-500">({count})</span>
      )}
    </div>
  );
}
