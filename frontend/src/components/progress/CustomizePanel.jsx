import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Icon } from './ui';
import { useApp } from '../../context/AppContext';
import { Plus, Pencil, Trash2, Copy, GripVertical, Eye, EyeOff, Archive } from 'lucide-react';
import { toast } from 'sonner';

function Toggle({ checked, onChange, testid }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} data-testid={testid}
      className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-500' : 'bg-white/[0.12]'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

const TOGGLES = [
  ['achievementsEnabled', 'Achievements', 'Show the milestones grid on the page'],
  ['streaksEnabled', 'Streaks', 'Track win / discipline streaks'],
  ['xpEnabled', 'Progression (XP & Level)', 'Earn XP from meaningful journal activity'],
  ['disciplineEnabled', 'Discipline Score', 'Score built from plan, risk & journaling'],
  ['notificationsEnabled', 'Unlock Notifications', 'Toast when you unlock a milestone'],
];

const toBody = (a, patch = {}) => ({
  title: a.title, description: a.description || '', category: a.category, icon: a.icon,
  requirement_type: a.requirement_type, requirement_value: a.requirement_value,
  requirement_meta: a.requirement_meta ?? null, conditions: a.conditions || [],
  xp_reward: a.xp_reward || 0, status: a.status || 'visible', ...patch,
});

const nextStatus = { visible: 'hidden', hidden: 'archived', archived: 'visible' };
const statusIcon = { visible: Eye, hidden: EyeOff, archived: Archive };

export default function CustomizePanel({ open, onClose, progress, onEditAchievement, onCreate, onChanged }) {
  const { saveProgressSettings, deleteAchievement, updateAchievement, duplicateAchievement, reorderAchievements } = useApp();
  const [local, setLocal] = useState(progress?.prefs || {});
  const [list, setList] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const dragIdx = useRef(null);

  useEffect(() => { if (open) { setLocal(progress?.prefs || {}); setList(progress?.achievements || []); } }, [open, progress]);

  const toggle = async (key, val) => {
    setLocal((l) => ({ ...l, [key]: val }));
    try { await saveProgressSettings({ [key]: val }); onChanged && onChanged(); }
    catch { toast.error('Could not save setting'); }
  };

  const changeStatus = async (a) => {
    const ns = nextStatus[a.status || 'visible'];
    setList((ls) => ls.map((x) => (x.id === a.id ? { ...x, status: ns } : x)));
    try { await updateAchievement(a.id, toBody(a, { status: ns })); toast.success(`Set to ${ns}`); onChanged && onChanged(); }
    catch { toast.error('Could not update'); }
  };

  const duplicate = async (a) => {
    try { await duplicateAchievement(a.id); toast.success('Duplicated as custom'); onChanged && onChanged(); }
    catch { toast.error('Could not duplicate'); }
  };

  const remove = async (a) => {
    setConfirmId(null);
    setList((ls) => ls.filter((x) => x.id !== a.id));
    try { await deleteAchievement(a.id); toast.success('Milestone removed'); onChanged && onChanged(); }
    catch { toast.error('Could not delete'); }
  };

  const onDrop = async (i) => {
    const from = dragIdx.current;
    dragIdx.current = null;
    if (from == null || from === i) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    setList(next);
    try { await reorderAchievements(next.map((x) => x.id)); onChanged && onChanged(); }
    catch { toast.error('Could not save order'); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl bg-[#0c0e12] border-white/10 text-gray-200 max-h-[92vh] overflow-y-auto" data-testid="customize-panel">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Manage Milestones</DialogTitle>
          <DialogDescription className="text-gray-500">Your progression is yours — hide, reorder, duplicate, or build your own.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          {TOGGLES.map(([key, title, desc]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div><div className="text-sm font-medium text-white">{title}</div><div className="text-xs text-gray-500">{desc}</div></div>
              <Toggle checked={local[key] !== false} onChange={(v) => toggle(key, v)} testid={`toggle-${key}`} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 mb-2">
          <h3 className="text-sm font-semibold text-white">Milestones <span className="text-gray-600 font-normal">· drag to reorder</span></h3>
          <button onClick={onCreate} data-testid="create-achievement-btn" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium px-3 py-1.5 transition"><Plus className="h-3.5 w-3.5" /> Add Milestone</button>
        </div>

        <div className="space-y-1.5">
          {list.map((a, i) => {
            const StatusIcon = statusIcon[a.status || 'visible'];
            return (
              <div key={a.id} draggable onDragStart={() => (dragIdx.current = i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}
                data-testid={`manage-row-${a.id}`}
                className={`flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-2.5 py-2 ${a.status === 'hidden' ? 'opacity-60' : ''}`}>
                <GripVertical className="h-4 w-4 text-gray-600 cursor-grab shrink-0" />
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${a.unlocked ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-gray-500'}`}><Icon name={a.icon} className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate flex items-center gap-1.5">
                    {a.title}
                    <span className={`text-[9px] rounded px-1 ${a.is_system ? 'text-sky-300/80 border border-sky-500/30' : 'text-emerald-400/80 border border-emerald-500/30'}`}>{a.is_system ? 'SYSTEM' : 'CUSTOM'}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{a.description}</div>
                </div>
                {confirmId === a.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-gray-400">Delete?</span>
                    <button onClick={() => setConfirmId(null)} className="text-[11px] text-gray-400 hover:text-white px-1.5 py-0.5">Cancel</button>
                    <button onClick={() => remove(a)} data-testid={`confirm-del-${a.id}`} className="text-[11px] text-red-300 bg-red-500/15 rounded px-1.5 py-0.5">Delete</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <IconBtn onClick={() => changeStatus(a)} title={`Visibility: ${a.status || 'visible'}`} testid={`vis-ach-${a.id}`}><StatusIcon className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn onClick={() => duplicate(a)} title="Duplicate" testid={`dup-ach-${a.id}`}><Copy className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn onClick={() => onEditAchievement(a)} title="Edit" testid={`edit-ach-${a.id}`}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn onClick={() => setConfirmId(a.id)} title="Delete" testid={`del-ach-${a.id}`} danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IconBtn({ children, onClick, title, testid, danger }) {
  return (
    <button onClick={onClick} title={title} data-testid={testid}
      className={`h-7 w-7 rounded-md flex items-center justify-center text-gray-400 transition ${danger ? 'hover:bg-red-500/15 hover:text-red-400' : 'hover:bg-white/[0.06] hover:text-white'}`}>
      {children}
    </button>
  );
}
