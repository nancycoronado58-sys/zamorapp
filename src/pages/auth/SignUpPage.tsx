import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Store, Briefcase, Bike, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendEmailNotification } from '@/lib/email';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import type { Role } from '@/types/db';
import { cn } from '@/lib/utils';

export function SignUpPage() {
  const { t, language, settings } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>((params.get('role') as Role) || 'customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const roles: { value: Role; label: string; icon: typeof Store }[] = [
    { value: 'customer', label: t('auth.role.customer'), icon: ShoppingBag },
    { value: 'business_owner', label: t('auth.role.business_owner'), icon: Store },
    { value: 'job_seeker', label: t('auth.role.job_seeker'), icon: Briefcase },
    { value: 'dropper', label: t('auth.role.dropper'), icon: Bike },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConfirmationRequired(false);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { display_name: name.trim(), role },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLoading(false);

    if (error) {
      const message = error.message.toLowerCase();
      setError(message.includes('already') || message.includes('registered') ? t('auth.error.exists') : t('common.error'));
      return;
    }
    if (!data.user) {
      setError(t('common.error'));
      return;
    }

    void sendEmailNotification({ type: 'welcome', to: normalizedEmail, userName: name });
    void sendEmailNotification({ type: 'user_registered', to: settings.admin_email, userName: name, role });

    if (!data.session) {
      setConfirmationRequired(true);
      return;
    }

    toast(language === 'es' ? 'Cuenta creada con éxito' : 'Account created successfully', 'success');
    navigate(redirect);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-xl">Z</div>
          <span className="text-2xl font-extrabold font-display text-neutral-900">Zamora<span className="text-primary-600">app</span></span>
        </Link>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-neutral-900 mb-1">{t('auth.signUp.title')}</h1>
          <p className="text-sm text-neutral-500 mb-5">
            {language === 'es' ? 'Únete a la comunidad Zamorapp' : 'Join the Zamorapp community'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.name')}</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-9"
                  placeholder={language === 'es' ? 'Tu nombre' : 'Your name'}
                />
              </div>
            </div>
            <div>
              <label className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="hola@email.com"
                />
              </div>
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="label">{t('auth.role')}</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition',
                        role === r.value
                          ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-xs font-semibold">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {confirmationRequired && (
              <div className="rounded-lg bg-success-50 border border-success-200 px-3 py-2 text-sm text-success-700">
                {language === 'es' ? 'Cuenta creada. Confirma tu correo electrónico para poder iniciar sesión.' : 'Account created. Confirm your email before signing in.'}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {t('auth.signUp.title')}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-neutral-100 text-center text-sm">
            <span className="text-neutral-500">{language === 'es' ? '¿Ya tienes cuenta?' : 'Already have an account?'} </span>
            <Link to="/signin" className="text-primary-600 font-semibold hover:underline">
              {t('auth.signIn.title')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
