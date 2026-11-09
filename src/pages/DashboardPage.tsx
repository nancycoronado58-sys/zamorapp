import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Store, Package, Wrench, Briefcase, Images, ShoppingBag, Bike,
  Plus, Trash2, Edit2, Loader2, X, Upload, Power, MapPin,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendEmailNotification } from '@/lib/email';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { uploadMedia } from '@/lib/storage';
import { slugify } from '@/lib/utils';
import type { Business, Product, Service, Job, BusinessGallery, Order, Dropper } from '@/types/db';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { formatPrice } from '@/lib/currency';

type Tab = 'overview' | 'business' | 'products' | 'services' | 'jobs' | 'gallery' | 'orders' | 'dropper';

export function DashboardPage() {
  const { profile, loading: authLoading, t, language, currency } = useApp();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get('tab') as Tab) || 'overview';
  const [tab, setTab] = useState<Tab>(initialTab);
  const { toast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [gallery, setGallery] = useState<BusinessGallery[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dropper, setDropper] = useState<Dropper | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);

  const isOwner = profile?.role === 'business_owner' || profile?.role === 'admin';
  const isDropper = profile?.role === 'dropper' || profile?.role === 'admin';

  const setTabAndUrl = (newTab: Tab) => {
    setTab(newTab);
    setParams({ tab: newTab });
  };

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    (async () => {
      if (isOwner) {
        const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', profile.id).maybeSingle();
        setBusiness(biz as Business | null);
        if (biz) {
          const [p, s, j, g, o] = await Promise.all([
            supabase.from('products').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
            supabase.from('services').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
            supabase.from('jobs').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
            supabase.from('business_gallery').select('*').eq('business_id', biz.id).order('sort_order'),
            supabase.from('orders').select('*').order('created_at', { ascending: false }),
          ]);
          setProducts((p.data as Product[]) || []);
          setServices((s.data as Service[]) || []);
          setJobs((j.data as Job[]) || []);
          setGallery((g.data as BusinessGallery[]) || []);
          // Filter orders to those containing this business's products
          const orderIds = new Set<string>();
          const { data: oi } = await supabase.from('order_items').select('order_id').eq('business_id', biz.id);
          (oi || []).forEach((x) => orderIds.add(x.order_id));
          setOrders(((o.data as Order[]) || []).filter((ord) => orderIds.has(ord.id)));
        }
      }
      if (isDropper) {
        const { data: d } = await supabase.from('droppers').select('*').eq('profile_id', profile.id).maybeSingle();
        setDropper(d as Dropper | null);
      }
      setLoading(false);
    })();
  }, [profile, isOwner, isDropper]);

  if (authLoading || loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) {
    return <div className="container-app py-16"><EmptyState icon={Store} title={t('review.login')} action={<Link to="/signin" className="btn-primary">{t('nav.signIn')}</Link>} /></div>;
  }

  const allTabs: { id: Tab; label: string; icon: typeof Store; show: boolean }[] = [
    { id: 'overview', label: language === 'es' ? 'Resumen' : 'Overview', icon: Store, show: true },
    { id: 'business', label: language === 'es' ? 'Mi negocio' : 'My business', icon: Store, show: isOwner },
    { id: 'products', label: t('nav.stores'), icon: Package, show: isOwner },
    { id: 'services', label: t('nav.services'), icon: Wrench, show: isOwner },
    { id: 'jobs', label: t('nav.jobs'), icon: Briefcase, show: isOwner },
    { id: 'gallery', label: language === 'es' ? 'Galería' : 'Gallery', icon: Images, show: isOwner },
    { id: 'orders', label: t('nav.myOrders'), icon: ShoppingBag, show: isOwner },
    { id: 'dropper', label: t('nav.droppers'), icon: Bike, show: isDropper },
  ];
  const tabs = allTabs.filter((x) => x.show);

  return (
    <div className="container-app py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">{t('nav.dashboard')}</h1>
      <p className="text-sm text-neutral-500 mb-6">{profile.display_name} · {profile.role.replace('_', ' ')}</p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0">
          <div className="card p-2 sticky top-24">
            {tabs.map((tb) => {
              const Icon = tb.icon;
              return (
                <button
                  key={tb.id}
                  onClick={() => setTabAndUrl(tb.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    tab === tb.id ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Icon size={16} /> {tb.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isOwner && business && (
                <>
                  <StatCard label={language === 'es' ? 'Productos' : 'Products'} value={products.length} icon={Package} />
                  <StatCard label={language === 'es' ? 'Servicios' : 'Services'} value={services.length} icon={Wrench} />
                  <StatCard label={language === 'es' ? 'Empleos' : 'Jobs'} value={jobs.length} icon={Briefcase} />
                  <StatCard label={language === 'es' ? 'Pedidos' : 'Orders'} value={orders.length} icon={ShoppingBag} />
                  <StatCard label={language === 'es' ? 'Valoración' : 'Rating'} value={`${business.score.toFixed(1)}★`} icon={Store} />
                  <StatCard label={language === 'es' ? 'Estado' : 'Status'} value={business.status} icon={Store} />
                </>
              )}
              {isOwner && !business && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <EmptyState icon={Store} title={language === 'es' ? 'Aún no tienes negocio' : "You don't have a business yet"} action={<button onClick={() => setShowBusinessModal(true)} className="btn-primary"><Plus size={16} /> {language === 'es' ? 'Registrar negocio' : 'Register business'}</button>} />
                </div>
              )}
              {isDropper && (
                <StatCard label={language === 'es' ? 'Estado dropper' : 'Dropper status'} value={dropper?.is_online ? (language === 'es' ? 'En línea' : 'Online') : (language === 'es' ? 'Desconectado' : 'Offline')} icon={Bike} />
              )}
            </div>
          )}

          {tab === 'business' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-neutral-900">{t('nav.dashboard')}</h2>
                <button onClick={() => setShowBusinessModal(true)} className="btn-outline"><Edit2 size={14} /> {language === 'es' ? 'Editar' : 'Edit'}</button>
              </div>
              {business ? (
                <div className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                      {business.logo_url && <img src={business.logo_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900">{business.name}</p>
                      <p className="text-sm text-neutral-500">{business.bio}</p>
                      <p className="text-xs text-neutral-400 mt-1">{business.address} · {business.phone}</p>
                      <span className={`badge mt-2 ${business.status === 'approved' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>{business.status}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState icon={Store} title={language === 'es' ? 'Crea tu negocio' : 'Create your business'} action={<button onClick={() => setShowBusinessModal(true)} className="btn-primary"><Plus size={16} /> {language === 'es' ? 'Registrar' : 'Register'}</button>} />
              )}
            </div>
          )}

          {tab === 'products' && (
            <ManageList
              title={language === 'es' ? 'Productos' : 'Products'}
              items={products}
              onAdd={() => { setEditingProduct(null); setShowProductModal(true); }}
              onEdit={(p) => { setEditingProduct(p); setShowProductModal(true); }}
              emptyIcon={Package}
              onDelete={async (id) => { await supabase.from('products').delete().eq('id', id); setProducts((p) => p.filter((x) => x.id !== id)); toast(language === 'es' ? 'Eliminado' : 'Deleted', 'info'); }}
              render={(p) => (
                <div className="flex items-center gap-3">
                  <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover bg-neutral-100" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-800 truncate">{p.name}</p>
                    <p className="text-xs text-neutral-500">{formatPrice(p.price, currency)} · stock {p.stock}</p>
                  </div>
                </div>
              )}
              language={language}
            />
          )}

          {tab === 'services' && (
            <ManageList
              title={language === 'es' ? 'Servicios' : 'Services'}
              items={services}
              onAdd={() => setShowServiceModal(true)}
              emptyIcon={Wrench}
              onDelete={async (id) => { await supabase.from('services').delete().eq('id', id); setServices((s) => s.filter((x) => x.id !== id)); toast(language === 'es' ? 'Eliminado' : 'Deleted', 'info'); }}
              render={(s) => (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-800 truncate">{s.name}</p>
                  <p className="text-xs text-neutral-500">{formatPrice(s.price_from, currency)} - {formatPrice(s.price_to, currency)}</p>
                </div>
              )}
              language={language}
            />
          )}

          {tab === 'jobs' && (
            <ManageList
              title={language === 'es' ? 'Empleos' : 'Jobs'}
              items={jobs}
              onAdd={() => setShowJobModal(true)}
              emptyIcon={Briefcase}
              onDelete={async (id) => { await supabase.from('jobs').delete().eq('id', id); setJobs((j) => j.filter((x) => x.id !== id)); toast(language === 'es' ? 'Eliminado' : 'Deleted', 'info'); }}
              render={(j) => (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-800 truncate">{j.title}</p>
                  <p className="text-xs text-neutral-500">{j.job_type.replace('_', ' ')} · {j.salary_range}</p>
                </div>
              )}
              language={language}
            />
          )}

          {tab === 'gallery' && business && (
            <GalleryManager businessId={business.id} gallery={gallery} onUpdate={() => {}} />
          )}

          {tab === 'orders' && (
            <div>
              <h2 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Pedidos recibidos' : 'Incoming orders'}</h2>
              {orders.length === 0 ? (
                <EmptyState icon={ShoppingBag} title={language === 'es' ? 'Sin pedidos' : 'No orders'} />
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <Link key={o.id} to={`/orders/${o.id}`} className="card p-4 flex items-center justify-between hover:shadow-card-hover transition">
                      <div>
                        <p className="font-semibold text-neutral-900">#{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-neutral-500">{o.customer_name} · {o.status.replace('_', ' ')}</p>
                      </div>
                      <span className="font-bold text-primary-700">{formatPrice(o.total, currency)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'dropper' && (
            <DropperPanel dropper={dropper} profileId={profile.id} onUpdate={setDropper} />
          )}
        </div>
      </div>

      {/* Modals */}
      {showBusinessModal && business !== undefined && (
        <BusinessFormModal
          existing={business || null}
          onClose={() => setShowBusinessModal(false)}
          onSaved={(b) => { setBusiness(b); setShowBusinessModal(false); toast(language === 'es' ? 'Negocio guardado' : 'Business saved', 'success'); }}
        />
      )}
      {showProductModal && business && (
        <ProductFormModal
          businessId={business.id}
          existing={editingProduct}
          onClose={() => setShowProductModal(false)}
          onSaved={(p) => {
            setProducts((prev) => editingProduct ? prev.map((item) => item.id === p.id ? p : item) : [p, ...prev]);
            setShowProductModal(false);
            setEditingProduct(null);
            toast(language === 'es' ? (editingProduct ? 'Producto actualizado' : 'Producto creado') : (editingProduct ? 'Product updated' : 'Product created'), 'success');
          }}
        />
      )}
      {showServiceModal && business && (
        <ServiceFormModal businessId={business.id} onClose={() => setShowServiceModal(false)} onSaved={(s) => { setServices((prev) => [s, ...prev]); setShowServiceModal(false); toast(language === 'es' ? 'Servicio creado' : 'Service created', 'success'); }} />
      )}
      {showJobModal && business && (
        <JobFormModal businessId={business.id} onClose={() => setShowJobModal(false)} onSaved={(j) => { setJobs((prev) => [j, ...prev]); setShowJobModal(false); toast(language === 'es' ? 'Empleo publicado' : 'Job posted', 'success'); }} />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Store }) {
  return (
    <div className="card p-5">
      <Icon size={20} className="text-primary-600 mb-2" />
      <p className="text-2xl font-extrabold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function ManageList<T extends { id: string }>({ title, items, onAdd, onEdit, onDelete, render, emptyIcon: Icon, language }: {
  title: string;
  items: T[];
  onAdd: () => void;
  onEdit?: (item: T) => void;
  onDelete: (id: string) => void;
  render: (item: T) => React.ReactNode;
  emptyIcon: typeof Store;
  language: 'es' | 'en';
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-neutral-900">{title}</h2>
        <button onClick={onAdd} className="btn-primary"><Plus size={14} /> {language === 'es' ? 'Añadir' : 'Add'}</button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Icon} title={language === 'es' ? 'Sin elementos' : 'No items'} />
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="card p-3 flex items-center gap-3">
              {render(it)}
              {onEdit && <button onClick={() => onEdit(it)} className="rounded-lg p-1.5 text-primary-600 hover:bg-primary-50"><Edit2 size={15} /></button>}
              <button onClick={() => onDelete(it.id)} className="rounded-lg p-1.5 text-error-500 hover:bg-error-50"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryManager({ businessId, gallery, onUpdate }: { businessId: string; gallery: BusinessGallery[]; onUpdate: () => void }) {
  const { t, language } = useApp();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState(gallery);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (items.length + files.length > 3) {
      toast(language === 'es' ? 'Máximo 3 imágenes' : 'Max 3 images', 'error');
      return;
    }
    setUploading(true);
    for (const file of files) {
      try {
        const url = await uploadMedia(file, 'gallery');
        const { data } = await supabase.from('business_gallery').insert({ business_id: businessId, image_url: url, sort_order: items.length }).select().single();
        if (data) setItems((prev) => [...prev, data as BusinessGallery]);
      } catch (err) {
        toast(err instanceof Error ? err.message : t('common.error'), 'error');
      }
    }
    setUploading(false);
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('business_gallery').delete().eq('id', id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div>
      <h2 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Galería (máx 3)' : 'Gallery (max 3)'}</h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {items.map((g) => (
          <div key={g.id} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 group">
            <img src={g.image_url} alt="" className="h-full w-full object-cover" />
            <button onClick={() => handleDelete(g.id)} className="absolute top-1 right-1 rounded-lg bg-black/50 text-white p-1 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
          </div>
        ))}
        {items.length < 3 && (
          <label className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 transition">
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            {uploading ? <Loader2 size={20} className="animate-spin text-primary-600" /> : <Upload size={20} className="text-neutral-400" />}
            <span className="text-xs text-neutral-400 mt-1">{language === 'es' ? 'Subir' : 'Upload'}</span>
          </label>
        )}
      </div>
    </div>
  );
}

function DropperPanel({ dropper, profileId, onUpdate }: { dropper: Dropper | null; profileId: string; onUpdate: (d: Dropper | null) => void }) {
  const { t, language } = useApp();
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState<Dropper['vehicle_type']>(dropper?.vehicle_type || 'bike');
  const [plate, setPlate] = useState(dropper?.vehicle_plate || '');
  const [area, setArea] = useState(dropper?.area || '');

  const save = async () => {
    if (dropper) {
      const { data, error } = await supabase.from('droppers').update({ vehicle_type: vehicle, vehicle_plate: plate, area }).eq('id', dropper.id).select().single();
      if (!error && data) { onUpdate(data as Dropper); toast(language === 'es' ? 'Guardado' : 'Saved', 'success'); }
    } else {
      const { data, error } = await supabase.from('droppers').insert({ profile_id: profileId, vehicle_type: vehicle, vehicle_plate: plate, area }).select().single();
      if (!error && data) { onUpdate(data as Dropper); toast(language === 'es' ? 'Perfil creado' : 'Profile created', 'success'); }
    }
  };

  const toggleOnline = async () => {
    if (!dropper) return;
    const { data } = await supabase.from('droppers').update({ is_online: !dropper.is_online }).eq('id', dropper.id).select().single();
    if (data) { onUpdate(data as Dropper); toast(dropper.is_online ? (language === 'es' ? 'Desconectado' : 'Offline') : (language === 'es' ? 'En línea' : 'Online'), 'info'); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-neutral-900">{language === 'es' ? 'Perfil de repartidor' : 'Dropper profile'}</h2>
          {dropper && (
            <button onClick={toggleOnline} className={`btn ${dropper.is_online ? 'bg-success-600 text-white' : 'btn-outline'}`}>
              <Power size={14} /> {dropper.is_online ? (language === 'es' ? 'En línea' : 'Online') : (language === 'es' ? 'Desconectado' : 'Offline')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">{language === 'es' ? 'Vehículo' : 'Vehicle'}</label>
            <select value={vehicle} onChange={(e) => setVehicle(e.target.value as Dropper['vehicle_type'])} className="input">
              <option value="bike">{language === 'es' ? 'Bicicleta' : 'Bike'}</option>
              <option value="motorcycle">{language === 'es' ? 'Moto' : 'Motorcycle'}</option>
              <option value="car">{language === 'es' ? 'Auto' : 'Car'}</option>
            </select>
          </div>
          <div>
            <label className="label">{language === 'es' ? 'Placa' : 'Plate'}</label>
            <input value={plate} onChange={(e) => setPlate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">{language === 'es' ? 'Zona' : 'Area'}</label>
            <input value={area} onChange={(e) => setArea(e.target.value)} className="input" />
          </div>
        </div>
        <button onClick={save} className="btn-primary mt-4">{language === 'es' ? 'Guardar' : 'Save'}</button>
      </div>

      {dropper?.is_online && <AvailableOrdersFeed dropperId={profileId} />}
    </div>
  );
}

function AvailableOrdersFeed({ dropperId }: { dropperId: string }) {
  const { t, language, currency } = useApp();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

  const load = async () => {
    const { data } = await supabase.from('orders').select('*').in('status', ['payment_verified', 'preparing']).order('created_at', { ascending: true });
    setOrders((data as Order[]) || []);
  };

  useEffect(() => { load(); }, []);

  const accept = async (o: Order) => {
    const { error } = await supabase.from('orders').update({ dropper_id: dropperId, status: 'out_for_delivery' }).eq('id', o.id);
    if (!error) { toast(language === 'es' ? 'Pedido aceptado' : 'Order accepted', 'success'); load(); }
  };

  const complete = async (o: Order) => {
    const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', o.id);
    if (!error) { toast(language === 'es' ? 'Pedido entregado' : 'Delivered', 'success'); load(); }
  };

  const myActive = orders.filter((o) => o.dropper_id === dropperId);
  const available = orders.filter((o) => !o.dropper_id);

  return (
    <div className="card p-5">
      <h3 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Pedidos disponibles' : 'Available orders'}</h3>
      {myActive.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-accent-700 uppercase mb-2">{language === 'es' ? 'En camino' : 'In progress'}</p>
          {myActive.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border border-accent-200 bg-accent-50 p-3 mb-2">
              <div>
                <p className="font-semibold text-neutral-900">#{o.id.slice(0, 8)}</p>
                <p className="text-xs text-neutral-600 flex items-center gap-1"><MapPin size={10} /> {o.shipping_address}</p>
              </div>
              <button onClick={() => complete(o)} className="btn bg-success-600 text-white">{language === 'es' ? 'Entregado' : 'Delivered'}</button>
            </div>
          ))}
        </div>
      )}
      {available.length === 0 ? (
        <p className="text-sm text-neutral-500">{language === 'es' ? 'Sin pedidos disponibles' : 'No available orders'}</p>
      ) : (
        <div className="space-y-2">
          {available.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
              <div>
                <p className="font-semibold text-neutral-900">#{o.id.slice(0, 8)}</p>
                <p className="text-xs text-neutral-600 flex items-center gap-1"><MapPin size={10} /> {o.shipping_address}</p>
                <p className="text-xs text-neutral-500">{formatPrice(o.total, currency)}</p>
              </div>
              <button onClick={() => accept(o)} className="btn-primary">{language === 'es' ? 'Aceptar' : 'Accept'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Form modals
function BusinessFormModal({ existing, onClose, onSaved }: { existing: Business | null; onClose: () => void; onSaved: (b: Business) => void }) {
  const { profile, t, language, settings } = useApp();
  const { toast } = useToast();
  const [name, setName] = useState(existing?.name || '');
  const [bio, setBio] = useState(existing?.bio || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [whatsapp, setWhatsapp] = useState(existing?.whatsapp || '');
  const [logoUrl, setLogoUrl] = useState(existing?.logo_url || '');
  const [coverUrl, setCoverUrl] = useState(existing?.cover_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, kind);
      if (kind === 'logo') setLogoUrl(url); else setCoverUrl(url);
    } catch (err) { setError(err instanceof Error ? err.message : t('common.error')); }
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const slug = slugify(name);
    if (existing) {
      const { data, error } = await supabase.from('businesses').update({ name, bio, address, phone, whatsapp, logo_url: logoUrl, cover_url: coverUrl }).eq('id', existing.id).select().single();
      setSaving(false);
      if (error) { setError(error.message); return; }
      onSaved(data as Business);
    } else {
      const { data, error } = await supabase.from('businesses').insert({ owner_id: profile.id, name, slug, bio, address, phone, whatsapp, logo_url: logoUrl, cover_url: coverUrl, status: 'approved' }).select().single();
      setSaving(false);
      if (error) { setError(error.message); return; }
      toast(language === 'es' ? 'Negocio registrado y publicado' : 'Business registered and published', 'success');
      void sendEmailNotification({ type: 'business_registered', to: settings.admin_email, businessName: name, adminEmail: settings.admin_email });
      onSaved(data as Business);
    }
  };

  return (
    <Modal open onClose={onClose} title={existing ? (language === 'es' ? 'Editar negocio' : 'Edit business') : (language === 'es' ? 'Registrar negocio' : 'Register business')} size="lg">
      <div className="space-y-3">
        <div><label className="label">{language === 'es' ? 'Nombre' : 'Name'}</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
        <div><label className="label">{language === 'es' ? 'Descripción' : 'Bio'}</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="input" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">{language === 'es' ? 'Dirección' : 'Address'}</label><input value={address} onChange={(e) => setAddress(e.target.value)} className="input" /></div>
          <div><label className="label">{language === 'es' ? 'Teléfono' : 'Phone'}</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" /></div>
        </div>
        <div><label className="label">WhatsApp</label><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="input" placeholder="51999888777" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{language === 'es' ? 'Logo' : 'Logo'}</label>
            <label className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-neutral-200 cursor-pointer hover:border-primary-300">
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'logo')} className="hidden" />
              {logoUrl ? <img src={logoUrl} alt="" className="h-full rounded-lg object-cover" /> : <Upload size={18} className="text-neutral-400" />}
            </label>
          </div>
          <div>
            <label className="label">{language === 'es' ? 'Portada' : 'Cover'}</label>
            <label className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-neutral-200 cursor-pointer hover:border-primary-300">
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'cover')} className="hidden" />
              {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full rounded-lg object-cover" /> : <Upload size={18} className="text-neutral-400" />}
            </label>
          </div>
        </div>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <button onClick={save} disabled={saving || !name} className="btn-primary w-full">{saving ? <Loader2 size={16} className="animate-spin" /> : null}{language === 'es' ? 'Guardar' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function ProductFormModal({ businessId, existing, onClose, onSaved }: { businessId: string; existing: Product | null; onClose: () => void; onSaved: (p: Product) => void }) {
  const { t, language } = useApp();
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [price, setPrice] = useState(existing?.price || 0);
  const [discount, setDiscount] = useState(existing?.discount_pct || 0);
  const [stock, setStock] = useState(existing?.stock || 1);
  const [imageUrl, setImageUrl] = useState(existing?.image_url || '');
  const [flash, setFlash] = useState(existing?.is_flash_offer || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await uploadMedia(file, 'products'); setImageUrl(url); } catch (err) { setError(err instanceof Error ? err.message : t('common.error')); }
  };

  const save = async () => {
    setSaving(true);
    const payload = { name, description, price, discount_pct: discount, stock, image_url: imageUrl, is_flash_offer: flash };
    const { data, error } = existing
      ? await supabase.from('products').update(payload).eq('id', existing.id).select().maybeSingle()
      : await supabase.from('products').insert({ business_id: businessId, ...payload }).select().maybeSingle();
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved(data as Product);
  };

  return (
    <Modal open onClose={onClose} title={existing ? (language === 'es' ? 'Editar producto' : 'Edit product') : (language === 'es' ? 'Nuevo producto' : 'New product')}>
      <div className="space-y-3">
        <div><label className="label">{language === 'es' ? 'Nombre' : 'Name'}</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
        <div><label className="label">{language === 'es' ? 'Descripción' : 'Description'}</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label">{language === 'es' ? 'Precio' : 'Price'}</label><input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} className="input" /></div>
          <div><label className="label">% {t('common.discount')}</label><input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} className="input" /></div>
          <div><label className="label">Stock</label><input type="number" value={stock} onChange={(e) => setStock(+e.target.value)} className="input" /></div>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={flash} onChange={(e) => setFlash(e.target.checked)} /> {t('common.flashOffer')}</label>
        <label className="flex items-center justify-center h-32 rounded-xl border-2 border-dashed border-neutral-200 cursor-pointer hover:border-primary-300">
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          {imageUrl ? <img src={imageUrl} alt="" className="h-full rounded-lg object-cover" /> : <Upload size={20} className="text-neutral-400" />}
        </label>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <button onClick={save} disabled={saving || !name} className="btn-primary w-full">{saving ? <Loader2 size={16} className="animate-spin" /> : null}{language === 'es' ? 'Guardar' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function ServiceFormModal({ businessId, onClose, onSaved }: { businessId: string; onClose: () => void; onSaved: (s: Service) => void }) {
  const { t, language } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceFrom, setPriceFrom] = useState(0);
  const [priceTo, setPriceTo] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await uploadMedia(file, 'services'); setImageUrl(url); } catch (err) { setError(err instanceof Error ? err.message : t('common.error')); }
  };

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('services').insert({ business_id: businessId, name, description, price_from: priceFrom, price_to: priceTo, image_url: imageUrl }).select().single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved(data as Service);
  };

  return (
    <Modal open onClose={onClose} title={language === 'es' ? 'Nuevo servicio' : 'New service'}>
      <div className="space-y-3">
        <div><label className="label">{language === 'es' ? 'Nombre' : 'Name'}</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
        <div><label className="label">{language === 'es' ? 'Descripción' : 'Description'}</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{language === 'es' ? 'Precio desde' : 'Price from'}</label><input type="number" value={priceFrom} onChange={(e) => setPriceFrom(+e.target.value)} className="input" /></div>
          <div><label className="label">{language === 'es' ? 'Precio hasta' : 'Price to'}</label><input type="number" value={priceTo} onChange={(e) => setPriceTo(+e.target.value)} className="input" /></div>
        </div>
        <label className="flex items-center justify-center h-32 rounded-xl border-2 border-dashed border-neutral-200 cursor-pointer hover:border-primary-300">
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          {imageUrl ? <img src={imageUrl} alt="" className="h-full rounded-lg object-cover" /> : <Upload size={20} className="text-neutral-400" />}
        </label>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <button onClick={save} disabled={saving || !name} className="btn-primary w-full">{saving ? <Loader2 size={16} className="animate-spin" /> : null}{language === 'es' ? 'Guardar' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function JobFormModal({ businessId, onClose, onSaved }: { businessId: string; onClose: () => void; onSaved: (j: Job) => void }) {
  const { t, language } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState<Job['job_type']>('full_time');
  const [salary, setSalary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('jobs').insert({ business_id: businessId, title, description, location, job_type: jobType, salary_range: salary }).select().single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved(data as Job);
  };

  return (
    <Modal open onClose={onClose} title={language === 'es' ? 'Publicar empleo' : 'Post job'}>
      <div className="space-y-3">
        <div><label className="label">{language === 'es' ? 'Título' : 'Title'}</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" /></div>
        <div><label className="label">{language === 'es' ? 'Descripción' : 'Description'}</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">{language === 'es' ? 'Ubicación' : 'Location'}</label><input value={location} onChange={(e) => setLocation(e.target.value)} className="input" /></div>
          <div><label className="label">{language === 'es' ? 'Tipo' : 'Type'}</label>
            <select value={jobType} onChange={(e) => setJobType(e.target.value as Job['job_type'])} className="input">
              <option value="full_time">{language === 'es' ? 'Tiempo completo' : 'Full time'}</option>
              <option value="part_time">{language === 'es' ? 'Medio tiempo' : 'Part time'}</option>
              <option value="temporary">{language === 'es' ? 'Temporal' : 'Temporary'}</option>
              <option value="contract">{language === 'es' ? 'Contrato' : 'Contract'}</option>
            </select>
          </div>
        </div>
        <div><label className="label">{language === 'es' ? 'Rango salarial' : 'Salary range'}</label><input value={salary} onChange={(e) => setSalary(e.target.value)} className="input" placeholder="1200-1600" /></div>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <button onClick={save} disabled={saving || !title} className="btn-primary w-full">{saving ? <Loader2 size={16} className="animate-spin" /> : null}{language === 'es' ? 'Publicar' : 'Post'}</button>
      </div>
    </Modal>
  );
}
