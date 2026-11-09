import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, Clock, DollarSign, ArrowRight, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useJobs } from '@/lib/hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { JobApplicationForm } from '@/components/forms/JobApplicationForm';
import type { Job } from '@/types/db';

export function JobsPage() {
  const { t, language } = useApp();
  const { jobs, loading } = useJobs(true);
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const filtered = jobs.filter(
    (j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.business?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const jobTypeLabels: Record<string, string> = {
    full_time: language === 'es' ? 'Tiempo completo' : 'Full time',
    part_time: language === 'es' ? 'Medio tiempo' : 'Part time',
    temporary: language === 'es' ? 'Temporal' : 'Temporary',
    contract: language === 'es' ? 'Por contrato' : 'Contract',
  };

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">
          {language === 'es' ? 'Bolsa de Empleo Local' : 'Local Job Board'}
        </h1>
        <p className="text-sm text-neutral-500">
          {language === 'es' ? 'Encuentra trabajo en negocios de tu ciudad' : 'Find work at businesses in your town'}
        </p>
      </div>

      <div className="relative mb-5 max-w-xl">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === 'es' ? 'Buscar empleos…' : 'Search jobs…'}
          className="input pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title={t('common.empty')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((j) => (
            <div key={j.id} className="card p-5 hover:shadow-card-hover transition flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <span className="rounded-xl bg-accent-50 p-2.5 text-accent-600 shrink-0">
                  <Briefcase size={20} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-neutral-900">{j.title}</h3>
                  <Link to={`/business/${j.business?.slug}`} className="text-xs text-primary-600 hover:underline">
                    {j.business?.name}
                  </Link>
                </div>
                <span className="badge bg-accent-100 text-accent-700">{jobTypeLabels[j.job_type]}</span>
              </div>
              <p className="text-sm text-neutral-600 line-clamp-2 mb-3">{j.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-neutral-500 mb-3">
                {j.location && (
                  <span className="flex items-center gap-1"><MapPin size={12} /> {j.location}</span>
                )}
                {j.salary_range && (
                  <span className="flex items-center gap-1 text-success-700 font-semibold"><DollarSign size={12} /> {j.salary_range}</span>
                )}
                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(j.created_at).toLocaleDateString()}</span>
              </div>
              <button onClick={() => setSelectedJob(j)} className="btn-primary mt-auto self-start">
                {t('btn.apply')}
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selectedJob} onClose={() => setSelectedJob(null)} title={selectedJob?.title}>
        {selectedJob && <JobApplicationForm job={selectedJob} onSuccess={() => setSelectedJob(null)} />}
      </Modal>
    </div>
  );
}
