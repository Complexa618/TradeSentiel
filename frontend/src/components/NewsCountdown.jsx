import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Zap } from 'lucide-react';

// Shows a live countdown to the next HIGH-impact economic event.
export default function NewsCountdown() {
  const { fetchEconomicCalendar } = useApp();
  const [next, setNext] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const res = await fetchEconomicCalendar();
      const upcoming = (res.events || [])
        .filter((e) => e.impact === 'High' && new Date(e.datetime).getTime() > Date.now())
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      setNext(upcoming[0] || null);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
    const dataId = setInterval(load, 5 * 60 * 1000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(dataId); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!next) return null;
  const diff = new Date(next.datetime).getTime() - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const label = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;

  return (
    <div className="hidden md:flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
      </span>
      <Zap className="h-3.5 w-3.5 text-red-300" />
      <span className="text-xs text-gray-300">
        <span className="font-semibold text-red-300">{next.currency} {next.title}</span>
        <span className="text-gray-500"> in </span>
        <span className="font-mono-num text-white">{label}</span>
      </span>
    </div>
  );
}
