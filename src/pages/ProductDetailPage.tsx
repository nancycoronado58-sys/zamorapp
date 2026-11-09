import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Package, ShoppingCart, Store } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import type { Product } from '@/types/db';
import { ProductCard } from '@/components/cards/ProductCard';
import { ReviewSection } from '@/components/forms/ReviewSection';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { discountedPrice, formatPrice } from '@/lib/currency';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language, currency } = useApp();
  const { add } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, business:businesses(*)')
        .eq('id', id)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        setProduct(null);
        setRelated([]);
        setLoading(false);
        return;
      }

      const current = data as Product;
      setProduct(current);

      const [sameCategory, sameBusiness] = await Promise.all([
        current.category_id
          ? supabase
              .from('products')
              .select('*, business:businesses(*)')
              .eq('category_id', current.category_id)
              .neq('id', current.id)
              .limit(8)
          : Promise.resolve({ data: [] as Product[] }),
        supabase
          .from('products')
          .select('*, business:businesses(*)')
          .eq('business_id', current.business_id)
          .neq('id', current.id)
          .limit(8),
      ]);

      if (!active) return;
      const categoryItems = (sameCategory.data as Product[]) || [];
      const businessItems = (sameBusiness.data as Product[]) || [];
      const unique = new Map<string, Product>();
      [...businessItems, ...categoryItems].forEach((item) => unique.set(item.id, item));
      setRelated([...unique.values()].slice(0, 8));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={32} /></div>;

  if (!product) {
    return (
      <div className="container-app py-20">
        <EmptyState
          icon={Package}
          title={language === 'es' ? 'Producto no encontrado' : 'Product not found'}
          action={<Link to="/stores" className="btn-primary">{language === 'es' ? 'Volver a tiendas' : 'Back to stores'}</Link>}
        />
      </div>
    );
  }

  const finalPrice = discountedPrice(product.price, product.discount_pct);
  const business = product.business;
  const handleAdd = () => {
    add(product, 1);
    toast(language === 'es' ? 'Producto añadido al carrito' : 'Product added to cart', 'success');
  };

  return (
    <div className="container-app py-8 md:py-10">
      <Link to={business ? `/business/${business.slug}` : '/stores'} className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-700 mb-6">
        <ArrowLeft size={16} /> {language === 'es' ? 'Volver a la tienda' : 'Back to store'}
      </Link>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="card overflow-hidden bg-neutral-100">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full aspect-square object-cover" />
          ) : (
            <div className="aspect-square flex items-center justify-center text-neutral-300"><Package size={72} /></div>
          )}
        </div>

        <div className="lg:pt-4">
          {business && (
            <Link to={`/business/${business.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline mb-3">
              <Store size={16} /> {business.name}
            </Link>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-950">{product.name}</h1>
          <div className="flex items-center gap-3 mt-4">
            <StarRating rating={product.score} count={product.reviews_count} showValue size={17} />
            <span className="text-sm text-neutral-500">{language === 'es' ? 'Opiniones verificadas' : 'Verified reviews'}</span>
          </div>

          <div className="mt-6 flex items-end gap-3">
            {product.discount_pct > 0 && <span className="text-base text-neutral-400 line-through">{formatPrice(product.price, currency)}</span>}
            <span className="text-3xl font-bold text-primary-700">{formatPrice(finalPrice, currency)}</span>
            {product.discount_pct > 0 && <span className="badge bg-error-100 text-error-700">-{product.discount_pct}%</span>}
          </div>

          <p className="mt-6 text-neutral-700 leading-7 whitespace-pre-line">{product.description || (language === 'es' ? 'Producto disponible en Zamorapp.' : 'Product available on Zamorapp.')}</p>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <Check size={17} className={product.stock > 0 ? 'text-success-600' : 'text-error-600'} />
            <span className={product.stock > 0 ? 'text-success-700' : 'text-error-700'}>
              {product.stock > 0 ? `${product.stock} ${language === 'es' ? 'disponibles' : 'available'}` : (language === 'es' ? 'Agotado' : 'Out of stock')}
            </span>
          </div>

          <button onClick={handleAdd} disabled={product.stock <= 0} className="btn-primary w-full sm:w-auto mt-7 px-7">
            <ShoppingCart size={18} /> {language === 'es' ? 'Agregar al carrito' : 'Add to cart'}
          </button>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide">{language === 'es' ? 'También puede interesarte' : 'You may also like'}</p>
              <h2 className="text-2xl font-bold text-neutral-950">{language === 'es' ? 'Productos relacionados' : 'Related products'}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}

      <section className="mt-14 max-w-3xl">
        <ReviewSection type="product" id={product.id} />
      </section>
    </div>
  );
}
