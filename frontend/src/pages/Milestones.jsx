import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmtMoney } from '../lib/calc';
import { CountUp, AnimatedBar, Icon } from '../components/progress/ui';
import AchievementBuilder from '../components/progress/AchievementBuilder';
import CustomizePanel from '../components/progress/CustomizePanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import {
  Flame, Trophy, Award, TrendingUp, Lock, Sliders, CheckCircle2, Sparkles, Crown, Gauge, History,
} from 'lucide-react';
import { toast } from 'sonner';

const money = (v) => fmtMoney(v);
const signMoney = (v) => `${v > 0 ? '+' : ''}${fmtMoney(v)}`;

export default function Milestones() {
  const { data, getProgress } = useApp();
  const [prog, setProg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('All');
  const [builder, setBuilder] = useState({ open: false, editing: null });
  const [customize, setCustomize] = useState(false);
  const [detail, setDetail] = useState(null);
  const [recordDetail, setRecordDetail] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const d = await getProgress();
      setProg(d);
      if (d.prefs?.notificationsEnabled !== false && d.newlyUnlocked?.length) {
        const map = Object.fromEntries(d.achievements.map((a) => [a.id, a]));
        d.newlyUnlocked.forEach((id) => {
          const a = map[id];
          if (a) toast.success(`Achievement unlocked · ${a.title}`, { description: a.description, icon: '★' });
        });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [getProgress]);

  useEffect(() => { refresh(); }, [refresh, data.trades]);

  const prefs = prog?.prefs || {};
  const categories = useMemo(() => {
    if (!prog) return ['All'];
    return ['All', ...Array.from(new Set(prog.achievements.map((a) => a.category)))];
  }, [prog]);
  const shownAchievements = useMemo(() => {
    if (!prog) return [];
    const list = cat === 'All' ? prog.achievements : prog.achievements.filter((a) => a.category === cat);
    return [...list].sort((a, b) => (b.unlocked - a.unlocked) || (b.percent - a.percent));
  }, [prog, cat]);
  const history = useMemo(() => {
    if (!prog) return [];
    return prog.achievements.filter((a) => a.unlocked_at).sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at));
  }, [prog]);

  if (loading) {
    return <div className="px-4 lg:px-8 py-10 max-w-[1400px] mx-auto text-gray-500">Loading your progress…</div>;
  }

  const s = prog.stats;
  const noTrades = s.total === 0;
  const subtitle = noTrades
    ? 'Your journey starts here — log your first trade to unlock your first milestone.'
    : `You're ${s.total} trade${s.total === 1 ? '' : 's'} into your journey · ${prog.discipline.label} discipline${prefs.achievementsEnabled !== false ? ` · ${prog.achievementsSummary.unlocked} of ${prog.achievementsSummary.total} unlocked` : ''}.`;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[1400px] mx-auto" data-testid="progress-page">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400/80 text-xs uppercase tracking-[0.2em] font-semibold"><Sparkles className="h-3.5 w-3.5" /> Trading Progress</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2">Consistency compounds.</h1>
          <p className="text-gray-400 mt-2 max-w-2xl text-sm">{subtitle}</p>
        </div>
        <button onClick={() => setCustomize(true)} data-testid="customize-btn"
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] text-gray-200 text-sm font-medium px-4 py-2 transition">
          <Sliders className="h-4 w-4" /> Customize
        </button>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {prefs.streaksEnabled !== false && (
          <StatCard icon={Flame} tone="amber" label="Current Win Streak" sub="consecutive wins"
            value={<CountUp value={prog.streaks.currentWin} />} foot={`Personal best: ${prog.streaks.bestWin}`} />
        )}
        {prefs.streaksEnabled !== false && (
          <StatCard icon={Trophy} tone="emerald" label="Best Win Streak" sub="all-time record"
            value={<CountUp value={prog.streaks.bestWin} />} foot={prog.streaks.bestWin > 0 ? 'Keep it going' : 'No streak yet'} />
        )}
        <StatCard icon={Award} tone="emerald" label="Achievements" sub={`${Math.round((prog.achievementsSummary.unlocked / Math.max(prog.achievementsSummary.total, 1)) * 100)}% unlocked`}
          value={<span><CountUp value={prog.achievementsSummary.unlocked} /> / {prog.achievementsSummary.total}</span>}
          bar={(prog.achievementsSummary.unlocked / Math.max(prog.achievementsSummary.total, 1)) * 100} />
        <StatCard icon={TrendingUp} tone={s.netPL >= 0 ? 'emerald' : 'red'} label="Net P&L" sub="all-time"
          value={<CountUp value={s.netPL} prefix={s.netPL > 0 ? '+$' : s.netPL < 0 ? '-$' : '$'} />} foot={`${s.winRate}% win rate · ${s.avgR}R avg`}
          numFix={(v) => v} />
      </div>

      {noTrades ? (
        <EmptyState />
      ) : (
        <>
          {/* Progress level */}
          {prefs.xpEnabled !== false && (
            <Section title="Your Progress" icon={Crown}>
              <div className="card-surface rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">{prog.level.level}</div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-500">Level {prog.level.level}</div>
                      <div className="text-lg font-semibold text-white">{prog.level.title}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 font-mono-num"><CountUp value={prog.level.xpTotal} /> XP total</div>
                </div>
                <div className="mt-4">
                  <AnimatedBar pct={prog.level.percent} height="h-2.5" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1.5 font-mono-num">
                    <span>{prog.level.xpInLevel} XP</span>
                    <span>{prog.level.xpForNext} XP to level {prog.level.level + 1}</span>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* Personal records */}
          <Section title="Personal Records" icon={Trophy}>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              <RecordCard label="Best Day" value={prog.records.bestDay ? signMoney(prog.records.bestDay.value) : '—'} note={prog.records.bestDay?.label} gold onClick={() => prog.records.bestDay && setRecordDetail({ title: 'Best Day', ...prog.records.bestDay })} />
              <RecordCard label="Best Trade" value={prog.records.bestTrade ? signMoney(prog.records.bestTrade.value) : '—'} note={prog.records.bestTrade?.symbol} gold />
              <RecordCard label="Best Strategy" value={prog.records.bestStrategy?.label || '—'} note={prog.records.bestStrategy ? signMoney(prog.records.bestStrategy.value) : ''} />
              <RecordCard label="Best Session" value={prog.records.bestSession?.label || '—'} note={prog.records.bestSession ? signMoney(prog.records.bestSession.value) : ''} />
              <RecordCard label="Longest Win Streak" value={prog.records.longestWinStreak ?? 0} note="wins in a row" />
              <RecordCard label="Largest R" value={prog.records.largestR ? `${prog.records.largestR.value}R` : '—'} note={prog.records.largestR?.symbol} />
              <RecordCard label="Best Week" value={prog.records.bestWeek ? signMoney(prog.records.bestWeek.value) : '—'} note={prog.records.bestWeek?.label} />
              <RecordCard label="Worst Loss" value={prog.records.worstLoss ? money(prog.records.worstLoss.value) : '—'} note={prog.records.worstLoss?.symbol} red />
            </div>
          </Section>

          {/* Periods */}
          <Section title="Recent Performance" icon={Gauge}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <PeriodCard title="Today" rows={[['Trades', prog.daily.trades], ['P&L', signMoney(prog.daily.pnl)], ['Journal', prog.daily.journalComplete ? '✓ Complete' : `${prog.daily.trades ? 'Incomplete' : '—'}`], ['Plan followed', prog.daily.planFollowed], ['Media added', prog.daily.screenshots]]} />
              <PeriodCard title="This Week" rows={[['Trades', prog.weekly.trades], ['Win rate', `${prog.weekly.winRate}%`], ['Net P&L', signMoney(prog.weekly.netPL)], ['Avg R', `${prog.weekly.avgR}R`], ['Best session', prog.weekly.bestSession]]} />
              <PeriodCard title="This Month" rows={[['Trades', prog.monthly.trades], ['Win rate', `${prog.monthly.winRate}%`], ['Net P&L', signMoney(prog.monthly.netPL)], ['Avg R', `${prog.monthly.avgR}R`], ['Best strategy', prog.monthly.bestStrategy]]} />
            </div>
          </Section>

          {/* Discipline */}
          {prefs.disciplineEnabled !== false && (
            <Section title="Discipline Score" icon={CheckCircle2}>
              <div className="card-surface rounded-2xl p-6 grid md:grid-cols-[auto_1fr] gap-6 items-center">
                <div className="text-center md:pr-6 md:border-r border-white/[0.06]">
                  <div className="text-5xl font-bold text-emerald-400 font-mono-num"><CountUp value={prog.discipline.score} /></div>
                  <div className="text-xs text-gray-500 mt-1">out of 100 · {prog.discipline.label}</div>
                </div>
                <div className="space-y-3 w-full">
                  {Object.entries({ 'Plan Followed': prog.discipline.factors.planFollowed, 'Risk Discipline': prog.discipline.factors.riskDiscipline, 'Journal Consistency': prog.discipline.factors.journal, 'Overtrading Control': prog.discipline.factors.overtrading }).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{k}</span><span className="text-gray-300 font-mono-num">{v}%</span></div>
                      <AnimatedBar pct={v} height="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Current goals */}
          <Section title="Current Goals" icon={TrendingUp}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prog.goals.map((g) => (
                <div key={g.id} className="card-surface rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{g.label}</span>
                    {g.completed
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" /> Complete</span>
                      : <span className="text-xs text-gray-500 font-mono-num">{Math.round(g.percent)}%</span>}
                  </div>
                  <div className="mt-3"><AnimatedBar pct={g.percent} /></div>
                  <div className="text-xs text-gray-500 mt-2 font-mono-num">
                    {g.unit === '$' ? `${money(g.current)} / ${money(g.target)}` : g.unit === '%' ? `${g.current}% / ${g.target}%` : g.unit === 'R' ? `${g.current}R / ${g.target}R` : `${g.current} / ${g.target}`}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Achievements */}
          {prefs.achievementsEnabled !== false && (
            <Section title="Achievements" icon={Award} action={<button onClick={() => setBuilder({ open: true, editing: null })} data-testid="new-achievement-btn" className="text-xs font-medium text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg px-3 py-1.5 transition">+ Create</button>}>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((c) => (
                  <button key={c} onClick={() => setCat(c)} data-testid={`cat-${c}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${cat === c ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300'}`}>{c}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {shownAchievements.map((a) => <AchievementCard key={a.id} a={a} onClick={() => setDetail(a)} newly={prog.newlyUnlocked?.includes(a.id)} />)}
              </div>
            </Section>
          )}

          {/* History */}
          {history.length > 0 && (
            <Section title="Achievement History" icon={History}>
              <div className="card-surface rounded-2xl divide-y divide-white/[0.05]">
                {history.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center"><Icon name={a.icon} className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{a.title}</div><div className="text-xs text-gray-500 truncate">{a.description}</div></div>
                    <div className="text-xs text-gray-500 font-mono-num">{new Date(a.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      <AchievementBuilder open={builder.open} editing={builder.editing} onClose={() => setBuilder({ open: false, editing: null })} onSaved={refresh} />
      <CustomizePanel open={customize} onClose={() => setCustomize(false)} progress={prog} onChanged={refresh}
        onCreate={() => { setCustomize(false); setBuilder({ open: true, editing: null }); }}
        onEditAchievement={(a) => { setCustomize(false); setBuilder({ open: true, editing: a }); }} />

      {/* Achievement detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md bg-[#0c0e12] border-white/10 text-gray-200" data-testid="achievement-detail">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${detail.unlocked ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-gray-500'}`}><Icon name={detail.icon} className="h-6 w-6" /></div>
                  <div>
                    <DialogTitle className="text-white">{detail.title}</DialogTitle>
                    <DialogDescription className="text-gray-500">{detail.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3">
                <Row k="Category" v={detail.category} />
                <Row k="Status" v={detail.unlocked ? 'Unlocked' : `${detail.percent}% complete`} tone={detail.unlocked ? 'emerald' : ''} />
                <Row k="Progress" v={`${reqText(detail, detail.current)} / ${reqText(detail, detail.target)}`} />
                {!detail.unlocked && <Row k="Remaining" v={reqText(detail, detail.remaining)} />}
                {detail.unlocked_at && <Row k="Unlocked" v={new Date(detail.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} tone="emerald" />}
                <AnimatedBar pct={detail.percent} height="h-2" />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Record detail */}
      <Dialog open={!!recordDetail} onOpenChange={(o) => !o && setRecordDetail(null)}>
        <DialogContent className="max-w-sm bg-[#0c0e12] border-white/10 text-gray-200" data-testid="record-detail">
          {recordDetail && (
            <>
              <DialogHeader><DialogTitle className="text-white">{recordDetail.title}</DialogTitle>
                <DialogDescription className="text-gray-500">{recordDetail.label}</DialogDescription></DialogHeader>
              <div className="text-3xl font-bold text-emerald-400 font-mono-num">{signMoney(recordDetail.value)}</div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Row k="Trades" v={recordDetail.count} />
                <Row k="Wins" v={recordDetail.wins} />
                <Row k="Losses" v={recordDetail.losses} />
                <Row k="Win rate" v={`${recordDetail.winRate}%`} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function reqText(a, val) {
  if (a.requirement_type === 'profit') return fmtMoney(val);
  if (a.requirement_type === 'win_rate') return `${val}%`;
  return Math.round(val);
}

const toneMap = { amber: 'text-amber-400', emerald: 'text-emerald-400', red: 'text-red-400' };
function StatCard({ icon: I, label, sub, value, foot, tone = 'emerald', bar }) {
  return (
    <div className="card-surface card-lift rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="label-caps text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
        <I className={`h-4 w-4 ${toneMap[tone]}`} />
      </div>
      <div className={`text-3xl font-bold font-mono-num mt-3 ${toneMap[tone]}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{sub}</div>
      {bar != null && <div className="mt-2"><AnimatedBar pct={bar} height="h-1.5" /></div>}
      {foot && <div className="text-[11px] text-gray-500 mt-2">{foot}</div>}
    </div>
  );
}

function Section({ title, icon: I, children, action }) {
  return (
    <div className="mt-8 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">{I && <I className="h-4.5 w-4.5 text-emerald-400/80" />}{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function RecordCard({ label, value, note, gold, red, onClick }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={`text-left card-surface rounded-2xl p-4 transition ${onClick ? 'card-lift cursor-pointer' : 'cursor-default'}`}>
      <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-xl font-bold font-mono-num mt-1.5 ${gold ? 'text-amber-300' : red ? 'text-red-400' : 'text-white'}`}>{value}</div>
      {note && <div className="text-xs text-gray-600 mt-0.5 truncate">{note}</div>}
    </button>
  );
}

function PeriodCard({ title, rows }) {
  return (
    <div className="card-surface rounded-2xl p-5">
      <div className="text-sm font-semibold text-white mb-3">{title}</div>
      <div className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{k}</span>
            <span className="text-gray-200 font-mono-num">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AchievementCard({ a, onClick, newly }) {
  return (
    <button onClick={onClick} data-testid={`achievement-${a.id}`}
      className={`text-left card-surface card-lift rounded-2xl p-5 relative overflow-hidden transition ${a.unlocked ? 'ring-1 ring-emerald-500/30' : 'opacity-95'} ${newly ? 'animate-in zoom-in-95 fade-in-0 duration-500' : ''}`}>
      {a.unlocked && <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />}
      <div className="flex items-start gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${a.unlocked ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-gray-600'}`}>
          {a.unlocked ? <Icon name={a.icon} className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${a.unlocked ? 'text-white' : 'text-gray-400'}`}>{a.title}</span>
            {a.unlocked && <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Unlocked</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
          {!a.unlocked && (
            <div className="mt-2.5">
              <AnimatedBar pct={a.percent} height="h-1.5" />
              <div className="flex justify-between text-[11px] text-gray-500 mt-1 font-mono-num">
                <span>{reqText(a, a.current)} / {reqText(a, a.target)}</span>
                <span>{Math.round(a.percent)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function Row({ k, v, tone }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{k}</span>
      <span className={`font-medium font-mono-num ${tone ? toneMap[tone] : 'text-gray-200'}`}>{v}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 card-surface rounded-2xl p-10 text-center">
      <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4"><Trophy className="h-7 w-7 text-emerald-400" /></div>
      <h3 className="text-lg font-semibold text-white">Your journey starts here</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Log your first trade to unlock <span className="text-emerald-400">First Blood</span> and start building streaks, records and achievements.</p>
      <div className="inline-flex items-center gap-3 mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <Lock className="h-4 w-4 text-gray-600" />
        <div className="text-left"><div className="text-sm text-gray-300">First Blood</div><div className="text-xs text-gray-600">0 / 1 trades</div></div>
      </div>
    </div>
  );
}
