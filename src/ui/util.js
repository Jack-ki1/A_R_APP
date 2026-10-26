import { useEffect, useRef, useState } from "react";
import { AS_OF, LAST } from "../engine/constants";

export const fmtN = (n) => (n == null ? "–" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(Math.round(n)));
export const fmtPct = (x, d = 0) => (x == null ? "–" : (x * 100).toFixed(d) + "%");
export const fmtSigned = (x, d = 1) => (x == null ? "–" : (x >= 0 ? "+" : "") + x.toFixed(d));
export const dayMs = 864e5;
export const weekDate = (i) => new Date(Date.parse(AS_OF + "T00:00:00Z") - (LAST - i) * 7 * dayMs);
export const fmtDay = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const fmtDayY = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const weekLabels = (T) => Array.from({ length: T + 1 }, (_, i) => fmtDay(weekDate(i)));
export const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export const storage = (() => {
  const mem = {};
  return {
    get(k) { try { const v = window.localStorage.getItem(k); if (v != null) return v; } catch (e) { /* unavailable */ } return mem[k] != null ? mem[k] : null; },
    set(k, v) { mem[k] = v; try { window.localStorage.setItem(k, v); } catch (e) { /* unavailable */ } },
  };
})();
export function usePersisted(key, init) {
  const full = "br-mvp-v2-" + key;
  const [v, setV] = useState(() => {
    const raw = storage.get(full);
    if (raw) { try { return JSON.parse(raw); } catch (e) { /* fall through */ } }
    return typeof init === "function" ? init() : init;
  });
  useEffect(() => { storage.set(full, JSON.stringify(v)); }, [full, v]);
  return [v, setV];
}
let gidCounter = 0;
export function useGid() { const r = useRef(null); if (r.current == null) r.current = "g" + ++gidCounter; return r.current; }
