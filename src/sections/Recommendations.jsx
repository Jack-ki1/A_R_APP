import { useMemo, useState } from "react";
import { REVIEWERS } from "../data/universe";
import { AS_OF, LAST } from "../engine/constants";
import { ARTISTRY_BAR, EVIDENCE_BAR, MOMENTUM_BAR, TIERS, buildMemo, whySurfaced } from "../engine/engine";
import { explainChanges, explainCompare, explainLookalikes, explainMissing, pipelineCounts } from "../engine/insights";
import { Donut } from "../ui/charts";
import { Chip, IBadge, Icon, TONE } from "../ui/primitives";
import { fmtDayY, fmtPct, weekDate } from "../ui/util";

/* ───────────────────────── 9. Recommendations ───────────────────────── */

export function downloadText(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    const el = document.createElement("a");
    el.href = url; el.download = name; document.body.appendChild(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) { return false; }
}

export const QUAD_COLOR = { go: "var(--ok)", info: "var(--s2)", warn: "var(--warn)", risk: "var(--risk)", mute: "var(--muted)" };

export function Matrix({ rows, selectedId, onPick }) {
  const W = 560, H = 400, m = { l: 44, r: 14, t: 16, b: 40 };
  const x = (v) => m.l + (v / 100) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - v / 100) * (H - m.t - m.b);
  const pts = rows.filter((r) => r.rec.pick != null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label="Momentum against artistic value">
      <rect x={x(ARTISTRY_BAR)} y={y(100)} width={x(100) - x(ARTISTRY_BAR)} height={y(MOMENTUM_BAR) - y(100)} fill="var(--okBg)" />
      {[0, 25, 50, 75, 100].map((t) => (<g key={t}><line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" /><text x={m.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--muted)">{t}</text>
        <text x={x(t)} y={H - m.b + 16} fontSize="11" textAnchor="middle" fill="var(--muted)">{t}</text></g>))}
      <line x1={x(ARTISTRY_BAR)} x2={x(ARTISTRY_BAR)} y1={m.t} y2={H - m.b} stroke="var(--muted)" strokeDasharray="4 4" />
      <line x1={m.l} x2={W - m.r} y1={y(MOMENTUM_BAR)} y2={y(MOMENTUM_BAR)} stroke="var(--muted)" strokeDasharray="4 4" />
      <text x={x(100) - 6} y={y(100) + 14} fontSize="12" textAnchor="end" fill="var(--ok)" fontWeight="600">Pursue</text>
      <text x={m.l + 6} y={y(100) + 14} fontSize="12" fill="var(--warn)" fontWeight="600">Momentum, weak artistry</text>
      <text x={x(100) - 6} y={y(0) - 8} fontSize="12" textAnchor="end" fill="var(--s2)" fontWeight="600">Develop first</text>
      <text x={m.l + 6} y={y(0) - 8} fontSize="12" fill="var(--muted)" fontWeight="600">Pass</text>
      <text x={(m.l + W - m.r) / 2} y={H - 6} fontSize="12" textAnchor="middle" fill="var(--muted)">Artistic value (panel score)</text>
      <text transform={`translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)`} fontSize="12" textAnchor="middle" fill="var(--muted)">Momentum (breakout index)</text>
      {pts.map((r) => {
        const cx = x(r.art.value), cy = y(r.rec.momentum), rad = 6 + r.sc.evidence * 7, sel = r.a.id === selectedId;
        return (
          <g key={r.a.id} role="button" tabIndex={0} aria-label={`${r.a.name}: artistic value ${r.art.value.toFixed(0)}, momentum ${r.rec.momentum.toFixed(0)}`} style={{ cursor: "pointer" }}
            onClick={() => onPick(r.a.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(r.a.id); } }}>
            <circle cx={cx} cy={cy} r={rad} fill={QUAD_COLOR[TIERS[r.rec.tier].tone]} fillOpacity=".35" stroke={QUAD_COLOR[TIERS[r.rec.tier].tone]} strokeWidth={sel ? 3 : 1.5} />
            <text x={cx} y={cy - rad - 4} fontSize="11.5" textAnchor="middle" fill="var(--text)">{r.a.name}</text>
          </g>);
      })}
    </svg>
  );
}

