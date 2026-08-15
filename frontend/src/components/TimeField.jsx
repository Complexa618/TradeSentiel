import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import DarkSelect from './DarkSelect';
import { Clock } from 'lucide-react';

// value: 'HH:mm' (24h). onChange('HH:mm')
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const to12 = (val) => {
  const [h = '9', m = '00'] = (val || '').split(':');
  let hh = parseInt(h, 10); if (isNaN(hh)) hh = 9;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  let h12 = hh % 12; if (h12 === 0) h12 = 12;
  return { h12: String(h12), m: (m || '00'), ampm };
};
const to24 = (h12, m, ampm) => {
  let hh = parseInt(h12, 10) % 12;
  if (ampm === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${m}`;
};
const label12 = (val) => {
  const { h12, m, ampm } = to12(val);
  return `${h12}:${m} ${ampm}`;
};

export default function TimeField({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const { h12, m, ampm } = to12(value);

  const setPart = (part, v) => {
    const next = { h12, m, ampm, [part]: v };
    onChange(to24(next.h12, next.m, next.ampm));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none transition hover:border-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
        >
          <span>{label12(value)}</span>
          <Clock className="h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-auto p-3 z-[70] border-white/10 bg-[#101216] text-gray-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] dialog-blur">
        <div className="flex items-center gap-2">
          <DarkSelect value={h12} onValueChange={(v) => setPart('h12', v)} options={HOURS} triggerClassName="w-16" />
          <span className="text-gray-500 font-semibold">:</span>
          <DarkSelect value={m} onValueChange={(v) => setPart('m', v)} options={MINUTES} triggerClassName="w-16" />
          <DarkSelect value={ampm} onValueChange={(v) => setPart('ampm', v)} options={['AM', 'PM']} triggerClassName="w-16" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
