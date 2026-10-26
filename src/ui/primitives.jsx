import { clamp, hashStr } from "../engine/math";
import { initials } from "./util";

export const ICONS = {
  discover: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.6 5.4-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z",
  analyse: "M3 12h4l2.5-6 4 12 2.5-6H21",
  pick: "M12 3v4M12 17v4M3 12h4M17 12h4M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  plus: "M12 5v14M5 12h14", check: "M5 12.5l4.5 4.5L19 7.5", x: "M6 6l12 12M18 6 6 18",
  book: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4ZM8 17h10",
  left: "M15 5l-7 7 7 7", right: "M9 5l7 7-7 7", down: "M5 9l7 7 7-7",
  dl: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14", play: "M7 5l12 7-12 7V5Z", eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  users: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20c0-3 2.5-5 6-5s6 2 6 5M14.5 15.2c.5-.1 1-.2 1.5-.2 3 0 5.5 1.7 6 5",
  bolt: "M13 3 5 14h6l-1 7 8-11h-6l1-7Z", flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7ZM10 20a2 2 0 0 0 4 0",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-5-5",
  pin: "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Zm-3 9 2.2 2.2L15.5 10",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  chat: "M4 5h16v11H9l-5 4V5Z", send: "M4 12 20 4l-4 16-4-6-8-2Z", layers: "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
};
export function Icon({ n, s = 18 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n] || ""} /></svg>);
}
export const IBadge = ({ n, tone = "l" }) => (<span className={"ibadge " + tone}><Icon n={n} s={18} /></span>);

export function Logo({ size = 30 }) {
  return (<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path d="M2 17h5l3-9 5 17 4-12 2 4h9" fill="none" stroke="#B8F500" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}

/* Generated avatar: no real faces for simulated, real photo when available. */
export function Avatar({ name, id, size = 36, picture }) {
  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        title={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          flex: "none",
          objectFit: "cover",
          boxShadow: "0 0 0 2px rgba(184,245,0,.35)",
        }}
      />
    );
  }
  const h = hashStr(id || name) % 360;
  return (
    <span title={name + " (simulated)"} aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff",
      background: `linear-gradient(135deg,hsl(${h} 68% 46%),hsl(${(h + 70) % 360} 70% 26%))`, boxShadow: "0 0 0 2px rgba(184,245,0,.35)" }}>{initials(name)}</span>
  );
}

export const TONE = { go: "go", info: "info", warn: "warn", risk: "risk", mute: "" };
export const Chip = ({ tone, children, title }) => (<span className={"chip " + (tone || "")} title={title}>{children}</span>);
export const intTone = (s) => (s === "clear" ? "go" : s === "paid" ? "info" : "risk");

export function RangeBar({ v, lo, hi }) {
  const L = clamp(lo, 0, 100), H = clamp(hi, 0, 100);
  return (
    <div className="rangebar" role="img" aria-label={`Index ${v.toFixed(0)}, 90% range ${lo.toFixed(0)} to ${hi.toFixed(0)}`}>
      <div className="span" style={{ left: L + "%", width: Math.max(2, H - L) + "%" }} />
      <div className="dot" style={{ left: clamp(v, 0, 100) + "%" }} />
    </div>
  );
}
export function Meter({ v, color }) { return (<div className="meter" aria-hidden="true"><i style={{ width: clamp(v, 0, 1) * 100 + "%", background: color }} /></div>); }

export function Spark({ values, color = "var(--s1)", w = 90, h = 26 }) {
  const lo = Math.min(...values), hi = Math.max(...values), r = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - lo) / r) * (h - 4)}`).join(" ");
  return (<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" /></svg>);
}
