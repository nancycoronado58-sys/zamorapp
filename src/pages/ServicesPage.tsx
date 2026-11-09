import { useApp } from '@/context/AppContext';
import { useServices } from '@/lib/hooks';
import { ServiceCard } from '@/components/cards/ServiceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Wrench } from 'lucide-react';

export function ServicesPage() {
  const { t, language } = useApp();
  const { services, loading } = useServices();

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">
          {language === 'es' ? 'Servicios Locales y Oficios' : 'Local Services & Trades'}
        </h1>
        <p className="text-sm text-neutral-500">
          {language === 'es' ? 'Electricistas, albañiles, técnicos, limpieza y más' : 'Electricians, masons, technicians, cleaning and more'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : services.length === 0 ? (
        <EmptyState icon={Wrench} title={t('common.empty')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}
