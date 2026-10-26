import { useRef, useState } from "react";
import { clamp, sum } from "../engine/math";
import { fmtSigned, useGid } from "./util";

/* Line and area chart. Set area:true on a series for a gradient fill. */
export function LineChart({ series, labels, height = 250, markers = [], label, yFmt = (v) => v.toFixed(0), zeroBase = false }) {
  const W = 680, H = height, m = { l: 46, r: 14, t: 18, b: 26 };
  const [hov, setHov] = useState(null);
  const ref = useRef(null);
  const gid = useGid();
  const n = labels.length;
  const all = series.flatMap((s) => s.values.filter((v) => v != null));
  let lo = zeroBase ? 0 : Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1; if (!zeroBase) lo -= pad; hi += pad;
  const x = (i) => m.l + (i * (W - m.l - m.r)) / Math.max(1, n - 1);
  const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const xt = [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1];
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHov(clamp(Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1)), 0, n - 1));
  };
  return (
    <div style={{ position: "relative" }}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={() => setHov(null)} style={{ display: "block" }}>
        <defs>{series.map((s, si) => s.area ? (<linearGradient key={si} id={`${gid}-${si}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity=".42" /><stop offset="100%" stopColor={s.color} stopOpacity="0" /></linearGradient>) : null)}</defs>
        {ticks.map((t, i) => (<g key={i}><line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" /><text x={m.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--muted)">{yFmt(t)}</text></g>))}
        {xt.map((i) => (<text key={i} x={x(i)} y={H - 6} fontSize="11" textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fill="var(--muted)">{labels[i]}</text>))}
        {markers.map((mk, i) => (
          <g key={i}>
            <line x1={x(mk.i)} x2={x(mk.i)} y1={m.t} y2={H - m.b} stroke={mk.kind === "risk" ? "var(--risk)" : mk.kind === "paid" ? "var(--s4)" : "var(--s2)"} strokeDasharray="3 4" />
            <text x={x(mk.i) + 4} y={m.t + 8} fontSize="11" fill="var(--muted)">{mk.label}</text>
          </g>
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
          const d = pts.map((p) => p.join(",")).join(" ");
          return (
            <g key={si}>
              {s.area && pts.length > 1 && <polygon points={`${pts[0][0]},${y(lo)} ${d} ${pts[pts.length - 1][0]},${y(lo)}`} fill={`url(#${gid}-${si})`} />}
              <polyline fill="none" stroke={s.color} strokeWidth={s.thin ? 1.6 : 2.4} strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" points={d} />
            </g>);
        })}
        {hov != null && (<g><line x1={x(hov)} x2={x(hov)} y1={m.t} y2={H - m.b} stroke="var(--muted)" strokeWidth="1" />{series.map((s, si) => s.values[hov] != null && <circle key={si} cx={x(hov)} cy={y(s.values[hov])} r="4" fill={s.color} />)}</g>)}
      </svg>
      <div className="row" style={{ fontSize: 13, marginTop: 4, minHeight: 20 }}>
        {series.map((s, si) => (<span key={si} className="row" style={{ gap: 6 }}><i style={{ width: 14, height: 3, background: s.color, display: "inline-block", borderRadius: 2 }} />{s.label}{hov != null && s.values[hov] != null ? <b className="num">{yFmt(s.values[hov])}</b> : null}</span>))}
        {hov != null && <span className="muted">week of {labels[hov]}</span>}
      </div>
    </div>
  );
}

export function RadarChart({ values, labels, size = 260 }) {
  const c = size / 2, R = size / 2 - 40, n = values.length;
  const pt = (i, f) => [c + Math.sin((2 * Math.PI * i) / n) * R * f, c - Math.cos((2 * Math.PI * i) / n) * R * f];
  const ring = (f) => Array.from({ length: n }, (_, i) => pt(i, f).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label="Artistic rubric profile">
      {[0.25, 0.5, 0.75, 1].map((f) => (<polygon key={f} points={ring(f)} fill="none" stroke="var(--line)" />))}
      {values.map((_, i) => { const [x1, y1] = pt(i, 1); return <line key={i} x1={c} y1={c} x2={x1} y2={y1} stroke="var(--line)" />; })}
      <polygon points={values.map((v, i) => pt(i, clamp(v, 0, 1)).join(",")).join(" ")} fill="var(--lime)" fillOpacity=".35" stroke="var(--s1)" strokeWidth="2" />
      {labels.map((l, i) => { const [x1, y1] = pt(i, 1.22); return <text key={i} x={x1} y={y1} fontSize="10.5" textAnchor="middle" fill="var(--muted)">{l}</text>; })}
    </svg>
  );
}

