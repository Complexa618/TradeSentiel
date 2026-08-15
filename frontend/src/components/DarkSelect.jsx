import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

// Premium dark select — replaces native <select> everywhere.
// options: array of strings OR array of { value, label }
export default function DarkSelect({ value, onValueChange, options = [], placeholder = 'Select', triggerClassName = '', align = 'start' }) {
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={`group inline-flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none transition data-[placeholder]:text-gray-500 hover:border-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 ${triggerClassName}`}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-gray-500 transition group-data-[state=open]:rotate-180 group-data-[state=open]:text-emerald-400" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          align={align}
          className="z-[90] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-white/10 bg-[#101216] text-gray-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
        >
          <SelectPrimitive.Viewport className="p-1.5 max-h-64">
            {norm.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-gray-300 outline-none transition data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white data-[state=checked]:text-emerald-300"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4 text-emerald-400" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
