import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Clock } from 'lucide-react';

// value: 'HH:mm' (24h). onChange('HH:mm')
const to12 = (val) => {
  const [h = '9', m = '00'] = (val || '').split(':');
  let hh = parseInt(h, 10); if (isNaN(hh)) hh = 9;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  let h12 = hh % 12; if (h12 === 0) h12 = 12;
  return { h12, m: (m || '00'), ampm };
};
const to24 = (h12, m, ampm) => {
  let hh = (parseInt(h12, 10) || 12) % 12;
  if (ampm === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const label12 = (val) => {
  const { h12, m, ampm } = to12(val);
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function TimeField({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const parsed = to12(value);
  const [hStr, setHStr] = useState(String(parsed.h12));
  const [mStr, setMStr] = useState(String(parsed.m).padStart(2, '0'));
  const [ampm, setAmpm] = useState(parsed.ampm);

  // Sync local draft when the external value changes (e.g. edit mode / reset)
  useEffect(() => {
    const p = to12(value);
    setHStr(String(p.h12)); setMStr(String(p.m).padStart(2, '0')); setAmpm(p.ampm);
  }, [value]);

  const commit = (h, m, ap) => {
    let hh = parseInt(h, 10); if (isNaN(hh)) hh = 12; hh = Math.min(12, Math.max(1, hh));
    let mm = parseInt(m, 10); if (isNaN(mm)) mm = 0; mm = Math.min(59, Math.max(0, mm));
    onChange(to24(hh, mm, ap));
  };

  const onHour = (e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); setHStr(v); if (v) commit(v, mStr, ampm); };
  const onMin = (e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); setMStr(v); if (v !== '') commit(hStr, v, ampm); };
  const blurMin = () => { const mm = String(Math.min(59, Math.max(0, parseInt(mStr, 10) || 0))).padStart(2, '0'); setMStr(mm); commit(hStr, mm, ampm); };
  const blurHour = () => { const hh = String(Math.min(12, Math.max(1, parseInt(hStr, 10) || 12))); setHStr(hh); commit(hh, mStr, ampm); };
  const setPeriod = (ap) => { setAmpm(ap); commit(hStr, mStr, ap); };

  const inputCls = 'w-14 text-center rounded-lg bg-white/[0.03] border border-white/[0.08] px-2 py-2 text-sm text-white font-mono-num outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`inline-flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none transition hover:border-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 ${className}`}>
          <span>{label12(value)}</span>
          <Clock className="h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-auto p-3 z-[70] border-white/10 bg-[#101216] text-gray-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] dialog-blur">
        <div className="flex items-end gap-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Hour</span>
            <input type="text" inputMode="numeric" value={hStr} onChange={onHour} onBlur={blurHour} onFocus={(e) => e.target.select()} className={inputCls} />
          </div>
          <span className="text-gray-500 font-semibold pb-2">:</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Min</span>
            <input type="text" inputMode="numeric" value={mStr} onChange={onMin} onBlur={blurMin} onFocus={(e) => e.target.select()} placeholder="00" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1 pl-1">
            {['AM', 'PM'].map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition ${ampm === p ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'border-white/10 text-gray-400 hover:border-white/25'}`}>{p}</button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-gray-600 mt-2">Type any minute (0–59).</p>
      </PopoverContent>
    </Popover>
  );
}
