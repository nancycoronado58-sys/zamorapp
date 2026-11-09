import { useEffect, useState, type FormEvent } from 'react';
import { Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface BlockedTerm {
  id: string;
  term: string;
  created_at: string;
}

export function BlockedTermsManager() {
  const { language } = useApp();
  const { toast } = useToast();
  const [terms, setTerms] = useState<BlockedTerm[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: loadError } = await supabase
        .from('moderation_blocked_terms')
        .select('id, term, created_at')
        .order('term');
      if (loadError || !Array.isArray(data)) {
        setError(language === 'es' ? 'No se pudo cargar la lista.' : 'The list could not be loaded.');
      } else {
        setTerms(data as BlockedTerm[]);
      }
      setLoading(false);
    })();
  }, [language]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const term = draft.trim().toLowerCase();
    if (!term) return;
    if (terms.some((item) => item.term === term)) {
      setError(language === 'es' ? 'Ese término ya está en la lista.' : 'That term is already in the list.');
      return;
    }
    setSaving(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('moderation_blocked_terms')
      .insert({ term })
      .select('id, term, created_at')
      .maybeSingle();
    setSaving(false);
    if (insertError || !data) {
      setError(language === 'es' ? 'No se pudo agregar el término.' : 'The term could not be added.');
      return;
    }
    setTerms((prev) => [...prev, data as BlockedTerm].sort((a, b) => a.term.localeCompare(b.term)));
    setDraft('');
    toast(language === 'es' ? 'Término agregado' : 'Term added', 'success');
  };

  const removeTerm = async (term: BlockedTerm) => {
    const { error: deleteError } = await supabase.from('moderation_blocked_terms').delete().eq('id', term.id);
    if (deleteError) {
      toast(language === 'es' ? 'No se pudo eliminar el término' : 'The term could not be removed', 'error');
      return;
    }
    setTerms((prev) => prev.filter((item) => item.id !== term.id));
    toast(language === 'es' ? 'Término eliminado' : 'Term removed', 'info');
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-neutral-900">{language === 'es' ? 'Lista de productos prohibidos' : 'Prohibited products list'}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {language === 'es'
            ? 'Un producto cuyo nombre o descripción contenga alguno de estos términos se rechaza automáticamente. No distingue mayúsculas.'
            : 'A product whose name or description contains any of these terms is rejected automatically. Case is ignored.'}
        </p>
      </div>

      <form onSubmit={handleAdd} className="card p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={80}
          placeholder={language === 'es' ? 'Ej. arma de fuego' : 'e.g. firearm'}
          className="input flex-1"
        />
        <button type="submit" disabled={saving || !draft.trim()} className="btn-primary">
          {saving ? <Spinner size={15} /> : <Plus size={15} />} {language === 'es' ? 'Agregar término' : 'Add term'}
        </button>
      </form>

      {error && <p className="text-sm text-error-600">{error}</p>}

      {terms.length === 0 ? <EmptyState icon={ShieldAlert} title={language === 'es' ? 'La lista está vacía' : 'The list is empty'} /> : (
        <div className="flex flex-wrap gap-2">
          {terms.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-error-50 px-3 py-1 text-sm text-error-700">
              {item.term}
              <button type="button" onClick={() => void removeTerm(item)} aria-label={language === 'es' ? 'Eliminar término' : 'Remove term'} className="text-error-600 hover:text-error-800">
                <Trash2 size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
