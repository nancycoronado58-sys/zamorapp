import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, ArrowRight, Store, Wrench, Briefcase, Siren, Bike, Package,
  Zap, Star, MapPin, Phone, TrendingUp, ShoppingBag, Users, Heart, Shield, Megaphone, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useCategories, useBusinesses, useProducts, useServices, useJobs, useEmergencies } from '@/lib/hooks';
import { getCategoryIcon } from '@/lib/icons';
import { formatPrice, discountedPrice } from '@/lib/currency';
import { StarRating } from '@/components/ui/StarRating';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/cards/ProductCard';
import { BusinessCard } from '@/components/cards/BusinessCard';
import { ServiceCard } from '@/components/cards/ServiceCard';
import type { HeroSlide } from '@/types/db';

export function HomePage() {
  const { t, language, currency, profile } = useApp();
  const { categories } = useCategories();
  const { businesses } = useBusinesses({ featured: true });
  const { products } = useProducts({ flash: true });
  const { services } = useServices();
  const { jobs } = useJobs(true);
  const { emergencies } = useEmergencies();
  const [managedHeroSlides, setManagedHeroSlides] = useState<HeroSlide[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from('hero_slides').select('*').eq('is_active', true).order('sort_order').order('created_at');
      if (active) setManagedHeroSlides((data as HeroSlide[]) || []);
    })();
    return () => { active = false; };
  }, []);

  const storeCategories = categories.filter((c) => !c.is_meta);
  const flashProducts = products.slice(0, 8);
  const featuredBusinesses = businesses.slice(0, 6);
  const topServices = services.slice(0, 6);
  const topJobs = jobs.slice(0, 4);
  const healthEmergencies = emergencies.filter((e) =>
    ['health_center', 'doctor', 'clinic'].includes(e.category)
  ).slice(0, 3);

  const metrics = [
    { icon: Store, value: '100+', label: t('metrics.businesses') },
    { icon: Package, value: '500+', label: t('metrics.products') },
    { icon: Star, value: '4.9/5', label: t('metrics.rating') },
    { icon: Bike, value: '50+', label: t('metrics.droppers') },
  ];

  const fallbackHeroSlides: HeroSlide[] = [
    { id: 'fallback-tech', title_es: 'Tecnología para todos', title_en: 'Technology for everyone', subtitle_es: 'Descubre productos, tiendas y oportunidades increíbles en Zamorapp.', subtitle_en: 'Discover products, stores and incredible opportunities on Zamorapp.', image_url: 'https://images.pexels.com/photos/30353224/pexels-photo-30353224.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', cta_label_es: 'Explorar productos', cta_label_en: 'Explore products', cta_url: '/categories', sort_order: 0, is_active: true, created_at: '', updated_at: '' },
    { id: 'fallback-mobile', title_es: 'Innovación cerca de ti', title_en: 'Innovation near you', subtitle_es: 'Encuentra la tecnología que necesitas con comercios locales.', subtitle_en: 'Find the technology you need from local businesses.', image_url: 'https://images.pexels.com/photos/12935121/pexels-photo-12935121.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', cta_label_es: 'Ver tiendas', cta_label_en: 'View stores', cta_url: '/stores', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
  ];
  const heroSlides = managedHeroSlides.length > 0 ? managedHeroSlides : fallbackHeroSlides;
  const activeHero = heroSlides[heroIndex % heroSlides.length];

  useEffect(() => {
    setHeroIndex(0);
  }, [managedHeroSlides.length]);

  useEffect(() => {
    if (heroSlides.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex((index) => (index + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white">
        <div className="absolute inset-0 opacity-20"><div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-400 blur-3xl" /><div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-secondary-400 blur-3xl" /></div>
        <div className="container-app relative grid min-h-[600px] grid-cols-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] lg:py-20">
          <motion.div key={activeHero.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative z-10">
            <span className="badge bg-white/15 text-white backdrop-blur-sm mb-5"><Zap size={12} /> {language === 'es' ? 'El marketplace que lo tiene todo' : 'The marketplace that has it all'}</span>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] md:text-6xl">{language === 'es' ? activeHero.title_es : activeHero.title_en || activeHero.title_es}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">{language === 'es' ? activeHero.subtitle_es : activeHero.subtitle_en || activeHero.subtitle_es}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={activeHero.cta_url} className="btn bg-secondary-400 text-neutral-950 hover:bg-secondary-300">{language === 'es' ? activeHero.cta_label_es : activeHero.cta_label_en || activeHero.cta_label_es}<ArrowRight size={16} /></Link>
              <Link to="/stores" className="btn bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"><Store size={16} /> {t('nav.stores')}</Link>
              {profile?.role === 'admin' && <Link to="/superadmin" className="btn bg-neutral-900/35 text-white backdrop-blur-sm hover:bg-neutral-900/50"><Shield size={16} /> {language === 'es' ? 'Administrar hero' : 'Manage hero'}</Link>}
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:grid-cols-4">
              {metrics.map((m) => { const Icon = m.icon; return <div key={m.label}><Icon size={18} className="mb-2 text-secondary-300" /><p className="text-xl font-extrabold">{m.value}</p><p className="text-xs text-white/65">{m.label}</p></div>; })}
            </div>
          </motion.div>
          <motion.div key={`${activeHero.id}-image`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55 }} className="relative z-10">
            <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-white/10 shadow-2xl">
              <img src={activeHero.image_url} alt={language === 'es' ? activeHero.title_es : activeHero.title_en || activeHero.title_es} className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[510px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-950/65 via-transparent to-transparent" />
              {heroSlides.length > 1 && <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between"><button type="button" onClick={() => setHeroIndex((index) => (index - 1 + heroSlides.length) % heroSlides.length)} className="rounded-full border border-white/30 bg-neutral-950/40 p-3 text-white backdrop-blur hover:bg-neutral-950/70" aria-label="Previous slide"><ChevronLeft size={18} /></button><div className="flex gap-1.5">{heroSlides.map((slide, index) => <button type="button" key={slide.id} onClick={() => setHeroIndex(index)} aria-label={`${language === 'es' ? 'Diapositiva' : 'Slide'} ${index + 1}`} className={`h-2 rounded-full transition-all ${index === heroIndex % heroSlides.length ? 'w-7 bg-secondary-400' : 'w-2 bg-white/60'}`} />)}</div><button type="button" onClick={() => setHeroIndex((index) => (index + 1) % heroSlides.length)} className="rounded-full border border-white/30 bg-neutral-950/40 p-3 text-white backdrop-blur hover:bg-neutral-950/70" aria-label="Next slide"><ChevronRight size={18} /></button></div>}
            </div>
          </motion.div>
        </div>
        <svg className="absolute bottom-0 left-0 w-full text-neutral-50" viewBox="0 0 1440 60" preserveAspectRatio="none" fill="currentColor"><path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" /></svg>
      </section>

      {/* Featured stores and advertising */}
      <section className="container-app py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">{language === 'es' ? 'Compra con confianza' : 'Shop with confidence'}</p>
                <h2 className="mt-1 text-xl font-bold text-neutral-900 md:text-2xl">{language === 'es' ? 'Tiendas destacadas' : 'Featured stores'}</h2>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/stores" className="hidden text-sm font-semibold text-primary-600 hover:text-primary-700 sm:inline-flex">{language === 'es' ? 'Ver todo' : 'View all'}</Link>
                <Link to="/signup?redirect=%2Fdashboard%3Ftab%3Dbusiness" className="btn-primary whitespace-nowrap px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm"><Plus size={15} /> {language === 'es' ? 'Crear tienda' : 'Create store'}</Link>
              </div>
            </div>
            {featuredBusinesses.length === 0 ? (
              <p className="text-sm text-neutral-500 py-8 text-center">{t('common.empty')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {featuredBusinesses.slice(0, 4).map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            )}
          </div>
          <AdvertisingSlot language={language} />
        </div>
      </section>

      {/* Categories */}
      <section className="container-app py-8">
        <SectionHeader title={t('section.categories')} link="/categories" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {storeCategories.map((cat, i) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/stores?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-neutral-100 bg-white p-4 shadow-card hover:shadow-card-hover hover:border-primary-200 transition"
                >
                  <span className="rounded-xl bg-primary-50 p-3 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition">
                    <Icon size={24} />
                  </span>
                  <span className="text-center text-xs font-semibold text-neutral-700 group-hover:text-primary-700 line-clamp-2">
                    {language === 'es' ? cat.name_es : cat.name_en}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Flash offers */}
      <section className="container-app py-8">
        <SectionHeader title={t('section.flash')} link="/stores?flash=1" icon={Zap} />
        {flashProducts.length === 0 ? (
          <p className="text-sm text-neutral-500 py-8 text-center">{t('common.empty')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {flashProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Featured businesses */}
      <section className="bg-white border-y border-neutral-100 py-10">
        <div className="container-app">
          <SectionHeader title={t('section.featured')} link="/stores" icon={Store} />
          {featuredBusinesses.length === 0 ? (
            <p className="text-sm text-neutral-500 py-8 text-center">{t('common.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredBusinesses.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Services */}
      <section className="container-app py-10">
        <SectionHeader title={t('section.services')} link="/services" icon={Wrench} />
        {topServices.length === 0 ? (
          <p className="text-sm text-neutral-500 py-8 text-center">{t('common.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topServices.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      {/* Jobs preview */}
      <section className="bg-white border-y border-neutral-100 py-10">
        <div className="container-app">
          <SectionHeader title={t('section.jobs')} link="/jobs" icon={Briefcase} />
          {topJobs.length === 0 ? (
            <p className="text-sm text-neutral-500 py-8 text-center">{t('common.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topJobs.map((j) => (
                <Link
                  key={j.id}
                  to="/jobs"
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 p-4 hover:border-primary-200 hover:bg-primary-50/30 transition"
                >
                  <span className="rounded-xl bg-accent-50 p-2.5 text-accent-600">
                    <Briefcase size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 truncate">{j.title}</p>
                    <p className="text-xs text-neutral-500 truncate">
                      {j.business?.name} · {j.location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {j.salary_range && <p className="text-sm font-semibold text-success-700">{j.salary_range}</p>}
                    <span className="badge bg-success-100 text-success-700">{j.job_type.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Health & emergency */}
      <section className="container-app py-10">
        <SectionHeader title={t('section.emergency')} link="/health" icon={Siren} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {healthEmergencies.map((e) => (
            <a
              key={e.id}
              href={`tel:${e.phone}`}
              className="card p-5 hover:shadow-card-hover transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="rounded-xl bg-error-50 p-2.5 text-error-600">
                  <Siren size={20} />
                </span>
                <div>
                  <p className="font-semibold text-neutral-900">{e.name}</p>
                  <p className="text-xs text-neutral-500 capitalize">{e.category.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-700 font-medium">
                <Phone size={14} />
                {e.phone}
              </div>
              {e.address && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                  <MapPin size={12} />
                  {e.address}
                </div>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* Horizontal advertising strip */}
      <section className="container-app py-4">
        <div className="relative flex min-h-[96px] items-center justify-between gap-4 overflow-hidden rounded-3xl bg-primary-900 px-6 py-5 text-white shadow-card sm:px-10">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-secondary-400/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="rounded-xl bg-white/10 p-2.5 text-secondary-300"><Megaphone size={20} /></span>
            <div>
              <p className="text-sm font-bold sm:text-base">{language === 'es' ? 'Haz que tu negocio sea imposible de ignorar' : 'Make your business impossible to ignore'}</p>
              <p className="text-xs text-white/70">{language === 'es' ? 'Publicidad visible para toda la comunidad Zamorapp.' : 'Visible advertising for the whole Zamorapp community.'}</p>
            </div>
          </div>
          <Link to="/checkout?advertising=weekly" className="btn relative shrink-0 bg-secondary-400 text-neutral-950 hover:bg-secondary-300">
            {language === 'es' ? 'Reservar' : 'Reserve'} <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="container-app py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-primary-900 text-white p-8 md:p-12">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {language === 'es' ? '¿Tienes un negocio o quieres ganar dinero?' : 'Have a business or want to earn money?'}
            </h2>
            <p className="text-white/80 mb-6">
              {language === 'es'
                ? 'Únete a Zamorapp y llega a toda tu comunidad. Registra tu negocio, ofrece servicios, publica empleos o conviértete en repartidor.'
                : 'Join Zamorapp and reach your whole community. Register your business, offer services, post jobs or become a dropper.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup" className="btn bg-white text-neutral-900 hover:bg-neutral-100">
                {language === 'es' ? 'Crear cuenta' : 'Create account'}
                <ArrowRight size={16} />
              </Link>
              <Link to="/droppers" className="btn bg-white/10 text-white hover:bg-white/20">
                <Bike size={16} />
                {language === 'es' ? 'Ser repartidor' : 'Become a dropper'}
              </Link>
            </div>
          </div>
          <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-primary-500/30 blur-2xl" />
        </div>
      </section>
    </div>
  );
}

function AdvertisingSlot({ language }: { language: 'es' | 'en' }) {
  return (
    <aside className="relative overflow-hidden rounded-[28px] bg-neutral-950 text-white shadow-card lg:sticky lg:top-24">
      <img
        src="https://images.pexels.com/photos/30353224/pexels-photo-30353224.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
        alt={language === 'es' ? 'Publicidad de tecnología' : 'Technology advertisement'}
        className="h-[520px] w-full object-cover opacity-70 lg:h-[780px]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <span className="badge bg-white/15 text-white backdrop-blur-sm">
          <Megaphone size={12} /> {language === 'es' ? 'Espacio publicitario' : 'Advertising space'}
        </span>
        <h3 className="mt-4 text-2xl font-bold">{language === 'es' ? 'iPhone 18' : 'iPhone 18'}</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">
          {language === 'es' ? 'Tecnología que destaca. Reserva este espacio para que tu negocio aparezca aquí.' : 'Technology that stands out. Reserve this space for your business to appear here.'}
        </p>
        <Link to="/checkout?advertising=weekly" className="btn mt-5 w-full bg-white text-neutral-950 hover:bg-neutral-100">
          <Plus size={16} /> {language === 'es' ? 'Alquila este espacio' : 'Rent this space'}
        </Link>
      </div>
    </aside>
  );
}

function SectionHeader({ title, link, icon: Icon }: { title: string; link?: string; icon?: typeof Store }) {
  const { language } = useApp();
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="rounded-lg bg-primary-50 p-2 text-primary-600">
            <Icon size={18} />
          </span>
        )}
        <h2 className="text-xl md:text-2xl font-bold text-neutral-900">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
          {language === 'es' ? 'Ver todo' : 'View all'}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
