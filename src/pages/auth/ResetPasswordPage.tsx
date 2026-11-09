import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';

export function ResetPasswordPage() {
  const { t, language } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t('auth.changePassword.tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.changePassword.mismatch'));
      return;
    }

    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      setError(
        language === 'es'
          ? 'El enlace de recuperación no es válido o ya expiró. Solicita un enlace nuevo desde Iniciar sesión.'
          : 'The recovery link is invalid or has expired. Request a new link from Sign in.'
      );
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(
        language === 'es'
          ? 'No se pudo actualizar la contraseña. El enlace puede haber expirado; solicita uno nuevo.'
          : 'The password could not be updated. The link may have expired; request a new one.'
      );
      return;
    }

    setDone(true);
    toast(t('auth.resetPassword.success'), 'success');
    setTimeout(() => navigate('/signin'), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-xl">Z</div>
          <span className="text-2xl font-extrabold font-display text-neutral-900">Zamora<span className="text-primary-600">app</span></span>
        </Link>

        <div className="card p-6">
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="rounded-full bg-success-100 p-3">
                <CheckCircle size={28} className="text-success-600" />
              </div>
              <h1 className="text-lg font-bold text-neutral-900">{t('auth.resetPassword.success')}</h1>
              <p className="text-sm text-neutral-500">
                {language === 'es' ? 'Te redirigiremos al inicio de sesión…' : 'Redirecting you to sign in…'}
              </p>
              <Link to="/signin" className="btn-primary mt-2">
                {t('auth.signIn.title')}
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-neutral-900 mb-1">{t('auth.resetPassword.title')}</h1>
              <p className="text-sm text-neutral-500 mb-5">{t('auth.resetPassword.desc')}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">{t('auth.changePassword.new')}</label>
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
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="label">{t('auth.changePassword.confirm')}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="input pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {language === 'es' ? 'Guardar nueva contraseña' : 'Save new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
