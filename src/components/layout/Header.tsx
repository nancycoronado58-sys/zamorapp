import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, ShoppingCart, Plus, Menu, X, ChevronDown, User, LogOut,
  LayoutDashboard, Shield, Package, Store, Wrench, Briefcase, Siren, Bike, Globe, Phone, MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import type { Business, Product, Service, Job, EmergencyContact } from '@/types/db';
import { cn, getInitials } from '@/lib/utils';
import { whatsappUrl } from '@/lib/siteSettings';

interface SearchResult {
  type: 'business' | 'product' | 'service' | 'job' | 'emergency';
  label: string;
  sub: string;
  href: string;
}

export function Header({ onOpenPublish }: { onOpenPublish: () => void }) {
  const { t, language, setLanguage, currency, setCurrency, profile, signOut } = useApp();
  const { count, open: openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { to: '/categories', label: t('nav.categories'), icon: Package },
    { to: '/stores', label: t('nav.stores'), icon: Store },
    { to: '/services', label: t('nav.services'), icon: Wrench },
    { to: '/jobs', label: t('nav.jobs'), icon: Briefcase },
    { to: '/health', label: t('nav.health'), icon: Siren },
    { to: '/droppers', label: t('nav.droppers'), icon: Bike },
  ];

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const q = search.trim().toLowerCase();
    let cancelled = false;

    (async () => {
      const [biz, prod, serv, jobs, emerg] = await Promise.all([
        supabase.from('businesses').select('name, slug, bio').ilike('name', `%${q}%`).limit(4),
        supabase.from('products').select('name, business_id, business:businesses(slug)').ilike('name', `%${q}%`).limit(4),
        supabase.from('services').select('name, business_id, business:businesses(slug)').ilike('name', `%${q}%`).limit(3),
        supabase.from('jobs').select('title, id').ilike('title', `%${q}%`).limit(3),
        supabase.from('emergency_contacts').select('name, phone, category').ilike('name', `%${q}%`).limit(2),
      ]);

      if (cancelled) return;

      const r: SearchResult[] = [];
      (biz.data as Business[])?.forEach((b) =>
        r.push({ type: 'business', label: b.name, sub: b.bio?.slice(0, 50) || 'Tienda', href: `/business/${b.slug}` })
      );
      (prod.data as unknown as (Product & { business?: { slug: string } })[])?.forEach((p) =>
        r.push({
          type: 'product',
          label: p.name,
          sub: 'Producto',
          href: p.business?.slug ? `/business/${p.business.slug}` : '/stores',
        })
      );
      (serv.data as unknown as (Service & { business?: { slug: string } })[])?.forEach((s) =>
        r.push({
          type: 'service',
          label: s.name,
          sub: 'Servicio',
          href: s.business?.slug ? `/business/${s.business.slug}` : '/services',
        })
      );
      (jobs.data as Job[])?.forEach((j) =>
        r.push({ type: 'job', label: j.title, sub: 'Empleo', href: '/jobs' })
      );
      (emerg.data as EmergencyContact[])?.forEach((e) =>
        r.push({ type: 'emergency', label: e.name, sub: e.phone, href: '/health' })
      );
      setResults(r);
    })();

    return () => {
      cancelled = true;
    };
  }, [search]);

  const handleResultClick = (href: string) => {
    setShowResults(false);
    setSearch('');
    navigate(href);
  };

  const dashboardLink = profile?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
      <div className="container-app">
        <div className="flex items-center gap-3 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-lg">
              Z
            </div>
            <span className="text-xl font-extrabold font-display text-neutral-900 hidden sm:block">
              Zamora<span className="text-primary-600">app</span>
            </span>
          </Link>

          {/* Search */}
          <div ref={searchRef} className="relative flex-1 max-w-xl hidden md:block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowResults(true)}
              placeholder={t('hero.search')}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
            />
            <AnimatePresence>
              {showResults && results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-card-hover border border-neutral-100 overflow-hidden"
                >
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleResultClick(r.href)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-neutral-50 transition text-left border-b border-neutral-50 last:border-0"
                    >
                      <span className="rounded-lg bg-primary-50 p-1.5">
                        {r.type === 'business' && <Store size={14} className="text-primary-600" />}
                        {r.type === 'product' && <Package size={14} className="text-primary-600" />}
                        {r.type === 'service' && <Wrench size={14} className="text-primary-600" />}
                        {r.type === 'job' && <Briefcase size={14} className="text-primary-600" />}
                        {r.type === 'emergency' && <Siren size={14} className="text-error-600" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{r.label}</p>
                        <p className="text-xs text-neutral-500 truncate">{r.sub}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Publish */}
            <button onClick={onOpenPublish} className="btn-secondary hidden sm:flex">
              <Plus size={16} />
              {t('nav.publish')}
            </button>

            {/* Language & Currency */}
            <div className="relative">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="btn-ghost px-2"
                aria-label="Language"
              >
                <Globe size={18} />
                <span className="text-xs font-semibold uppercase">{language}</span>
                <ChevronDown size={12} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-card-hover border border-neutral-100 p-2 z-50"
                    onMouseLeave={() => setLangOpen(false)}
                  >
                    <p className="text-xs font-semibold text-neutral-400 px-2 py-1 uppercase">Idioma</p>
                    {(['es', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLanguage(l); setLangOpen(false); }}
                        className={cn(
                          'flex w-full items-center px-2 py-1.5 rounded-lg text-sm transition',
                          language === l ? 'bg-primary-50 text-primary-700 font-semibold' : 'hover:bg-neutral-50 text-neutral-700'
                        )}
                      >
                        {l === 'es' ? 'Español' : 'English'}
                      </button>
                    ))}
                    <div className="h-px bg-neutral-100 my-1.5" />
                    <p className="text-xs font-semibold text-neutral-400 px-2 py-1 uppercase">Moneda</p>
                    {(['VES', 'USD', 'EUR'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCurrency(c); setLangOpen(false); }}
                        className={cn(
                          'flex w-full items-center px-2 py-1.5 rounded-lg text-sm transition',
                          currency === c ? 'bg-primary-50 text-primary-700 font-semibold' : 'hover:bg-neutral-50 text-neutral-700'
                        )}
                      >
                        {c === 'VES' ? 'REF. (Bs)' : c}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cart */}
            <button onClick={openCart} className="relative btn-ghost px-2.5" aria-label="Cart">
              <ShoppingCart size={20} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-500 text-white text-xs font-bold px-1">
                  {count}
                </span>
              )}
            </button>

            {/* User */}
            {profile ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-neutral-100 transition"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold">
                      {getInitials(profile.display_name)}
                    </span>
                  )}
                  <ChevronDown size={14} className="text-neutral-400 hidden sm:block" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-card-hover border border-neutral-100 p-2 z-50"
                      onMouseLeave={() => setUserMenuOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                        <p className="text-sm font-semibold text-neutral-800 truncate">{profile.display_name}</p>
                        <p className="text-xs text-neutral-500 truncate">{profile.role.replace('_', ' ')}</p>
                      </div>
                      <MenuItem icon={LayoutDashboard} label={t('nav.dashboard')} to={dashboardLink} />
                      <MenuItem icon={Package} label={t('nav.myOrders')} to="/orders" />
                      <MenuItem icon={User} label={t('nav.profile')} to="/profile" />
                      {profile.role === 'admin' && <MenuItem icon={Shield} label={t('nav.admin')} to="/admin" />}
                      <div className="h-px bg-neutral-100 my-1" />
                      <button
                        onClick={() => { signOut(); navigate('/'); }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error-600 hover:bg-error-50 transition"
                      >
                        <LogOut size={16} />
                        {t('nav.signOut')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link to="/signin" className="btn-ghost">{t('nav.signIn')}</Link>
                <Link to="/signup" className="btn-primary">{t('nav.signUp')}</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileOpen((o) => !o)} className="btn-ghost px-2 md:hidden">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Nav links - desktop */}
        <nav className="hidden md:flex items-center gap-1 h-12 border-t border-neutral-100">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition',
                  active ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                )}
              >
                <Icon size={15} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-neutral-100 bg-white"
          >
            <div className="container-app py-4 space-y-2">
              <div className="relative mb-3">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('hero.search')}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <Icon size={18} className="text-primary-600" />
                    {link.label}
                  </Link>
                );
              })}
              <button onClick={onOpenPublish} className="btn-secondary w-full">
                <Plus size={16} />
                {t('nav.publish')}
              </button>
              {!profile && (
                <div className="flex gap-2 pt-2">
                  <Link to="/signin" className="btn-outline flex-1">{t('nav.signIn')}</Link>
                  <Link to="/signup" className="btn-primary flex-1">{t('nav.signUp')}</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuItem({ icon: Icon, label, to }: { icon: typeof User; label: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 transition">
      <Icon size={16} className="text-neutral-400" />
      {label}
    </Link>
  );
}

export function LayoutShell({ children, onOpenPublish }: { children: ReactNode; onOpenPublish: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenPublish={onOpenPublish} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

import { Store as StoreIcon, Mail, MapPin } from 'lucide-react';

function Footer() {
  const { language, settings } = useApp();
  return (
    <footer className="bg-neutral-900 text-neutral-300 mt-16">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white font-bold">Z</div>
              <span className="text-xl font-extrabold font-display text-white">Zamora<span className="text-primary-400">app</span></span>
            </div>
            <p className="text-sm text-neutral-400">
              {language === 'es'
                ? 'El marketplace, directorio y red de entrega local de tu ciudad.'
                : 'The local marketplace, directory, and delivery network of your town.'}
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
              {language === 'es' ? 'Explorar' : 'Explore'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/stores" className="hover:text-white transition">{t_nav(language, 'stores')}</Link></li>
              <li><Link to="/services" className="hover:text-white transition">{t_nav(language, 'services')}</Link></li>
              <li><Link to="/jobs" className="hover:text-white transition">{t_nav(language, 'jobs')}</Link></li>
              <li><Link to="/health" className="hover:text-white transition">{t_nav(language, 'health')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
              {language === 'es' ? 'Comunidad' : 'Community'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/droppers" className="hover:text-white transition">{t_nav(language, 'droppers')}</Link></li>
              <li><Link to="/signup" className="hover:text-white transition">{language === 'es' ? 'Publicar negocio' : 'List your business'}</Link></li>
              <li><Link to="/admin" className="hover:text-white transition">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
              {language === 'es' ? 'Contacto' : 'Contact'}
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><MapPin size={14} /> {settings.office_address || 'Zamora, VE'}</li>
              <li><a href={`tel:${settings.contact_phone}`} className="flex items-center gap-2 hover:text-white transition"><Phone size={14} /> {settings.contact_phone_display}</a></li>
              <li><a href={whatsappUrl(settings)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-success-400 hover:text-success-300 transition"><MessageCircle size={14} /> WhatsApp</a></li>
              <li className="flex items-center gap-2"><Mail size={14} /> {settings.contact_email}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">© 2026 Zamorapp. {language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <StoreIcon size={14} /> Zamorapp.com
          </div>
        </div>
      </div>
    </footer>
  );
}

function t_nav(lang: 'es' | 'en', key: 'stores' | 'services' | 'jobs' | 'health' | 'droppers'): string {
  const map = {
    es: { stores: 'Tiendas', services: 'Servicios', jobs: 'Empleos', health: 'Salud & Emergencias', droppers: 'Repartidores' },
    en: { stores: 'Stores', services: 'Services', jobs: 'Jobs', health: 'Health & Emergencies', droppers: 'Droppers' },
  };
  return map[lang][key];
}
