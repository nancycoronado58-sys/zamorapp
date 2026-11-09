import { Link } from 'lucide-react';
import { Wrench, ArrowRight } from 'lucide-react';
import type { Service } from '@/types/db';
import { useApp } from '@/context/AppContext';
import { formatPrice } from '@/lib/currency';
import { StarRating } from '@/components/ui/StarRating';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { currency, t } = useApp();

  return (
    <a
      href={`/business/${service.business?.slug || ''}`}
      className="group card p-5 hover:shadow-card-hover transition flex gap-4"
    >
      <div className="h-16 w-16 rounded-xl overflow-hidden bg-accent-50 shrink-0">
        {service.image_url ? (
          <img src={service.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-accent-600">
            <Wrench size={24} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-neutral-900 truncate">{service.name}</p>
        <p className="text-xs text-neutral-500 truncate mb-1">{service.business?.name}</p>
        <p className="text-xs text-neutral-600 line-clamp-2">{service.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <StarRating rating={service.score} count={service.reviews_count} size={12} />
          <span className="text-sm font-bold text-accent-700">
            {formatPrice(service.price_from, currency)}
            {service.price_to > service.price_from && ` – ${formatPrice(service.price_to, currency)}`}
          </span>
        </div>
      </div>
    </a>
  );
}
