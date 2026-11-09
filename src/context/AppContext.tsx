import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, Language, Currency } from '@/types/db';
import { t as translate, type TranslationKey } from '@/lib/i18n';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/siteSettings';

interface AppContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  language: Language;
  currency: Currency;
  settings: SiteSettings;
  setLanguage: (l: Language) => void;
  setCurrency: (c: Currency) => void;
  t: (key: TranslationKey) => string;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const LANG_KEY = 'zamorapp_language';
const CURR_KEY = 'zamorapp_currency';

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem(LANG_KEY) as Language) || 'es'
  );
  const [currency, setCurrencyState] = useState<Currency>(
    () => (localStorage.getItem(CURR_KEY) as Currency) || 'VES'
  );
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  const setLanguage = (l: Language) => {
    setLanguageState(l);
    localStorage.setItem(LANG_KEY, l);
  };

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(CURR_KEY, c);
  };

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const refreshSettings = useCallback(async () => {
    const { data, error } = await supabase.from('site_settings').select('key, value');
    if (error || !Array.isArray(data)) return;
    setSettings(mergeSiteSettings(data as { key: string; value: string }[]));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        fetchProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(true);
      if (newSession?.user?.id) {
        (async () => {
          try {
            await fetchProfile(newSession.user.id);
          } finally {
            if (mounted) setLoading(false);
          }
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const t = useCallback((key: TranslationKey) => translate(language, key), [language]);

  return (
    <AppContext.Provider
      value={{
        session,
        profile,
        loading,
        language,
        currency,
        settings,
        setLanguage,
        setCurrency,
        t,
        refreshProfile,
        refreshSettings,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
