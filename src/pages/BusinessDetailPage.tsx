import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Phone, MessageCircle, MapPin, Clock, Star, Package, Wrench, Images, Info,
  ArrowLeft, BadgeCheck, Store,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import type { Business, BusinessGallery, Product, Service } from '@/types/db';
import { StarRating } from '@/components/ui/StarRating';
import { ProductCard } from '@/components/cards/ProductCard';
import { ServiceCard } from '@/components/cards/ServiceCard';
import { ReviewSection } from '@/components/forms/ReviewSection';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { whatsappUrl } from '@/lib/siteSettings';

export function BusinessDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language, settings } = useApp();
  const [business, setBusiness] = useState<Business | null>(null);
  const [gallery, setGallery] = useState<BusinessGallery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'products' | 'services' | 'gallery' | 'about' | 'reviews'>('products');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    (async () => {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .maybeSingle();
      const b = biz as Business | null;
      setBusiness(b);
      if (b) {
        const [g, p, s] = await Promise.all([
          supabase.from('business_gallery').select('*').eq('business_id', b.id).order('sort_order'),
          supabase.from('products').select('*').eq('business_id', b.id).order('is_flash_offer', { ascending: false }),
          supabase.from('services').select('*').eq('business_id', b.id).order('score', { ascending: false }),
        ]);
        setGallery((g.data as BusinessGallery[]) || []);
        setProducts((p.data as Product[]) || []);
        setServices((s.data as Service[]) || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={32} /></div>;
  if (!business) {
    return (
      <div className="container-app py-20">
        <EmptyState icon={Store} title={language === 'es' ? 'Negocio no encontrado' : 'Business not found'} action={<Link to="/stores" className="btn-primary">{t('nav.stores')}</Link>} />
      </div>
    );
  }

  const hasProducts = products.length > 0;
  const hasServices = services.length > 0;
  const hasGallery = gallery.length > 0 || business.cover_url;

  const tabs = [
    { id: 'products' as const, label: t('nav.stores'), icon: Package, show: hasProducts },
    { id: 'services' as const, label: t('nav.services'), icon: Wrench, show: hasServices },
    { id: 'gallery' as const, label: language === 'es' ? 'Galería' : 'Gallery', icon: Images, show: hasGallery },
    { id: 'about' as const, label: language === 'es' ? 'Información' : 'About', icon: Info, show: true },
    { id: 'reviews' as const, label: t('review.title'), icon: Star, show: true },
  ].filter((x) => x.show);

  const whatsappMsg = encodeURIComponent(
    language === 'es'
      ? `Hola ${business.name}, vengo de Zamorapp y me gustaría más información.`
      : `Hi ${business.name}, I come from Zamorapp and would like more info.`
  );
  const galleryImages = [
    ...(business.cover_url ? [business.cover_url] : []),
    ...gallery.map((g) => g.image_url),
  ].slice(0, 3);

  return (
    <div>
      {/* Cover */}
      <div className="relative h-48 md:h-64 bg-neutral-200 overflow-hidden">
        {business.cover_url && (
          <img src={business.cover_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="container-app absolute inset-x-0 bottom-0 pb-4">
          <Link to="/stores" className="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white mb-2">
            <ArrowLeft size={14} /> {t('nav.stores')}
          </Link>
        </div>
      </div>

      <div className="container-app">
        {/* Header card overlapping cover */}
        <div className="relative -mt-12 mb-6 card p-5 flex flex-col sm:flex-row gap-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-white shrink-0">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-600 text-white text-2xl font-bold">
                {business.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900">{business.name}</h1>
              {business.is_featured && (
                <span className="badge bg-primary-50 text-primary-700">
                  <BadgeCheck size={12} /> {t('common.featured')}
                </span>
              )}
            </div>
            <p className="text-sm text-primary-600 font-medium">
              {language === 'es' ? business.category?.name_es : business.category?.name_en}
            </p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <StarRating rating={business.score} count={business.reviews_count} showValue size={14} />
              {business.address && (
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin size={12} /> {business.address}
                </span>
              )}
            </div>
          </div>

          {/* Contact action bar */}
          <div className="flex flex-wrap gap-2 sm:flex-col lg:flex-row">
            <a href={`tel:${settings.contact_phone}`} className="btn-primary">
              <Phone size={15} /> {t('btn.call')}
            </a>
            <a
                href={`${whatsappUrl(settings)}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn bg-success-600 text-white hover:bg-success-700"
              >
                <MessageCircle size={15} /> {t('btn.whatsapp')}
              </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-neutral-200 mb-6 overflow-x-auto no-scrollbar">
          {tabs.map((tb) => {
            const Icon = tb.icon;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap',
                  tab === tb.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                )}
              >
                <Icon size={15} />
                {tb.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="pb-12">
          {tab === 'products' && (
            <>
              {products.length === 0 ? (
                <EmptyState icon={Package} title={language === 'es' ? 'Sin productos' : 'No products'} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'services' && (
            <>
              {services.length === 0 ? (
                <EmptyState icon={Wrench} title={language === 'es' ? 'Sin servicios' : 'No services'} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((s) => (
                    <ServiceCard key={s.id} service={s} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'gallery' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(img)}
                  className="relative aspect-video rounded-xl overflow-hidden bg-neutral-100 group"
                >
                  <img src={img} alt="" className="h-full w-full object-cover group-hover:scale-105 transition" />
                </button>
              ))}
              {galleryImages.length === 0 && (
                <EmptyState icon={Images} title={language === 'es' ? 'Sin imágenes' : 'No images'} />
              )}
            </div>
          )}

          {tab === 'about' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card p-5 lg:col-span-2">
                <h3 className="font-bold text-neutral-900 mb-2">{language === 'es' ? 'Acerca de' : 'About'}</h3>
                <p className="text-sm text-neutral-700 leading-relaxed">{business.bio || '—'}</p>
                {business.hours && business.hours.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold text-neutral-800 mb-2 flex items-center gap-1.5">
                      <Clock size={15} className="text-primary-600" /> {language === 'es' ? 'Horarios' : 'Hours'}
                    </h4>
                    <ul className="space-y-1">
                      {business.hours.map((h, i) => (
                        <li key={i} className="text-sm text-neutral-600 flex justify-between max-w-xs">
                          <span>{h.d}</span>
                          <span className="font-medium">{h.h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="card p-5">
                <h3 className="font-bold text-neutral-900 mb-3">{language === 'es' ? 'Ubicación' : 'Location'}</h3>
                {business.address && (
                  <p className="text-sm text-neutral-600 flex items-start gap-2 mb-3">
                    <MapPin size={16} className="text-primary-600 mt-0.5 shrink-0" />
                    {business.address}
                  </p>
                )}
                {business.latitude && business.longitude && (
                  <div className="rounded-xl overflow-hidden border border-neutral-200">
                    <iframe
                      title="map"
                      width="100%"
                      height="200"
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${business.longitude - 0.01},${business.latitude - 0.01},${business.longitude + 0.01},${business.latitude + 0.01}&layer=mapnik&marker=${business.latitude},${business.longitude}`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'reviews' && (
            <ReviewSection type="business" id={business.id} />
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
