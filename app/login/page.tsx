'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Chrome,
  FolderKanban,
  HardDrive,
  Lock,
  LogOut,
  Mail,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  User,
} from 'lucide-react';
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from '@/lib/supabase/browser';
import {
  getLocalUserSession,
  loadUserProjectList,
  migrateGuestProjectToLocalProfile,
  setLocalUserSession,
  type LocalUserSession,
} from '@/lib/storage/studioRepository';
import './login.css';

type AuthMode = 'login' | 'signup';
type StudioTheme = 'light' | 'dark';

const STUDIO_THEME_KEY = 'mangai-studio-theme-v1';

export default function LoginPage() {
  const router = useRouter();
  const supabaseReady = isSupabaseConfigured();

  const [theme, setTheme] = useState<StudioTheme>('light');
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Honest Local Device Profile (Beta) state when Supabase env vars are not set
  const [localSession, setLocalSessionState] = useState<LocalUserSession | null>(null);
  const [localProjectCount, setLocalProjectCount] = useState(0);
  const [localName, setLocalName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(STUDIO_THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch {
      // Ignore storage access errors.
    }

    const activeLocal = getLocalUserSession();
    setLocalSessionState(activeLocal);
    if (activeLocal) {
      setLocalName(activeLocal.displayName);
      setLocalEmail(activeLocal.email);
      void loadUserProjectList().then((list) => {
        setLocalProjectCount(list.length);
      });
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: StudioTheme = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(STUDIO_THEME_KEY, next);
        document.documentElement.setAttribute('data-theme', next);
      } catch {
        // Ignore storage access errors.
      }
      return next;
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(
        'Supabase Auth aún no está configurado en el servidor. Usa "Perfil Local en este Dispositivo (Beta)" abajo o entra en Modo Invitado.',
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) {
          throw new Error(
            signInError.message.includes('Invalid login credentials')
              ? 'Correo o contraseña incorrectos.'
              : signInError.message,
          );
        }
        router.push('/studio');
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: fullName.trim() || cleanEmail.split('@')[0],
            },
          },
        });
        if (signUpError) {
          throw new Error(signUpError.message);
        }
        if (data.session) {
          router.push('/studio');
          router.refresh();
        } else {
          setInfo(
            'Cuenta creada con Plan Trial (3 días · 10 páginas). Revisa tu bandeja de entrada para confirmar tu correo e iniciar sesión.',
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setInfo('');
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(
        'Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar el acceso con Google.',
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthErr) throw new Error(oauthErr.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google.');
      setGoogleLoading(false);
    }
  };

  const handleLocalProfileLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const cleanEmail = localEmail.trim().toLowerCase();
    const cleanName = localName.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Ingresa un correo válido para identificar tu perfil en este navegador.');
      return;
    }
    if (cleanName.length < 2) {
      setLocalError('Ingresa tu nombre artístico (mínimo 2 caracteres).');
      return;
    }

    const nextSession: LocalUserSession = {
      email: cleanEmail,
      displayName: cleanName,
      signedInAt: new Date().toISOString(),
      mode: 'local-beta',
    };

    setLocalUserSession(nextSession);
    migrateGuestProjectToLocalProfile(cleanEmail, cleanName);
    setLocalSessionState(nextSession);
    router.push('/studio');
  };

  const handleClearLocalProfile = () => {
    setLocalUserSession(null);
    setLocalSessionState(null);
    setLocalProjectCount(0);
  };

  return (
    <div className="ml-root" data-theme={theme}>
      <header className="ml-topbar">
        <Link href="/" prefetch={false} className="ml-back-link">
          <ArrowLeft size={15} strokeWidth={1.75} />
          <span>Volver al inicio</span>
        </Link>

        <div className="ml-topbar-actions">
          <button
            type="button"
            className="ml-theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo Claro Genkō' : 'Modo Oscuro Sumi'}
          >
            {theme === 'dark' ? (
              <Sun size={15} strokeWidth={1.75} />
            ) : (
              <Moon size={15} strokeWidth={1.75} />
            )}
            <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
          </button>

          <Link href="/studio" className="ml-guest-link">
            <span>Entrar en Modo Invitado</span>
          </Link>
        </div>
      </header>

      <main className="ml-main">
        <div className="ml-sheet">
          <div className="ml-sheet-guide" aria-hidden="true" />

          <div className="ml-brand-head">
            <div className="ml-brand-icon">
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="ml-eyebrow">MANGAI STUDIO OS · GENKŌ AUTH</p>
              <h1 className="ml-title">
                {mode === 'login' ? 'Inicia sesión en tu Estudio' : 'Crea tu cuenta de Mangaka'}
              </h1>
            </div>
          </div>

          <p className="ml-subtitle">
            {supabaseReady
              ? 'Sincroniza tus tomos, fichas Settei y viñetas Koma-wari en Supabase con prueba inicial Trial (3 días · 1 proyecto · 10 páginas).'
              : 'Conecta Supabase para sincronización en la nube o activa un Perfil Local en este Dispositivo (Beta) para separar tus proyectos por autor.'}
          </p>

          {!supabaseReady && (
            <div className="ml-notice">
              <AlertCircle size={15} strokeWidth={2} className="ml-shrink" />
              <div>
                <strong>Sincronización en la nube desactivada en este entorno.</strong> Para
                habilitar OAuth con Google y base de datos multi-dispositivo configura{' '}
                <code>NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en <code>.env.local</code> o Vercel.
              </div>
            </div>
          )}

          {!supabaseReady && (
            <section className="ml-local-card" aria-label="Perfil Local en este Dispositivo (Beta)">
              <div className="ml-local-head">
                <span className="ml-local-badge">
                  <HardDrive size={13} strokeWidth={2} />
                  <span>Perfil Local en este Dispositivo (Beta)</span>
                </span>
              </div>
              <p className="ml-local-desc">
                Sal del Modo Invitado y guarda tus tomos en este navegador bajo tu propio correo
                (sin sincronización externa en la nube). Tus borradores de invitado se migran
                automáticamente al entrar.
              </p>

              {localSession ? (
                <div className="ml-local-active">
                  <div className="ml-local-active-meta">
                    <strong>{localSession.displayName}</strong>
                    <span>{localSession.email}</span>
                    <small>
                      <FolderKanban size={12} strokeWidth={2} />
                      <span>
                        {localProjectCount}{' '}
                        {localProjectCount === 1 ? 'proyecto guardado' : 'proyectos guardados'} en
                        este dispositivo
                      </span>
                    </small>
                  </div>
                  <div className="ml-local-active-actions">
                    <Link href="/studio" className="ml-submit-btn ml-local-enter-btn">
                      <span>Abrir Estudio</span>
                    </Link>
                    <button
                      type="button"
                      className="ml-local-logout-btn"
                      onClick={handleClearLocalProfile}
                    >
                      <LogOut size={14} strokeWidth={1.75} />
                      <span>Cerrar perfil local</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form className="ml-form" onSubmit={handleLocalProfileLogin} noValidate>
                  <label className="ml-field">
                    <span className="ml-field-label">Nombre artístico / Autor</span>
                    <div className="ml-input-wrap">
                      <User size={15} strokeWidth={1.75} className="ml-input-icon" />
                      <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        placeholder="Ej. Kenji Sato"
                        autoComplete="name"
                      />
                    </div>
                  </label>

                  <label className="ml-field">
                    <span className="ml-field-label">Correo del perfil local</span>
                    <div className="ml-input-wrap">
                      <Mail size={15} strokeWidth={1.75} className="ml-input-icon" />
                      <input
                        type="email"
                        value={localEmail}
                        onChange={(e) => setLocalEmail(e.target.value)}
                        placeholder="autor@mangai.local"
                        autoComplete="email"
                      />
                    </div>
                  </label>

                  {localError && (
                    <div className="ml-alert is-error" role="alert">
                      <AlertCircle size={15} strokeWidth={2} className="ml-shrink" />
                      <span>{localError}</span>
                    </div>
                  )}

                  <button type="submit" className="ml-submit-btn">
                    <HardDrive size={15} strokeWidth={2} />
                    <span>Activar Perfil Local y Abrir Estudio</span>
                  </button>
                </form>
              )}
            </section>
          )}

          <div className="ml-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`ml-tab ${mode === 'login' ? 'is-active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
                setInfo('');
              }}
            >
              Iniciar Sesión Cloud
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`ml-tab ${mode === 'signup' ? 'is-active' : ''}`}
              onClick={() => {
                setMode('signup');
                setError('');
                setInfo('');
              }}
            >
              Crear Cuenta Cloud
            </button>
          </div>

          <button
            type="button"
            className="ml-google-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading || !supabaseReady}
            title={
              supabaseReady
                ? 'Iniciar sesión con Google OAuth'
                : 'Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY'
            }
          >
            {googleLoading ? (
              <RefreshCw size={16} strokeWidth={2} className="ml-spin" />
            ) : (
              <Chrome size={16} strokeWidth={2} />
            )}
            <span>Continuar con Google</span>
          </button>

          <div className="ml-divider">
            <span>o con correo en Supabase</span>
          </div>

          <form className="ml-form" onSubmit={handleEmailAuth} noValidate>
            {mode === 'signup' && (
              <label className="ml-field">
                <span className="ml-field-label">Nombre artístico / Autor</span>
                <div className="ml-input-wrap">
                  <User size={15} strokeWidth={1.75} className="ml-input-icon" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Kenji Sato"
                    autoComplete="name"
                    disabled={loading || !supabaseReady}
                  />
                </div>
              </label>
            )}

            <label className="ml-field">
              <span className="ml-field-label">Correo electrónico</span>
              <div className="ml-input-wrap">
                <Mail size={15} strokeWidth={1.75} className="ml-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="autor@mangai.studio"
                  autoComplete="email"
                  required
                  disabled={loading || !supabaseReady}
                />
              </div>
            </label>

            <label className="ml-field">
              <span className="ml-field-label">Contraseña</span>
              <div className="ml-input-wrap">
                <Lock size={15} strokeWidth={1.75} className="ml-input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  disabled={loading || !supabaseReady}
                />
              </div>
            </label>

            {error && (
              <div className="ml-alert is-error" role="alert">
                <AlertCircle size={15} strokeWidth={2} className="ml-shrink" />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="ml-alert is-success" role="status">
                <CheckCircle2 size={15} strokeWidth={2} className="ml-shrink" />
                <span>{info}</span>
              </div>
            )}

            <button
              type="submit"
              className="ml-submit-btn"
              disabled={loading || googleLoading || !supabaseReady}
            >
              {loading && <RefreshCw size={15} strokeWidth={2} className="ml-spin" />}
              <span>
                {loading
                  ? 'Procesando...'
                  : mode === 'login'
                  ? 'Iniciar Sesión'
                  : 'Crear Cuenta Trial (Gratis 3 días)'}
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
