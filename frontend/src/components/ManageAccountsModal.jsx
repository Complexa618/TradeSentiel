import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useApp } from '../context/AppContext';
import { fmtMoney } from '../lib/calc';
import { Plus, Trash2, Wallet } from 'lucide-react';

export default function ManageAccountsModal({ open, onClose }) {
  const { data, addAccount, deleteAccount } = useApp();
  const [form, setForm] = useState({ name: '', broker: '', balance: '' });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    addAccount({ name: form.name, broker: form.broker, balance: Number(form.balance || 0) });
    setForm({ name: '', broker: '', balance: '' });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[#0c0e12] border-white/10 text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Manage Accounts</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2 max-h-56 overflow-y-auto">
          {data.accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400"><Wallet className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm text-white font-medium">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.broker || 'Broker'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono-num text-sm text-white">{fmtMoney(a.balance)}</span>
                <button onClick={() => deleteAccount(a.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {!data.accounts.length && <p className="text-sm text-gray-600 text-center py-4">No accounts yet.</p>}
        </div>

        <form onSubmit={submit} className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Account name" className={cls} />
            <input value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="Broker" className={cls} />
            <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="Balance" className={cls} />
          </div>
          <button type="submit" className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 text-[#062017] font-semibold py-2 hover:from-emerald-300 transition">
            <Plus className="h-4 w-4" /> Add Account
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
const cls = "rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition";
