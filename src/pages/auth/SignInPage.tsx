import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, KeyRound, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

export function SignInPage() {
  const { t, language } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);

    if (error) {
      const message = error.message.toLowerCase();
      const isInvalidCredentials = error.code === 'invalid_credentials' || message.includes('invalid login credentials');
      const isEmailNotConfirmed = error.code === 'email_not_confirmed' || message.includes('email not confirmed');
      const isConnectionError = error.name === 'AuthRetryableFetchError'
        || message.includes('failed to fetch')
        || message.includes('network')
        || message.includes('timeout')
        || message.includes('connect');

      if (isInvalidCredentials) {
        setError(t('auth.error.invalid'));
      } else if (isEmailNotConfirmed) {
        setError(language === 'es' ? 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.' : 'You must confirm your email before signing in. Check your inbox.');
      } else if (isConnectionError) {
        setError(language === 'es' ? 'No se pudo conectar con el servicio de autenticación. Revisa tu conexión e inténtalo de nuevo.' : 'The authentication service could not be reached. Check your connection and try again.');
      } else {
        setError(language === 'es' ? 'No se pudo iniciar sesión. Revisa los datos e inténtalo de nuevo.' : 'We could not sign you in. Check your details and try again.');
      }
      return;
    }
    toast(language === 'es' ? 'Sesión iniciada' : 'Signed in', 'success');
    navigate(redirect);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setForgotSending(false);

    if (error) {
      const message = error.message.toLowerCase();
      const isRedirectError = message.includes('redirect') || message.includes('url') || message.includes('not allowed');
      const isEmailDeliveryError = message.includes('sending') || message.includes('smtp') || message.includes('email');
      const friendlyMessage = isRedirectError
        ? language === 'es'
          ? 'El enlace no puede volver a esta página porque la dirección de recuperación no está autorizada en Supabase.'
          : 'The link cannot return to this page because the recovery address is not authorized in Supabase.'
        : isEmailDeliveryError
          ? language === 'es'
            ? 'Supabase no pudo enviar el correo de recuperación. Revisa la configuración del servicio de correo y vuelve a intentarlo.'
            : 'Supabase could not send the recovery email. Check the email service configuration and try again.'
          : language === 'es'
            ? 'No se pudo enviar el enlace. Verifica el correo e inténtalo de nuevo.'
            : 'The link could not be sent. Check your email and try again.';
      setForgotError(`${friendlyMessage} (${error.message})`);
      return;
    }
    setForgotSent(true);
    toast(t('auth.forgotPassword.success'), 'success');
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotSent(false);
    setForgotEmail('');
    setForgotError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-xl">Z</div>
          <span className="text-2xl font-extrabold font-display text-neutral-900">Zamora<span className="text-primary-600">app</span></span>
        </Link>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-neutral-900 mb-1">{t('auth.signIn.title')}</h1>
          <p className="text-sm text-neutral-500 mb-5">
            {language === 'es' ? 'Ingresa a tu cuenta Zamorapp' : 'Sign in to your Zamorapp account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs text-primary-600 font-semibold hover:underline"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {t('auth.signIn.title')}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-neutral-100 text-center text-sm">
            <span className="text-neutral-500">{language === 'es' ? '¿No tienes cuenta?' : "Don't have an account?"} </span>
            <Link to="/signup" className="text-primary-600 font-semibold hover:underline">
              {t('auth.signUp.title')}
            </Link>
          </div>
        </div>

      </div>

      <Modal
        open={forgotOpen}
        onClose={closeForgot}
        title={forgotSent ? '' : t('auth.forgotPassword.title')}
        size="sm"
      >
        {forgotSent ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <div className="rounded-full bg-success-100 p-3">
              <CheckCircle size={28} className="text-success-600" />
            </div>
            <p className="text-sm text-neutral-700">{t('auth.forgotPassword.success')}</p>
            <button onClick={closeForgot} className="btn-primary mt-2">
              {language === 'es' ? 'Entendido' : 'Got it'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="rounded-xl bg-primary-50 p-2.5 text-primary-600">
                <KeyRound size={20} />
              </span>
              <p className="text-sm text-neutral-500">{t('auth.forgotPassword.desc')}</p>
            </div>
            <div>
              <label className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="hola@email.com"
                  autoFocus
                />
              </div>
            </div>
            {forgotError && (
              <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
                {forgotError}
              </div>
            )}
            <button type="submit" disabled={forgotSending} className="btn-primary w-full">
              {forgotSending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {t('auth.forgotPassword.send')}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
