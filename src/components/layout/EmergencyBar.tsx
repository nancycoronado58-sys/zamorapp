import { useEffect, useState } from 'react';
import { Phone, Siren, Flame, Ambulance, Pill } from 'lucide-react';
import type { EmergencyContact } from '@/types/db';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';

const categoryConfig = {
  police: { icon: Siren, color: 'text-accent-600 bg-accent-50' },
  fire: { icon: Flame, color: 'text-error-600 bg-error-50' },
  ambulance: { icon: Ambulance, color: 'text-error-600 bg-error-50' },
  pharmacy: { icon: Pill, color: 'text-secondary-600 bg-secondary-50' },
  health_center: { icon: Siren, color: 'text-primary-600 bg-primary-50' },
  doctor: { icon: Siren, color: 'text-primary-600 bg-primary-50' },
  clinic: { icon: Siren, color: 'text-primary-600 bg-primary-50' },
} as const;

export function EmergencyBar() {
  const { t, language } = useApp();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    supabase
      .from('emergency_contacts')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setContacts((data as EmergencyContact[]) || []));
  }, []);

  const topFour = contacts.slice(0, 4);

  if (topFour.length === 0) return null;

  return (
    <div className="bg-neutral-900 text-white">
      <div className="container-app flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-secondary-400 shrink-0">
          <Siren size={14} />
          {language === 'es' ? 'Emergencias' : 'Emergency'}
        </span>
        <div className="h-4 w-px bg-white/20 shrink-0" />
        {topFour.map((c) => {
          const cfg = categoryConfig[c.category] || categoryConfig.police;
          const Icon = cfg.icon;
          return (
            <a
              key={c.id}
              href={`tel:${c.phone}`}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs hover:bg-white/10 transition shrink-0"
            >
              <span className={`rounded-md p-1 ${cfg.color}`}>
                <Icon size={12} />
              </span>
              <span className="font-medium">{c.name}</span>
              <span className="flex items-center gap-1 text-secondary-300">
                <Phone size={10} />
                {c.phone}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
