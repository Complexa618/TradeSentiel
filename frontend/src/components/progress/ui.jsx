import React, { useEffect, useRef, useState } from 'react';
import {
  Trophy, Award, Flame, Zap, Target, ShieldCheck, Star, Lock, TrendingUp, DollarSign, Gem,
  Brain, NotebookPen, Camera, CalendarCheck, Sunrise, Swords, Rocket, Crown, Medal, Sparkles,
  LineChart, Clock, CheckCircle2, Gauge, Anchor, Mountain,
} from 'lucide-react';

export const ICONS = {
  Trophy, Award, Flame, Zap, Target, ShieldCheck, Star, Lock, TrendingUp, DollarSign, Gem,
  Brain, NotebookPen, Camera, CalendarCheck, Sunrise, Swords, Rocket, Crown, Medal, Sparkles,
  LineChart, Clock, CheckCircle2, Gauge, Anchor, Mountain,
};
export const ICON_CHOICES = Object.keys(ICONS).filter((k) => k !== 'Lock');

export function Icon({ name, className }) {
  const C = ICONS[name] || Trophy;
  return <C className={className} />;
}

export const CATEGORIES = ['Trading', 'Discipline', 'Consistency', 'Strategy', 'Sessions', 'Journaling', 'Profitability', 'Risk Management', 'Personal Records'];

export const REQUIREMENT_TYPES = [
  { value: 'trade_count', label: 'Number of trades' },
  { value: 'win_streak', label: 'Win streak length' },
  { value: 'profit', label: 'Net profit ($)' },
  { value: 'win_rate', label: 'Win rate (%) — 10+ trades' },
  { value: 'session_count', label: 'Trades in a session' },
  { value: 'strategy_count', label: 'Trades with a strategy' },
  { value: 'journal_trades', label: 'Journaled trades (with notes)' },
  { value: 'plan_followed', label: "Trades tagged 'Plan Followed'" },
  { value: 'no_revenge', label: "Trades without 'Revenge'" },
  { value: 'active_days', label: 'Active trading days' },
  { value: 'screenshots', label: 'Trades with media attached' },
];

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Animated count-up. Re-animates only when `value` changes.
export function CountUp({ value = 0, duration = 750, decimals = 0, prefix = '', suffix = '', className = '' }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const raf = useRef();
  useEffect(() => {
    const from = prev.current;
    const to = Number(value) || 0;
    prev.current = to;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(from + (to - from) * easeOut(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  const n = decimals ? display.toFixed(decimals) : Math.round(display);
  const withCommas = Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className={className}>{prefix}{withCommas}{suffix}</span>;
}

// Progress bar that fills from 0 to pct on mount / when pct changes.
export function AnimatedBar({ pct = 0, className = '', color = 'from-emerald-500 to-emerald-400', height = 'h-2', delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setW(Math.max(0, Math.min(pct, 100))), 60 + delay);
    return () => clearTimeout(id);
  }, [pct, delay]);
  return (
    <div className={`${height} rounded-full bg-white/[0.06] overflow-hidden ${className}`}>
      <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${w}%`, transition: 'width 800ms cubic-bezier(0.22,0.61,0.36,1)' }} />
    </div>
  );
}
