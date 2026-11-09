import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { useApp } from '@/context/AppContext';
import { formatPrice, discountedPrice } from '@/lib/currency';

export function CartDrawer() {
  const { items, isOpen, close, setQty, remove, subtotal, clear } = useCart();
  const { currency, t, language } = useApp();
  const navigate = useNavigate();

  const deliveryFee = items.length > 0 ? 5 : 0;
  const tax = subtotal * 0.18;
  const total = subtotal + deliveryFee + tax;

  const handleCheckout = () => {
    close();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-card-hover flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary-600" />
                <h2 className="text-lg font-bold text-neutral-900">{t('cart.title')}</h2>
              </div>
              <button onClick={close} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
                <X size={20} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="rounded-2xl bg-neutral-100 p-6">
                  <ShoppingCart size={32} className="text-neutral-400" />
                </div>
                <p className="text-neutral-500">{t('cart.empty')}</p>
                <button onClick={close} className="btn-primary">
                  {t('cart.continue')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
                  {items.map((item) => {
                    const final = discountedPrice(item.product.price, item.product.discount_pct);
                    return (
                      <div key={item.product.id} className="flex gap-3 rounded-xl border border-neutral-100 p-3">
                        <img
                          src={item.product.image_url || 'https://placehold.co/80x80?text=Z'}
                          alt={item.product.name}
                          className="h-16 w-16 rounded-lg object-cover bg-neutral-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 truncate">{item.product.name}</p>
                          <p className="text-xs text-neutral-500">{formatPrice(final, currency)}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => setQty(item.product.id, item.qty - 1)}
                              className="rounded-md p-1 hover:bg-neutral-100"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                            <button
                              onClick={() => setQty(item.product.id, item.qty + 1)}
                              className="rounded-md p-1 hover:bg-neutral-100"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              onClick={() => remove(item.product.id)}
                              className="ml-auto rounded-md p-1 text-error-500 hover:bg-error-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-neutral-900">{formatPrice(final * item.qty, currency)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={clear} className="text-xs text-neutral-400 hover:text-error-500 transition">
                    {language === 'es' ? 'Vaciar carrito' : 'Clear cart'}
                  </button>
                </div>

                <div className="border-t border-neutral-100 px-5 py-4 space-y-2 bg-neutral-50">
                  <Row label={t('cart.subtotal')} value={formatPrice(subtotal, currency)} />
                  <Row label={t('cart.tax')} value={formatPrice(tax, currency)} />
                  <Row label={t('cart.delivery')} value={formatPrice(deliveryFee, currency)} />
                  <div className="h-px bg-neutral-200 my-1" />
                  <Row label={t('cart.total')} value={formatPrice(total, currency)} bold />
                  <button onClick={handleCheckout} className="btn-primary w-full mt-2">
                    {t('cart.checkout')}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'text-base font-bold text-neutral-900' : 'text-sm text-neutral-600'}>{label}</span>
      <span className={bold ? 'text-base font-bold text-neutral-900' : 'text-sm font-semibold text-neutral-800'}>{value}</span>
    </div>
  );
}