export function RecCard({ row, app, selected }) {
  const { a, sc, art, rec, list, recommended, slot } = row;
  const last = [...app.decisions].reverse().find((d) => d.artistId === a.id && d.week === AS_OF);
  const [mode, setMode] = useState(null);
  const [tier, setTier] = useState("pass");
  const [reason, setReason] = useState("");
  const actor = REVIEWERS.find((r) => r.id === app.actor);
  const T = TIERS[rec.tier];
  return (
    <div className="card" id={"rec-" + a.id} style={selected ? { borderColor: "var(--s2)" } : null}>
      <div className="row">
        <h3 className="disp" style={{ fontSize: 17, margin: 0 }}>{a.name}</h3>
        <Chip tone={TONE[T.tone]}>{T.label}</Chip>
        {recommended && <Chip tone="lime">Recommended pick {slot}</Chip>}
        <span className="muted" style={{ fontSize: 13 }}>{a.city}, {a.country} · {a.genre}</span>
      </div>
      <div className="row" style={{ gap: 22, margin: "10px 0" }}>
        <div><div className="disp num" style={{ fontSize: 26 }}>{rec.pick != null ? rec.pick.toFixed(0) : "–"}</div><div className="muted" style={{ fontSize: 12.5 }}>Pick score</div></div>
        <div><div className="num" style={{ fontSize: 18 }}>{rec.momentum != null ? rec.momentum.toFixed(0) : "–"}</div><div className="muted" style={{ fontSize: 12.5 }}>Momentum{rec.paid ? " (discounted for paid push)" : ""}</div></div>
        <div><div className="num" style={{ fontSize: 18 }}>{art.value != null ? art.value.toFixed(0) : "–"}</div><div className="muted" style={{ fontSize: 12.5 }}>Artistic value, {art.reviewers} reviewer{art.reviewers === 1 ? "" : "s"}</div></div>
        <div><div className="num" style={{ fontSize: 18 }}>{sc ? fmtPct(sc.evidence) : "–"}</div><div className="muted" style={{ fontSize: 12.5 }}>Evidence</div></div>
      </div>
      <p style={{ margin: "0 0 8px" }}>{rec.why}</p>
      {sc && <p className="muted" style={{ margin: "0 0 8px", fontSize: 13.5 }}>{whySurfaced(a, sc)}</p>}
      <details><summary>Before anyone signs ({list.length})</summary><ul className="dlist" style={{ marginTop: 6 }}>{list.map((x) => (<li key={x}>{x}</li>))}</ul></details>

      <div className="row" style={{ marginTop: 12 }}>
        {last ? <Chip tone={last.kind === "accepted" ? "go" : "warn"}>{last.kind === "accepted" ? "Accepted" : "Overridden to " + TIERS[last.toTier].label} by {last.by}</Chip> : <Chip>No decision logged this week</Chip>}
        {(a.previewUrl || (a.tracks && a.tracks[0] && a.tracks[0].preview)) && (
          <button className="btn sm ghost" onClick={() => app.playTrack(a.tracks?.[0] || { title: a.name + " Top Track", preview: a.previewUrl }, a.name, a.picture)} title="Listen to master audio preview">
            <Icon n="play" s={13} /> Listen
          </button>
        )}
        <div style={{ marginLeft: "auto" }} className="row">
          <button className="btn sm primary" onClick={() => app.logDecision({ artistId: a.id, name: a.name, kind: "accepted", fromTier: rec.tier, toTier: rec.tier, reason: "Accepted the recommendation.", by: actor.name })}>Accept</button>
          <button className="btn sm" aria-expanded={mode === "override"} onClick={() => setMode(mode ? null : "override")}>Override</button>
        </div>
      </div>
      {mode === "override" && (
        <div className="stack" style={{ marginTop: 10 }}>
          <div className="field"><label htmlFor={"ot" + a.id}>Change the verdict to</label>
            <select id={"ot" + a.id} value={tier} onChange={(e) => setTier(e.target.value)}>{Object.entries(TIERS).filter(([k]) => k !== "pending").map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}</select></div>
          <div className="field"><label htmlFor={"or" + a.id}>Reason (required, at least 10 characters)</label><textarea id={"or" + a.id} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="row"><button className="btn sm primary" disabled={reason.trim().length < 10} onClick={() => { app.logDecision({ artistId: a.id, name: a.name, kind: "overridden", fromTier: rec.tier, toTier: tier, reason: reason.trim(), by: actor.name }); setMode(null); setReason(""); }}>Log override</button>
            <button className="btn sm ghost" onClick={() => setMode(null)}>Cancel</button></div>
        </div>)}
    </div>
  );
}