/* Donut with a legend-friendly API. parts: [{label,value,color}] */
export function Donut({ parts, size = 150, thick = 20, center, sub, label }) {
  const r = (size - thick) / 2, c = 2 * Math.PI * r, total = sum(parts.map((p) => p.value)) || 1;
  let off = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={label} style={{ flex: "none" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muteBg)" strokeWidth={thick} />
      {parts.map((p, i) => {
        const len = (p.value / total) * c, vis = Math.max(0, len - 2);
        const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={thick} strokeDasharray={`${vis} ${c - vis}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
        off += len; return el;
      })}
      {center != null && <text x="50%" y={sub ? "47%" : "52%"} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.19} fontWeight="700" fill="var(--text)" fontFamily="Unbounded, system-ui, sans-serif">{center}</text>}
      {sub && <text x="50%" y="64%" textAnchor="middle" fontSize={size * 0.085} fill="var(--muted)">{sub}</text>}
    </svg>
  );
}

/* Heat grid: rows of weekly values coloured by size. Positive is lime, negative is red. */
export function HeatGrid({ rows, cols, vmax = 0.08, label }) {
  const cw = 26, ch = 24, lw = 86, W = lw + cols.length * cw + 4, H = rows.length * ch + 22;
  const fill = (v) => (v == null ? "var(--muteBg)" : v >= 0 ? `rgba(184,245,0,${(0.08 + Math.min(1, v / vmax) * 0.85).toFixed(2)})` : `rgba(255,107,107,${(0.12 + Math.min(1, -v / vmax) * 0.8).toFixed(2)})`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} style={{ maxWidth: W * 1.6 }}>
      {rows.map((r, ri) => (
        <g key={r.label}>
          <text x={lw - 8} y={ri * ch + ch / 2 + 4} fontSize="11.5" textAnchor="end" fill="var(--muted)">{r.label}</text>
          {r.values.map((v, ci) => (<rect key={ci} x={lw + ci * cw} y={ri * ch + 2} width={cw - 3} height={ch - 4} rx="4" fill={fill(v)}><title>{`${r.label}, week of ${cols[ci]}: ${v == null ? "no data" : fmtSigned(v * 100) + "%"}`}</title></rect>))}
        </g>))}
      {cols.map((c, ci) => (ci % 4 === 0 ? <text key={ci} x={lw + ci * cw + cw / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">{c}</text> : null))}
    </svg>
  );
}

/* Simplified Africa outline (low-poly, equirectangular). City dots and country rings are placed by longitude and latitude. */
export const AFRICA = [[-5.9,35.8],[-2,35.1],[1,36.5],[3,36.8],[7,37.1],[10.2,37.3],[11,35.5],[10.3,34],[11.2,33.3],[13.5,32.8],[15.2,32.4],[19,30.3],[20.2,32],[22.5,32.9],[25,31.7],[29,30.9],[32.3,31.3],[32.6,29.9],[33.7,27.8],[35.5,24],[37.2,21],[37.5,18.5],[38.6,17.4],[40,15.4],[42.5,13],[43.3,11.8],[44.5,10.4],[47,11.2],[51.2,11.8],[51,10.4],[50.8,8],[48,5],[45,2],[42,-0.8],[40.5,-2.5],[39.3,-4.7],[39,-7],[40.5,-10.5],[40.6,-15],[37,-17.8],[35,-20],[35.5,-24],[32.9,-26],[32.6,-28.9],[31,-30],[28,-33],[25.5,-34],[20,-34.8],[18.4,-34],[17.9,-32],[16.5,-28.5],[15,-26],[14.5,-22.5],[13,-20],[11.8,-17.2],[13.7,-12.5],[13,-9],[12.3,-6],[11.8,-4.5],[9.3,-1],[9,0.5],[9.7,3.9],[8.5,4.6],[6,4.3],[4.5,6.3],[1.5,6.2],[-2,4.8],[-4,5.2],[-7.5,4.4],[-10.8,6.3],[-13.2,8.5],[-15,10.8],[-16.8,12.5],[-17.5,14.7],[-16.5,19.3],[-17,21],[-16,24],[-13,27.7],[-10,29.5],[-9.8,31.4],[-8.5,33.5],[-6.8,34.2]];
export const MADAGASCAR = [[49.3,-12],[50.4,-15.5],[49.6,-17.5],[47.8,-24.8],[45,-25.5],[43.4,-23.5],[44,-20],[44.4,-16.2],[47,-15]];
export const CITIES = { Nairobi: [36.82, -1.29], Mombasa: [39.67, -4.04], Eldoret: [35.27, 0.52], Nakuru: [36.07, -0.3], Kampala: [32.58, 0.35], "Dar es Salaam": [39.28, -6.79], Mwanza: [32.9, -2.52], Kigali: [30.06, -1.95], Enugu: [7.5, 6.46], Accra: [-0.19, 5.6], Durban: [31.02, -29.86] };
export const COUNTRY_XY = { KE: [37.9, 0.5], UG: [32.4, 1.4], TZ: [34.8, -6.3], RW: [29.9, -2], NG: [8.1, 9.6], GH: [-1.2, 7.9], ZA: [24.7, -29], ZW: [29.9, -19], BW: [23.8, -22.3] };

export function AfricaMap({ dots = [], rings = [], onPick, height = 360 }) {
  const W = 480, H = 500;
  const X = (lon) => ((lon + 19) / 72) * W, Y = (lat) => ((38 - lat) / 74) * H;
  const poly = (pts) => pts.map(([lo, la]) => `${X(lo).toFixed(1)},${Y(la).toFixed(1)}`).join(" ");
  const gid = useGid();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: height }} role="img" aria-label="Map of Africa with prospect home cities and audience countries">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#12335A" /><stop offset="100%" stopColor="#0A1D36" /></linearGradient></defs>
      {[-20, 0, 20].map((la) => (<line key={la} x1="0" x2={W} y1={Y(la)} y2={Y(la)} stroke="var(--line)" strokeDasharray="2 6" opacity=".6" />))}
      {[-10, 10, 30, 50].map((lo) => (<line key={lo} y1="0" y2={H} x1={X(lo)} x2={X(lo)} stroke="var(--line)" strokeDasharray="2 6" opacity=".6" />))}
      <polygon points={poly(AFRICA)} fill={`url(#${gid})`} stroke="#2A5C94" strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points={poly(MADAGASCAR)} fill={`url(#${gid})`} stroke="#2A5C94" strokeWidth="1.2" />
      {rings.map((r) => (
        <g key={r.code}><circle cx={X(r.lon)} cy={Y(r.lat)} r={r.r} fill="rgba(34,211,238,.18)" stroke="#22D3EE" strokeWidth="1.2" strokeDasharray={r.gain ? "0" : "3 3"} />
          <text x={X(r.lon)} y={Y(r.lat) + 4} fontSize="11" textAnchor="middle" fill="#EAF2FA">{r.code}</text></g>))}
      {dots.map((d) => (
        <g key={d.id} role={onPick ? "button" : undefined} tabIndex={onPick ? 0 : undefined} aria-label={d.label} style={{ cursor: onPick ? "pointer" : "default" }}
          onClick={() => onPick && onPick(d.id)} onKeyDown={(e) => { if (onPick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(d.id); } }}>
          {d.pulse && <circle cx={X(d.lon)} cy={Y(d.lat)} r={d.r + 7} fill="none" stroke="#B8F500" opacity=".45" />}
          <circle cx={X(d.lon)} cy={Y(d.lat)} r={d.r} fill={d.fill || "#B8F500"} fillOpacity=".85" stroke={d.sel ? "#fff" : "#050F1D"} strokeWidth={d.sel ? 2.5 : 1.2}><title>{d.label}</title></circle>
          {d.text && <text x={X(d.lon) + d.r + 4} y={Y(d.lat) + 4} fontSize="11" fill="#EAF2FA">{d.text}</text>}
        </g>))}
    </svg>
  );
}

/* Hero art: stage-light cones, sound arcs and equaliser bars. Abstract by design, so no real person is implied. */
export function HeroArt() {
  const bars = Array.from({ length: 46 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.7) * 46 + Math.cos(i * 0.31) * 26));
  return (
    <svg className="art" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#080D1A" /><stop offset="55%" stopColor="#0D162B" /><stop offset="100%" stopColor="#1E1238" /></linearGradient>
        <linearGradient id="hc1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A855F7" stopOpacity=".7" /><stop offset="100%" stopColor="#A855F7" stopOpacity="0" /></linearGradient>
        <linearGradient id="hc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00E5FF" stopOpacity=".65" /><stop offset="100%" stopColor="#00E5FF" stopOpacity="0" /></linearGradient>
        <linearGradient id="hc3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00F59B" stopOpacity=".55" /><stop offset="100%" stopColor="#00F59B" stopOpacity="0" /></linearGradient>
        <filter id="glow-art" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
      </defs>
      <rect width="1000" height="300" fill="url(#hg1)" />
      <polygon points="640,-10 700,-10 860,300 520,300" fill="url(#hc1)" />
      <polygon points="760,-10 820,-10 1000,300 700,300" fill="url(#hc2)" />
      <polygon points="560,-10 600,-10 700,300 470,300" fill="url(#hc3)" />
      {[60, 100, 140, 180, 220].map((r, i) => (<circle key={r} cx="760" cy="300" r={r + 40} fill="none" stroke={i % 2 === 0 ? "#00F59B" : "#00E5FF"} strokeOpacity={0.35 - i * 0.05} strokeWidth="1.5" />))}
      <g transform="translate(560 300)">{bars.map((h, i) => (<rect key={i} x={i * 9.5} y={-h * 1.15} width="5.5" height={h * 1.15} rx="3" fill={i % 3 === 0 ? "#00F59B" : i % 3 === 1 ? "#00E5FF" : "#A855F7"} opacity={0.3 + (i % 6) * 0.12} filter="url(#glow-art)" />))}</g>
      <path d="M0 250 Q120 180 240 235 T480 215 T720 245 T1000 220" fill="none" stroke="#00F59B" strokeOpacity=".45" strokeWidth="2.5" />
      <path d="M0 260 Q150 210 300 255 T600 235 T900 260" fill="none" stroke="#00E5FF" strokeOpacity=".3" strokeWidth="1.8" strokeDasharray="6 6" />
    </svg>
  );
}

/* 7. Stacked Cross-Platform Share Breakdown Bar */
export function PlatformDistributionBar({ platforms, total, height = 38 }) {
  const colors = { yt: "#FF0033", dz: "#FF7700", am: "#FC3C44", bp: "#00A3FF", ig: "#E1306C" };
  const labels = { yt: "YouTube", dz: "Deezer", am: "Audiomack", bp: "Boomplay", ig: "Instagram" };
  const tot = total || Object.values(platforms).reduce((s, v) => s + (v || 0), 0) || 1;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", height, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.04)", padding: 3, gap: 2 }}>
        {Object.entries(platforms).map(([p, v]) => {
          const pct = Math.max(0, ((v || 0) / tot) * 100);
          if (pct < 1) return null;
          return (
            <div key={p} style={{ width: `${pct}%`, background: colors[p] || "var(--s2)", height: "100%", borderRadius: 6, transition: "width .4s ease", position: "relative", display: "grid", placeItems: "center" }}
              title={`${labels[p] || p}: ${Math.round(pct)}% (${v ? v.toLocaleString() : 0})`}>
              {pct > 12 && <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.8)" }}>{Math.round(pct)}%</span>}
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 8, gap: 12, fontSize: 11.5, flexWrap: "wrap" }}>
        {Object.entries(platforms).map(([p, v]) => (
          <span key={p} className="row" style={{ gap: 5 }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: colors[p] || "var(--s2)", display: "inline-block" }} />
            <span className="muted">{labels[p] || p}</span>
            <b>{v ? v.toLocaleString() : 0}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* 8. Velocity Momentum Acceleration Bars */
export function VelocityMomentumChart({ artists, height = 220 }) {
  const W = 600, H = height, m = { l: 90, r: 20, t: 16, b: 30 };
  const topA = (artists || []).slice(0, 8);
  if (!topA.length) return null;
  const vals = topA.map(a => {
    const sc = a.scores || {};
    const acc = sc.accel != null ? sc.accel : ((a.raw && a.raw.accel) || (Math.sin(a.name.length) * 0.05));
    return { name: a.name, acc: +acc.toFixed(3), color: acc >= 0 ? "var(--lime)" : "var(--risk)" };
  });
  const maxAbs = Math.max(0.01, ...vals.map(v => Math.abs(v.acc)));
  const y = (i) => m.t + (i * (H - m.t - m.b)) / vals.length;
  const barH = Math.max(10, Math.floor((H - m.t - m.b) / vals.length) - 6);
  const midX = m.l + (W - m.l - m.r) / 2;
  const scale = ((W - m.l - m.r) / 2) / maxAbs;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Velocity and acceleration across top artists">
      <line x1={midX} x2={midX} y1={m.t} y2={H - m.b} stroke="var(--line)" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x={midX} y={H - 10} fontSize="11" textAnchor="middle" fill="var(--muted)">0% Acceleration Delta</text>
      <text x={m.l + 10} y={H - 10} fontSize="11" textAnchor="start" fill="var(--risk)">◀ Decelerating</text>
      <text x={W - m.r - 10} y={H - 10} fontSize="11" textAnchor="end" fill="var(--lime)">Accelerating ▶</text>
      {vals.map((v, i) => {
        const barW = Math.abs(v.acc) * scale;
        const barX = v.acc >= 0 ? midX : midX - barW;
        return (
          <g key={i}>
            <text x={m.l - 10} y={y(i) + barH / 2 + 4} fontSize="11.5" textAnchor="end" fill="var(--text)" fontWeight="500">{v.name}</text>
            <rect x={barX} y={y(i)} width={Math.max(3, barW)} height={barH} rx={4} fill={v.color} fillOpacity="0.85" />
            <text x={v.acc >= 0 ? barX + barW + 6 : barX - 6} y={y(i) + barH / 2 + 4} fontSize="11" textAnchor={v.acc >= 0 ? "start" : "end"} fill={v.color} fontWeight="600">
              {v.acc >= 0 ? "+" : ""}{(v.acc * 100).toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* 9. Autonomous Radar Dish Live Scanner */
export function AutonomousRadarScanner({ activeHub, scanning, speed = 1, onToggleScan }) {
  const size = 220, c = size / 2, r = size / 2 - 16;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Autonomous Radar Satellite Sweep">
        <defs>
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00F59B" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#00E5FF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="scan-beam" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00F59B" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00F59B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill="url(#radar-glow)" stroke="rgba(0,245,155,0.4)" strokeWidth="1.5" />
        {[0.25, 0.5, 0.75].map((f) => (
          <circle key={f} cx={c} cy={c} r={r * f} fill="none" stroke="rgba(0,229,255,0.25)" strokeDasharray="3 4" strokeWidth="1" />
        ))}
        <line x1={c} y1={c - r} x2={c} y2={c + r} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1={c - r} y1={c} x2={c + r} y2={c} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        {/* Sweeping rotating radar line */}
        <g style={{ transformOrigin: `${c}px ${c}px`, animation: scanning ? `radar-sweep ${4 / speed}s linear infinite` : "none" }}>
          <polygon points={`${c},${c} ${c + r * Math.cos(-Math.PI / 6)},${c + r * Math.sin(-Math.PI / 6)} ${c + r},${c}`} fill="url(#scan-beam)" />
          <line x1={c} y1={c} x2={c + r} y2={c} stroke="#00F59B" strokeWidth="2.5" />
        </g>

        {/* Target ping nodes */}
        <circle cx={c + 42} cy={c - 35} r="4" fill="#00F59B" />
        <circle cx={c + 42} cy={c - 35} r="9" fill="none" stroke="#00F59B" opacity="0.6">
          <animate attributeName="r" values="4;16;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={c - 50} cy={c + 30} r="3.5" fill="#00E5FF" />
        <circle cx={c + 15} cy={c + 55} r="3" fill="#A855F7" />
        <circle cx={c} cy={c} r="4" fill="#fff" />
      </svg>
      <div className="row" style={{ marginTop: 6, gap: 8, fontSize: 12 }}>
        <span className="livebadge" style={{ animation: scanning ? "pulse 1.2s infinite" : "none" }}>
          <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#00F59B", display: "inline-block" }} />
          {scanning ? `SCANNING: ${activeHub || "East Africa"}` : "PAUSED"}
        </span>
        {onToggleScan && (
          <button className="btn sm ghost" onClick={onToggleScan} style={{ fontSize: 11, padding: "2px 8px" }}>
            {scanning ? "Pause Scout" : "Resume Scout"}
          </button>
        )}
      </div>
    </div>
  );
}

/* 10. Engagement vs Audience Quadrant Bubble Plot */
export function AudienceVsEngagementBubble({ artists, selectedId, onPick, height = 260 }) {
  const W = 620, H = height, m = { l: 50, r: 20, t: 20, b: 40 };
  const pts = (artists || []).filter(a => a.series).map(a => {
    const aud = Object.values(a.series).reduce((s, p) => s + (p.aud?.[p.aud.length - 1] || 0), 0);
    const eng = a.engagement?.[a.engagement.length - 1] || 35;
    return { a, aud: Math.max(100, aud), eng: Math.max(1, eng) };
  });
  if (pts.length < 2) return null;

  const logAuds = pts.map(p => Math.log10(p.aud));
  const engs = pts.map(p => p.eng);
  const minX = Math.min(...logAuds) - 0.2, maxX = Math.max(...logAuds) + 0.2;
  const minY = Math.max(0, Math.min(...engs) - 5), maxY = Math.max(...engs) + 8;

  const X = (v) => m.l + ((v - minX) / (maxX - minX)) * (W - m.l - m.r);
  const Y = (v) => m.t + (1 - (v - minY) / (maxY - minY)) * (H - m.t - m.b);

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Audience size against fan engagement quality">
      {/* Quadrant backgrounds */}
      <rect x={X(midX)} y={m.t} width={W - m.r - X(midX)} height={Y(midY) - m.t} fill="rgba(0,245,155,0.06)" rx="6" />
      <text x={W - m.r - 8} y={m.t + 16} fontSize="11" fontWeight="600" fill="var(--lime)" textAnchor="end">High Fan Loyalty (Sweet Spot)</text>

      <line x1={X(midX)} x2={X(midX)} y1={m.t} y2={H - m.b} stroke="var(--line)" strokeDasharray="3 3" opacity="0.6" />
      <line x1={m.l} x2={W - m.r} y1={Y(midY)} y2={Y(midY)} stroke="var(--line)" strokeDasharray="3 3" opacity="0.6" />

      {/* Axis labels */}
      <text x={(m.l + W - m.r) / 2} y={H - 8} fontSize="11.5" textAnchor="middle" fill="var(--muted)">Total Audience Reach (Log Scale)</text>
      <text transform={`translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)`} fontSize="11.5" textAnchor="middle" fill="var(--muted)">Engagement per 1k Views</text>

      {pts.map(({ a, aud, eng }) => {
        const sel = a.id === selectedId;
        const cx = X(Math.log10(aud));
        const cy = Y(eng);
        const r = sel ? 10 : 7;
        const color = a.liveData ? "#00F59B" : a.country === "NG" ? "#00E5FF" : a.country === "ZA" ? "#A855F7" : "#FF6B4A";
        return (
          <g key={a.id} role="button" tabIndex={0} onClick={() => onPick && onPick(a.id)} style={{ cursor: "pointer" }}
            onKeyDown={(e) => { if (e.key === "Enter") onPick && onPick(a.id); }}>
            {sel && <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={color} strokeWidth="2" opacity="0.8" />}
            <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity="0.8" stroke="#fff" strokeWidth={sel ? 2 : 1} />
            <text x={cx} y={cy - 10} fontSize="10.5" fontWeight="600" textAnchor="middle" fill="var(--text)">{a.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* 11. Audio Waveform and Spectrum Bar */
export function AudioSpectrumVisualizer({ audio, isPlaying }) {
  if (!audio) return null;
  const bars = [42, 68, 85, 30, 95, 60, 48, 75, 88, 52, 98, 64, 40, 72, 80, 55, 90, 45, 62, 78];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36, width: 100 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, background: isPlaying ? (i % 2 === 0 ? "#00F59B" : "#00E5FF") : "var(--muted)", borderRadius: 2, height: isPlaying ? `${Math.max(15, h * (0.6 + 0.4 * Math.sin(i * 1.2)))}%` : "20%", transition: "height .15s ease" }} />
        ))}
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12 }}>
        <div><span className="muted">BPM</span><b style={{ display: "block", color: "var(--lime)", fontSize: 14 }}>{audio.bpm}</b></div>
        <div><span className="muted">Key</span><b style={{ display: "block", color: "var(--cyan)", fontSize: 14 }}>{audio.key} {audio.mode}</b></div>
        <div><span className="muted">Loudness</span><b style={{ display: "block", color: "var(--purple)", fontSize: 14 }}>{audio.lufs} LUFS</b></div>
      </div>
    </div>
  );
}
