import React, { useMemo, useState } from "react";
import { REVIEWERS } from "../data/universe";
import { AS_OF, LAST, PLATFORMS } from "../engine/constants";
import { EVIDENCE_BAR, RUBRIC, artisticValue, peerMedianSeries, rubricValue, scoreUniverse } from "../engine/engine";
import { scoreChips } from "../engine/insights";
import { median, sum } from "../engine/math";
import { Donut, HeatGrid, LineChart, RadarChart, PlatformDistributionBar, AudioSpectrumVisualizer } from "../ui/charts";
import { Avatar, Chip, IBadge, Icon, Spark, intTone } from "../ui/primitives";
import { fmtDay, fmtDayY, fmtN, fmtPct, fmtSigned, weekDate, weekLabels } from "../ui/util";

/* ───────────────────────── 8. Analyse ───────────────────────── */

export const MIN_T = LAST - 8;
export const VERDICT = { advance: { label: "Advance to recommendations", tone: "go" }, watch: { label: "Keep watching", tone: "info" }, drop: { label: "Dropped", tone: "mute" } };

export function Analyse({ app }) {
  const { visible, watch, weekly, reviews } = app;
  const live = useMemo(() => visible.filter((a) => a.series), [visible]);
  const watched = live.filter((a) => watch.includes(a.id));
  const [tab, setTab] = useState("week");
  const [T, setT] = useState(LAST);
  const scoresT = useMemo(() => scoreUniverse(live, T, 0), [live, T]);
  const scoresP = useMemo(() => scoreUniverse(live, T - 1, 0), [live, T]);
  const sel = watched.find((a) => a.id === app.analyseId) || watched[0];
  const due = (a) => !(weekly[a.id] && weekly[a.id].week === AS_OF);

  if (!watched.length) {
    return (
      <div>
        <div className="page-h"><div><h1 className="disp">Analyse</h1><p>The weekly review of your shortlist. Nobody is on it yet.</p></div></div>
        <div className="card"><p style={{ marginTop: 0 }}>Shortlist prospects in Discovery and they will appear here for their Monday review.</p><button className="btn primary" onClick={() => app.setSection("discovery")}>Go to Discovery</button></div>
      </div>
    );
  }
  const sc = scoresT.byId.get(sel.id), sp = scoresP.byId.get(sel.id);
  const dueCount = watched.filter(due).length;
  return (
    <div>
      <div className="page-h">
        <div>
          <h1 className="disp">Analyse</h1>
          <p>Each Monday, review the shortlist. The numbers show what happened this week. The music decides whether it matters.</p>
        </div>
        <div className="row" style={{ marginLeft: "auto" }}>
          <Chip tone={dueCount ? "warn" : "go"}>{dueCount ? `${dueCount} review${dueCount > 1 ? "s" : ""} due` : "All reviewed this week"}</Chip>
        </div>
      </div>

      <div className="layout-a">
        <div className="card" style={{ padding: 8 }}>
          <div className="muted" style={{ fontSize: 12.5, padding: "6px 10px" }}>Shortlist ({watched.length})</div>
          {watched.map((a) => {
            const s = scoresT.byId.get(a.id), w = weekly[a.id] && weekly[a.id].week === AS_OF ? weekly[a.id] : null;
            return (
              <button key={a.id} className="listbtn" aria-current={a.id === sel.id} onClick={() => app.setAnalyseId(a.id)}>
                <div style={{ flex: 1, minWidth: 0 }}><b>{a.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{a.city} · idx {s && s.idx != null ? s.idx.toFixed(0) : "–"}</div></div>
                {w ? <Chip tone={VERDICT[w.verdict].tone}>{w.verdict === "advance" ? "Advanced" : w.verdict === "watch" ? "Watching" : "Dropped"}</Chip> : <Chip tone="warn">Due</Chip>}
              </button>
            );
          })}
        </div>

        <div key={sel.id} className="stack">
          <div className="card">
            <div className="row">
              <div className="row" style={{ flexWrap: "nowrap", gap: 12 }}><Avatar name={sel.name} id={sel.id} size={54} picture={sel.picture} /><div><div className="row"><h2 className="disp" style={{ fontSize: 20, margin: 0 }}>{sel.name}</h2>{sel.liveData ? <Chip tone="go">Live data</Chip> : <Chip tone="sim">Simulated</Chip>}</div>
                <div className="muted" style={{ fontSize: 13.5 }}>{sel.city}, {sel.country} · {sel.genre} · {sel.language}</div>
                {(sel.previewUrl || (sel.tracks && sel.tracks[0] && sel.tracks[0].preview)) && (
                  <button className="btn sm primary" style={{ marginTop: 6 }} onClick={() => app.playTrack(sel.tracks?.[0] || { title: sel.name + " Top Track", preview: sel.previewUrl }, sel.name, sel.picture)}>
                    <Icon n="play" s={13} /> Listen ({sel.tracks?.[0]?.title || "Preview"})
                  </button>
                )}
              </div></div>
              <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
                <button className="btn sm" aria-label="Previous week" onClick={() => setT((t) => Math.max(MIN_T, t - 1))} disabled={T <= MIN_T}><Icon n="left" s={15} /></button>
                <b>Week of {fmtDayY(weekDate(T))}</b>
                <button className="btn sm" aria-label="Next week" onClick={() => setT((t) => Math.min(LAST, t + 1))} disabled={T >= LAST}><Icon n="right" s={15} /></button>
              </div>
            </div>
            <div className="scorechips" style={{ marginTop: 12 }}>
              {scoreChips(sc, artisticValue(reviews[sel.id])).map((c) => (
                <div key={c.k} className="scorechip" style={{ borderColor: c.v == null ? "var(--line)" : c.color }}>
                  <div className="v num" style={{ color: c.v == null ? "var(--muted)" : c.color }}>{c.v == null ? "–" : c.v.toFixed(0)}</div>
                  <div className="l">{c.k}{c.v == null ? " (not scored)" : ""}</div>
                </div>))}
            </div>
            {T < LAST && <div className="sig info" style={{ marginTop: 10 }}>Viewing a past week. Only data up to that Monday is used, exactly as it would have looked then.</div>}
          </div>

          <div className="tabs" role="tablist" aria-label="Analysis views">
            {[["week", "This week"], ["art", "Artistic quality"], ["trail", "Trail"]].map(([k, l]) => (
              <button key={k} role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>))}
          </div>

          {tab === "week" && <WeekTab a={sel} sc={sc} sp={sp} T={T} live={live} />}
          {tab === "art" && <ArtisticTab a={sel} app={app} />}
          {tab === "trail" && <TrailTab a={sel} live={live} />}

          <VerdictBar key={sel.id + "v"} a={sel} app={app} />
        </div>
      </div>
    </div>
  );
}

export function Kpi({ l, v, sub }) { return (<div className="kpi"><div className="v num">{v}</div><div className="l">{l}</div>{sub && <div className="muted" style={{ fontSize: 12.5 }}>{sub}</div>}</div>); }

export function WeekTab({ a, sc, sp, T, live }) {
  const peer = useMemo(() => peerMedianSeries(live, T), [live, T]);
  const ps = Object.keys(a.series);
  const wk = (arr, k) => arr[T] / arr[T - k] - 1;
  const tot = Array.from({ length: T + 1 }, (_, t) => sum(ps.map((p) => a.series[p].aud[t])));
  const net = tot.map((v, t) => (t ? v - tot[t - 1] : null));
  const hcols = Array.from({ length: 16 }, (_, k) => T - 15 + k);
  const heat = ps.map((p) => ({ label: PLATFORMS[p].label, values: hcols.map((t) => Math.log(a.series[p].aud[t] / a.series[p].aud[t - 1])) }));
  const DON = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--ok)", "var(--muted)"];
  const idxD = sc.idx - sp.idx;
  const rankD = sp.rank != null && sc.rank != null ? sp.rank - sc.rank : null;
  const movers = ps.map((p) => ({ p, v: wk(a.series[p].aud, 1) })).sort((x, y) => y.v - x.v);
  const engNow = median(a.engagement.slice(T - 3, T + 1)), engPrev = median(a.engagement.slice(T - 7, T - 3));
  const changes = [];
  changes.push(`Breakout index ${sc.idx.toFixed(0)}, ${idxD >= 0 ? "up" : "down"} ${Math.abs(idxD).toFixed(1)} on last week${rankD ? `; rank ${rankD > 0 ? "up" : "down"} ${Math.abs(rankD)}` : ""}.`);
  changes.push(`Fastest platform this week: ${PLATFORMS[movers[0].p].label} (${fmtSigned(movers[0].v * 100)}%). Slowest: ${PLATFORMS[movers[movers.length - 1].p].label} (${fmtSigned(movers[movers.length - 1].v * 100)}%).`);
  if (sp.integrity.status !== sc.integrity.status) changes.push(`Integrity status moved from "${sp.integrity.label}" to "${sc.integrity.label}".`);
  changes.push(`Engagement per 1,000 views is ${engNow.toFixed(0)}, ${engNow >= engPrev ? "up" : "down"} ${Math.abs((engNow / engPrev - 1) * 100).toFixed(0)}% on the previous four weeks.`);
  if (a.ugcSeries) changes.push(`${a.ugcSeries[T]} creators made content with the music this week, ${fmtSigned((a.ugcSeries[T] / a.ugcSeries[T - 4] - 1) * 100, 0)}% on four weeks ago.`);
  if (T === LAST) {
    const shifts = a.geo.map(([k, v], i) => ({ k, d: v - a.geoPrev[i][1] })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
    changes.push(`Largest audience-mix shift over four weeks: ${shifts.k} ${fmtSigned(shifts.d * 100, 0)} points.`);
  }
  const promo = sc.integrity.status === "paid" ? ["info", "Probable paid promotion", "Growth on a few channels ran above normal for a fixed window, then reverted, with steady engagement."]
    : sc.integrity.status === "review" ? ["risk", "Possible inorganic activity", "See the integrity signals in the list below."]
    : sc.integrity.status === "synthetic" ? ["risk", "Synthetic-catalogue risk", "See the integrity signals in the list below."]
    : ["go", "No campaign signature found", "Growth shape and engagement look organic this week."];
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi l="Breakout index" v={sc.idx.toFixed(0)} sub={`${fmtSigned(idxD)} vs last week`} />
        <Kpi l="Rank among eligible" v={sc.rank != null ? "#" + sc.rank : "Held"} sub={rankD ? `${rankD > 0 ? "Up" : "Down"} ${Math.abs(rankD)}` : "No change"} />
        <Kpi l="Four-week growth" v={fmtSigned((Math.exp(sc.growth4) - 1) * 100) + "%"} sub={`${fmtSigned(sc.growthVsPeers * 100)} pts vs peers`} />
        <Kpi l="Evidence coverage" v={fmtPct(sc.evidence)} sub={sc.evidence < EVIDENCE_BAR ? "Below the bar" : "Enough to act on"} />
        <div className="kpi"><div className="row" style={{ minHeight: 34 }}><Chip tone={intTone(sc.integrity.status)}>{sc.integrity.label}</Chip></div><div className="l">Integrity screen</div></div>
      </div>

      <div className="card"><h3 className="disp" style={{ fontSize: 15 }}>What changed this week</h3>
        <ul className="dlist">{changes.map((c, i) => (<li key={i}>{c}</li>))}</ul></div>

      <div className="card">
        <div className="ch"><IBadge n="users" tone="v" /><div><h3 className="disp" style={{ fontSize: 15 }}>Audience intelligence</h3><div className="sub">How the audience is growing against peers. Totals add the tracked platforms, so a fan on two platforms counts twice.</div></div></div>
        <LineChart label={`${a.name} audience index against peer median`} labels={weekLabels(T)} series={[{ label: a.name, color: "var(--s1)", values: sc.B, area: true }, { label: "Peer median", color: "var(--s3)", dash: "5 4", thin: true, values: peer }]} markers={sc.integrity.markers} />
        <div className="grid g2e" style={{ marginTop: 14 }}>
          <div><h4 className="disp" style={{ fontSize: 13, margin: "0 0 4px" }}>Total audience</h4>
            <LineChart label="Total audience across platforms" height={190} zeroBase labels={weekLabels(T)} yFmt={fmtN} series={[{ label: "Total", color: "var(--s2)", area: true, values: tot }]} /></div>
          <div><h4 className="disp" style={{ fontSize: 13, margin: "0 0 4px" }}>New audience per week</h4>
            <LineChart label="Net new audience per week" height={190} zeroBase labels={weekLabels(T)} yFmt={fmtN} series={[{ label: "Net new", color: "var(--s3)", area: true, values: net }]} /></div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><IBadge n="layers" tone="c" /><div><h3 className="disp" style={{ fontSize: 15 }}>Audience composition</h3><div className="sub">Share of listeners by country, latest against four weeks earlier. Group totals only; they cannot show which people moved.</div></div></div>
        {T < LAST ? <p className="muted" style={{ margin: 0 }}>Country mix is a latest-week snapshot in this demo, so it is hidden for past weeks.</p> : (
          <div className="grid g2e" style={{ alignItems: "center" }}>
            {[["Latest", a.geo], ["Four weeks earlier", a.geoPrev]].map(([t, g]) => (
              <div key={t} className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
                <Donut size={132} thick={18} label={`Audience by country, ${t}`} center={fmtPct(g[0][1])} sub={g[0][0]} parts={g.map(([k, v], i) => ({ label: k, value: v, color: DON[i % DON.length] }))} />
                <div className="legend" style={{ flex: 1 }}><b>{t}</b>{g.map(([k, v], i) => (<div key={k} className="it"><i style={{ background: DON[i % DON.length] }} /><span>{k}</span><span className="num">{fmtPct(v)}</span></div>))}</div>
              </div>))}
          </div>)}
      </div>

      <div className="card">
        <div className="ch"><IBadge n="trend" tone="l" /><div><h3 className="disp" style={{ fontSize: 15 }}>Weekly growth heatmap</h3><div className="sub">Week-over-week change by platform, last 16 weeks. Lime is growth, red is decline.</div></div></div>
        <HeatGrid label={`${a.name} weekly growth by platform`} rows={heat} cols={hcols.map((t) => fmtDay(weekDate(t)))} />
      </div>

      <div className="card"><h3 className="disp" style={{ fontSize: 15 }}>By platform</h3>
        <div style={{ marginBottom: 14 }}>
          <PlatformDistributionBar platforms={Object.fromEntries(ps.map(p => [p, a.series[p].aud[T]]))} total={tot[T]} />
        </div>
        <div className="scroll-x"><table className="tbl"><caption className="sr">Platform audiences and weekly activity</caption>
          <thead><tr><th>Platform</th><th>Audience</th><th>Week</th><th>4 weeks</th><th>Weekly activity</th><th>12 weeks</th></tr></thead>
          <tbody>{ps.map((p) => {
            const s = a.series[p];
            return (<tr key={p}><td>{PLATFORMS[p].label}<div className="muted" style={{ fontSize: 12 }}>{PLATFORMS[p].audLabel}</div></td>
              <td className="num">{fmtN(s.aud[T])}</td><td className="num">{fmtSigned(wk(s.aud, 1) * 100)}%</td><td className="num">{fmtSigned(wk(s.aud, 4) * 100)}%</td>
              <td className="num">{s.act ? `${fmtN(s.act[T])} (${fmtSigned(wk(s.act, 1) * 100, 0)}%)` : <span className="muted">Not provided</span>}</td>
              <td><Spark values={s.aud.slice(Math.max(0, T - 11), T + 1)} /></td></tr>);
          })}</tbody></table></div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Platforms the artist is not tracked on are left out, not shown as zero.</p>
      </div>

      <div className="grid g2">
        <div className="card"><h3 className="disp" style={{ fontSize: 15 }}>Engagement and promotion</h3>
          <div className="row"><b className="num" style={{ fontSize: 22 }}>{engNow.toFixed(0)}</b><span className="muted">likes and comments per 1,000 views (peer median {sc.peerEng ? "" : ""}{fmtN(median(live.map((x) => median(x.engagement.slice(T - 3, T + 1)))))})</span></div>
          <div className="row" style={{ margin: "10px 0" }}><Chip tone={promo[0]}>{promo[1]}</Chip></div>
          <p style={{ margin: 0 }}>{promo[2]}</p>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Ad accounts are not connected. Campaign calls are inferred from growth shape. Ask the artist's team for campaign dates and spend to confirm.</p>
        </div>
        <div className="card"><div className="ch"><IBadge n="users" tone="a" /><h3 className="disp" style={{ fontSize: 15 }}>Fan-content pulse</h3></div>
          {a.ugcSeries ? (<>
            <div className="row"><b className="num" style={{ fontSize: 22 }}>{a.ugcSeries[T]}</b><span className="muted">creators this week</span></div>
            <LineChart label="Creators making content with the music" height={150} zeroBase labels={weekLabels(T)} series={[{ label: "Creators", color: "var(--s2)", area: true, values: a.ugcSeries.slice(0, T + 1) }]} />
            <p style={{ marginBottom: 0 }}>{fmtPct(a.ugc.top)} of the content comes from the single biggest creator. {a.ugc.top > 0.4 ? "That is concentrated. One creator can fake a trend." : "The spread across creators looks healthy."}</p>
          </>) : (<p style={{ marginTop: 0 }}>No authorised fan-content feed for this artist yet. This is unknown, not zero. TikTok offers no commercial API, so use creator-authorised exports or a licensed vendor.</p>)}
        </div>
      </div>

      <div className="card"><h3 className="disp" style={{ fontSize: 15 }}>Where the audience is</h3>
        {T < LAST ? <p className="muted" style={{ margin: 0 }}>Country mix is a latest-week snapshot in this demo, so it is hidden for past weeks.</p> : (
          <div className="stack" style={{ gap: 6 }}>
            {a.geo.map(([k, v], i) => { const d = v - a.geoPrev[i][1]; return (
              <div key={k} className="bar2" style={{ gridTemplateColumns: "60px 1fr 120px" }}><span>{k}</span>
                <div className="track"><div className="fill" style={{ left: 0, width: v * 100 + "%", background: "var(--s2)" }} /></div>
                <span className="num">{fmtPct(v)} <span className="muted">({fmtSigned(d * 100, 0)} pts)</span></span></div>); })}
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Share of listeners by country compared with four weeks ago. These are group totals. They cannot show which people moved.</p>
          </div>)}
      </div>

      {sc.integrity.signals.length > 0 && (
        <div className="card"><h3 className="disp" style={{ fontSize: 15 }}>Integrity signals</h3>
          <div className="stack" style={{ gap: 6 }}>{sc.integrity.signals.map((s, i) => (<div key={i} className={"sig " + s.sev}>{s.text}</div>))}</div></div>)}
    </div>
  );
}