export function Copilot({ rows, app }) {
  const withSc = rows.filter((r) => r.sc);
  const [aId, setA] = useState(null);
  const [bId, setB] = useState(null);
  const [ans, setAns] = useState(null);
  if (withSc.length < 2) {
    return (<div className="card"><div className="ch"><IBadge n="chat" tone="c" /><h2 className="disp" style={{ fontSize: 16 }}>Ask the evidence</h2></div><p className="muted" style={{ margin: 0 }}>Shortlist at least two measured artists to compare them here.</p></div>);
  }
  const A = withSc.find((r) => r.a.id === aId) || withSc[0];
  const B = withSc.find((r) => r.a.id === bId && r.a.id !== A.a.id) || withSc.find((r) => r.a.id !== A.a.id);
  const [hi, lo] = (A.rec.pick ?? -1) >= (B.rec.pick ?? -1) ? [A, B] : [B, A];
  const sp = app.prev.byId.get(A.a.id);
  const questions = [
    { q: `Why is ${hi.a.name} ranked above ${lo.a.name}?`, run: () => explainCompare(hi, lo) },
    { q: `What changed for ${A.a.name} in the last four weeks?`, run: () => explainChanges(A.a, A.sc).concat(sp ? [`Index ${A.sc.idx.toFixed(0)}, ${A.sc.idx - sp.idx >= 0 ? "up" : "down"} ${Math.abs(A.sc.idx - sp.idx).toFixed(1)} on last week.`] : []) },
    { q: `Which artists look like ${A.a.name}?`, run: () => explainLookalikes(A.sc, (id) => (app.allArtists.find((x) => x.id === id) || { name: id }).name) },
    { q: `What must happen before we sign ${A.a.name}?`, run: () => explainMissing(A) },
  ];
  return (
    <div className="card">
      <div className="ch"><IBadge n="chat" tone="c" /><div><h2 className="disp" style={{ fontSize: 16 }}>Ask the evidence</h2><div className="sub">Answers are built only from the numbers on this page, so each line can be checked. A language model can phrase them later, but should see only these facts.</div></div></div>
      <div className="grid g2e" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="row">
            <div className="field"><label htmlFor="ca">Artist</label><select id="ca" value={A.a.id} onChange={(e) => { setA(e.target.value); setAns(null); }}>{withSc.map((r) => (<option key={r.a.id} value={r.a.id}>{r.a.name}</option>))}</select></div>
            <div className="field"><label htmlFor="cb">Compare with</label><select id="cb" value={B.a.id} onChange={(e) => { setB(e.target.value); setAns(null); }}>{withSc.filter((r) => r.a.id !== A.a.id).map((r) => (<option key={r.a.id} value={r.a.id}>{r.a.name}</option>))}</select></div>
          </div>
          <div className="suggest">{questions.map((x) => (<button key={x.q} onClick={() => setAns({ q: x.q, lines: x.run() })}>{x.q}</button>))}</div>
        </div>
        <div className="chat" aria-live="polite">
          {!ans && <div className="bubble muted">Pick a question. Nothing is guessed: if a number is missing, the answer says so.</div>}
          {ans && (<><div className="bubble q">{ans.q}</div><div className="bubble"><ul className="dlist">{ans.lines.map((l, i) => (<li key={i}>{l}</li>))}</ul></div></>)}
        </div>
      </div>
    </div>
  );
}

