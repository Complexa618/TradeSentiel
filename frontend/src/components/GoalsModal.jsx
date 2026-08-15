import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useApp } from '../context/AppContext';
import { Target, Loader2 } from 'lucide-react';

export default function GoalsModal({ open, onClose }) {
  const { data, saveGoals } = useApp();
  const [drafts, setDrafts] = useState({}); // id -> {label, target}
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Prepopulate each goal by its own id when the modal opens
  useEffect(() => {
    if (open) {
      const d = {};
      data.goals.forEach((g) => { d[g.id] = { label: g.label, target: String(g.target ?? '') }; });
      setDrafts(d);
      setErrors({});
      setSaving(false);
    }
  }, [open, data.goals]);

  const setField = (id, key, val) => setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: val } }));

  const validate = () => {
    const errs = {};
    data.goals.forEach((g) => {
      const dr = drafts[g.id] || {};
      if (!dr.label || !dr.label.trim()) errs[g.id] = 'Name is required';
      else if (dr.target === '' || dr.target === null || isNaN(Number(dr.target))) errs[g.id] = 'Enter a valid number';
      else if (Number(dr.target) <= 0) errs[g.id] = 'Target must be greater than 0';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return; // prevent multiple submissions
    if (!validate()) return;
    setSaving(true);
    // Build full goals array, updating ONLY edited fields on each goal by id (preserve everything else)
    const updated = data.goals.map((g) => ({
      ...g,
      label: (drafts[g.id]?.label ?? g.label).trim(),
      target: Number(drafts[g.id]?.target ?? g.target),
    }));
    const res = await saveGoals(updated);
    setSaving(false);
    if (res.ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg bg-[#0c0e12] border-white/10 text-gray-200 dialog-blur">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2"><Target className="h-5 w-5 text-emerald-400" /> Edit Trading Goals</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4 mt-2">
          {data.goals.map((g) => {
            const dr = drafts[g.id] || { label: '', target: '' };
            return (
              <div key={g.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px] gap-3">
                  <div>
                    <label className="label-caps text-gray-500 block mb-1.5">Goal name</label>
                    <input
                      value={dr.label}
                      onChange={(e) => setField(g.id, 'label', e.target.value)}
                      className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>
                  <div>
                    <label className="label-caps text-gray-500 block mb-1.5">Target {g.unit ? `(${g.unit})` : ''}</label>
                    <input
                      type="number" step="any"
                      value={dr.target}
                      onChange={(e) => setField(g.id, 'target', e.target.value)}
                      className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white text-right font-mono-num focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>
                </div>
                {errors[g.id] && <p className="text-xs text-red-400 mt-2">{errors[g.id]}</p>}
              </div>
            );
          })}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/[0.06] transition disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-b from-emerald-400 to-emerald-500 text-[#062017] hover:from-emerald-300 transition shadow-[0_4px_20px_-6px_rgba(16,185,129,0.7)] disabled:opacity-70">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Saving…' : 'Save Goals'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
