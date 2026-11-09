import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { Product } from '@/types/db';

export function ProductEditModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: (product: Product) => void }) {
  const { language } = useApp();
  const { toast } = useToast();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [discount, setDiscount] = useState(String(product.discount_pct));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    const numericDiscount = Number(discount);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(numericStock) || numericStock < 0 || !Number.isInteger(numericDiscount) || numericDiscount < 0 || numericDiscount > 100) {
      setError(language === 'es' ? 'Revisa el nombre, precio, stock y descuento.' : 'Check the name, price, stock and discount.');
      return;
    }
    setSaving(true);
    setError('');
    const { data, error: saveError } = await supabase
      .from('products')
      .update({ name: name.trim(), description: description.trim(), price: numericPrice, stock: numericStock, discount_pct: numericDiscount })
      .eq('id', product.id)
      .select('*, business:businesses(name)')
      .maybeSingle();
    setSaving(false);
    if (saveError || !data) {
      setError(language === 'es' ? 'No se pudo guardar el producto.' : 'The product could not be saved.');
      return;
    }
    toast(language === 'es' ? 'Producto actualizado' : 'Product updated', 'success');
    onSaved(data as Product);
  };

  return (
    <Modal open onClose={onClose} title={language === 'es' ? 'Editar producto' : 'Edit product'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">{language === 'es' ? 'Nombre' : 'Name'}</label>
          <input required maxLength={140} value={name} onChange={(event) => setName(event.target.value)} className="input" />
        </div>
        <div>
          <label className="label">{language === 'es' ? 'Descripción' : 'Description'}</label>
          <textarea rows={3} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">{language === 'es' ? 'Precio' : 'Price'}</label>
            <input type="number" min="0" step="any" value={price} onChange={(event) => setPrice(event.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Stock</label>
            <input type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} className="input" />
          </div>
          <div>
            <label className="label">%</label>
            <input type="number" min="0" max="100" step="1" value={discount} onChange={(event) => setDiscount(event.target.value)} className="input" />
          </div>
        </div>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving && <Spinner size={15} />}
          {language === 'es' ? 'Guardar cambios' : 'Save changes'}
        </button>
      </form>
    </Modal>
  );
}
