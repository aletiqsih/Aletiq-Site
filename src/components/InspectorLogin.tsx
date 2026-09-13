import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Building2,
  BadgeCheck,
  Scale,
  FileCheck2,
  Info,
  HelpCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { authService, SAMPLE_INSPECTORS } from '../services/authService';
import { InspectorUser } from '../types';

interface InspectorLoginProps {
  onLoginSuccess: (user: InspectorUser) => void;
  onReturnToApp: () => void;
}

const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || '1x00000000000000000000AA';

type AuthPhase = 'idle' | 'verifying' | 'signing_in';

export const InspectorLogin: React.FC<InspectorLoginProps> = ({
  onLoginSuccess,
  onReturnToApp,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Authentication & Verification state
  const [authPhase, setAuthPhase] = useState<AuthPhase>('idle');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isExecutingRef = useRef<boolean>(false);
  const pendingAuthRef = useRef<{
    identifier: string;
    password: string;
    rememberMe: boolean;
  } | null>(null);

  // Form Validation & Errors State
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
    general?: string;
  }>({});
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Process login with the verified Turnstile token
  const processBackendLogin = useCallback(
    async (token: string) => {
      const creds = pendingAuthRef.current;
      if (!creds) {
        setAuthPhase('idle');
        isExecutingRef.current = false;
        return;
      }

      setAuthPhase('signing_in');

      try {
        const result = await authService.login({
          identifier: creds.identifier,
          password: creds.password,
          rememberMe: creds.rememberMe,
          turnstileToken: token,
        });

        if (result.success && result.user) {
          pendingAuthRef.current = null;
          isExecutingRef.current = false;
          onLoginSuccess(result.user);
        } else {
          setAuthPhase('idle');
          pendingAuthRef.current = null;
          isExecutingRef.current = false;
          setErrors({ general: result.error || 'Authentication failed. Please verify credentials.' });

          // Reset Turnstile widget so user can re-verify on next submission
          if (window.turnstile && widgetIdRef.current) {
            try {
              window.turnstile.reset(widgetIdRef.current);
            } catch {}
          }
        }
      } catch (err: any) {
        setAuthPhase('idle');
        pendingAuthRef.current = null;
        isExecutingRef.current = false;
        setErrors({
          general: err.message || 'An unexpected error occurred during authentication.',
        });

        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {}
        }
      }
    },
    [onLoginSuccess]
  );

  // Initialize Cloudflare Turnstile widget in manual execution mode
  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !turnstileContainerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return; // already rendered

      try {
        const id = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'light',
          execution: 'execute', // MANUAL EXECUTION: Do NOT execute on page load!
          appearance: 'always', // Widget frame remains stable in DOM
          callback: (token: string) => {
            if (!isMounted) return;
            processBackendLogin(token);
          },
          'error-callback': (errorCode?: string) => {
            if (!isMounted) return;
            console.warn('[Turnstile] Challenge error:', errorCode);
            setAuthPhase('idle');
            isExecutingRef.current = false;
            pendingAuthRef.current = null;
            setErrors(prev => ({
              ...prev,
              general: 'Security verification encountered an error. Please try signing in again.',
            }));
            if (window.turnstile && widgetIdRef.current) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {}
            }
          },
          'timeout-callback': () => {
            if (!isMounted) return;
            console.warn('[Turnstile] Challenge timed out');
            setAuthPhase('idle');
            isExecutingRef.current = false;
            pendingAuthRef.current = null;
            setErrors(prev => ({
              ...prev,
              general: 'Security verification timed out. Please try signing in again.',
            }));
            if (window.turnstile && widgetIdRef.current) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {}
            }
          },
          'expired-callback': () => {
            if (!isMounted) return;
            console.warn('[Turnstile] Challenge token expired');
            setAuthPhase('idle');
            isExecutingRef.current = false;
            pendingAuthRef.current = null;
            if (window.turnstile && widgetIdRef.current) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {}
            }
          },
        });

        widgetIdRef.current = id;
        setTurnstileReady(true);
      } catch (e) {
        console.warn('Turnstile render warning:', e);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector('script[src*="turnstile"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) {
            renderWidget();
          }
        };
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', () => {
          if (isMounted) {
            renderWidget();
          }
        });
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [processBackendLogin]);

  const validate = (): boolean => {
    const newErrors: {
      identifier?: string;
      password?: string;
      general?: string;
    } = {};

    if (!identifier.trim()) {
      newErrors.identifier = 'Inspector ID or official email is required.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // 1. Validate fields locally
    if (!validate()) {
      return;
    }

    // 2. Prevent duplicate execution
    if (authPhase !== 'idle' || isExecutingRef.current) {
      return;
    }

    // 3. Store pending credentials and transition to 'verifying' phase
    pendingAuthRef.current = {
      identifier: identifier.trim(),
      password,
      rememberMe,
    };
    isExecutingRef.current = true;
    setAuthPhase('verifying');

    // 4. Trigger manual Turnstile verification
    if (window.turnstile && widgetIdRef.current) {
      try {
        window.turnstile.execute(widgetIdRef.current);
      } catch (err) {
        console.error('[Turnstile] Error triggering execution:', err);
        setAuthPhase('idle');
        isExecutingRef.current = false;
        pendingAuthRef.current = null;
        setErrors({ general: 'Failed to initiate security check. Please try again.' });
      }
    } else if (window.turnstile && turnstileContainerRef.current) {
      try {
        window.turnstile.execute(turnstileContainerRef.current);
      } catch (err) {
        console.error('[Turnstile] Error triggering execution on container:', err);
        setAuthPhase('idle');
        isExecutingRef.current = false;
        pendingAuthRef.current = null;
        setErrors({ general: 'Failed to initiate security check. Please try again.' });
      }
    } else {
      // Fallback: If Turnstile CDN script is blocked or unavailable
      setAuthPhase('idle');
      isExecutingRef.current = false;
      pendingAuthRef.current = null;
      setErrors({
        general:
          'Security verification service is still initializing. Please wait a moment and click Sign In again.',
      });
    }
  };

  const handleQuickFill = (sampleIndex: number) => {
    const sample = SAMPLE_INSPECTORS[sampleIndex];
    if (sample) {
      setIdentifier(sample.user.badgeId);
      setPassword(sample.defaultPassword);
      setErrors(prev => ({ ...prev, identifier: undefined, password: undefined }));
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
  };

  const isSubmitting = authPhase !== 'idle';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans antialiased text-slate-900">
      {/* Top Header / Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={onReturnToApp}
            className="flex items-center space-x-2.5 text-left focus:outline-none group"
            title="Return to Main Application"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-500 transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">Aletiq</span>
                <span className="text-[10px] uppercase font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
                  SIH26034
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Packaged Commodity Compliance Intelligence
              </p>
            </div>
          </button>

          <button
            onClick={onReturnToApp}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Return to</span> Platform Overview
          </button>
        </div>
      </header>

      {/* Main Split / Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          
          {/* Left Column: Regulatory Authority & Mission Info (Slate-900) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -top-16 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <div className="inline-flex items-center space-x-2 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2.5 py-1 rounded-md text-xs font-semibold">
                <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Enforcement & Regulatory Portal</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Inspector Portal
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Secure access for authorized Legal Metrology enforcement officers, field inspectors, and verification controllers.
                </p>
              </div>

              {/* Regulatory Capabilities List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
                  <div className="p-1.5 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-700/40 shrink-0 mt-0.5">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-slate-200">Statutory Rule Engine</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Verify mandatory declarations under Legal Metrology (Packaged Commodities) Rules, 2011.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
                  <div className="p-1.5 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-700/40 shrink-0 mt-0.5">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-slate-200">Notice & Audit Generation</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Automated Form-A Improvement Notices, inspection audit trails & statutory penalty citations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/60">
                  <div className="p-1.5 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-700/40 shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-slate-200">E-Commerce Cross-Verification</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cross-verify physical packaging against digital marketplace listings under Rule 6(10).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice Box */}
            <div className="mt-8 pt-4 border-t border-slate-800 relative z-10">
              <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Authorized Government Personnel Only • SIH26034</span>
              </div>
            </div>
          </div>

          {/* Right Column: Inspector Login Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Form Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Inspector Sign In
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Enter your government badge credentials or official email.
                  </p>
                </div>
                <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>System Active</span>
                </div>
              </div>

              {/* Demo Credentials Quick-Select Pill Bar */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                    Demo Inspector Profiles:
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Click to auto-fill</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_INSPECTORS.map((sample, idx) => (
                    <button
                      key={sample.user.id}
                      type="button"
                      onClick={() => handleQuickFill(idx)}
                      disabled={isSubmitting}
                      className="text-[11px] bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 border border-slate-200 px-2.5 py-1 rounded-md transition-colors text-left flex items-center space-x-1.5 shadow-2xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{sample.user.name}</span>
                      <span className="text-[10px] text-slate-400">({sample.user.badgeId})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* General Error Banner */}
              {errors.general && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium">{errors.general}</p>
                </div>
              )}

              {/* Form Element */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                {/* Identifier Input */}
                <div>
                  <label
                    htmlFor="inspector-identifier"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Inspector ID or Official Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="inspector-identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={e => {
                        setIdentifier(e.target.value);
                        if (errors.identifier) setErrors(prev => ({ ...prev, identifier: undefined }));
                      }}
                      placeholder="e.g., DL-INSP-2026-089 or inspector@delhi.gov.in"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.identifier)}
                      aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                      className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                        errors.identifier
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                          : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
                      }`}
                    />
                  </div>
                  {errors.identifier && (
                    <p id="identifier-error" className="text-[11px] text-rose-600 font-medium mt-1 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.identifier}</span>
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="inspector-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline font-medium focus:outline-none cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="inspector-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      placeholder="••••••••••••"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                        errors.password
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                          : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={isSubmitting}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-[11px] text-rose-600 font-medium mt-1 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Remember Me & Terminal Policy */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      disabled={isSubmitting}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                    />
                    <span>Remember me on this terminal</span>
                  </label>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    7-day authorized session
                  </span>
                </div>

                {/* Cloudflare Turnstile Security Verification Container */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Security Verification <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Cloudflare Turnstile (Managed)</span>
                  </div>
                  
                  <div className="min-h-[66px] flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div ref={turnstileContainerRef} id="turnstile-container" className="my-0.5" />
                    {!turnstileReady && (
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Initializing security engine...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/80 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-lg shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {authPhase === 'verifying' && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Security Challenge...</span>
                      </>
                    )}
                    {authPhase === 'signing_in' && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing In to Inspector Portal...</span>
                      </>
                    )}
                    {authPhase === 'idle' && (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Sign In to Inspector Portal</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Security / Trust Notice */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>256-bit TLS Encrypted Government Channel</span>
              </div>
              <button
                type="button"
                onClick={onReturnToApp}
                className="text-emerald-700 hover:text-emerald-800 hover:underline font-medium cursor-pointer"
              >
                Back to Public Dashboard →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotSent(false);
                setForgotEmail('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Inspector Credential Recovery
                </h3>
                <p className="text-xs text-slate-500">
                  Directorate of Legal Metrology Security Administration
                </p>
              </div>
            </div>

            {forgotSent ? (
              <div className="py-4 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Recovery Instructions Dispatched</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If the identifier or email <strong className="text-slate-900">{forgotEmail}</strong> matches an active official record, a temporary recovery dispatch has been routed to your zonal administrator.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSent(false);
                      setForgotEmail('');
                    }}
                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Close & Return to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Please enter your registered official government email or Inspector Badge ID. A secure verification link will be routed to your department administrator.
                </p>

                <div>
                  <label htmlFor="recovery-id" className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email or Badge ID
                  </label>
                  <input
                    id="recovery-id"
                    type="text"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="e.g., inspector.verma@delhi.gov.in"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center space-x-2">
            <span>Aletiq Legal Metrology Compliance Intelligence</span>
            <span>•</span>
            <span>SIH26034 Reference Implementation</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Rules, 2011 Compliance</span>
            <span>Direct Consumer Affairs Directorate Integration</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
