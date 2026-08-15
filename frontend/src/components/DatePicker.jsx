import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

// value: 'YYYY-MM-DD' string. onChange('YYYY-MM-DD')
const toYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return isNaN(dt) ? undefined : dt;
};

export default function DatePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const label = selected
    ? selected.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Pick a date';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none transition hover:border-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
        >
          <span className={selected ? '' : 'text-gray-500'}>{label}</span>
          <CalendarDays className="h-4 w-4 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto p-0 z-[70] border-white/10 bg-[#101216] text-gray-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] dialog-blur"
      >
        <div className="p-3">
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => { if (d) { onChange(toYmd(d)); setOpen(false); } }}
            showOutsideDays
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-3',
              caption: 'flex justify-between items-center px-1',
              caption_label: 'text-sm font-semibold text-white',
              nav: 'flex items-center gap-1',
              nav_button: 'h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/10 text-gray-300 hover:bg-white/[0.06] hover:text-white transition',
              nav_button_previous: '',
              nav_button_next: '',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'text-gray-500 w-9 h-8 flex items-center justify-center text-[11px] font-medium uppercase',
              row: 'flex w-full',
              cell: 'h-9 w-9 text-center p-0',
              day: 'h-9 w-9 rounded-lg text-sm text-gray-200 hover:bg-white/[0.07] transition inline-flex items-center justify-center outline-none',
              day_selected: 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/60 hover:bg-emerald-500/30',
              day_today: 'text-emerald-400 font-semibold',
              day_outside: 'text-gray-600',
              day_disabled: 'text-gray-700 opacity-40',
            }}
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
            }}
          />
          <div className="flex items-center justify-between px-1 pt-2 border-t border-white/[0.06]">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-xs text-gray-400 hover:text-white transition">Clear</button>
            <button type="button" onClick={() => { onChange(toYmd(new Date())); setOpen(false); }} className="text-xs text-emerald-400 hover:text-emerald-300 transition">Today</button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
