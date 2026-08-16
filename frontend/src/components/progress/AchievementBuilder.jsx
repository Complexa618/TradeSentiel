import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import DarkSelect from '../DarkSelect';
import { Icon, ICON_CHOICES, CATEGORIES, REQUIREMENT_TYPES, metaKind, VISIBILITY, AnimatedBar } from './ui';
import { SESSIONS, COMMON_TAGS } from '../../mock';
import { useApp } from '../../context/AppContext';
import { distinctStrategies } from '../../lib/calc';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyCond = () => ({ requirement_type: 'trade_count', requirement_value: 10, requirement_meta: null });
const empty = { title: '', description: '', category: 'Trading', icon: 'Target', requirement_type: 'trade_count', requirement_value: 10, requirement_meta: null, xp_reward: 0, status: 'visible' };

export default function AchievementBuilder({ open, onClose, editing, onSaved }) {
  const { data, createAchievement, updateAchievement } = useApp();
  const [form, setForm] = useState(empty);
  const [multi, setMulti] = useState(false);
  const [conds, setConds] = useState([emptyCond()]);
  const [saving, setSaving] = useState(false);
  const isEdit = !!editing;
  const strategies = useMemo(() => distinctStrategies(data.trades || []), [data.trades]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({ ...empty, ...editing });
      const ec = editing.conditions || [];
      setMulti(ec.length > 0);
      setConds(ec.length ? ec.map((c) => ({ ...emptyCond(), ...c })) : [emptyCond()]);
    } else {
      setForm(empty); setMulti(false); setConds([emptyCond()]);
    }
  }, [open, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const MetaField = ({ rtype, value, onChange }) => {
    const kind = metaKind(rtype);
    if (!kind) return null;
    if (kind === 'session') return <DarkSelect value={value || SESSIONS[0]} onValueChange={onChange} options={SESSIONS} triggerClassName="w-full" />;
    if (kind === 'strategy') return strategies.length
      ? <DarkSelect value={value || strategies[0]} onValueChange={onChange} options={strategies} triggerClassName="w-full" />
      : <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Strategy name" className={inp} />;
    if (kind === 'tag') return <DarkSelect value={value || COMMON_TAGS[0]} onValueChange={onChange} options={COMMON_TAGS} triggerClassName="w-full" />;
    if (kind === 'rr') return <input type="number" step="0.1" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="R threshold e.g. 2" className={inp} />;
    return null;
  };

  const setCond = (i, k, v) => setConds((cs) => cs.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const addCond = () => setConds((cs) => [...cs, emptyCond()]);
  const rmCond = (i) => setConds((cs) => (cs.length > 1 ? cs.filter((_, idx) => idx !== i) : cs));

  const save = async () => {
    if (!form.title.trim()) { toast.error('Give your milestone a title'); return; }
    const base = {
      title: form.title.trim(), description: form.description.trim(), category: form.category,
      icon: form.icon, xp_reward: Number(form.xp_reward) || 0, status: form.status,
    };
    let body;
    if (multi) {
      const cleaned = conds.map((c) => ({
        requirement_type: c.requirement_type, requirement_value: Number(c.requirement_value) || 0,
        requirement_meta: metaKind(c.requirement_type) ? (c.requirement_meta || defaultMeta(c.requirement_type, strategies)) : null,
      })).filter((c) => c.requirement_value > 0);
      if (!cleaned.length) { toast.error('Add at least one valid condition'); return; }
      body = { ...base, requirement_type: cleaned[0].requirement_type, requirement_value: cleaned[0].requirement_value, requirement_meta: cleaned[0].requirement_meta, conditions: cleaned };
    } else {
      if (!Number(form.requirement_value) || Number(form.requirement_value) <= 0) { toast.error('Target must be greater than 0'); return; }
      body = { ...base, requirement_type: form.requirement_type, requirement_value: Number(form.requirement_value),
        requirement_meta: metaKind(form.requirement_type) ? (form.requirement_meta || defaultMeta(form.requirement_type, strategies)) : null, conditions: [] };
    }
    setSaving(true);
    try {
      if (isEdit) await updateAchievement(editing.id, body);
      else await createAchievement(body);
      toast.success(isEdit ? 'Milestone updated' : 'Milestone created', { description: `${body.title} is ready.` });
      onSaved && onSaved(); onClose();
    } catch { toast.error('Could not save. Try again.'); }
    finally { setSaving(false); }
  };

  const previewLabel = multi ? `${conds.length} condition${conds.length > 1 ? 's' : ''}` : `${form.requirement_value} · ${(REQUIREMENT_TYPES.find((r) => r.value === form.requirement_type) || {}).label}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[#0c0e12] border-white/10 text-gray-200 max-h-[92vh] overflow-y-auto" data-testid="achievement-builder">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">{isEdit ? 'Edit Milestone' : 'Create Milestone'}</DialogTitle>
          <DialogDescription className="text-gray-500">Built from your real trading activity — no fake progress.</DialogDescription>
        </DialogHeader>

        {/* Live preview */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0"><Icon name={form.icon} className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{form.title || 'Milestone name'}</div>
            <div className="text-xs text-gray-500 truncate">{form.description || previewLabel}</div>
            <div className="mt-1.5"><AnimatedBar pct={20} height="h-1.5" /></div>
          </div>
        </div>

        <div className="space-y-4 mt-1">
          <Field label="Title"><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. NY AM Specialist" data-testid="ab-title" className={inp} /></Field>
          <Field label="Description"><input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Complete 25 NY AM trades" data-testid="ab-desc" className={inp} /></Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Category"><DarkSelect value={form.category} onValueChange={(v) => set('category', v)} options={CATEGORIES} triggerClassName="w-full" /></Field>
            <Field label="XP Reward"><input type="number" min="0" value={form.xp_reward} onChange={(e) => set('xp_reward', e.target.value)} data-testid="ab-xp" className={inp} /></Field>
            <Field label="Visibility"><DarkSelect value={form.status} onValueChange={(v) => set('status', v)} options={VISIBILITY} triggerClassName="w-full" /></Field>
          </div>

          {/* Multi-condition toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} data-testid="ab-multi" className="accent-emerald-500 h-4 w-4" />
            Advanced — require multiple conditions
          </label>

          {!multi ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Requirement"><DarkSelect value={form.requirement_type} onValueChange={(v) => set('requirement_type', v)} options={REQUIREMENT_TYPES} triggerClassName="w-full" /></Field>
              <Field label="Target"><input type="number" min="1" value={form.requirement_value} onChange={(e) => set('requirement_value', e.target.value)} data-testid="ab-target" className={inp} /></Field>
              {metaKind(form.requirement_type) && <div className="col-span-2"><Field label={metaLabel(form.requirement_type)}><MetaField rtype={form.requirement_type} value={form.requirement_meta} onChange={(v) => set('requirement_meta', v)} /></Field></div>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {conds.map((c, i) => (
                <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3" data-testid={`ab-cond-${i}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><DarkSelect value={c.requirement_type} onValueChange={(v) => setCond(i, 'requirement_type', v)} options={REQUIREMENT_TYPES} triggerClassName="w-full" /></div>
                    <input type="number" min="1" value={c.requirement_value} onChange={(e) => setCond(i, 'requirement_value', e.target.value)} className={`${inp} w-24`} />
                    <button onClick={() => rmCond(i)} className="h-8 w-8 rounded-md hover:bg-red-500/15 text-gray-500 hover:text-red-400 flex items-center justify-center shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {metaKind(c.requirement_type) && <div className="mt-2"><MetaField rtype={c.requirement_type} value={c.requirement_meta} onChange={(v) => setCond(i, 'requirement_meta', v)} /></div>}
                </div>
              ))}
              <button onClick={addCond} data-testid="ab-add-cond" className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 font-medium"><Plus className="h-3.5 w-3.5" /> Add condition</button>
            </div>
          )}

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
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.05]" data-testid="ab-cancel">Cancel</button>
          <button onClick={save} disabled={saving} data-testid="ab-save" className="px-4 py-2 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 text-[#062017] font-semibold text-sm disabled:opacity-60">{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Milestone'}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const inp = 'w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20';
const metaLabel = (rt) => ({ session: 'Session', strategy: 'Strategy', tag: 'Tag', rr: 'R:R threshold' }[metaKind(rt)] || 'Detail');
const defaultMeta = (rt, strategies) => ({ session: SESSIONS[0], strategy: strategies[0] || '', tag: COMMON_TAGS[0], rr: '2' }[metaKind(rt)] || null);

function Field({ label, children }) {
  return <div><label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>{children}</div>;
}
