import React, { useMemo, useRef, useState, useEffect } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from './ui/dropdown-menu';
import { fmtMoney } from '../lib/calc';
import { Check, X, ChevronDown, Wallet } from 'lucide-react';

// Multi-select account picker with optional per-account P&L allocation.
// value: [{ account_id, allocated_pnl }]
export default function AccountMultiSelect({ accounts = [], value = [], onChange, pnl = 0, independent = false, onIndependent, onManage }) {
  const [open, setOpen] = useState(false);
  const selectedIds = value.map((v) => v.account_id);
  const byId = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const editedRef = useRef(false);

  // Auto-distribute allocations when the selection / pnl / independent flag changes (unless the user edited them).
  useEffect(() => {
    if (editedRef.current || !value.length) return;
    const n = value.length;
    const share = independent ? pnl : pnl / n;
    onChange(value.map((v) => ({ ...v, allocated_pnl: Math.round(share * 100) / 100 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join(','), pnl, independent]);

  const toggle = (id) => {
    editedRef.current = false;
    if (selectedIds.includes(id)) onChange(value.filter((v) => v.account_id !== id));
    else onChange([...value, { account_id: id, allocated_pnl: null }]);
  };
  const setAlloc = (id, v) => {
    editedRef.current = true;
    onChange(value.map((x) => (x.account_id === id ? { ...x, allocated_pnl: v === '' ? 0 : Number(v) } : x)));
  };

  const totalAlloc = value.reduce((s, v) => s + Number(v.allocated_pnl || 0), 0);
  const mismatch = !independent && value.length > 0 && Math.abs(totalAlloc - pnl) > 0.5;

  if (!accounts.length) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-3 flex items-center justify-between" data-testid="account-empty">
        <span className="text-sm text-gray-500">No accounts connected</span>
        {onManage && <button type="button" onClick={onManage} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Manage Accounts</button>}
      </div>
    );
  }

  return (
    <div>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button type="button" data-testid="account-select-trigger"
            className="w-full flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-left hover:border-white/20 transition">
            <span className="flex flex-wrap gap-1.5 items-center min-h-[20px]">
              {value.length ? value.map((v) => (
                <span key={v.account_id} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs px-2 py-0.5" data-testid={`account-pill-${v.account_id}`}>
                  {byId[v.account_id]?.name || 'Account'}
                  <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); toggle(v.account_id); }} />
                </span>
              )) : <span className="text-gray-600 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Select account(s)</span>}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] bg-[#12151b] border-white/10 text-gray-200 p-1" data-testid="account-menu">
          {accounts.map((a) => {
            const on = selectedIds.includes(a.id);
            return (
              <button type="button" key={a.id} onClick={() => toggle(a.id)} data-testid={`account-option-${a.id}`}
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-white/[0.06] transition text-left">
                <span className={`h-4 w-4 rounded flex items-center justify-center border ${on ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>{on && <Check className="h-3 w-3 text-[#062017]" />}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white truncate">{a.name}</span>
                  <span className="block text-xs text-gray-500">{a.broker ? `${a.broker} · ` : ''}{fmtMoney(a.balance)}</span>
                </span>
              </button>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {value.length > 0 && (
        <div className="mt-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={independent} onChange={(e) => { editedRef.current = false; onIndependent(e.target.checked); }} data-testid="account-independent" className="accent-emerald-500 h-3.5 w-3.5" />
            Same position executed independently on each account (full P&L each)
          </label>
          {value.map((v) => (
            <div key={v.account_id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-300 truncate">{byId[v.account_id]?.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-600 text-sm">$</span>
                <input type="number" step="any" value={v.allocated_pnl ?? 0} onChange={(e) => setAlloc(v.account_id, e.target.value)} data-testid={`account-alloc-${v.account_id}`}
                  className="w-24 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1 text-sm text-right text-white font-mono-num focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
          ))}
          {!independent && (
            <div className={`text-xs flex justify-between pt-1 border-t border-white/[0.05] ${mismatch ? 'text-amber-400' : 'text-gray-500'}`}>
              <span>Total allocated</span>
              <span className="font-mono-num" data-testid="account-total-alloc">{fmtMoney(totalAlloc)}{mismatch ? ` / ${fmtMoney(pnl)}` : ' ✓'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
