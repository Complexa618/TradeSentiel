import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useApp } from '../context/AppContext';
import { SESSIONS, COMMON_TAGS, SYMBOLS } from '../mock';
import { computeTradeMetrics, fmtMoney, fmtR, fmtDuration } from '../lib/calc';
import { TrendingUp, TrendingDown, Upload, X, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import StrategyTagInput from './StrategyTagInput';
import DarkSelect from './DarkSelect';
import DatePicker from './DatePicker';
import TimeField from './TimeField';
import TradePhotos from './TradePhotos';
import AccountMultiSelect from './AccountMultiSelect';

const LAST_ACCTS_KEY = 'ts_last_accounts';

const todayStr = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const timeStr = (addMs = 0) => {
  const d = new Date(Date.now() + addMs);
  d.setSeconds(0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
};
// ISO datetime -> local HH:mm
const isoToTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
};

const makeEmpty = () => ({
  symbol: '', direction: 'long', risk: '', reward: '',
  session: 'NY AM', strategies: [], status: 'closed', tags: [], notes: '',
  screenshot: null, day: todayStr(), entryTimeVal: timeStr(), exitTimeVal: timeStr(3600000),
});

// Build form state from an existing trade (edit mode)
const fromTrade = (t) => ({
  symbol: t.symbol || '', direction: t.direction || 'long',
  risk: t.risk ?? '', reward: t.reward ?? '',
  session: SESSIONS.includes(t.session) ? t.session : 'NY AM',
  strategies: Array.isArray(t.strategies) ? t.strategies : (t.strategy ? [t.strategy] : []),
  status: t.status || 'closed', tags: t.tags || [], notes: t.notes || '',
  screenshot: t.screenshot || null,
  day: (t.day || (t.date || '').slice(0, 10)) || todayStr(),
  entryTimeVal: isoToTime(t.entryTime) || timeStr(),
  exitTimeVal: isoToTime(t.exitTime) || timeStr(3600000),
});

// Combine a day (YYYY-MM-DD) and a time (HH:mm) into an ISO datetime
const combine = (day, time) => {
  if (!day || !time) return null;
  const d = new Date(`${day}T${time}:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

export default function AddTradeModal({ open, onClose, trade = null }) {
  const { addTrade, updateTrade, uploadPhotos, data, setSettings } = useApp();
  const isEdit = !!trade;
  const [form, setForm] = useState(makeEmpty);
  const [pending, setPending] = useState([]);
  const [accounts, setAccounts] = useState([]);       // [{account_id, allocated_pnl}]
  const [independent, setIndependent] = useState(false);
  const fileRef = useRef();
  const settings = data.settings || {};
  const userAccounts = data.accounts || [];

  // Prefill when opening; reset when closing
  useEffect(() => {
    if (!open) return;
    setForm(trade ? fromTrade(trade) : makeEmpty());
    setPending([]);
    if (trade) {
      setAccounts(trade.accounts || []);
      setIndependent(!!trade.independent);
    } else {
      // Remember last used accounts if enabled
      let init = [];
      if (settings.rememberLastAccounts !== false) {
        try { init = JSON.parse(localStorage.getItem(LAST_ACCTS_KEY) || '[]'); } catch { init = []; }
        init = init.filter((id) => userAccounts.some((a) => a.id === id)).map((id) => ({ account_id: id, allocated_pnl: null }));
      }
      setAccounts(init);
      setIndependent(false);
    }
  }, [open, trade]); // eslint-disable-line

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const preview = useMemo(() => computeTradeMetrics(form), [form]);
  const entryISO = useMemo(() => combine(form.day, form.entryTimeVal), [form.day, form.entryTimeVal]);
  const exitISO = useMemo(() => combine(form.day, form.exitTimeVal), [form.day, form.exitTimeVal]);
  const durationLabel = useMemo(() => fmtDuration({ entryTime: entryISO, exitTime: exitISO }), [entryISO, exitISO]);

  const toggleTag = (t) => set('tags', form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('screenshot', reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (userAccounts.length && !accounts.length && settings.allowTradesWithoutAccount !== true) {
      toast.error('Select at least one account.');
      return;
    }
    const payload = {
      symbol: form.symbol, direction: form.direction, status: form.status,
      tags: form.tags, notes: form.notes,
      strategies: (form.strategies || []).map((s) => s.trim()).filter(Boolean),
      session: form.session,
      risk: Number(form.risk),
      reward: Number(form.reward),
      day: form.day,
      date: form.day ? new Date(`${form.day}T00:00:00`).toISOString() : new Date().toISOString(),
      entryTime: entryISO,
      exitTime: exitISO,
      accounts: accounts.map((a) => ({ account_id: a.account_id, allocated_pnl: a.allocated_pnl })),
      independent,
    };
    if (settings.rememberLastAccounts !== false) {
      try { localStorage.setItem(LAST_ACCTS_KEY, JSON.stringify(accounts.map((a) => a.account_id))); } catch { /* ignore */ }
    }
    if (isEdit) {
      await updateTrade(trade.id, payload);
    } else {
      const created = await addTrade(payload);
      if (created && pending.length) {
        try { await uploadPhotos(created.id, pending.map((p) => p.file)); } catch { /* toast handled */ }
      }
    }
    setForm(makeEmpty());
    setPending([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0c0e12] border-white/10 text-gray-200 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Log a Trade</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Lbl>Symbol</Lbl>
              <input list="symbols" required value={form.symbol} onChange={(e) => set('symbol', e.target.value.toUpperCase())}
                placeholder="e.g. XAUUSD" className={inputCls} />
              <datalist id="symbols">{SYMBOLS.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Lbl>Direction</Lbl>
              <div className="grid grid-cols-2 gap-2">
                <DirBtn active={form.direction === 'long'} onClick={() => set('direction', 'long')} icon={TrendingUp} label="Long" color="emerald" />
                <DirBtn active={form.direction === 'short'} onClick={() => set('direction', 'short')} icon={TrendingDown} label="Short" color="red" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Num label="Risk ($)" value={form.risk} onChange={(v) => set('risk', v)} required />
            <Num label="Reward ($)" value={form.reward} onChange={(v) => set('reward', v)} required />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Lbl>Status</Lbl>
              <DarkSelect value={form.status} onValueChange={(v) => set('status', v)} triggerClassName="w-full"
                options={[{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }]} />
            </div>
            <div>
              <Lbl>Day</Lbl>
              <DatePicker value={form.day} onChange={(v) => set('day', v)} />
            </div>
            <div>
              <Lbl>Entry Time</Lbl>
              <TimeField value={form.entryTimeVal} onChange={(v) => set('entryTimeVal', v)} />
            </div>
            <div>
              <Lbl>Exit Time</Lbl>
              <TimeField value={form.exitTimeVal} onChange={(v) => set('exitTimeVal', v)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Strategy</Lbl>
              <StrategyTagInput value={form.strategies} onChange={(v) => set('strategies', v)} />
            </div>
            <div>
              <Lbl>Session</Lbl>
              <DarkSelect value={form.session} onValueChange={(v) => set('session', v)} options={SESSIONS} triggerClassName="w-full" />
            </div>
          </div>

          <div>
            <Lbl>Account(s)</Lbl>
            <AccountMultiSelect accounts={userAccounts} value={accounts} onChange={setAccounts}
              pnl={preview.pnl} independent={independent} onIndependent={setIndependent} />
          </div>

          <div>
            <Lbl>Tags</Lbl>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((t) => (
                <button type="button" key={t} onClick={() => toggleTag(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${form.tags.includes(t) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'border-white/10 text-gray-400 hover:border-white/25'}`}>
                  {form.tags.includes(t) && <Check className="h-3 w-3 inline mr-1" />}{t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Chart Screenshots</Lbl>
            <TradePhotos tradeId={isEdit ? trade.id : null} pending={pending} onPending={setPending} />
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="What was your thesis? Did you follow the plan?" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/[0.07]">
            <Metric label="Risk" value={fmtMoney(Number(form.risk || 0))} positive={false} />
            <Metric label="Reward" value={fmtMoney(Number(form.reward || 0))} positive={Number(form.reward || 0) >= 0} />
            <Metric label="Profit" value={fmtMoney(preview.pnl)} positive={preview.pnl >= 0} />
            <Metric label="RR" value={fmtR(preview.rMultiple)} positive={preview.rMultiple !== null && preview.rMultiple >= 0} />
            <div>
              <div className="label-caps text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Duration</div>
              <div className="text-lg font-semibold font-mono-num mt-0.5 text-white">{durationLabel}</div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/[0.06] transition">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-b from-emerald-400 to-emerald-500 text-[#062017] hover:from-emerald-300 transition shadow-[0_4px_20px_-6px_rgba(16,185,129,0.7)]">Save Trade</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inputCls = "w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition";
const Lbl = ({ children }) => <label className="label-caps text-gray-500 block mb-1.5">{children}</label>;
const Num = ({ label, value, onChange, required }) => (
  <div>
    <Lbl>{label}</Lbl>
    <input type="number" step="any" required={required} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
  </div>
);
const DirBtn = ({ active, onClick, icon: Icon, label, color }) => (
  <button type="button" onClick={onClick}
    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition ${
      active
        ? color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border-red-500/40 text-red-300'
        : 'border-white/10 text-gray-400 hover:border-white/25'
    }`}>
    <Icon className="h-4 w-4" /> {label}
  </button>
);
const Metric = ({ label, value, positive }) => (
  <div>
    <div className="label-caps text-gray-500">{label}</div>
    <div className={`text-lg font-semibold font-mono-num mt-0.5 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{value}</div>
  </div>
);
