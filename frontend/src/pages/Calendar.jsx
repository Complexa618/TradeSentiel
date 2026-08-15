import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmtMoney } from '../lib/calc';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function Calendar() {
  const { data } = useApp();
  const [cursor, setCursor] = useState(new Date());

  const { grid, monthPnl, monthTrades, weekSummaries } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDay = {};
    let monthPnl = 0, monthTrades = 0;
    data.trades.forEach((t) => {
      const d = new Date(t.date || t.entryTime);
      if (d.getFullYear() === year && d.getMonth() === month && t.status === 'closed') {
        const day = d.getDate();
        if (!byDay[day]) byDay[day] = { pnl: 0, trades: 0 };
        byDay[day].pnl += Number(t.pnl || 0);
        byDay[day].trades += 1;
        monthPnl += Number(t.pnl || 0);
        monthTrades += 1;
      }
    });

    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, ...(byDay[d] || { pnl: 0, trades: 0 }) });
    while (cells.length % 7 !== 0) cells.push(null);

    const grid = [];
    for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7));

    const weekSummaries = grid.map((week) => {
      const pnl = week.reduce((s, c) => s + (c?.pnl || 0), 0);
      const trades = week.reduce((s, c) => s + (c?.trades || 0), 0);
      return { pnl, trades };
    });

    return { grid, monthPnl, monthTrades, weekSummaries };
  }, [data.trades, cursor]);

  const shift = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[1400px] mx-auto animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-gray-500 mt-1">Daily P&L, mapped across the month.</p>
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

      <div className="card-surface rounded-2xl p-4 lg:p-6 mt-6">
        <div className="grid grid-cols-8 gap-2 mb-2">
          {DOW.map((d) => <div key={d} className="label-caps text-gray-500 text-center py-1">{d}</div>)}
          <div className="label-caps text-gray-500 text-center py-1">WEEK</div>
        </div>
        <div className="space-y-2">
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-8 gap-2">
              {week.map((cell, ci) => {
                if (!cell) return <div key={ci} className="rounded-lg bg-white/[0.01] min-h-[76px]" />;
                const isToday = cell.day === today.getDate() && cursor.getMonth() === today.getMonth() && cursor.getFullYear() === today.getFullYear();
                const has = cell.trades > 0;
                const pos = cell.pnl >= 0;
                return (
                  <div key={ci} className={`rounded-lg min-h-[76px] p-2 border transition ${
                    has ? (pos ? 'bg-emerald-500/[0.08] border-emerald-500/25' : 'bg-red-500/[0.08] border-red-500/25')
                        : 'bg-white/[0.02] border-white/[0.05]'
                  } ${isToday ? 'ring-1 ring-emerald-400/60' : ''}`}>
                    <div className={`text-xs font-medium ${isToday ? 'text-emerald-400' : 'text-gray-500'}`}>{cell.day}</div>
                    {has && (
                      <>
                        <div className={`text-sm font-semibold font-mono-num mt-2 ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(cell.pnl)}</div>
                        <div className="text-[10px] text-gray-500">{cell.trades} {cell.trades === 1 ? 'trade' : 'trades'}</div>
                      </>
                    )}
                  </div>
                );
              })}
              <div className="rounded-lg min-h-[76px] p-2 bg-white/[0.03] border border-white/[0.06] flex flex-col justify-center">
                <div className={`text-sm font-semibold font-mono-num ${weekSummaries[wi].pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(weekSummaries[wi].pnl)}</div>
                <div className="text-[10px] text-gray-500">{weekSummaries[wi].trades} trades</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06] text-sm">
          <span className="text-gray-500">{monthTrades} trades this month</span>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500"><span className="h-2.5 w-2.5 rounded bg-emerald-500/40" /> Profit</span>
            <span className="flex items-center gap-1.5 text-gray-500"><span className="h-2.5 w-2.5 rounded bg-red-500/40" /> Loss</span>
          </div>
        </div>
      </div>
    </div>
  );
}