export function Recommendations({ app }) {
  const { recs, capacity, setCapacity, decisions } = app;
  const [pick, setPick] = useState(null);
  const rows = recs.rows;
  const picks = rows.filter((r) => r.recommended);
  const live = useMemo(() => app.visible.filter((a) => a.series), [app.visible]);
  const unreviewed = live.filter((a) => !rows.some((r) => r.a.id === a.id)).length;
  const funnel = pipelineCounts({ live, watch: app.watch, reviews: app.reviews, recs, decisions });
  const tierCounts = {};
  for (const r of rows) tierCounts[r.rec.tier] = (tierCounts[r.rec.tier] || 0) + 1;
  const parts = Object.entries(tierCounts).map(([k, n]) => ({ label: TIERS[k].label, value: n, color: QUAD_COLOR[TIERS[k].tone] }));
  const memo = () => {
    const ok = downloadText("board-memo-" + AS_OF + ".md", buildMemo({ week: fmtDayY(weekDate(LAST)), rows, capacity }));
    app.say(ok ? "Board memo downloaded." : "Download is blocked in this environment.");
  };
  const onPick = (id) => { setPick(id); const el = typeof document !== "undefined" && document.getElementById("rec-" + id); if (el && el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" }); };
  return (
    <div>
      <div className="page-h">
        <div>
          <h1 className="disp">Recommendations</h1>
          <p>Whom to pick, and why. Momentum alone never earns a recommendation. The music has to clear the bar, the evidence has to be real, and a person makes the call.</p>
        </div>
        <div className="row" style={{ marginLeft: "auto" }}>
          <div className="field"><label htmlFor="cap">Signing slots this quarter</label>
            <select id="cap" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}</option>))}</select></div>
          <div className="field"><label htmlFor="act">Deciding as</label>
            <select id="act" value={app.actor} onChange={(e) => app.setActor(e.target.value)}>{REVIEWERS.map((r) => (<option key={r.id} value={r.id}>{r.name} ({r.role})</option>))}</select></div>
          <button className="btn" onClick={memo}><Icon n="dl" s={16} />Board memo</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14, background: picks.length ? "var(--okBg)" : "var(--warnBg)", borderColor: "transparent" }}>
        {picks.length === 0 ? <b>No artist clears the bar this week. The slots stay empty on purpose.</b> : (
          <div><b>{picks.length} of {capacity} slot{capacity > 1 ? "s" : ""} filled: </b>{picks.map((r) => r.a.name).join(", ")}.
            {picks.length < capacity && <span> Not filling the rest. Only artists with strong momentum, strong artistry and enough evidence qualify.</span>}</div>)}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ch"><IBadge n="layers" tone="l" /><div><h2 className="disp" style={{ fontSize: 16 }}>Pipeline this week</h2><div className="sub">How many artists have reached each stage. Counted from your shortlist, reviews and logged decisions.</div></div></div>
        <div className="funnel" role="list">
          {funnel.map((s, i) => (<div key={s.k} role="listitem" className={"st" + (i === funnel.length - 1 && s.n > 0 ? " hot" : "")}><div className="ring num">{s.n}</div><div style={{ fontSize: 13 }}>{s.label}</div></div>))}
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card"><div className="ch"><IBadge n="target" tone="g" /><h2 className="disp" style={{ fontSize: 16 }}>Momentum against artistry</h2></div>
          {rows.some((r) => r.rec.pick != null) ? <Matrix rows={rows} selectedId={pick} onPick={onPick} /> : <p>Score at least one shortlisted artist in Analyse to place them here.</p>}
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Bubble size is evidence coverage. Dashed lines are the bars: momentum {MOMENTUM_BAR}, artistry {ARTISTRY_BAR}.</p></div>
        <div className="stack">
          <div className="card"><div className="ch"><IBadge n="pick" tone="v" /><h2 className="disp" style={{ fontSize: 16 }}>Verdict mix</h2></div>
            {parts.length ? (
              <div className="row" style={{ gap: 16, flexWrap: "nowrap" }}>
                <Donut size={132} thick={18} label="Verdicts across the shortlist" center={rows.length} sub="artists" parts={parts} />
                <div className="legend" style={{ flex: 1 }}>{parts.map((p) => (<div key={p.label} className="it"><i style={{ background: p.color }} /><span>{p.label}</span><b className="num">{p.value}</b></div>))}</div>
              </div>) : <p className="muted" style={{ margin: 0 }}>No verdicts yet.</p>}
          </div>
          <div className="card"><h2 className="disp" style={{ fontSize: 16 }}>How a verdict is reached</h2>
            <ol className="dlist" style={{ lineHeight: 1.6 }}>
              <li>Integrity flags hold an artist until a person resolves them.</li>
              <li>No artistic review means no recommendation, only "needs review".</li>
              <li>Evidence below {fmtPct(EVIDENCE_BAR)} makes any verdict provisional.</li>
              <li>Momentum is discounted when a paid push explains part of it.</li>
              <li>Pick score is half momentum, half artistic value. Signing needs two reviewers.</li>
            </ol>
            {unreviewed > 0 && <div className="sig info">{unreviewed} measured prospect{unreviewed > 1 ? "s are" : " is"} not on the shortlist, so not assessed here. <button className="linkbtn" onClick={() => app.setSection("discovery")}>Open Discovery</button></div>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}><Copilot rows={rows} app={app} /></div>

      <div className="stack" style={{ marginTop: 14 }}>
        {rows.length === 0 && <div className="card">Nobody is on the shortlist. Add prospects in Discovery, then review them in Analyse.</div>}
        {rows.map((r) => (<RecCard key={r.a.id + decisions.length} row={r} app={app} selected={pick === r.a.id} />))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="disp" style={{ fontSize: 16 }}>Decision log</h2>
        {decisions.length === 0 ? <p className="muted" style={{ margin: 0 }}>Accepted and overridden recommendations are recorded here with who, when and why.</p> : (
          <div className="scroll-x"><table className="tbl"><thead><tr><th>When</th><th>Artist</th><th>Decision</th><th>By</th><th>Reason</th></tr></thead>
            <tbody>{[...decisions].reverse().map((d) => (<tr key={d.id}><td className="num">{new Date(d.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td>{d.name}</td>
              <td>{d.kind === "accepted" ? `Accepted: ${TIERS[d.toTier].label}` : `Overrode ${TIERS[d.fromTier].label} to ${TIERS[d.toTier].label}`}</td><td>{d.by}</td><td className="muted">{d.reason}</td></tr>))}</tbody></table></div>)}
      </div>
    </div>
  );
}