export const DESC = (a) => {
  const x = a.audio, none = "n/a (instrumental)";
  return [
    ["Key", `${x.key} ${x.mode}`, `confidence ${x.keyStrength}`],
    ["Tempo", `${x.bpm} BPM`, "median across top tracks"],
    ["Loudness", `${x.lufs} LUFS`, "integrated, EBU R128 style"],
    ["Pitch deviation", x.pitchDev == null ? none : `${x.pitchDev} cents`, "median; lower means steadier intonation"],
    ["Vocal range", x.vocalRange == null ? none : `${x.vocalRange} semitones`, "across top tracks"],
    ["Hook repetition", String(x.hook), "0 to 1; how much the melody repeats"],
    ["Lyric diversity", x.lyricDiv == null ? none : String(x.lyricDiv), "unique words over total words"],
  ];
};

export function ArtisticTab({ a, app }) {
  const revs = app.reviews[a.id] || {};
  const art = artisticValue(revs);
  const [rid, setRid] = useState(app.actor);
  const [draft, setDraft] = useState(() => ({ scores: { ...((revs[rid] && revs[rid].scores) || {}) }, notes: (revs[rid] && revs[rid].notes) || "" }));
  const load = (id) => { const e = (app.reviews[a.id] || {})[id]; setDraft({ scores: { ...((e && e.scores) || {}) }, notes: (e && e.notes) || "" }); };
  const scored = RUBRIC.filter((d) => typeof draft.scores[d.key] === "number").length;
  const full = scored === RUBRIC.length;
  const reviewer = REVIEWERS.find((r) => r.id === rid);
  return (
    <div className="stack">
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="row" style={{ marginBottom: 6 }}>
            <h3 className="disp" style={{ fontSize: 15, margin: 0 }}>Panel score</h3>
            {art.reviewers > 0 && art.agreement && <Chip tone={art.agreement.label === "Low" ? "risk" : art.agreement.label === "Moderate" ? "warn" : "go"}>{art.agreement.label} agreement</Chip>}
          </div>
          {art.reviewers === 0 ? <p style={{ margin: 0 }}>Not scored yet. Listen first, then score all eight areas on the right.</p> : (
            <div className="row" style={{ alignItems: "center", gap: 18 }}>
              <div><div className="disp num" style={{ fontSize: 44, lineHeight: 1 }}>{art.value.toFixed(0)}</div><div className="muted" style={{ fontSize: 12.5 }}>of 100, {art.reviewers} reviewer{art.reviewers > 1 ? "s" : ""}</div></div>
              <RadarChart size={250} labels={RUBRIC.map((d) => d.label.split(" ")[0])} values={RUBRIC.map((d) => (art.perDim[d.key] - 1) / 4)} />
            </div>)}
          {art.each.map((e) => { const r = REVIEWERS.find((x) => x.id === e.id); return (
            <div key={e.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <div className="row"><b>{r ? r.name : e.id}</b><span className="muted">{r && r.role}</span><b className="num" style={{ marginLeft: "auto" }}>{e.value.toFixed(0)}</b>{e.seeded && <Chip tone="sim">Demo review</Chip>}</div>
              {e.notes && <div className="muted" style={{ fontSize: 13.5 }}>{e.notes}</div>}
            </div>); })}
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Signing needs two independent reviewers. Disagreement is shown, never averaged away.</p>
        </div>

        <div className="card">
          {a.audio && (
            <div style={{ marginBottom: 12 }}>
              <AudioSpectrumVisualizer audio={a.audio} isPlaying={app.playingTrack && app.playingTrack.artistName === a.name} />
            </div>
          )}
          {a.tracks && a.tracks.length > 0 && (
            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              <div className="row" style={{ marginBottom: 8, justifyContent: "space-between" }}>
                <h3 className="disp" style={{ fontSize: 15, margin: 0 }}>Master audio tracks</h3>
                <Chip tone="lime">30s Previews</Chip>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                {a.tracks.map((t, idx) => (
                  <div key={idx} className="row" style={{ justifyContent: "space-between", padding: "6px 8px", background: "var(--panel2)", borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <b style={{ fontSize: 13 }}>{t.title}</b>
                      <div className="muted" style={{ fontSize: 11.5 }}>{t.album || a.genre}</div>
                    </div>
                    {t.preview ? (
                      <button className="btn sm primary" onClick={() => app.playTrack(t, a.name, a.picture)}>
                        <Icon n="play" s={13} /> Listen
                      </button>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>Metadata</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <h3 className="disp" style={{ fontSize: 15 }}>Machine pre-screen</h3>
          <div className="stack" style={{ gap: 0 }}>
            {DESC(a).map(([k, v, n]) => (<div key={k} className="row" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}><span style={{ width: 120 }}>{k}</span><b className="num">{v}</b><span className="muted" style={{ fontSize: 12.5 }}>{n}</span></div>))}
            <div className="row" style={{ padding: "6px 0" }}><span style={{ width: 120 }}>Synthetic audio</span><b className="num">{fmtPct(a.synth)}</b><span className="muted" style={{ fontSize: 12.5 }}>likelihood (simulated detector)</span></div>
          </div>
          <div className="sig info" style={{ marginTop: 10 }}>These describe the signal. They do not measure quality, and they never feed the artistic score. Key tools are tuned on mostly Western music, so treat them as a cross-check on non-Western tonal systems.</div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 6 }}>
          <h3 className="disp" style={{ fontSize: 15, margin: 0 }}>Score the music</h3>
          <div className="field" style={{ marginLeft: "auto" }}><label htmlFor="rev">Reviewing as</label>
            <select id="rev" value={rid} onChange={(e) => { setRid(e.target.value); load(e.target.value); }}>{REVIEWERS.map((r) => (<option key={r.id} value={r.id}>{r.name} ({r.role})</option>))}</select></div>
        </div>
        {RUBRIC.map((d) => (
          <fieldset key={d.key} className="rub" style={{ border: 0, borderBottom: "1px solid var(--line)", margin: 0 }}>
            <legend className="sr">{d.label}</legend>
            <div><b>{d.label}</b> <span className="muted" style={{ fontSize: 12.5 }}>weight {fmtPct(d.w)}</span></div>
            <div className="seg" role="radiogroup" aria-label={d.label}>
              {[1, 2, 3, 4, 5].map((n) => { const id = `${a.id}-${rid}-${d.key}-${n}`; return (<React.Fragment key={n}>
                <input type="radio" id={id} name={`${a.id}-${rid}-${d.key}`} checked={draft.scores[d.key] === n} onChange={() => setDraft((s) => ({ ...s, scores: { ...s.scores, [d.key]: n } }))} />
                <label htmlFor={id}>{n}</label></React.Fragment>); })}
            </div>
            <div className="hint">{d.hint}. 1 is {d.lo.toLowerCase()}; 5 is {d.hi.toLowerCase()}.</div>
          </fieldset>))}
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="notes">What stood out? Cite the track and moment.</label>
          <textarea id="notes" rows={3} value={draft.notes} onChange={(e) => setDraft((s) => ({ ...s, notes: e.target.value }))} /></div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" disabled={!full} onClick={() => app.saveReview(a.id, rid, draft)}><Icon n="check" s={16} />Save {reviewer.name}'s review</button>
          <span className="muted">{full ? `Would score ${rubricValue(draft.scores).toFixed(0)} of 100` : `${scored} of ${RUBRIC.length} areas scored`}</span>
        </div>
      </div>
    </div>
  );
}

export function TrailTab({ a, live }) {
  const hist = useMemo(() => Array.from({ length: 9 }, (_, k) => scoreUniverse(live, MIN_T + k, 0).byId.get(a.id)), [a.id, live]);
  const labels = hist.map((h) => fmtDay(weekDate(h.T)));
  return (
    <div className="stack">
      <div className="card"><h3 className="disp" style={{ fontSize: 15 }}>Breakout index, last nine Mondays</h3>
        <LineChart label={`${a.name} breakout index by week`} labels={labels} height={200} series={[{ label: "Index", color: "var(--s1)", values: hist.map((h) => h.idx) }]} />
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Each point is rescored with only the data available that Monday. Catalogue depth, country mix and repeat listening are latest-week snapshots in this demo, so earlier points are slightly flattered.</p></div>
      <div className="card scroll-x"><table className="tbl"><caption className="sr">Weekly trail</caption>
        <thead><tr><th>Week of</th><th>Index</th><th>Rank</th><th>Evidence</th><th>Integrity</th></tr></thead>
        <tbody>{[...hist].reverse().map((h) => (<tr key={h.T}><td>{fmtDayY(weekDate(h.T))}</td><td className="num">{h.idx.toFixed(0)}</td><td className="num">{h.rank != null ? "#" + h.rank : "Held"}</td><td className="num">{fmtPct(h.evidence)}</td><td><Chip tone={intTone(h.integrity.status)}>{h.integrity.label}</Chip></td></tr>))}</tbody></table></div>
    </div>
  );
}

export function VerdictBar({ a, app }) {
  const w = app.weekly[a.id] && app.weekly[a.id].week === AS_OF ? app.weekly[a.id] : null;
  const art = artisticValue(app.reviews[a.id]);
  const [note, setNote] = useState((w && w.note) || "");
  const canAdvance = art.reviewers > 0;
  return (
    <div className="card" style={{ borderColor: "var(--s2)" }}>
      <div className="row">
        <h3 className="disp" style={{ fontSize: 15, margin: 0 }}>This week's call</h3>
        {w ? <Chip tone={VERDICT[w.verdict].tone}>{VERDICT[w.verdict].label}</Chip> : <Chip tone="warn">Not yet decided</Chip>}
      </div>
      <div className="field" style={{ margin: "10px 0" }}><label htmlFor="vn">Note for the board (optional)</label><input id="vn" type="text" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="row">
        <button className="btn primary" disabled={!canAdvance} onClick={() => app.setVerdict(a.id, "advance", note)}>Advance to recommendations</button>
        <button className="btn" onClick={() => app.setVerdict(a.id, "watch", note)}>Keep watching</button>
        <button className="btn" onClick={() => app.setVerdict(a.id, "drop", note)}>Drop</button>
      </div>
      {!canAdvance && <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Advancing needs at least one complete artistic review. Score the music in the Artistic quality tab.</p>}
    </div>
  );
}
