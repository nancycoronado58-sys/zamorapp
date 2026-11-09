import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { uploadMedia } from '@/lib/storage';
import { sendEmailNotification } from '@/lib/email';
import type { Job } from '@/types/db';
import { Loader2, Upload, Send } from 'lucide-react';

interface Props {
  job: Job;
  onSuccess: () => void;
}

export function JobApplicationForm({ job, onSuccess }: Props) {
  const { profile, t, language } = useApp();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.display_name || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [coverNote, setCoverNote] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadMedia(file, 'cvs');
      setCvUrl(url);
      toast(language === 'es' ? 'CV subido' : 'CV uploaded', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setError(t('review.login'));
      return;
    }
    setSubmitting(true);
    setError('');

    const { error } = await supabase.from('job_applications').insert({
      job_id: job.id,
      applicant_id: profile.id,
      full_name: fullName,
      email,
      phone,
      cover_note: coverNote,
      cv_url: cvUrl,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    const { data: employer } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', job.business_id)
      .maybeSingle();
    let employerEmail: string | undefined;
    if (employer?.owner_id) {
      const { data: ep } = await supabase.from('profiles').select('email').eq('id', employer.owner_id).maybeSingle();
      employerEmail = ep?.email;
    }
    sendEmailNotification({
      type: 'job_application',
      to: employerEmail || email,
      jobTitle: job.title,
      applicantName: fullName,
      employerEmail,
    });

    toast(language === 'es' ? 'Postulación enviada' : 'Application submitted', 'success');
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-neutral-600 mb-2">
        {language === 'es' ? 'Postulando a' : 'Applying to'}: <span className="font-semibold text-neutral-900">{job.title}</span>
      </p>
      <div>
        <label className="label">{t('checkout.name')}</label>
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">{t('checkout.email')}</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">{t('checkout.phone')}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
        </div>
      </div>
      <div>
        <label className="label">CV / Curriculum</label>
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 p-5 cursor-pointer hover:border-primary-300 transition">
          <input type="file" accept=".pdf,.doc,.docx" onChange={handleFile} className="hidden" />
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-primary-600" />
          ) : cvUrl ? (
            <span className="text-sm text-success-700 font-medium">✓ {language === 'es' ? 'CV cargado' : 'CV uploaded'}</span>
          ) : (
            <>
              <Upload size={20} className="text-neutral-400" />
              <span className="text-xs text-neutral-500">{language === 'es' ? 'Subir PDF (máx 5MB)' : 'Upload PDF (max 5MB)'}</span>
            </>
          )}
        </label>
      </div>
      <div>
        <label className="label">{language === 'es' ? 'Nota de presentación' : 'Cover note'}</label>
        <textarea value={coverNote} onChange={(e) => setCoverNote(e.target.value)} rows={3} className="input" />
      </div>

      {error && <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">{error}</div>}

      <button type="submit" disabled={submitting || !profile} className="btn-primary w-full">
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {t('btn.apply')}
      </button>
      {!profile && <p className="text-xs text-center text-neutral-500">{t('review.login')}</p>}
    </form>
  );
}
