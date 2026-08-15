import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';

const GREEN = '#34d399';

const money0 = (v) => {
  const n = Math.round(Number(v) || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US')}`;
};
const fmtDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtDateLong = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// "Nice" axis scale
function niceNum(range, round) {
  const exp = Math.floor(Math.log10(range));
  const frac = range / Math.pow(10, exp);
  let nf;
  if (round) nf = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  else nf = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}
function niceScale(min, max, maxTicks = 5) {
  if (min === max) { min -= 1; max += 1; }
  const range = niceNum(max - min, false);
  const step = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) ticks.push(v);
  return { niceMin, niceMax, ticks };
}

// Catmull-Rom -> cubic bezier smoothing
function smoothPath(pts) {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  const t = 0.5;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * t * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * t * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * t * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * t * 2;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function EquityChart({ data = [], startBalance = 0, height = 300 }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState(null); // index

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth || 800);
    return () => ro.disconnect();
  }, []);

  const padT = 18, padB = 30, padL = 12, padR = 68;
  const plotW = Math.max(width - padL - padR, 10);
  const plotH = Math.max(height - padT - padB, 10);

  const values = data.map((d) => Number(d.value) || 0);
  const scale = useMemo(() => {
    if (!values.length) return null;
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const margin = (rawMax - rawMin) * 0.12 || Math.abs(rawMax) * 0.03 || 100;
    return niceScale(rawMin - margin, rawMax + margin, 6);
  }, [data]); // eslint-disable-line

  // Signature to restart the draw animation when the dataset changes
  const drawKey = useMemo(() => `${data.length}:${values[0] || 0}:${values[values.length - 1] || 0}:${Math.round(plotW)}`,
    [data.length, plotW]); // eslint-disable-line

  const n = data.length;
  const x = (i) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yOf = (v) => {
    if (!scale) return padT + plotH / 2;
    const { niceMin, niceMax } = scale;
    const r = niceMax - niceMin || 1;
    return padT + (1 - (v - niceMin) / r) * plotH;
  };

  const pts = data.map((d, i) => ({ x: x(i), y: yOf(Number(d.value) || 0) }));
  const linePath = smoothPath(pts);
  const areaPath = linePath ? `${linePath} L ${pts[pts.length - 1].x.toFixed(2)} ${(padT + plotH).toFixed(2)} L ${pts[0].x.toFixed(2)} ${(padT + plotH).toFixed(2)} Z` : '';

  // X-axis labels (auto count)
  const labelCount = Math.min(n, Math.max(3, Math.floor(plotW / 130)));
  const labelIdx = n <= 1 ? [0] : Array.from({ length: labelCount }, (_, k) => Math.round((k / (labelCount - 1)) * (n - 1)));
  const uniqIdx = [...new Set(labelIdx)];

  const onMove = (e) => {
    if (n < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const rel = Math.min(Math.max((mx - padL) / plotW, 0), 1);
    setHover(Math.round(rel * (n - 1)));
  };

  // Empty / initial state
  if (n < 2) {
    return (
      <div ref={wrapRef} data-testid="equity-chart-empty" className="relative rounded-xl border border-white/[0.06] bg-[#0a0c10] overflow-hidden" style={{ height }}>
        <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(52,211,153,0.08), transparent 55%)' }} />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono-num">{money0(startBalance)}</div>
          <div className="text-sm text-gray-300 mt-2 font-medium">No equity data yet</div>
          <div className="text-xs text-gray-500 mt-1">Log your first trade to start building your equity curve.</div>
        </div>
      </div>
    );
  }

  const hoverPt = hover != null ? pts[hover] : null;
  const tipLeft = hoverPt ? Math.min(Math.max(hoverPt.x, 70), width - 70) : 0;
  const first = values[0];
  const last = values[values.length - 1];
  const up = last >= first;

  return (
    <div ref={wrapRef} data-testid="equity-chart" className="relative rounded-xl border border-white/[0.06] bg-[#0a0c10] overflow-hidden" style={{ height }}>
      <svg width={width} height={height} className="block" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.28" />
            <stop offset="55%" stopColor={GREEN} stopOpacity="0.08" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
          <filter id="eqGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Horizontal grid + right-side Y axis labels */}
        {scale && scale.ticks.map((v, i) => {
          const gy = yOf(v);
          if (gy < padT - 1 || gy > padT + plotH + 1) return null;
          return (
            <g key={i}>
              <line x1={padL} x2={padL + plotW} y1={gy} y2={gy} stroke="rgba(255,255,255,0.055)" strokeWidth="1" />
              <text x={width - padR + 10} y={gy + 3.5} fill="rgba(255,255,255,0.4)" fontSize="10.5" fontFamily="'JetBrains Mono', monospace">{money0(v)}</text>
            </g>
          );
        })}

        {/* Area + line (re-mounts on drawKey to replay draw-in animation) */}
        <g key={drawKey}>
          <path d={areaPath} fill="url(#eqFill)" className="eq-area" />
          <path d={linePath} fill="none" stroke={GREEN} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" pathLength="1" className="eq-line" filter="url(#eqGlow)" />
        </g>

        {/* X-axis date labels */}
        {uniqIdx.map((idx) => {
          const lx = Math.min(Math.max(x(idx), padL + 14), padL + plotW - 14);
          return <text key={idx} x={lx} y={height - 9} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10.5" fontFamily="'JetBrains Mono', monospace">{fmtDate(data[idx].date)}</text>;
        })}

        {/* Hover crosshair + point */}
        {hoverPt && (
          <g>
            <line x1={hoverPt.x} x2={hoverPt.x} y1={padT} y2={padT + plotH} stroke="rgba(52,211,153,0.35)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hoverPt.x} cy={hoverPt.y} r="6" fill={GREEN} fillOpacity="0.18" />
            <circle cx={hoverPt.x} cy={hoverPt.y} r="3.5" fill={GREEN} stroke="#0a0c10" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="absolute top-3 left-3 flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />
        <span className="text-gray-300 font-medium">Equity</span>
        <span className={`ml-2 font-mono-num ${up ? 'text-emerald-400' : 'text-red-400'}`}>{money0(last)}</span>
      </div>

      {/* Tooltip */}
      {hoverPt && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-[#12151b]/95 backdrop-blur px-3 py-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]"
          style={{ left: tipLeft, top: Math.max(hoverPt.y - 62, 6) }}>
          <div className="text-[11px] text-gray-400 font-mono-num whitespace-nowrap">{fmtDateLong(data[hover].date)}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
            <span className="text-sm font-semibold text-white font-mono-num whitespace-nowrap">{money0(data[hover].value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
