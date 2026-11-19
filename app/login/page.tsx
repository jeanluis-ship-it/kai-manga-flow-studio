'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Chrome,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react';
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from '@/lib/supabase/browser';
import './login.css';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const supabaseReady = isSupabaseConfigured();

  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

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
        'Supabase Auth aún no está configurado en las variables de entorno. Puedes seguir trabajando en Modo Invitado dentro de /studio.',
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

  return (
    <div className="ml-root">
      <header className="ml-topbar">
        <Link href="/" prefetch={false} className="ml-back-link">
          <ArrowLeft size={15} strokeWidth={1.75} />
          <span>Volver al inicio</span>
        </Link>

        <Link href="/studio" className="ml-guest-link">
          <span>Entrar en Modo Invitado</span>
        </Link>
      </header>

      <main className="ml-main">
        <div className="ml-sheet">
          <div className="ml-sheet-guide" aria-hidden="true" />

          <div className="ml-brand-head">
            <div className="ml-brand-icon">
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="ml-eyebrow">MANGAI STUDIO OS · GENKŌ CLOUD</p>
              <h1 className="ml-title">
                {mode === 'login' ? 'Inicia sesión en tu Estudio' : 'Crea tu cuenta de Mangaka'}
              </h1>
            </div>
          </div>

          <p className="ml-subtitle">
            Sincroniza tus tomos, fichas Settei y viñetas Koma-wari en Supabase con prueba inicial
            Trial (3 días · 1 proyecto · 10 páginas).
          </p>

          {!supabaseReady && (
            <div className="ml-notice">
              <AlertCircle size={15} strokeWidth={2} className="ml-shrink" />
              <span>
                Entorno sin llaves Supabase públicas (`NEXT_PUBLIC_SUPABASE_*`). Puedes probar todo
                el estudio ahora mismo en{' '}
                <Link href="/studio" className="ml-inline-link">
                  Modo Invitado (/studio)
                </Link>
                .
              </span>
            </div>
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
              Iniciar Sesión
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
              Crear Cuenta
            </button>
          </div>

          <button
            type="button"
            className="ml-google-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <RefreshCw size={16} strokeWidth={2} className="ml-spin" />
            ) : (
              <Chrome size={16} strokeWidth={2} />
            )}
            <span>Continuar con Google</span>
          </button>

          <div className="ml-divider">
            <span>o con correo electrónico</span>
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
                    disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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

            <button type="submit" className="ml-submit-btn" disabled={loading || googleLoading}>
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
