import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  Store, Package, ShoppingBag, Users, Star, Shield, Check, X, Image,
  TrendingUp, DollarSign, Briefcase, Bike, Settings, ShieldAlert, Trash2, KeyRound,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import type { Business, Order, Profile, Review, Dropper } from '@/types/db';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/lib/currency';
import { HeroSlideManager } from '@/components/admin/HeroSlideManager';
import { ProductsModerationManager } from '@/components/admin/ProductsModerationManager';
import { BlockedTermsManager } from '@/components/admin/BlockedTermsManager';
import { SiteSettingsManager } from '@/components/admin/SiteSettingsManager';
import { cn, formatRelativeDate } from '@/lib/utils';

type Tab = 'overview' | 'hero' | 'businesses' | 'products' | 'moderation' | 'orders' | 'users' | 'reviews' | 'droppers' | 'settings';

export function AdminPage() {
  const { profile, loading: authLoading, t, language, currency } = useApp();
  const { toast } = useToast();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>('overview');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [droppers, setDroppers] = useState<Dropper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      setLoading(false);
      return;
    }
    (async () => {
      const [b, o, u, r, d] = await Promise.all([
        supabase.from('businesses').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, reviewer:profiles(display_name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('droppers').select('*'),
      ]);
      setBusinesses((b.data as Business[]) || []);
      setOrders((o.data as Order[]) || []);
      setUsers((u.data as Profile[]) || []);
      setReviews((r.data as Review[]) || []);
      setDroppers((d.data as Dropper[]) || []);
      setLoading(false);
    })();
  }, [profile]);

  if (authLoading || loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) return <Navigate to={`/signin?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const pendingBiz = businesses.filter((b) => b.status === 'pending');
  const pendingOrders = orders.filter((o) => o.status === 'pending_payment');
  const totalRevenue = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'pending_payment').reduce((a, o) => a + o.total, 0);

  const updateBizStatus = async (id: string, status: Business['status']) => {
    const { data } = await supabase.from('businesses').update({ status }).eq('id', id).select().single();
    if (data) {
      setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      toast(language === 'es' ? `Negocio ${status}` : `Business ${status}`, 'success');
    }
  };

  const deleteBusiness = async (business: Business) => {
    if (!window.confirm(language === 'es' ? `¿Eliminar el negocio "${business.name}"? Sus productos también se eliminarán.` : `Delete "${business.name}"? Its products will also be removed.`)) return;
    const { error } = await supabase.from('businesses').delete().eq('id', business.id);
    if (error) {
      toast(language === 'es' ? 'No se pudo eliminar el negocio' : 'The business could not be deleted', 'error');
      return;
    }
    setBusinesses((prev) => prev.filter((b) => b.id !== business.id));
    toast(language === 'es' ? 'Negocio eliminado' : 'Business deleted', 'info');
  };

  const updateUserApproval = async (user: Profile, status: Profile['approval_status']) => {
    const { error } = await supabase.rpc('set_profile_approval', { p_profile_id: user.id, p_status: status });
    if (error) {
      toast(language === 'es' ? 'No se pudo actualizar la aprobación' : 'Approval could not be updated', 'error');
      return;
    }
    setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, approval_status: status } : item));
    toast(language === 'es' ? 'Aprobación actualizada' : 'Approval updated', 'success');
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    const { data } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (data) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      toast(language === 'es' ? `Pedido ${status.replace('_', ' ')}` : `Order ${status.replace('_', ' ')}`, 'success');
    }
  };

  const deleteReview = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast(language === 'es' ? 'Reseña eliminada' : 'Review deleted', 'info');
  };

  const tabs: { id: Tab; label: string; icon: typeof Store; badge?: number }[] = [
    { id: 'overview', label: language === 'es' ? 'Resumen' : 'Overview', icon: TrendingUp },
    { id: 'settings', label: language === 'es' ? 'Configuración' : 'Settings', icon: Settings },
    { id: 'hero', label: language === 'es' ? 'Hero de portada' : 'Homepage hero', icon: Image },
    { id: 'businesses', label: language === 'es' ? 'Negocios' : 'Businesses', icon: Store, badge: pendingBiz.length },
    { id: 'products', label: language === 'es' ? 'Productos' : 'Products', icon: Package },
    { id: 'moderation', label: language === 'es' ? 'Productos prohibidos' : 'Prohibited items', icon: ShieldAlert },
    { id: 'orders', label: language === 'es' ? 'Pagos y ventas' : 'Payments & sales', icon: DollarSign, badge: pendingOrders.length },
    { id: 'users', label: language === 'es' ? 'Usuarios' : 'Users', icon: Users },
    { id: 'reviews', label: language === 'es' ? 'Reseñas' : 'Reviews', icon: Star },
    { id: 'droppers', label: language === 'es' ? 'Repartidores' : 'Droppers', icon: Bike },
  ];

  return (
    <div className="container-app py-8">
      <div className="flex items-center gap-2 mb-6">
        <Shield size={24} className="text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('nav.admin')}</h1>
          <p className="text-sm text-neutral-500">{language === 'es' ? 'Panel de SuperAdmin' : 'SuperAdmin dashboard'}</p>
        </div>
        <Link to="/profile" className="btn-outline ml-auto text-sm">
          <KeyRound size={15} /> {language === 'es' ? 'Mi perfil y contraseña' : 'Profile and password'}
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 shrink-0">
          <div className="card p-2 sticky top-24">
            {tabs.map((tb) => {
              const Icon = tb.icon;
              return (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={cn('flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition', tab === tb.id ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-50')}
                >
                  <Icon size={16} /> {tb.label}
                  {tb.badge ? <span className="ml-auto badge bg-error-500 text-white">{tb.badge}</span> : null}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {tab === 'settings' && <SiteSettingsManager />}

          {tab === 'hero' && <HeroSlideManager />}

          {tab === 'products' && <ProductsModerationManager />}

          {tab === 'moderation' && <BlockedTermsManager />}

          {tab === 'overview' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat icon={Store} value={businesses.length} label={language === 'es' ? 'Negocios' : 'Businesses'} />
              <Stat icon={ShoppingBag} value={orders.length} label={language === 'es' ? 'Pedidos' : 'Orders'} />
              <Stat icon={Users} value={users.length} label={language === 'es' ? 'Usuarios' : 'Users'} />
              <Stat icon={DollarSign} value={formatPrice(totalRevenue, currency)} label={language === 'es' ? 'Ingresos' : 'Revenue'} />
              <Stat icon={Briefcase} value={reviews.length} label={language === 'es' ? 'Reseñas' : 'Reviews'} />
              <Stat icon={Bike} value={droppers.length} label={language === 'es' ? 'Repartidores' : 'Droppers'} />
              <Stat icon={Package} value={pendingBiz.length} label={language === 'es' ? 'Pendientes' : 'Pending'} />
              <Stat icon={DollarSign} value={pendingOrders.length} label={language === 'es' ? 'Pagos pend.' : 'Pending pay'} />
            </div>
          )}

          {tab === 'businesses' && (
            <div>
              <h2 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Aprobación de negocios' : 'Business approvals'}</h2>
              {businesses.length === 0 ? <EmptyState icon={Store} title={t('common.empty')} /> : (
                <div className="space-y-2">
                  {businesses.map((b) => (
                    <div key={b.id} className="card p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                        {b.logo_url && <img src={b.logo_url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/business/${b.slug}`} className="font-semibold text-neutral-900 hover:underline truncate block">{b.name}</Link>
                        <p className="text-xs text-neutral-500">{b.address}</p>
                      </div>
                      <span className={cn('badge', b.status === 'approved' ? 'bg-success-100 text-success-700' : b.status === 'pending' ? 'bg-warning-100 text-warning-700' : 'bg-error-100 text-error-700')}>{b.status}</span>
                      {b.status !== 'approved' && (
                        <button onClick={() => updateBizStatus(b.id, 'approved')} className="btn bg-success-600 text-white px-2 py-1 text-xs"><Check size={12} /></button>
                      )}
                      {b.status !== 'rejected' && (
                        <button onClick={() => updateBizStatus(b.id, 'rejected')} className="btn bg-error-600 text-white px-2 py-1 text-xs"><X size={12} /></button>
                      )}
                      <button onClick={() => void deleteBusiness(b)} aria-label={language === 'es' ? 'Eliminar negocio' : 'Delete business'} className="btn-danger px-2 py-1 text-xs"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'orders' && (
            <div>
              <h2 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Verificación de pagos' : 'Payment verification'}</h2>
              {orders.length === 0 ? <EmptyState icon={DollarSign} title={t('common.empty')} /> : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="card p-4 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900">#{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-neutral-500">{o.customer_name} · {o.payment_method} · {formatPrice(o.total, currency)}</p>
                        <p className="text-xs text-neutral-400">{formatRelativeDate(o.created_at, language)}</p>
                      </div>
                      <span className={cn('badge', o.status === 'pending_payment' ? 'bg-warning-100 text-warning-700' : 'bg-success-100 text-success-700')}>{t(`order.status.${o.status}` as never)}</span>
                      {o.payment_receipt_url && <a href={o.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">{language === 'es' ? 'Comprobante' : 'Receipt'}</a>}
                      {o.status === 'pending_payment' && (
                        <button onClick={() => updateOrderStatus(o.id, 'payment_verified')} className="btn bg-success-600 text-white px-2 py-1 text-xs"><Check size={12} /> {language === 'es' ? 'Verificar' : 'Verify'}</button>
                      )}
                      {o.status === 'payment_verified' && (
                        <button onClick={() => updateOrderStatus(o.id, 'preparing')} className="btn-primary px-2 py-1 text-xs">{language === 'es' ? 'Preparar' : 'Prepare'}</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'users' && (
            <div>
              <h2 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Usuarios' : 'Users'}</h2>
              {users.length === 0 ? <EmptyState icon={Users} title={t('common.empty')} /> : (
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
                      <tr><th className="p-3">{language === 'es' ? 'Nombre' : 'Name'}</th><th className="p-3">Rol</th><th className="p-3">{language === 'es' ? 'Estado' : 'Status'}</th><th className="p-3">{language === 'es' ? 'Registro' : 'Joined'}</th><th className="p-3"></th></tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-neutral-100">
                          <td className="p-3 font-medium text-neutral-800">{u.display_name}</td>
                          <td className="p-3"><span className="badge bg-primary-50 text-primary-700">{u.role.replace('_', ' ')}</span></td>
                          <td className="p-3"><span className={cn('badge', u.approval_status === 'approved' ? 'bg-success-100 text-success-700' : u.approval_status === 'rejected' ? 'bg-error-100 text-error-700' : 'bg-warning-100 text-warning-700')}>{u.approval_status}</span></td>
                          <td className="p-3 text-neutral-500">{formatRelativeDate(u.created_at, language)}</td>
                          <td className="p-3 text-right whitespace-nowrap">
                            {u.role !== 'admin' && u.approval_status !== 'approved' && <button onClick={() => updateUserApproval(u, 'approved')} className="btn bg-success-600 text-white px-2 py-1 text-xs mr-1"><Check size={12} /></button>}
                            {u.role !== 'admin' && u.approval_status !== 'rejected' && <button onClick={() => updateUserApproval(u, 'rejected')} className="btn bg-error-600 text-white px-2 py-1 text-xs"><X size={12} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div>
              <h2 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Moderación de reseñas' : 'Review moderation'}</h2>
              {reviews.length === 0 ? <EmptyState icon={Star} title={t('common.empty')} /> : (
                <div className="space-y-2">
                  {reviews.map((r) => (
                    <div key={r.id} className="card p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-800">{r.comment || '—'}</p>
                        <p className="text-xs text-neutral-500 mt-1">{r.reviewer?.display_name || 'Anon'} · {r.rating}★ · {formatRelativeDate(r.created_at, language)}</p>
                      </div>
                      <button onClick={() => deleteReview(r.id)} className="btn bg-error-50 text-error-600 px-2 py-1 text-xs hover:bg-error-100"><X size={12} /> {language === 'es' ? 'Eliminar' : 'Delete'}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'droppers' && (
            <div>
              <h2 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Flota de repartidores' : 'Dropper fleet'}</h2>
              {droppers.length === 0 ? <EmptyState icon={Bike} title={t('common.empty')} /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {droppers.map((d) => (
                    <div key={d.id} className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">{d.vehicle_type}</p>
                          <p className="text-xs text-neutral-500">{d.area || '—'} · {d.vehicle_plate || ''}</p>
                        </div>
                        <span className={cn('badge', d.is_online ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-500')}>{d.is_online ? (language === 'es' ? 'En línea' : 'Online') : (language === 'es' ? 'Off' : 'Off')}</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-2">{d.rating.toFixed(1)}★</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Store; value: string | number; label: string }) {
  return (
    <div className="card p-4">
      <Icon size={18} className="text-primary-600 mb-2" />
      <p className="text-xl font-extrabold text-neutral-900 truncate">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
