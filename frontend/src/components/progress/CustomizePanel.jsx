import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Icon } from './ui';
import { useApp } from '../../context/AppContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function Toggle({ checked, onChange, testid }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} data-testid={testid}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-white/[0.12]'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

const TOGGLES = [
  ['achievementsEnabled', 'Achievements', 'Show the achievements grid and progress'],
  ['streaksEnabled', 'Streaks', 'Track win / discipline streaks'],
  ['xpEnabled', 'Progression (XP & Level)', 'Earn XP from meaningful journal activity'],
  ['disciplineEnabled', 'Discipline Score', 'Score built from plan, risk & journaling'],
  ['notificationsEnabled', 'Unlock Notifications', 'Toast when you unlock an achievement'],
];

export default function CustomizePanel({ open, onClose, progress, onEditAchievement, onCreate, onChanged }) {
  const { saveProgressSettings, deleteAchievement } = useApp();
  const prefs = progress?.prefs || {};
  const [local, setLocal] = useState(prefs);

  const toggle = async (key, val) => {
    const next = { ...local, [key]: val };
    setLocal(next);
    try { await saveProgressSettings({ [key]: val }); onChanged && onChanged(); }
    catch { toast.error('Could not save setting'); }
  };

  const remove = async (a) => {
    try { await deleteAchievement(a.id); toast.success('Achievement removed'); onChanged && onChanged(); }
    catch { toast.error('Could not delete'); }
  };

  const achievements = progress?.achievements || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl bg-[#0c0e12] border-white/10 text-gray-200 max-h-[92vh] overflow-y-auto" data-testid="customize-panel">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Customize Progress</DialogTitle>
          <DialogDescription className="text-gray-500">Tailor your progression system. Everything stays based on real trades.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          {TOGGLES.map(([key, title, desc]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">{title}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
              <Toggle checked={local[key] !== false} onChange={(v) => toggle(key, v)} testid={`toggle-${key}`} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 mb-2">
          <h3 className="text-sm font-semibold text-white">Manage Achievements</h3>
          <button onClick={onCreate} data-testid="create-achievement-btn"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium px-3 py-1.5 transition">
            <Plus className="h-3.5 w-3.5" /> Create
          </button>
        </div>

        <div className="space-y-1.5">
          {achievements.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${a.unlocked ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-gray-500'}`}>
                <Icon name={a.icon} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate flex items-center gap-2">
                  {a.title}
                  {a.is_custom && <span className="text-[9px] text-emerald-400/80 border border-emerald-500/30 rounded px-1">CUSTOM</span>}
                </div>
                <div className="text-[11px] text-gray-500 truncate">{a.description}</div>
              </div>
              <button onClick={() => onEditAchievement(a)} className="h-7 w-7 rounded-md hover:bg-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white transition" data-testid={`edit-ach-${a.id}`}><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => remove(a)} className="h-7 w-7 rounded-md hover:bg-red-500/15 flex items-center justify-center text-gray-400 hover:text-red-400 transition" data-testid={`del-ach-${a.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
