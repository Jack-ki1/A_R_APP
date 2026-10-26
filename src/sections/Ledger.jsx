import { useEffect, useRef } from "react";
import { PROVIDERS } from "../data/providers";
import { Chip, Icon } from "../ui/primitives";

/* ───────────────────────── 10. Source ledger ───────────────────────── */

export function Ledger({ onClose }) {
  const mlTone = { allowed: "go", verify: "warn", blocked: "risk" };
  const mlText = { allowed: "Allowed in scoring", verify: "Verify terms first", blocked: "Blocked from scoring" };
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus(); const h = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="drawer-bg" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Source ledger" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 className="disp" style={{ margin: 0, fontSize: 20 }}>Source ledger</h2><button ref={ref} className="btn sm" style={{ marginLeft: "auto" }} onClick={onClose}><Icon n="x" s={15} />Close</button></div>
        <p className="muted">What each source gives us, what it costs, and whether its terms let us use it for scoring. Checked 21 October 2026. Re-check before signing a contract.</p>
        <div className="stack">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="card">
              <div className="row"><b>{p.name}</b><Chip>{p.status}</Chip><Chip tone={mlTone[p.ml]}>{mlText[p.ml]}</Chip></div>
              <div className="muted" style={{ fontSize: 13.5, margin: "4px 0" }}>{p.role}</div>
              <ul className="dlist" style={{ fontSize: 13.5 }}>{p.facts.map((f) => (<li key={f}>{f}</li>))}</ul>
              <div style={{ fontSize: 13.5 }}><b>Our rule:</b> {p.note}</div>
            </div>))}
        </div>
      </aside>
    </div>
  );
}
