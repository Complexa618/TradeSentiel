import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { fmtMoney } from '../lib/calc';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, RefreshCw, Zap, CalendarDays, Newspaper } from 'lucide-react';

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
const IMPACTS = ['High', 'Medium', 'Low'];
const IMPACT_COLOR = { High: '#f87171', Medium: '#fbbf24', Low: '#94a3b8' };
const IMPACT_BG = { High: 'bg-red-500/15 text-red-300 border-red-500/30', Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Low: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hhmm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Calendar() {
  const { data, fetchEconomicCalendar } = useApp();
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [selectedDay, setSelectedDay] = useState(ymd(new Date()));
  const [detail, setDetail] = useState(null);

  const [curSel, setCurSel] = useState(CURRENCIES);
  const [impSel, setImpSel] = useState(IMPACTS);
  const [highOnly, setHighOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchEconomicCalendar();
      setEvents(res.events || []);
    } catch { /* keep old */ } finally { setLoadingNews(false); }
  }, [fetchEconomicCalendar]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000); // live refresh, cached on backend
    return () => clearInterval(id);
  }, [load]);

  const activeImpacts = useMemo(() => (highOnly ? ['High'] : impSel), [highOnly, impSel]);

  // Filtered news grouped by local day
  const newsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!curSel.includes(e.currency)) return;
      if (!activeImpacts.includes(e.impact)) return;
      const d = new Date(e.datetime);
      if (isNaN(d)) return;
      const key = ymd(d);
      (map[key] = map[key] || []).push({ ...e, _d: d });
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a._d - b._d));
    return map;
  }, [events, curSel, activeImpacts]);

  const { grid, monthPnl, monthTrades, weekSummaries } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const startDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDay = {};
    let monthPnl = 0, monthTrades = 0;
    data.trades.forEach((t) => {
      const d = new Date(t.date || t.entryTime);
      if (d.getFullYear() === year && d.getMonth() === month && t.status === 'closed') {
        const day = d.getDate();
        byDay[day] = byDay[day] || { pnl: 0, trades: 0 };
        byDay[day].pnl += Number(t.pnl || 0);
        byDay[day].trades += 1;
        monthPnl += Number(t.pnl || 0); monthTrades += 1;
      }
    });
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let dd = 1; dd <= daysInMonth; dd++) cells.push({ day: dd, ...(byDay[dd] || { pnl: 0, trades: 0 }) });
    while (cells.length % 7 !== 0) cells.push(null);
    const grid = [];
    for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7));
    const weekSummaries = grid.map((w) => ({ pnl: w.reduce((s, c) => s + (c?.pnl || 0), 0), trades: w.reduce((s, c) => s + (c?.trades || 0), 0) }));
    return { grid, monthPnl, monthTrades, weekSummaries };
  }, [data.trades, cursor]);

  const shift = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();

  const toggle = (val, list, setList) => setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

  // Agenda for selected day (trades + news merged, time-sorted)
  const agenda = useMemo(() => {
    const items = [];
    data.trades.forEach((t) => {
      const key = ymd(new Date(t.date || t.entryTime));
      if (key !== selectedDay) return;
      const d = t.entryTime ? new Date(t.entryTime) : new Date(t.date);
      items.push({ type: 'trade', time: d, trade: t });
    });
    (newsByDay[selectedDay] || []).forEach((e) => items.push({ type: 'news', time: e._d, event: e }));
    return items.sort((a, b) => a.time - b.time);
  }, [data.trades, newsByDay, selectedDay]);

  const selDate = new Date(selectedDay + 'T00:00:00');

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-gray-500 mt-1">Your trades &amp; live economic news, side by side.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="label-caps text-gray-500">Month P&L</div>
            <div className={`text-xl font-bold font-mono-num ${monthPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(monthPnl)}</div>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1">
            <button onClick={() => shift(-1)} className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-300"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-sm font-medium text-white min-w-[130px] text-center">{monthLabel}</span>
            <button onClick={() => shift(1)} className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-300"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-surface rounded-xl p-3 mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="label-caps text-gray-500 flex items-center gap-1.5"><Newspaper className="h-3.5 w-3.5 text-emerald-400" /> Currency</span>
          <Chip active={curSel.length === CURRENCIES.length} onClick={() => setCurSel(curSel.length === CURRENCIES.length ? [] : CURRENCIES)}>All</Chip>
          {CURRENCIES.map((c) => <Chip key={c} active={curSel.includes(c)} onClick={() => toggle(c, curSel, setCurSel)}>{c}</Chip>)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="label-caps text-gray-500">Impact</span>
          {IMPACTS.map((i) => (
            <Chip key={i} active={!highOnly && impSel.includes(i)} disabled={highOnly} onClick={() => toggle(i, impSel, setImpSel)} dot={IMPACT_COLOR[i]}>{i}</Chip>
          ))}
        </div>
        <button onClick={() => setHighOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition ${highOnly ? 'bg-red-500/15 text-red-300 border-red-500/40' : 'border-white/10 text-gray-300 hover:bg-white/[0.05]'}`}>
          <Zap className="h-3.5 w-3.5" /> High Impact Only
        </button>
        <button onClick={() => { setLoadingNews(true); load(); }} className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
          <RefreshCw className={`h-3.5 w-3.5 ${loadingNews ? 'animate-spin' : ''}`} /> {loadingNews ? 'Syncing…' : 'Live'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        {/* Month grid */}
        <div className="xl:col-span-2 card-surface rounded-2xl p-4 lg:p-5">
          <div className="grid grid-cols-8 gap-2 mb-2">
            {DOW.map((d) => <div key={d} className="label-caps text-gray-500 text-center py-1">{d}</div>)}
            <div className="label-caps text-gray-500 text-center py-1">WK</div>
          </div>
          <div className="space-y-2">
            {grid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-8 gap-2">
                {week.map((cell, ci) => {
                  if (!cell) return <div key={ci} className="rounded-lg bg-white/[0.01] min-h-[74px]" />;
                  const dayDate = new Date(cursor.getFullYear(), cursor.getMonth(), cell.day);
                  const key = ymd(dayDate);
                  const isToday = key === ymd(today);
                  const isSel = key === selectedDay;
                  const has = cell.trades > 0;
                  const pos = cell.pnl >= 0;
                  const dayNews = newsByDay[key] || [];
                  const impacts = [...new Set(dayNews.map((n) => n.impact))];
                  return (
                    <button key={ci} onClick={() => setSelectedDay(key)}
                      className={`text-left rounded-lg min-h-[74px] p-2 border transition-all card-lift ${
                        has ? (pos ? 'bg-emerald-500/[0.08] border-emerald-500/25' : 'bg-red-500/[0.08] border-red-500/25') : 'bg-white/[0.02] border-white/[0.05] hover:border-white/15'
                      } ${isSel ? 'ring-2 ring-emerald-400/70' : isToday ? 'ring-1 ring-emerald-400/40' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isToday ? 'text-emerald-400' : 'text-gray-500'}`}>{cell.day}</span>
                        <span className="flex gap-0.5">
                          {impacts.slice(0, 3).map((im) => <span key={im} className="h-1.5 w-1.5 rounded-full" style={{ background: IMPACT_COLOR[im] }} />)}
                        </span>
                      </div>
                      {has && <div className={`text-[13px] font-semibold font-mono-num mt-1.5 ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(cell.pnl)}</div>}
                      {dayNews.length > 0 && <div className="text-[10px] text-gray-500 mt-1">{dayNews.length} news</div>}
                    </button>
                  );
                })}
                <div className="rounded-lg min-h-[74px] p-2 bg-white/[0.03] border border-white/[0.06] flex flex-col justify-center">
                  <div className={`text-[13px] font-semibold font-mono-num ${weekSummaries[wi].pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(weekSummaries[wi].pnl)}</div>
                  <div className="text-[10px] text-gray-500">{weekSummaries[wi].trades} trades</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06] text-xs">
            <span className="text-gray-500">{monthTrades} trades this month</span>
            <div className="flex items-center gap-3">
              {IMPACTS.map((i) => <span key={i} className="flex items-center gap-1.5 text-gray-500"><span className="h-2 w-2 rounded-full" style={{ background: IMPACT_COLOR[i] }} /> {i}</span>)}
            </div>
          </div>
        </div>

        {/* Day agenda */}
        <div className="card-surface rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            <h3 className="text-white font-semibold">{selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
          </div>
          <div className="mt-4 space-y-2 overflow-y-auto max-h-[560px] pr-1">
            {agenda.map((item, i) => item.type === 'trade' ? (
              <div key={i} className="row-in flex items-center gap-3 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15" style={{ animationDelay: `${i * 30}ms` }}>
                <span className="text-xs font-mono-num text-gray-400 w-14 shrink-0">{item.time ? hhmm(item.time) : '--:--'}</span>
                <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${item.trade.direction === 'long' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {item.trade.direction === 'long' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium truncate">My Trade — {item.trade.symbol}</div>
                  <div className="text-xs text-gray-500 truncate">{(item.trade.strategies || []).join(', ') || 'Unclassified'}</div>
                </div>
                <span className={`text-sm font-mono-num font-semibold ${Number(item.trade.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(item.trade.pnl)}</span>
              </div>
            ) : (
              <button key={i} onClick={() => setDetail(item.event)} className="row-in w-full text-left flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/15 transition" style={{ animationDelay: `${i * 30}ms` }}>
                <span className="text-xs font-mono-num text-gray-400 w-14 shrink-0">{hhmm(item.time)}</span>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: IMPACT_COLOR[item.event.impact] }} />
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border shrink-0 ${IMPACT_BG[item.event.impact]}`}>{item.event.currency}</span>
                <span className="text-sm text-gray-200 truncate flex-1">{item.event.title}</span>
                {item.time > new Date() && <span className="text-[10px] font-medium text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Upcoming</span>}
              </button>
            ))}
            {!agenda.length && (
              <div className="text-center py-12">
                <Newspaper className="h-7 w-7 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Nothing scheduled for this day.</p>
                <p className="text-xs text-gray-700 mt-1">Trades and news will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event detail — minimal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-sm bg-[#0c0e12] border-white/10 text-gray-200 dialog-blur">
          <DialogHeader><DialogTitle className="text-white">Economic Event</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 mt-1">
              <Row label="Event" value={detail.title} />
              <Row label="Date" value={new Date(detail.datetime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
              <Row label="Time" value={hhmm(new Date(detail.datetime))} />
              <Row label="Currency" value={detail.currency} />
              <div className="flex items-center justify-between">
                <span className="label-caps text-gray-500">Impact</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${IMPACT_BG[detail.impact]}`}>{detail.impact}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Chip = ({ children, active, onClick, disabled, dot }) => (
  <button onClick={onClick} disabled={disabled}
    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition ${
      disabled ? 'opacity-40 cursor-not-allowed border-white/10 text-gray-500' :
      active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'border-white/10 text-gray-400 hover:border-white/25'
    }`}>
    {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}{children}
  </button>
);
const Row = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="label-caps text-gray-500 shrink-0">{label}</span>
    <span className="text-sm text-white text-right">{value}</span>
  </div>
);
