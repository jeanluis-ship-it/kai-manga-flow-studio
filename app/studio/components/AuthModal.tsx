'use client';

import React, { useState } from 'react';
import { CheckCircle2, Cloud, LogIn, Mail, Lock, RefreshCw, UserPlus, X } from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { PillButton } from './Primitives';
import './AuthModal.css';

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!open) return null;

  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError('Supabase no está configurado en este entorno. Puedes continuar en Modo Invitado.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        const redirectTo =
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: displayName.trim() || cleanEmail.split('@')[0],
            },
          },
        });
        if (signUpErr) {
          setError(signUpErr.message);
          return;
        }
        if (data.session) {
          onAuthSuccess();
          onClose();
        } else {
          setNotice(
            'Cuenta creada. Revisa tu correo para confirmar tu registro o inicia sesión si la confirmación automática está desactivada.',
          );
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInErr) {
          setError(signInErr.message);
          return;
        }
        onAuthSuccess();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la autenticación.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="gf-auth-modal-overlay"
      role="dialog"
      aria-modal="false"
      aria-label="Autenticación de MANGAI Studio"
      onClick={() => !busy && onClose()}
    >
      <div className="gf-auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="gf-auth-modal-head">
          <div className="gf-auth-modal-brand">
            <Cloud size={18} strokeWidth={2} className="gf-icon-shrink" />
            <div>
              <h3>{mode === 'login' ? 'Iniciar Sesión en MANGAI' : 'Crear Cuenta Mangaka'}</h3>
              <p>Sincroniza tus Mangas, Settei y páginas en Supabase Cloud</p>
            </div>
          </div>
          <button
            type="button"
            className="gf-auth-modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar modal de autenticación"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="gf-auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`gf-auth-tab ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
              setNotice('');
            }}
          >
            <LogIn size={14} strokeWidth={2} />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`gf-auth-tab ${mode === 'register' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
              setNotice('');
            }}
          >
            <UserPlus size={14} strokeWidth={2} />
            <span>Registrarse</span>
          </button>
        </div>

        <form className="gf-auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className="gf-auth-field">
              <span>Nombre de Mangaka / Estudio</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Jean Gonzalez"
                autoComplete="name"
              />
            </label>
          )}

          <label className="gf-auth-field">
            <span>
              <Mail size={12} strokeWidth={2} /> Correo electrónico
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="gf-auth-field">
            <span>
              <Lock size={12} strokeWidth={2} /> Contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </label>

          {!configured && (
            <div className="gf-auth-notice">
              Variables de Supabase no detectadas en este entorno. Sigue trabajando en Modo Invitado.
            </div>
          )}

          {error && (
            <div className="gf-auth-error" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="gf-auth-success" role="status">
              <CheckCircle2 size={15} strokeWidth={2} className="gf-icon-shrink" />
              <span>{notice}</span>
            </div>
          )}

          <div className="gf-auth-actions">
            <PillButton variant="outline" onClick={onClose} disabled={busy}>
              Seguir como Invitado
            </PillButton>
            <button type="submit" className="gf-auth-submit-btn" disabled={busy || !configured}>
              {busy ? (
                <RefreshCw size={15} strokeWidth={2} className="gf-spin" />
              ) : mode === 'login' ? (
                <LogIn size={15} strokeWidth={2} />
              ) : (
                <UserPlus size={15} strokeWidth={2} />
              )}
              <span>
                {busy
                  ? 'Conectando...'
                  : mode === 'login'
                  ? 'Entrar a mi Nube'
                  : 'Crear Cuenta Gratis'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
