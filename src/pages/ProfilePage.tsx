import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Loader2, Save, Lock, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { User } from 'lucide-react';
import type { Currency, Language } from '@/types/db';

export function ProfilePage() {
  const { profile, t, language, setLanguage, currency, setCurrency, refreshProfile, session } = useApp();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (!profile) {
    return <div className="container-app py-16"><EmptyState icon={User} title={t('review.login')} action={<Link to="/signin" className="btn-primary">{t('nav.signIn')}</Link>} /></div>;
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: name, phone, preferred_language: language, preferred_currency: currency }).eq('id', profile.id);
    setSaving(false);
    if (error) { toast(t('common.error'), 'error'); return; }
    await refreshProfile();
    toast(language === 'es' ? 'Perfil actualizado' : 'Profile updated', 'success');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError(t('auth.changePassword.tooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.changePassword.mismatch'));
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError(
        language === 'es'
          ? 'No se pudo actualizar la contraseña. Inténtalo de nuevo.'
          : 'The password could not be updated. Try again.'
      );
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    toast(t('auth.changePassword.success'), 'success');
  };

  return (
    <div className="container-app py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t('nav.profile')}</h1>

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white text-xl font-bold">
              {profile.display_name[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-neutral-900">{profile.display_name}</p>
            <p className="text-sm text-neutral-500">{session?.user?.email}</p>
            <span className="badge bg-primary-50 text-primary-700 mt-1">{profile.role.replace('_', ' ')}</span>
          </div>
        </div>

        <div>
          <label className="label">{t('auth.name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">{t('checkout.phone')}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Idioma</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="input">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="label">Moneda</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="input">
              <option value="VES">VES (REF.)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {language === 'es' ? 'Guardar' : 'Save'}
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="rounded-lg bg-primary-50 p-2 text-primary-600">
            <KeyRound size={18} />
          </span>
          <h2 className="text-lg font-bold text-neutral-900">{t('auth.changePassword')}</h2>
        </div>
        <p className="text-sm text-neutral-500 mb-4">
          {language === 'es'
            ? 'Mantén tu cuenta segura con una contraseña que solo tú conozcas.'
            : 'Keep your account safe with a password only you know.'}
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">{t('auth.changePassword.new')}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input pl-9"
                placeholder="••••••••"
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>

          {passwordError && (
            <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
              {passwordError}
            </div>
          )}

          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {t('auth.changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
