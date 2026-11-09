import { Link } from 'react-router-dom';
import { ShoppingCart, Zap, Star } from 'lucide-react';
import type { Product } from '@/types/db';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import { formatPrice, discountedPrice } from '@/lib/currency';
import { StarRating } from '@/components/ui/StarRating';
import { useToast } from '@/components/ui/Toast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { currency, t, language } = useApp();
  const { add } = useCart();
  const { toast } = useToast();

  const finalPrice = discountedPrice(product.price, product.discount_pct);
  const hasDiscount = product.discount_pct > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product, 1);
    toast(language === 'es' ? 'Añadido al carrito' : 'Added to cart', 'success');
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group card overflow-hidden hover:shadow-card-hover transition flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <Star size={40} />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 badge bg-error-500 text-white">
            -{product.discount_pct}%
          </span>
        )}
        {product.is_flash_offer && (
          <span className="absolute top-2 right-2 badge bg-secondary-500 text-white">
            <Zap size={10} />
            {t('common.flashOffer')}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs text-neutral-500 truncate">{product.business?.name}</p>
        <p className="text-sm font-semibold text-neutral-900 line-clamp-2 mb-1">{product.name}</p>
        <div className="mt-auto">
          <StarRating rating={product.score} count={product.reviews_count} size={12} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {hasDiscount && (
                <p className="text-xs text-neutral-400 line-through">{formatPrice(product.price, currency)}</p>
              )}
              <p className="text-base font-bold text-primary-700">{formatPrice(finalPrice, currency)}</p>
            </div>
            <button
              onClick={handleAdd}
              className="rounded-lg bg-primary-600 p-2 text-white hover:bg-primary-700 transition shrink-0"
              aria-label={t('btn.addToCart')}
            >
              <ShoppingCart size={15} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
