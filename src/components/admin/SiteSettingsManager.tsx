import { useEffect, useState, type FormEvent } from 'react';
import { Check, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import type { SiteSettingKey, SiteSettings } from '@/lib/siteSettings';
import { cn } from '@/lib/utils';

interface SettingRow {
  key: SiteSettingKey;
  value: string;
  label: string;
  group_name: 'contact' | 'system';
}

const GROUPS: { id: SettingRow['group_name']; title: { es: string; en: string }; description: { es: string; en: string } }[] = [
  {
    id: 'contact',
    title: { es: 'Datos de contacto', en: 'Contact details' },
    description: { es: 'Se muestran en el pie de página, el chat y las fichas de negocios.', en: 'Shown in the footer, chat and business pages.' },
  },
  {
    id: 'system',
    title: { es: 'Parámetros del sistema', en: 'System parameters' },
    description: { es: 'Controlan el comportamiento automático de la plataforma.', en: 'Control the automatic behavior of the platform.' },
  },
];

export function SiteSettingsManager() {
  const { language, refreshSettings } = useApp();
  const { toast } = useToast();
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [values, setValues] = useState<Partial<SiteSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: loadError } = await supabase
        .from('site_settings')
        .select('key, value, label, group_name')
        .order('group_name')
        .order('key');
      if (loadError || !Array.isArray(data)) {
        setError(language === 'es' ? 'No se pudo cargar la configuración.' : 'Settings could not be loaded.');
      } else {
        const loaded = data as SettingRow[];
        setRows(loaded);
        setValues(Object.fromEntries(loaded.map((row) => [row.key, row.value])));
      }
      setLoading(false);
    })();
  }, [language]);

  const updateValue = (key: SiteSettingKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const changed = rows.filter((row) => (values[row.key] ?? '') !== row.value);
    if (changed.length === 0) {
      toast(language === 'es' ? 'No hay cambios por guardar' : 'Nothing to save', 'info');
      return;
    }
    setSaving(true);
    setError('');
    const results = await Promise.all(
      changed.map((row) => supabase.from('site_settings').update({ value: (values[row.key] ?? '').trim(), updated_at: new Date().toISOString() }).eq('key', row.key).select('key').maybeSingle()),
    );
    setSaving(false);
    if (results.some((result) => result.error || !result.data)) {
      setError(language === 'es' ? 'Algunos cambios no se pudieron guardar. Revisa los datos e inténtalo de nuevo.' : 'Some changes could not be saved. Check the values and try again.');
      return;
    }
    await refreshSettings();
    const savedRows = rows.map((row) => ({ ...row, value: (values[row.key] ?? '').trim() }));
    setRows(savedRows);
    setValues(Object.fromEntries(savedRows.map((row) => [row.key, row.value])));
    toast(language === 'es' ? 'Configuración guardada' : 'Settings saved', 'success');
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-bold text-neutral-900">{language === 'es' ? 'Configuración' : 'Settings'}</h2>
        <p className="mt-1 text-sm text-neutral-500">{language === 'es' ? 'Cambia los datos de contacto y los parámetros de la plataforma sin tocar el código.' : 'Change contact details and platform parameters without touching the code.'}</p>
      </div>

      {GROUPS.map((group) => {
        const groupRows = rows.filter((row) => row.group_name === group.id);
        return (
          <section key={group.id} className="card p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-neutral-900">{group.title[language]}</h3>
              <p className="text-xs text-neutral-500">{group.description[language]}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupRows.map((row) => (
                <SettingField key={row.key} row={row} value={values[row.key] ?? ''} onChange={(value) => updateValue(row.key, value)} language={language} />
              ))}
            </div>
          </section>
        );
      })}

      {error && <p className="text-sm text-error-600">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Spinner size={15} /> : <Save size={15} />}
          {saving ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar configuración' : 'Save settings')}
        </button>
      </div>
    </form>
  );
}

function SettingField({ row, value, onChange, language }: { row: SettingRow; value: string; onChange: (value: string) => void; language: 'es' | 'en' }) {
  if (row.key === 'auto_publish_products') {
    const enabled = value === 'true';
    return (
      <div className="md:col-span-2 flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{language === 'es' ? 'Publicar productos automáticamente' : 'Publish products automatically'}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {language === 'es'
              ? 'Si está activo, los productos que no contienen términos prohibidos se publican al instante. Si está apagado, quedan pendientes de tu revisión.'
              : 'When on, products without prohibited terms are published instantly. When off, they wait for your review.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(enabled ? 'false' : 'true')}
          className={cn('relative h-6 w-11 shrink-0 rounded-full transition', enabled ? 'bg-success-600' : 'bg-neutral-300')}
        >
          <span className={cn('absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform', enabled && 'translate-x-5')}>
            {enabled && <Check size={12} className="text-success-600" />}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="label">{row.label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} maxLength={200} className="input" />
    </div>
  );
}
