import { Link } from 'react-router-dom';
import { MapPin, Star, BadgeCheck } from 'lucide-react';
import type { Business } from '@/types/db';
import { useApp } from '@/context/AppContext';
import { StarRating } from '@/components/ui/StarRating';

interface BusinessCardProps {
  business: Business;
}

export function BusinessCard({ business }: BusinessCardProps) {
  const { language, t } = useApp();

  return (
    <Link
      to={`/business/${business.slug}`}
      className="group card overflow-hidden hover:shadow-card-hover transition flex flex-col"
    >
      <div className="relative h-40 overflow-hidden bg-neutral-100">
        {business.cover_url ? (
          <img
            src={business.cover_url}
            alt={business.name}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-50 text-primary-200">
            <Star size={48} />
          </div>
        )}
        {business.is_featured && (
          <span className="absolute top-2 right-2 badge bg-white/90 text-primary-700 backdrop-blur-sm">
            <BadgeCheck size={12} />
            {t('common.featured')}
          </span>
        )}
        <div className="absolute -bottom-6 left-3 h-12 w-12 rounded-xl overflow-hidden border-2 border-white bg-white shadow-sm">
          {business.logo_url ? (
            <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary-600 text-white font-bold">
              {business.name[0]}
            </div>
          )}
        </div>
      </div>
      <div className="p-3 pt-8 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-neutral-900 truncate">{business.name}</p>
        </div>
        <p className="text-xs text-primary-600 font-medium mb-1">
          {language === 'es' ? business.category?.name_es : business.category?.name_en}
        </p>
        <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{business.bio}</p>
        <div className="mt-auto flex items-center justify-between">
          <StarRating rating={business.score} count={business.reviews_count} size={12} />
          {business.address && (
            <span className="flex items-center gap-1 text-xs text-neutral-400 truncate">
              <MapPin size={11} />
              {business.address.split(',')[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
