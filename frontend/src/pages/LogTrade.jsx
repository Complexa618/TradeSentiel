import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fmtMoney, fmtR, fmtDuration } from '../lib/calc';
import { Plus, Download, TrendingUp, TrendingDown, Trash2, Search, Image as ImageIcon, X, Pencil } from 'lucide-react';
import { Lightbox } from '../components/TradePhotos';

const SORTS = { date: 'Date', symbol: 'Symbol', pnl: 'P&L', r: 'R Multiple' };

export default function LogTrade() {
  const { data, deleteTrade, listPhotos } = useApp();
  const { openAddTrade, openEditTrade } = useOutletContext();
  const [sort, setSort] = useState('date');
  const [query, setQuery] = useState('');
  const [viewImg, setViewImg] = useState(null);
  const [gallery, setGallery] = useState({ items: [], index: null });
  const openViewer = async (t) => {
    try {
      const photos = await listPhotos(t.id);
      if (photos.length) setGallery({ items: photos, index: 0 });
    } catch { /* ignore */ }
  };

  const trades = useMemo(() => {
    let list = data.trades.filter((t) => {
      const strat = (t.strategies && t.strategies.length ? t.strategies.join(' ') : (t.strategy || '')).toLowerCase();
      return t.symbol.toLowerCase().includes(query.toLowerCase()) || strat.includes(query.toLowerCase());
    });
    list = [...list].sort((a, b) => {
      if (sort === 'symbol') return a.symbol.localeCompare(b.symbol);
      if (sort === 'pnl') return Number(b.pnl) - Number(a.pnl);
      if (sort === 'r') return Number(b.rMultiple) - Number(a.rMultiple);
      return new Date(b.date || b.entryTime) - new Date(a.date || a.entryTime);
    });
    return list;
  }, [data.trades, sort, query]);

  const stats = useMemo(() => {
    const closed = data.trades.filter((t) => t.status === 'closed');
    const wins = closed.filter((t) => Number(t.pnl) > 0).length;
    const pnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
    return { count: data.trades.length, pnl, win: closed.length ? (wins / closed.length) * 100 : 0 };
  }, [data.trades]);

  const exportCSV = () => {
    const headers = ['Symbol', 'Direction', 'Risk', 'Reward', 'Profit', 'RR', 'Strategy', 'Session', 'Entry Time', 'Exit Time', 'Duration', 'Status', 'Date'];
    const rows = data.trades.map((t) => [t.symbol, t.direction, t.risk, t.reward, t.pnl, (t.rMultiple ?? 'N/A'), (t.strategies && t.strategies.length ? t.strategies.join(' | ') : (t.strategy || '')), t.session, t.entryTime || '', t.exitTime || '', fmtDuration(t), t.status, (t.date || '').slice(0, 10)]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trade-sentinel-journal.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[1500px] mx-auto animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trading Journal</h1>
          <p className="text-gray-500 mt-1">Every trade, logged and scored against plan.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 text-sm text-gray-200 px-3.5 py-2 hover:bg-white/[0.05] transition">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={openAddTrade} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 text-[#062017] text-sm font-semibold px-3.5 py-2 hover:from-emerald-300 transition shadow-[0_4px_20px_-6px_rgba(16,185,129,0.7)]">
            <Plus className="h-4 w-4" /> Add Trade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        <MiniStat label="Trades" value={stats.count} />
        <MiniStat label="Net P&L" value={fmtMoney(stats.pnl)} tone={stats.pnl >= 0 ? 'green' : 'red'} />
        <MiniStat label="Win Rate" value={`${stats.win.toFixed(0)}%`} tone="green" />
      </div>

      <div className="card-surface rounded-2xl mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-semibold">Trade Log</h3>
            <p className="text-xs text-gray-500">{trades.length} entries</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol / strategy"
                className="rounded-lg bg-white/[0.03] border border-white/[0.08] pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition w-56" />
            </div>
            <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1">
              {Object.entries(SORTS).map(([k, l]) => (
                <button key={k} onClick={() => setSort(k)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${sort === k ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-gray-300'}`}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left label-caps text-gray-500 border-b border-white/[0.06]">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3 text-right">Risk / Reward</th>
                <th className="px-4 py-3">Strategy</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 text-right">RR</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-4 py-3 text-center">Chart</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{t.symbol}</div>
                    <div className="text-xs text-gray-600">{(t.date || '').slice(0, 10)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${t.direction === 'long' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {t.direction === 'long' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{t.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono-num text-gray-300">
                    <span className="text-red-400">{fmtMoney(t.risk)}</span> <span className="text-gray-600">/</span> <span className={Number(t.reward) >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtMoney(t.reward)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(t.strategies && t.strategies.length ? t.strategies : (t.strategy ? [t.strategy] : [])).map((s, i) => (
                        <span key={i} className="inline-flex items-center rounded-full border border-white/[0.16] bg-white/[0.05] px-2.5 py-0.5 text-xs text-gray-200 whitespace-nowrap">{s}</span>
                      ))}
                      {!(t.strategies && t.strategies.length) && !t.strategy && <span className="text-gray-600">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{t.session || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono-num whitespace-nowrap">{fmtDuration(t)}</td>
                  <td className={`px-4 py-3 text-right font-mono-num ${t.rMultiple === null || t.rMultiple === undefined ? 'text-gray-500' : Number(t.rMultiple) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtR(t.rMultiple)}</td>
                  <td className={`px-4 py-3 text-right font-mono-num font-semibold ${Number(t.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(t.pnl)}</td>
                  <td className="px-4 py-3 text-center">
                    {t.photoCount > 0 ? (
                      <button onClick={() => openViewer(t)} className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition"><ImageIcon className="h-4 w-4" /><span className="text-xs font-mono-num">{t.photoCount}</span></button>
                    ) : t.screenshot ? (
                      <button onClick={() => setViewImg(t.screenshot)} className="text-emerald-400 hover:text-emerald-300"><ImageIcon className="h-4 w-4 mx-auto" /></button>
                    ) : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => openEditTrade(t)} className="p-1.5 rounded-md text-gray-500 hover:text-emerald-400 hover:bg-white/[0.05] transition" title="Edit trade"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteTrade(t.id)} className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-white/[0.05] transition" title="Delete trade"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!trades.length && <div className="text-center text-gray-600 py-16 text-sm">No trades found. Log your first trade to begin.</div>}
        </div>
      </div>

      {viewImg && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in-0" onClick={() => setViewImg(null)}>
          <button className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
          <img src={viewImg} alt="chart" className="max-h-[85vh] max-w-full rounded-xl border border-white/10" />
        </div>
      )}
      <Lightbox items={gallery.items} index={gallery.index} onClose={() => setGallery({ items: [], index: null })} onIndex={(i) => setGallery((g) => ({ ...g, index: i }))} />
    </div>
  );
}

const MiniStat = ({ label, value, tone = 'white' }) => (
  <div className="card-surface rounded-xl p-4">
    <div className="label-caps text-gray-500">{label}</div>
    <div className={`text-xl font-bold font-mono-num mt-2 ${tone === 'green' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-white'}`}>{value}</div>
  </div>
);
