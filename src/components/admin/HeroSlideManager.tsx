import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, Image, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadMedia } from '@/lib/storage';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import type { HeroSlide } from '@/types/db';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface SlideForm {
  title_es: string;
  title_en: string;
  subtitle_es: string;
  subtitle_en: string;
  image_url: string;
  cta_label_es: string;
  cta_label_en: string;
  cta_url: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: SlideForm = {
  title_es: '',
  title_en: '',
  subtitle_es: '',
  subtitle_en: '',
  image_url: '',
  cta_label_es: 'Explorar productos',
  cta_label_en: 'Explore products',
  cta_url: '/categories',
  sort_order: '0',
  is_active: true,
};

function toForm(slide: HeroSlide): SlideForm {
  return {
    title_es: slide.title_es,
    title_en: slide.title_en,
    subtitle_es: slide.subtitle_es,
    subtitle_en: slide.subtitle_en,
    image_url: slide.image_url,
    cta_label_es: slide.cta_label_es,
    cta_label_en: slide.cta_label_en,
    cta_url: slide.cta_url,
    sort_order: String(slide.sort_order),
    is_active: slide.is_active,
  };
}

export function HeroSlideManager() {
  const { language } = useApp();
  const { toast } = useToast();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [form, setForm] = useState<SlideForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadSlides = async () => {
    const { data, error: loadError } = await supabase.from('hero_slides').select('*').order('sort_order').order('created_at');
    if (loadError) {
      setError(language === 'es' ? 'No se pudieron cargar las diapositivas.' : 'Slides could not be loaded.');
    } else {
      setSlides((data as HeroSlide[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadSlides();
  }, [language]);

  const updateField = <K extends keyof SlideForm>(field: K, value: SlideForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      updateField('image_url', await uploadMedia(file, 'hero-slides'));
      setError('');
    } catch {
      setError(language === 'es' ? 'No se pudo cargar la imagen. Usa una imagen de hasta 5 MB.' : 'The image could not be uploaded. Use an image up to 5 MB.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.image_url) {
      setError(language === 'es' ? 'Carga una imagen para publicar la diapositiva.' : 'Upload an image before publishing the slide.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      title_es: form.title_es.trim(),
      title_en: form.title_en.trim(),
      subtitle_es: form.subtitle_es.trim(),
      subtitle_en: form.subtitle_en.trim(),
      image_url: form.image_url,
      cta_label_es: form.cta_label_es.trim(),
      cta_label_en: form.cta_label_en.trim(),
      cta_url: form.cta_url.trim() || '/categories',
      sort_order: Math.max(0, Number(form.sort_order) || 0),
      is_active: form.is_active,
    };
    const query = editingId
      ? supabase.from('hero_slides').update(payload).eq('id', editingId).select().maybeSingle()
      : supabase.from('hero_slides').insert(payload).select().maybeSingle();
    const { error: saveError } = await query;
    setSaving(false);
    if (saveError) {
      setError(language === 'es' ? 'No se pudo guardar la diapositiva.' : 'The slide could not be saved.');
      return;
    }
    toast(language === 'es' ? 'Hero actualizado' : 'Hero updated', 'success');
    resetForm();
    await loadSlides();
  };

  const editSlide = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setForm(toForm(slide));
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSlide = async (id: string) => {
    if (!window.confirm(language === 'es' ? '¿Eliminar esta diapositiva?' : 'Delete this slide?')) return;
    const { error: deleteError } = await supabase.from('hero_slides').delete().eq('id', id);
    if (deleteError) {
      toast(language === 'es' ? 'No se pudo eliminar la diapositiva' : 'The slide could not be deleted', 'error');
      return;
    }
    setSlides((current) => current.filter((slide) => slide.id !== id));
    if (editingId === id) resetForm();
    toast(language === 'es' ? 'Diapositiva eliminada' : 'Slide deleted', 'info');
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-neutral-900">{language === 'es' ? 'Hero tecnológico' : 'Technology hero'}</h2>
        <p className="mt-1 text-sm text-neutral-500">{language === 'es' ? 'Publica y cambia las imágenes de la portada sin actualizar el sitio.' : 'Publish and change homepage images without updating the site.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-neutral-900">{editingId ? (language === 'es' ? 'Editar diapositiva' : 'Edit slide') : (language === 'es' ? 'Nueva diapositiva' : 'New slide')}</h3>
          {editingId && <button type="button" onClick={resetForm} className="btn-ghost px-2 py-1 text-xs"><X size={14} /> {language === 'es' ? 'Cancelar' : 'Cancel'}</button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="label">Título en español</label><input required maxLength={140} value={form.title_es} onChange={(event) => updateField('title_es', event.target.value)} className="input" /></div>
          <div><label className="label">Title in English</label><input maxLength={140} value={form.title_en} onChange={(event) => updateField('title_en', event.target.value)} className="input" /></div>
          <div><label className="label">Descripción en español</label><textarea maxLength={280} rows={3} value={form.subtitle_es} onChange={(event) => updateField('subtitle_es', event.target.value)} className="input" /></div>
          <div><label className="label">Description in English</label><textarea maxLength={280} rows={3} value={form.subtitle_en} onChange={(event) => updateField('subtitle_en', event.target.value)} className="input" /></div>
          <div><label className="label">Botón en español</label><input required maxLength={80} value={form.cta_label_es} onChange={(event) => updateField('cta_label_es', event.target.value)} className="input" /></div>
          <div><label className="label">Button in English</label><input maxLength={80} value={form.cta_label_en} onChange={(event) => updateField('cta_label_en', event.target.value)} className="input" /></div>
          <div><label className="label">Destino del botón</label><input required maxLength={500} value={form.cta_url} onChange={(event) => updateField('cta_url', event.target.value)} className="input" placeholder="/categories" /></div>
          <div><label className="label">Orden</label><input type="number" min="0" value={form.sort_order} onChange={(event) => updateField('sort_order', event.target.value)} className="input" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-outline cursor-pointer"><input type="file" accept="image/*" onChange={handleImage} className="hidden" />{uploading ? <Spinner size={15} /> : <Upload size={15} />} {form.image_url ? (language === 'es' ? 'Cambiar imagen' : 'Change image') : (language === 'es' ? 'Cargar imagen' : 'Upload image')}</label>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 accent-primary-600" /> {language === 'es' ? 'Visible en portada' : 'Visible on homepage'}</label>
          {form.image_url && <img src={form.image_url} alt="" className="h-12 w-20 rounded-lg object-cover" />}
        </div>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <button type="submit" disabled={saving || uploading} className="btn-primary"><Check size={15} /> {saving ? (language === 'es' ? 'Guardando...' : 'Saving...') : (editingId ? (language === 'es' ? 'Guardar cambios' : 'Save changes') : (language === 'es' ? 'Publicar diapositiva' : 'Publish slide'))}</button>
      </form>

      {slides.length === 0 ? <EmptyState icon={Image} title={language === 'es' ? 'Aún no hay diapositivas publicadas' : 'No slides published yet'} /> : (
        <div className="space-y-3">
          {slides.map((slide) => (
            <div key={slide.id} className="card flex flex-wrap items-center gap-3 p-3">
              <img src={slide.image_url} alt="" className="h-16 w-24 rounded-lg object-cover" />
              <div className="min-w-0 flex-1"><p className="font-semibold text-neutral-900 truncate">{slide.title_es}</p><p className="text-xs text-neutral-500">#{slide.sort_order} · {slide.is_active ? (language === 'es' ? 'Visible' : 'Visible') : (language === 'es' ? 'Oculta' : 'Hidden')}</p></div>
              <button type="button" onClick={() => editSlide(slide)} className="btn-outline px-2 py-1 text-xs"><Pencil size={13} /> {language === 'es' ? 'Editar' : 'Edit'}</button>
              <button type="button" onClick={() => void deleteSlide(slide.id)} className="btn-danger px-2 py-1 text-xs"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
