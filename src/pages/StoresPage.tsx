import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Store as StoreIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useBusinesses, useCategories } from '@/lib/hooks';
import { BusinessCard } from '@/components/cards/BusinessCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

export function StoresPage() {
  const { t, language } = useApp();
  const [params] = useSearchParams();
  const categoryParam = params.get('category');
  const flashParam = params.get('flash');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(categoryParam);
  const { categories } = useCategories();
  const { businesses, loading } = useBusinesses({ categorySlug: category || undefined, search: search || undefined });

  const filtered = useMemo(() => {
    if (flashParam) {
      return businesses.filter((b) => b.is_featured);
    }
    return businesses;
  }, [businesses, flashParam]);

  const storeCats = categories.filter((c) => !c.is_meta);

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">
          {language === 'es' ? 'Tiendas y Comercios' : 'Stores & Shops'}
        </h1>
        <p className="text-sm text-neutral-500">
          {language === 'es' ? 'Descubre negocios locales aprobados' : 'Discover approved local businesses'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="card p-4 sticky top-24">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal size={16} className="text-primary-600" />
              <h2 className="text-sm font-bold text-neutral-900 uppercase">
                {language === 'es' ? 'Categorías' : 'Categories'}
              </h2>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setCategory(null)}
                className={`flex w-full items-center px-3 py-2 rounded-lg text-sm transition ${
                  !category ? 'bg-primary-50 text-primary-700 font-semibold' : 'hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                {t('common.all')}
              </button>
              {storeCats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.slug)}
                  className={`flex w-full items-center px-3 py-2 rounded-lg text-sm transition ${
                    category === c.slug ? 'bg-primary-50 text-primary-700 font-semibold' : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  {language === 'es' ? c.name_es : c.name_en}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="relative mb-5">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="input pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={StoreIcon} title={t('common.empty')} description={language === 'es' ? 'Prueba con otra búsqueda o categoría.' : 'Try another search or category.'} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
