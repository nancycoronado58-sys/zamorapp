import { useEffect, useMemo, useState } from 'react';
import { Check, Package, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ProductEditModal } from '@/components/admin/ProductEditModal';
import { formatPrice } from '@/lib/currency';
import type { Product } from '@/types/db';
import { cn } from '@/lib/utils';

type ModerationStatus = Product['moderation_status'];
type Filter = 'all' | ModerationStatus;

const FILTERS: Filter[] = ['all', 'pending', 'approved', 'rejected'];

const STATUS_LABEL: Record<ModerationStatus, { es: string; en: string }> = {
  pending: { es: 'Pendiente', en: 'Pending' },
  approved: { es: 'Publicado', en: 'Published' },
  rejected: { es: 'Rechazado', en: 'Rejected' },
};

const STATUS_BADGE: Record<ModerationStatus, string> = {
  pending: 'bg-warning-100 text-warning-700',
  approved: 'bg-success-100 text-success-700',
  rejected: 'bg-error-100 text-error-700',
};

export function ProductsModerationManager() {
  const { language, currency } = useApp();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: loadError } = await supabase
        .from('products')
        .select('*, business:businesses(name)')
        .order('created_at', { ascending: false });
      if (loadError || !Array.isArray(data)) {
        setError(language === 'es' ? 'No se pudieron cargar los productos.' : 'Products could not be loaded.');
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    })();
  }, [language]);

  const counts = useMemo(() => ({
    all: products.length,
    pending: products.filter((p) => p.moderation_status === 'pending').length,
    approved: products.filter((p) => p.moderation_status === 'approved').length,
    rejected: products.filter((p) => p.moderation_status === 'rejected').length,
  }), [products]);

  const visible = filter === 'all' ? products : products.filter((p) => p.moderation_status === filter);

  const replaceProduct = (updated: Product) => {
    setProducts((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  };

  const setModeration = async (product: Product, status: ModerationStatus) => {
    const note = status === 'rejected' ? 'Rechazado por un administrador' : status === 'approved' ? '' : product.moderation_note;
    const { data, error: updateError } = await supabase
      .from('products')
      .update({ moderation_status: status, moderation_note: note })
      .eq('id', product.id)
      .select('moderation_status, moderation_note')
      .maybeSingle();
    if (updateError || !data) {
      toast(language === 'es' ? 'No se pudo cambiar el estado' : 'Status could not be changed', 'error');
      return;
    }
    replaceProduct({ ...product, moderation_status: status, moderation_note: note });
    toast(language === 'es' ? `Producto ${STATUS_LABEL[status].es.toLowerCase()}` : `Product ${STATUS_LABEL[status].en.toLowerCase()}`, 'success');
  };

  const toggleFeatured = async (product: Product) => {
    const next = !product.is_flash_offer;
    const { error: updateError } = await supabase.from('products').update({ is_flash_offer: next }).eq('id', product.id);
    if (updateError) {
      toast(language === 'es' ? 'No se pudo actualizar el producto' : 'Product could not be updated', 'error');
      return;
    }
    replaceProduct({ ...product, is_flash_offer: next });
    toast(language === 'es' ? (next ? 'Producto destacado' : 'Producto retirado de destacados') : (next ? 'Product featured' : 'Product removed from featured'), 'success');
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(language === 'es' ? `¿Eliminar "${product.name}" de forma permanente?` : `Permanently delete "${product.name}"?`)) return;
    const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id);
    if (deleteError) {
      toast(language === 'es' ? 'No se pudo eliminar el producto' : 'The product could not be deleted', 'error');
      return;
    }
    setProducts((prev) => prev.filter((item) => item.id !== product.id));
    toast(language === 'es' ? 'Producto eliminado' : 'Product deleted', 'info');
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <h2 className="font-bold text-neutral-900 mb-1">{language === 'es' ? 'Productos' : 'Products'}</h2>
      <p className="text-sm text-neutral-500 mb-4">
        {language === 'es'
          ? 'Revisa, edita y elimina productos. Los que no pasan el filtro de términos prohibidos se publican solos.'
          : 'Review, edit and delete products. Items that fail the prohibited-terms filter are published automatically.'}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn('rounded-full px-3 py-1 text-xs font-semibold transition', filter === item ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
          >
            {item === 'all' ? (language === 'es' ? 'Todos' : 'All') : STATUS_LABEL[item][language]} ({counts[item]})
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-error-600 mb-3">{error}</p>}

      {visible.length === 0 ? <EmptyState icon={Package} title={language === 'es' ? 'No hay productos en esta lista' : 'No products in this list'} /> : (
        <div className="space-y-2">
          {visible.map((product) => (
            <div key={product.id} className="card p-3 flex items-center gap-3 flex-wrap">
              <img src={product.image_url} alt="" className="h-14 w-14 rounded-lg object-cover bg-neutral-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{product.name}</p>
                <p className="text-xs text-neutral-500">{product.business?.name || (language === 'es' ? 'Negocio' : 'Business')} · {formatPrice(product.price, currency)}</p>
                {product.moderation_note && <p className="text-xs text-error-600 mt-0.5">{product.moderation_note}</p>}
              </div>
              <span className={cn('badge', STATUS_BADGE[product.moderation_status])}>{STATUS_LABEL[product.moderation_status][language]}</span>
              <div className="flex items-center gap-1 flex-wrap">
                {product.moderation_status !== 'approved' && (
                  <button onClick={() => void setModeration(product, 'approved')} className="btn bg-success-600 text-white px-2 py-1 text-xs"><Check size={12} /> {language === 'es' ? 'Publicar' : 'Publish'}</button>
                )}
                {product.moderation_status !== 'rejected' && (
                  <button onClick={() => void setModeration(product, 'rejected')} className="btn bg-error-600 text-white px-2 py-1 text-xs"><X size={12} /> {language === 'es' ? 'Rechazar' : 'Reject'}</button>
                )}
                <button onClick={() => void toggleFeatured(product)} className={product.is_flash_offer ? 'btn-outline px-2 py-1 text-xs' : 'btn-primary px-2 py-1 text-xs'}>
                  {product.is_flash_offer ? (language === 'es' ? 'Quitar destacado' : 'Unfeature') : (language === 'es' ? 'Destacar' : 'Feature')}
                </button>
                <button onClick={() => setEditing(product)} className="btn-outline px-2 py-1 text-xs"><Pencil size={12} /></button>
                <button onClick={() => void deleteProduct(product)} className="btn-danger px-2 py-1 text-xs"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProductEditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replaceProduct(updated);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
