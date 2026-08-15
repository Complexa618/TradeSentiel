import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User as UserIcon, ArrowRight, TrendingUp } from 'lucide-react';

export default function Login() {
  const { login, signup } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = mode === 'login'
      ? await login({ email: form.email, password: form.password })
      : await signup(form);
    setLoading(false);
    if (res.error) setError(res.error);
    else navigate('/dashboard');
  };

  const googleSignIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-[#0a0b0e] border-r border-white/[0.06] overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-600/[0.07] blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-[#08090c] shadow-[0_0_24px_-4px_rgba(16,185,129,0.7)]">TS</div>
          <span className="font-bold tracking-[0.18em] text-white">TRADE SENTINEL</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-tight">Trade with<br/>institutional discipline.</h1>
          <p className="mt-4 text-gray-400 max-w-md leading-relaxed">Log every trade, upload chart screenshots, and instantly calculate your risk/reward with pro-grade performance analytics.</p>
          <div className="mt-8 flex gap-6">
            {[['R:R', 'Calculator'], ['Equity', 'Curves'], ['Session', 'Analytics']].map(([a, b]) => (
              <div key={a} className="flex items-center gap-2 text-sm text-gray-400">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> <span>{a} <span className="text-gray-600">{b}</span></span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-gray-600">Cut losers fast. Log everything. Trust the process.</p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-[#08090c]">TS</div>
            <span className="font-bold tracking-[0.16em] text-white text-sm">TRADE SENTINEL</span>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-4">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure trader access
          </div>
          <h2 className="text-2xl font-bold text-white">{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2>
          <p className="text-sm text-gray-500 mt-1">{mode === 'login' ? 'Sign in to your trading journal.' : 'Start logging trades in seconds.'}</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'signup' && (
              <Field icon={UserIcon} placeholder="Full name" value={form.name} onChange={set('name')} required />
            )}
            <Field icon={Mail} type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
            <Field icon={Lock} type="password" placeholder="Password" value={form.password} onChange={set('password')} required />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 text-[#062017] font-semibold py-2.5 transition-all shadow-[0_6px_24px_-8px_rgba(16,185,129,0.8)] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-[11px] uppercase tracking-wider text-gray-600">or</span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <button
            type="button"
            onClick={googleSignIn}
            data-testid="google-signin-button"
            className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.07] hover:border-white/[0.18] text-gray-100 font-medium py-2.5 transition-all active:scale-[0.99]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-6 text-sm text-gray-500 text-center">
            {mode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
      <input
        {...props}
        className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
