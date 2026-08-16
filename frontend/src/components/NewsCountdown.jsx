import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Zap, ChevronDown } from 'lucide-react';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
const LIVE_WINDOW = 10 * 60 * 1000; // treat an event as "live" for 10 min after its time

// USD-first impact ranking: lower tier = more important.
const P1 = ['fomc', 'interest rate decision', 'rate decision', 'press conference', 'non-farm', 'nonfarm', 'nfp', 'cpi', 'pce', 'powell'];
const P2 = ['gdp', 'retail sales', 'ism', 'unemployment', 'jobless', 'ppi', 'consumer confidence'];
const tierOf = (e) => {
  const t = (e.title || '').toLowerCase();
  if (P1.some((k) => t.includes(k))) return 1;
  if (P2.some((k) => t.includes(k))) return 2;
  if (e.impact === 'High') return 2.5;
  if (e.impact === 'Medium') return 3.2;
  return 4;
};

const fmtCountdown = (diff) => {
  const s = Math.max(Math.floor(diff / 1000), 0);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

export default function NewsCountdown() {
  const { fetchEconomicCalendar, data, setSettings } = useApp();
  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const currency = data?.settings?.mainNewsCurrency || 'USD';

  const load = async () => {
    try { setEvents((await fetchEconomicCalendar()).events || []); } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
    const dataId = setInterval(load, 5 * 60 * 1000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(dataId); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const chosen = useMemo(() => {
    const cands = events
      .filter((e) => e.currency === currency && new Date(e.datetime).getTime() > now - LIVE_WINDOW)
      .sort((a, b) => tierOf(a) - tierOf(b) || new Date(a.datetime) - new Date(b.datetime));
    return cands[0] || null;
  }, [events, currency, now]);

  const pickCurrency = (c) => { setMenuOpen(false); if (c !== currency) setSettings({ mainNewsCurrency: c }); };

  const eventTime = chosen ? new Date(chosen.datetime).getTime() : 0;
  const diff = eventTime - now;
  const isLive = chosen && diff <= 0;
  const soon = chosen && diff > 0 && diff < 60 * 60 * 1000;
  const hot = chosen && (tierOf(chosen) <= 2 || chosen.impact === 'High' || isLive || soon);
  const accent = hot ? 'red' : 'amber';

  return (
    <div ref={menuRef} className="relative hidden md:flex items-center" data-testid="main-news">
      <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${accent === 'red' ? 'border-red-500/25 bg-red-500/[0.06]' : 'border-amber-500/25 bg-amber-500/[0.06]'}`}>
        {/* Currency selector */}
        <button onClick={() => setMenuOpen((o) => !o)} data-testid="main-news-currency"
          className="flex items-center gap-0.5 text-[11px] font-bold text-gray-200 hover:text-white rounded px-1 py-0.5 hover:bg-white/[0.06] transition">
          {currency}<ChevronDown className="h-3 w-3 text-gray-500" />
        </button>
        <span className="h-3.5 w-px bg-white/10" />

        {chosen ? (
          <>
            <span className="relative flex h-2 w-2">
              {(hot || isLive) && <span className={`absolute inline-flex h-full w-full rounded-full ${accent === 'red' ? 'bg-red-400' : 'bg-amber-400'} opacity-60 animate-ping`} />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${accent === 'red' ? 'bg-red-400' : 'bg-amber-400'}`} />
            </span>
            <Zap className={`h-3.5 w-3.5 ${accent === 'red' ? 'text-red-300' : 'text-amber-300'}`} />
            <span className="text-xs text-gray-300 max-w-[220px] truncate">
              <span className={`font-semibold ${accent === 'red' ? 'text-red-200' : 'text-amber-200'}`}>{currency} {chosen.title}</span>
              {isLive ? (
                <span className="ml-1 font-bold text-red-300" data-testid="main-news-live">· LIVE NOW</span>
              ) : (
                <>
                  <span className="text-gray-500"> in </span>
                  <span className="font-mono-num text-white" data-testid="main-news-countdown">{fmtCountdown(diff)}</span>
                </>
              )}
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-500" data-testid="main-news-empty">No major {currency} news scheduled</span>
        )}
      </div>

      {menuOpen && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-40 rounded-lg border border-white/10 bg-[#12151b] shadow-xl p-1" data-testid="main-news-menu">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-gray-600">Main News Currency</div>
          {CURRENCIES.map((c) => (
            <button key={c} onClick={() => pickCurrency(c)} data-testid={`main-news-cur-${c}`}
              className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition ${c === currency ? 'bg-emerald-500/15 text-emerald-300' : 'text-gray-300 hover:bg-white/[0.06]'}`}>
              {c}{c === 'USD' && <span className="text-[10px] text-gray-500 ml-1">default</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
