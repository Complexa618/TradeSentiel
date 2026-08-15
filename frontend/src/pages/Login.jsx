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
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 text-[#062017] font-semibold py-2.5 transition-all shadow-[0_6px_24px_-8px_rgba(16,185,129,0.8)] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

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
