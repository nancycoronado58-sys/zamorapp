import { useApp } from '@/context/AppContext';
import { useCategories } from '@/lib/hooks';
import { getCategoryIcon } from '@/lib/icons';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/Spinner';

export function CategoriesPage() {
  const { language } = useApp();
  const { categories, loading } = useCategories();

  const storeCats = categories.filter((c) => !c.is_meta);
  const metaCats = categories.filter((c) => c.is_meta);

  const metaHrefs: Record<string, string> = {
    empleos: '/jobs',
    salud: '/health',
    repartidores: '/droppers',
  };

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">
          {language === 'es' ? 'Explora por Categoría' : 'Explore by Category'}
        </h1>
        <p className="text-sm text-neutral-500">
          {language === 'es' ? 'Todo lo que ofrece tu comunidad local' : 'Everything your local community offers'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
          <h2 className="text-lg font-bold text-neutral-800 mb-3">
            {language === 'es' ? 'Tiendas y Productos' : 'Stores & Products'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {storeCats.map((cat, i) => {
              const Icon = getCategoryIcon(cat.icon);
              return (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link
                    to={`/stores?category=${cat.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-card hover:shadow-card-hover hover:border-primary-200 transition"
                  >
                    <span className="rounded-xl bg-primary-50 p-3 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition">
                      <Icon size={24} />
                    </span>
                    <div>
                      <p className="font-semibold text-neutral-900 text-sm">
                        {language === 'es' ? cat.name_es : cat.name_en}
                      </p>
                      <p className="text-xs text-neutral-400">{language === 'es' ? 'Ver tiendas' : 'View stores'}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <h2 className="text-lg font-bold text-neutral-800 mb-3">
            {language === 'es' ? 'Secciones Especiales' : 'Special Sections'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {metaCats.map((cat, i) => {
              const Icon = getCategoryIcon(cat.icon);
              return (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link
                    to={metaHrefs[cat.slug] || '/'}
                    className="group flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-5 shadow-card hover:shadow-card-hover hover:border-primary-200 transition"
                  >
                    <span className="rounded-xl bg-accent-50 p-3 text-accent-600 group-hover:bg-accent-600 group-hover:text-white transition">
                      <Icon size={24} />
                    </span>
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {language === 'es' ? cat.name_es : cat.name_en}
                      </p>
                      <p className="text-xs text-neutral-400">{language === 'es' ? 'Explorar' : 'Explore'}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
