import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Bike, Car, MapPin } from 'lucide-react';
import type { Dropper, Profile } from '@/types/db';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StarRating } from '@/components/ui/StarRating';
import { getInitials } from '@/lib/utils';

const vehicleIcon = { bike: Bike, motorcycle: Bike, car: Car };

export function DroppersPage() {
  const { language } = useApp();
  const [droppers, setDroppers] = useState<(Dropper & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('droppers')
      .select('*, profile:profiles(*)')
      .order('is_online', { ascending: false })
      .order('rating', { ascending: false })
      .then(({ data }) => {
        setDroppers((data as (Dropper & { profile?: Profile })[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">
          {language === 'es' ? 'Repartidores Locales' : 'Local Droppers'}
        </h1>
        <p className="text-sm text-neutral-500">
          {language === 'es' ? 'Conoce a los droppers que entregan en tu zona' : 'Meet the droppers delivering in your area'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : droppers.length === 0 ? (
        <EmptyState icon={Bike} title={language === 'es' ? 'No hay repartidores registrados aún' : 'No droppers registered yet'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {droppers.map((d) => {
            const Icon = vehicleIcon[d.vehicle_type] || Bike;
            return (
              <div key={d.id} className="card p-5 hover:shadow-card-hover transition">
                <div className="flex items-center gap-3 mb-3">
                  {d.profile?.avatar_url ? (
                    <img src={d.profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white font-bold">
                      {getInitials(d.profile?.display_name || 'D')}
                    </span>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">{d.profile?.display_name}</p>
                    <span className={`badge ${d.is_online ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${d.is_online ? 'bg-success-500 animate-pulse' : 'bg-neutral-400'}`} />
                      {d.is_online ? (language === 'es' ? 'En línea' : 'Online') : (language === 'es' ? 'Desconectado' : 'Offline')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-600 mb-3">
                  <span className="flex items-center gap-1.5">
                    <Icon size={16} className="text-primary-600" />
                    {language === 'es' ? d.vehicle_type : d.vehicle_type}
                  </span>
                  {d.vehicle_plate && <span className="text-xs badge bg-neutral-100 text-neutral-600">{d.vehicle_plate}</span>}
                </div>
                {d.area && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
                    <MapPin size={12} /> {d.area}
                  </div>
                )}
                <StarRating rating={d.rating} size={14} showValue />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
