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
  { value: 'trade_count', label: 'Total trades' },
  { value: 'win_count', label: 'Winning trades' },
  { value: 'loss_count', label: 'Losing trades' },
  { value: 'profit', label: 'Net profit ($)' },
  { value: 'daily_pnl', label: 'Best day P&L ($)' },
  { value: 'weekly_pnl', label: 'Best week P&L ($)' },
  { value: 'monthly_pnl', label: 'Best month P&L ($)' },
  { value: 'win_streak', label: 'Win streak length' },
  { value: 'win_rate', label: 'Win rate (%) — 10+ trades' },
  { value: 'avg_rr', label: 'Average R:R' },
  { value: 'rr_above', label: 'Trades above an R:R' },
  { value: 'session_count', label: 'Trades in a session' },
  { value: 'strategy_count', label: 'Trades with a strategy' },
  { value: 'strategy_pnl', label: 'Profit with a strategy ($)' },
  { value: 'journal_trades', label: 'Journaled trades (with notes)' },
  { value: 'screenshots', label: 'Trades with media attached' },
  { value: 'plan_followed', label: "Trades tagged 'Plan Followed'" },
  { value: 'no_revenge', label: "Trades without 'Revenge'" },
  { value: 'tag_used', label: 'Trades using a tag' },
  { value: 'avoid_tag', label: 'Trades avoiding a tag' },
  { value: 'active_days', label: 'Active trading days' },
];

// Which requirement types need an extra "meta" value, and what kind of picker.
export const metaKind = (rtype) => ({
  session_count: 'session', strategy_count: 'strategy', strategy_pnl: 'strategy',
  tag_used: 'tag', avoid_tag: 'tag', rr_above: 'rr',
}[rtype] || null);

export const VISIBILITY = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'archived', label: 'Archived' },
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
