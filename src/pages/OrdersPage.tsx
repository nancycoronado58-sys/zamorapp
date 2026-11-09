import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Package, Clock, Truck, CheckCircle, CreditCard, MapPin, ArrowLeft,
  Banknote, Smartphone, Landmark, Wallet, XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { formatPrice } from '@/lib/currency';
import type { Order, OrderItem, OrderStatus } from '@/types/db';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatRelativeDate } from '@/lib/utils';

const statusSteps: OrderStatus[] = ['pending_payment', 'payment_verified', 'preparing', 'out_for_delivery', 'delivered'];

export function OrdersPage() {
  const { t, language, profile, currency } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) || []);
        setLoading(false);
      });
  }, [profile]);

  if (!profile) {
    return <div className="container-app py-16"><EmptyState icon={Package} title={t('review.login')} action={<Link to="/signin" className="btn-primary">{t('nav.signIn')}</Link>} /></div>;
  }
  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (orders.length === 0) return <div className="container-app py-16"><EmptyState icon={Package} title={language === 'es' ? 'Sin pedidos aún' : 'No orders yet'} action={<Link to="/stores" className="btn-primary">{t('cart.continue')}</Link>} /></div>;

  return (
    <div className="container-app py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">{t('nav.myOrders')}</h1>
      <div className="space-y-3">
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="card p-4 hover:shadow-card-hover transition block">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900">#{o.id.slice(0, 8)}</p>
                <p className="text-xs text-neutral-500">{formatRelativeDate(o.created_at, language)}</p>
              </div>
              <StatusBadge status={o.status} t={t} />
              <p className="font-bold text-primary-700">{formatPrice(o.total, currency)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language, currency, profile } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: o }, { data: its }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).maybeSingle(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ]);
      setOrder(o as Order | null);
      setItems((its as OrderItem[]) || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!order) return <div className="container-app py-16"><EmptyState icon={Package} title={language === 'es' ? 'Pedido no encontrado' : 'Order not found'} /></div>;

  const currentStep = statusSteps.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  const paymentIcon = { cod: Banknote, pago_movil: Smartphone, bank_transfer: Landmark, binance: Wallet }[order.payment_method];
  const PaymentIcon = paymentIcon || Banknote;

  return (
    <div className="container-app py-8 max-w-3xl">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-4">
        <ArrowLeft size={14} /> {t('nav.myOrders')}
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">#{order.id.slice(0, 8)}</h1>
            <p className="text-xs text-neutral-500">{formatRelativeDate(order.created_at, language)}</p>
          </div>
          <StatusBadge status={order.status} t={t} />
        </div>

        {/* Status tracker */}
        {!isCancelled ? (
          <div className="flex items-center justify-between mb-2">
            {statusSteps.map((step, i) => {
              const Icon = i === 0 ? CreditCard : i === 1 ? CheckCircle : i === 2 ? Clock : i === 3 ? Truck : Package;
              const done = i <= currentStep;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={cn('rounded-full p-2 transition', done ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-400')}>
                      <Icon size={16} />
                    </div>
                    <span className={cn('text-[10px] mt-1 text-center', done ? 'text-primary-700 font-semibold' : 'text-neutral-400')}>
                      {t(`order.status.${step}` as never)}
                    </span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-1 transition', i < currentStep ? 'bg-primary-600' : 'bg-neutral-200')} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-error-50 border border-error-200 p-3 flex items-center gap-2 text-error-700">
            <XCircle size={18} /> {t('order.status.cancelled')}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Productos' : 'Items'}</h2>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-neutral-800">{it.name}</p>
                <p className="text-xs text-neutral-500">{it.qty} × {formatPrice(it.unit_price, currency)}</p>
              </div>
              <span className="font-semibold">{formatPrice(it.unit_price * it.qty, currency)}</span>
            </div>
          ))}
        </div>
        <div className="h-px bg-neutral-100 my-3" />
        <div className="space-y-1">
          <Row label={t('cart.subtotal')} value={formatPrice(order.subtotal, currency)} />
          <Row label={t('cart.tax')} value={formatPrice(order.tax, currency)} />
          <Row label={t('cart.delivery')} value={formatPrice(order.delivery_fee, currency)} />
          <div className="h-px bg-neutral-200 my-1" />
          <Row label={t('cart.total')} value={formatPrice(order.total, currency)} bold />
        </div>
      </div>

      {/* Shipping + payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold text-neutral-900 mb-2">{language === 'es' ? 'Entrega' : 'Shipping'}</h3>
          <p className="text-sm text-neutral-700">{order.customer_name}</p>
          <p className="text-sm text-neutral-600">{order.customer_phone}</p>
          <p className="text-sm text-neutral-600 flex items-start gap-1.5 mt-1">
            <MapPin size={14} className="text-primary-600 mt-0.5 shrink-0" />
            {order.shipping_address}
          </p>
          {order.delivery_notes && <p className="text-xs text-neutral-500 mt-2">{order.delivery_notes}</p>}
        </div>
        <div className="card p-5">
          <h3 className="font-bold text-neutral-900 mb-2">{t('checkout.payment')}</h3>
          <p className="text-sm text-neutral-700 flex items-center gap-2">
            <PaymentIcon size={16} className="text-primary-600" />
            {t(`checkout.${order.payment_method}` as never)}
          </p>
          {order.payment_receipt_url && (
            <a href={order.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-primary-600 hover:underline">
              {language === 'es' ? 'Ver comprobante' : 'View receipt'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: OrderStatus; t: (k: never) => string }) {
  const colors: Record<OrderStatus, string> = {
    pending_payment: 'bg-warning-100 text-warning-700',
    payment_verified: 'bg-accent-100 text-accent-700',
    preparing: 'bg-secondary-100 text-secondary-700',
    out_for_delivery: 'bg-accent-100 text-accent-700',
    delivered: 'bg-success-100 text-success-700',
    cancelled: 'bg-error-100 text-error-700',
  };
  return <span className={cn('badge', colors[status])}>{t(`order.status.${status}` as never)}</span>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'text-base font-bold text-neutral-900' : 'text-sm text-neutral-600'}>{label}</span>
      <span className={bold ? 'text-base font-bold text-neutral-900' : 'text-sm font-semibold text-neutral-800'}>{value}</span>
    </div>
  );
}
