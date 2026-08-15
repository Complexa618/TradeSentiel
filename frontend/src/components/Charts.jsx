import React from 'react';

// Area chart for equity curve
export function AreaChart({ data, height = 220, color = '#34d399' }) {
  if (!data || data.length < 2) return <Empty height={height} />;
  const w = 600;
  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const margin = (rawMax - rawMin) * 0.08 || Math.abs(rawMax) * 0.02 || 1;
  const min = rawMin - margin;
  const max = rawMax + margin;
  const range = max - min || 1;
  const pad = 10;
  const x = (i) => (i / (data.length - 1)) * (w - pad * 2) + pad;
  const y = (v) => height - pad - ((v - min) / range) * (height - pad * 2);
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(data.length - 1)} ${height - pad} L ${x(0)} ${height - pad} Z`;
  // Reference line at the starting baseline (first point)
  const baseY = y(values[0]);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} x2={w - pad} y1={baseY} y2={baseY} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Line chart (rolling win rate)
export function LineChartSimple({ data, height = 220, color = '#34d399' }) {
  if (!data || data.length < 2) return <Empty height={height} />;
  const w = 600, pad = 12;
  const x = (i) => (i / (data.length - 1)) * (w - pad * 2) + pad;
  const y = (v) => height - pad - (v / 100) * (height - pad * 2);
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {[25, 50, 75].map((g) => (
        <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Bar chart (daily P&L)
export function BarChart({ data, height = 220 }) {
  if (!data || !data.length) return <Empty height={height} />;
  const w = 600, pad = 12;
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const bw = (w - pad * 2) / data.length;
  const zeroY = height / 2;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <line x1={pad} x2={w - pad} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.1)" />
      {data.map((d, i) => {
        const h = (Math.abs(d.value) / max) * (height / 2 - pad);
        const pos = d.value >= 0;
        return (
          <rect key={i} x={pad + i * bw + bw * 0.15} width={bw * 0.7}
            y={pos ? zeroY - h : zeroY} height={Math.max(h, 1)} rx="2"
            fill={pos ? '#34d399' : '#f87171'} opacity="0.85" />
        );
      })}
    </svg>
  );
}

// Radial gauge for performance score
export function Gauge({ value = 0, size = 200 }) {
  const r = size / 2 - 16;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, 100)) / 100;
  const dash = circ * 0.75; // 270deg arc
  const offset = dash * (1 - pct);
  const color = value >= 66 ? '#34d399' : value >= 33 ? '#fbbf24' : '#f87171';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold font-mono-num text-white">{value.toFixed(2)}</div>
        <div className="label-caps text-gray-500 mt-1">Score</div>
      </div>
    </div>
  );
}

function Empty({ height }) {
  return (
    <div className="flex items-center justify-center text-sm text-gray-600" style={{ height }}>
      No trades in this range.
    </div>
  );
}
