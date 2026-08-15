import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import DarkSelect from '../DarkSelect';
import { Icon, ICON_CHOICES, CATEGORIES, REQUIREMENT_TYPES } from './ui';
import { SESSIONS } from '../../mock';
import { useApp } from '../../context/AppContext';
import { distinctStrategies } from '../../lib/calc';
import { toast } from 'sonner';

const empty = { title: '', description: '', category: 'Trading', icon: 'Target', requirement_type: 'trade_count', requirement_value: 10, requirement_meta: null, is_active: true };

export default function AchievementBuilder({ open, onClose, editing, onSaved }) {
  const { data, createAchievement, updateAchievement } = useApp();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const isEdit = !!editing;

  useEffect(() => {
    if (open) setForm(editing ? { ...empty, ...editing } : empty);
  }, [open, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const needsSession = form.requirement_type === 'session_count';
  const needsStrategy = form.requirement_type === 'strategy_count';
  const strategies = distinctStrategies(data.trades || []);

  const save = async () => {
    if (!form.title.trim()) { toast.error('Give your achievement a title'); return; }
    if (!Number(form.requirement_value) || Number(form.requirement_value) <= 0) { toast.error('Target must be greater than 0'); return; }
    const body = {
      title: form.title.trim(), description: form.description.trim(), category: form.category,
      icon: form.icon, requirement_type: form.requirement_type,
      requirement_value: Number(form.requirement_value),
      requirement_meta: needsSession ? (form.requirement_meta || SESSIONS[0]) : needsStrategy ? (form.requirement_meta || (strategies[0] || '')) : null,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      if (isEdit) await updateAchievement(editing.id, body);
      else await createAchievement(body);
      toast.success(isEdit ? 'Achievement updated' : 'Achievement created');
      onSaved && onSaved();
      onClose();
    } catch { toast.error('Could not save. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[#0c0e12] border-white/10 text-gray-200 max-h-[92vh] overflow-y-auto" data-testid="achievement-builder">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">{isEdit ? 'Edit Achievement' : 'Create Achievement'}</DialogTitle>
          <DialogDescription className="text-gray-500">Build a milestone from your real trading activity — no fake progress.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Title">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Morning Master" data-testid="ab-title"
              className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
          </Field>
          <Field label="Description">
            <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Complete 20 NY AM trades" data-testid="ab-desc"
              className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <DarkSelect value={form.category} onValueChange={(v) => set('category', v)} options={CATEGORIES} triggerClassName="w-full" />
            </Field>
            <Field label="Requirement">
              <DarkSelect value={form.requirement_type} onValueChange={(v) => set('requirement_type', v)} options={REQUIREMENT_TYPES} triggerClassName="w-full" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Target">
              <input type="number" min="1" value={form.requirement_value} onChange={(e) => set('requirement_value', e.target.value)} data-testid="ab-target"
                className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
            </Field>
            {needsSession && (
              <Field label="Session"><DarkSelect value={form.requirement_meta || SESSIONS[0]} onValueChange={(v) => set('requirement_meta', v)} options={SESSIONS} triggerClassName="w-full" /></Field>
            )}
            {needsStrategy && (
              <Field label="Strategy">
                {strategies.length ? <DarkSelect value={form.requirement_meta || strategies[0]} onValueChange={(v) => set('requirement_meta', v)} options={strategies} triggerClassName="w-full" />
                  : <input value={form.requirement_meta || ''} onChange={(e) => set('requirement_meta', e.target.value)} placeholder="Strategy name" className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white" />}
              </Field>
            )}
          </div>

          <Field label="Icon">
            <div className="grid grid-cols-9 gap-1.5">
              {ICON_CHOICES.map((name) => (
                <button key={name} type="button" onClick={() => set('icon', name)} data-testid={`ab-icon-${name}`}
                  className={`aspect-square rounded-lg flex items-center justify-center border transition ${form.icon === name ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:border-white/15'}`}>
                  <Icon name={name} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition" data-testid="ab-cancel">Cancel</button>
          <button onClick={save} disabled={saving} data-testid="ab-save"
            className="px-4 py-2 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 text-[#062017] font-semibold text-sm transition disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Achievement'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
