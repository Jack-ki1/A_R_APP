import { useEffect, useMemo, useState } from "react";
import { EXPANDED_REAL_ARTISTS, MUSIC_HUBS, hydrateArtistFromRealData, searchMultiSource } from "../data/liveSources";
import { PROVIDERS } from "../data/providers";
import { LAST, PLATFORMS } from "../engine/constants";
import { EVIDENCE_BAR, FEATURES, peerMedianSeries, whySurfaced } from "../engine/engine";
import { integritySplit, marketMovers, signalsFeed, underpriced } from "../engine/insights";
import { hashStr, median, sum } from "../engine/math";
import {
  AfricaMap, AudienceVsEngagementBubble, AudioSpectrumVisualizer,
  AutonomousRadarScanner, CITIES, COUNTRY_XY, Donut, HeroArt, LineChart,
  PlatformDistributionBar, VelocityMomentumChart
} from "../ui/charts";
import { Avatar, Chip, IBadge, Icon, Logo, Meter, RangeBar, Spark, TONE, intTone } from "../ui/primitives";
import { fmtDay, fmtDayY, fmtN, fmtPct, fmtSigned, weekDate, weekLabels } from "../ui/util";

/* ───────────────────────── 7. Discovery ───────────────────────── */

export const STAGES = [
  { k: "plan", name: "Plan scope", line: (c) => `Scope: ${c.scopeText}. Quota plan ${fmtN(c.units)} of 10,000 YouTube units.` },
  { k: "sweep", name: "Sweep sources", line: (c) => `Pulled from ${c.sources} sources and saw ${c.handles} public handles (simulated counts).` },
  { k: "resolve", name: "Resolve identities", line: (c) => `Merged handles into ${c.identities} canonical artists. ${c.ambiguous} ambiguous matches queued for a human.` },
  { k: "screen", name: "Screen integrity", line: (c) => `Checked surge patterns and audio. ${c.held} held for review, ${c.paid} probable campaign, ${c.synth} synthetic-risk.` },
  { k: "score", name: "Score and rank", line: (c) => `Scored ${c.scored} artists on ${FEATURES.length} features, with 300 re-weighted simulations for rank stability.` },
  { k: "evaluate", name: "Evaluate audio", line: (c) => `Extracted key, tempo, loudness and pitch descriptors for ${c.scored} catalogues (simulated).` },
  { k: "publish", name: "Publish", line: (c) => (c.newCount ? `${c.newCount} new prospect${c.newCount > 1 ? "s" : ""} added to the ranked list. Shortlist them to start weekly review.` : "No new prospects since the last sweep. The ranked list is unchanged.") },
];

export const CEILINGS = [["Any size", 1e12], ["Under 250k", 250000], ["Under 100k", 100000], ["Under 50k", 50000]];
export const totalAud = (a) => (a.series ? sum(Object.values(a.series).map((s) => s.aud[LAST])) : 0);
export const quotaUnits = (searches, channels) => searches * 100 + Math.ceil(channels / 50) + channels + Math.ceil((channels * 8) / 50);

export function UnderpricedPlot({ rows, selectedId, onPick }) {
  const W = 520, H = 300, m = { l: 46, r: 14, t: 14, b: 40 };
  if (rows.length < 2) return <p className="muted">Needs at least two ranked prospects.</p>;
  const xs = rows.map((r) => Math.log10(r.aud)), ys = rows.map((r) => r.s.idx);
  const x0 = Math.min(...xs) - 0.1, x1 = Math.max(...xs) + 0.1, y0 = Math.min(...ys) - 5, y1 = Math.max(...ys) + 5;
  const X = (v) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
  const Y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const mx = median(xs), my = median(ys);
  const xt = [1e4, 3e4, 1e5, 3e5, 1e6].filter((v) => Math.log10(v) > x0 && Math.log10(v) < x1);
  const yt = [0, 1, 2, 3].map((k) => y0 + ((y1 - y0) * k) / 3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label="Breakout index against audience size">
      <rect x={m.l} y={m.t} width={X(mx) - m.l} height={Y(my) - m.t} fill="var(--okBg)" opacity=".8" rx="6" />
      <text x={m.l + 8} y={m.t + 16} fontSize="12" fontWeight="600" fill="var(--ok)">Underpriced: strong evidence, small audience</text>
      {yt.map((t, i) => (<g key={i}><line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} stroke="var(--line)" /><text x={m.l - 6} y={Y(t) + 4} fontSize="11" textAnchor="end" fill="var(--muted)">{t.toFixed(0)}</text></g>))}
      {xt.map((t) => (<text key={t} x={X(Math.log10(t))} y={H - m.b + 16} fontSize="11" textAnchor="middle" fill="var(--muted)">{fmtN(t)}</text>))}
      <text x={(m.l + W - m.r) / 2} y={H - 6} fontSize="12" textAnchor="middle" fill="var(--muted)">Total audience across platforms (log scale)</text>
      <text transform={`translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)`} fontSize="12" textAnchor="middle" fill="var(--muted)">Breakout index</text>
      {rows.map((r) => {
        const sel = r.a.id === selectedId;
        return (
          <g key={r.a.id} role="button" tabIndex={0} aria-label={`${r.a.name}: index ${r.s.idx.toFixed(0)}, audience ${fmtN(r.aud)}`} style={{ cursor: "pointer" }}
            onClick={() => onPick(r.a.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(r.a.id); } }}>
            <circle cx={X(Math.log10(r.aud))} cy={Y(r.s.idx)} r={sel ? 9 : 7} fill={r.gap > 0 ? "var(--s1)" : "var(--s2)"} fillOpacity=".55" stroke={r.gap > 0 ? "var(--s1)" : "var(--s2)"} strokeWidth={sel ? 3 : 1.4} />
            <text x={X(Math.log10(r.aud))} y={Y(r.s.idx) - 12} fontSize="11" textAnchor="middle" fill="var(--text)">{r.a.name}</text>
          </g>);
      })}
    </svg>
  );
}

export function Discovery({ app }) {
  const { allArtists, visible, scores, prev, scope, setScope, run, startRun, watch, toggleWatch, revealed, query } = app;
  const [searches, setSearches] = useState(6);
  const [autoScout, setAutoScout] = useState(true);
  const [hubIdx, setHubIdx] = useState(0);
  const activeHub = MUSIC_HUBS[hubIdx] || MUSIC_HUBS[0];
  const [scoutFeed, setScoutFeed] = useState([
    { time: "Live", hub: "Nairobi, KE", artist: "Wakadinali", text: "Drill/Gengetone breakout (+4.2% acceleration)", tone: "lime" },
    { time: "30s ago", hub: "Lagos, NG", artist: "Ayra Starr", text: "Streaming velocity verified (240k Deezer fans)", tone: "cyan" },
    { time: "1m ago", hub: "Johannesburg, ZA", artist: "Uncle Waffles", text: "Broad Amapiano surge across 4 platforms", tone: "purple" },
    { time: "2m ago", hub: "Kampala, UG", artist: "Joshua Baraka", text: "Acoustic fingerprint: 104 BPM, LUFS -8.8", tone: "amber" },
  ]);

  useEffect(() => {
    if (!autoScout) return;
    const t = setInterval(() => {
      setHubIdx(idx => {
        const next = (idx + 1) % MUSIC_HUBS.length;
        const hub = MUSIC_HUBS[next];
        const match = EXPANDED_REAL_ARTISTS.find(a => a.city === hub.city) || { name: `${hub.city} Talent` };
        setScoutFeed(prev => [
          { time: "Live", hub: `${hub.city}, ${hub.country}`, artist: match.name, text: `${hub.genre} scan verified (${hub.focus})`, tone: "lime" },
          ...prev.slice(0, 5)
        ]);
        return next;
      });
    }, 8000);
    return () => clearInterval(t);
  }, [autoScout]);

  const triggerHubScout = async () => {
    const hub = activeHub;
    const match = EXPANDED_REAL_ARTISTS.find(a => a.city === hub.city) || EXPANDED_REAL_ARTISTS[0];
    app.say(`Autonomous Scout ingesting verified talent from ${hub.city}...`);
    try {
      const hydrated = await hydrateArtistFromRealData(match);
      app.addLiveArtist(hydrated);
    } catch (e) {
      app.say("Scout notice: " + (e.message || e));
    }
  };

  const live = useMemo(() => visible.filter((a) => a.series), [visible]);
  const movers = useMemo(() => marketMovers(live, scores), [live, scores]);
  const feed = useMemo(() => signalsFeed(live, scores), [live, scores]);
  const split = useMemo(() => integritySplit(live, scores), [live, scores]);
  const under = useMemo(() => underpriced(live, scores), [live, scores]);

  const pool = allArtists.filter((a) => !a.hidden || revealed);
  const countries = [...new Set(pool.map((a) => a.country))].filter(Boolean).sort();
  const genres = [...new Set(pool.map((a) => a.genre))].sort();
  const toggle = (key, v) => setScope((s) => ({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] }));
  const q = (query || "").trim().toLowerCase();

  const inScope = visible.filter((a) =>
    (!scope.countries.length || scope.countries.includes(a.country)) &&
    (!scope.genres.length || scope.genres.includes(a.genre)) &&
    (!a.series || totalAud(a) <= scope.ceiling) &&
    (!q || [a.name, a.city, a.genre, a.country, a.language].join(" ").toLowerCase().includes(q)));
  const sc = (a) => scores.byId.get(a.id);
  const rankedAll = inScope.filter((a) => sc(a) && sc(a).rank != null).sort((x, y) => sc(x).rank - sc(y).rank);
  const ranked = rankedAll.filter((a) => sc(a).evidence >= scope.minEvidence);
  const hiddenByEvidence = rankedAll.length - ranked.length;
  const held = inScope.filter((a) => sc(a) && sc(a).integrity.held);
  const pending = inScope.filter((a) => !a.series);
  const selectedId = app.selectedId && inScope.some((a) => a.id === app.selectedId) ? app.selectedId : (ranked[0] || held[0] || pending[0] || {}).id;
  const selected = inScope.find((a) => a.id === selectedId);
  const rankMove = (a) => { const p = prev.byId.get(a.id); const s = sc(a); if (!p || p.rank == null || s.rank == null) return null; return p.rank - s.rank; };
  const measuredCount = live.length;
  const highConf = scores.eligibleIds.filter((id) => { const s = scores.byId.get(id); return s.evidence >= 0.8 && s.stability >= 0.5; }).length;
  const flags = split.paid + split.review + split.synthetic;

  const tiles = [
    { l: "Artists monitored", v: measuredCount, n: "users", t: "v" },
    { l: "Ranked prospects", v: scores.eligibleIds.length, n: "target", t: "c" },
    { l: "Flags to review", v: flags, n: "flag", t: "r" },
    { l: "High-confidence leads", v: highConf, n: "star", t: "a" },
    { l: "Weekly reviews due", v: app.dueCount, n: "analyse", t: "l" },
  ];

  const mapDots = live.map((a) => {
    const xy = CITIES[a.city]; const s = sc(a);
    if (!xy || !s) return null;
    const j = hashStr(a.id);
    return { id: a.id, lon: xy[0] + (((j % 100) / 100) - 0.5) * 1.8, lat: xy[1] + ((((j >> 7) % 100) / 100) - 0.5) * 1.8, r: 4 + ((s.idx || 40) / 100) * 7,
      fill: s.integrity.held ? "#FF6B6B" : s.integrity.status === "paid" ? "#22D3EE" : "#B8F500", sel: a.id === selectedId, pulse: s.rank != null && s.rank <= 3, label: `${a.name}, ${a.city}`, text: a.id === selectedId ? a.name : undefined };
  }).filter(Boolean);
  const geoRows = selected && selected.geo ? selected.geo.map(([k, v], i) => ({ k, v, d: v - selected.geoPrev[i][1] })) : [];
  const mapRings = geoRows.filter((g) => COUNTRY_XY[g.k]).map((g) => ({ code: g.k, lon: COUNTRY_XY[g.k][0], lat: COUNTRY_XY[g.k][1], r: 9 + g.v * 70, gain: g.d > 0.02 }));
  const offMap = geoRows.filter((g) => !COUNTRY_XY[g.k]);

  const act = (r) => {
    if (r.action === "Watch") { app.setSelectedId(r.a.id); return; }
    if (!watch.includes(r.a.id)) toggleWatch(r.a.id);
    if (r.action === "Investigate") { app.setAnalyseId(r.a.id); app.setSection("analyse"); }
  };
  const signalTone = { risk: "r", info: "c", lime: "l", go: "g" };

  return (
    <div>
      <div className="hero">
        <HeroArt />
        <div className="copy">
          <div className="eyebrow"><Logo size={22} /><span>Breakout Radar</span></div>
          <h1 className="disp">Find tomorrow's stars<em>today.</em></h1>
          <p>Sweeps credible sources every week, screens for fake growth, and ranks upcoming African artists with the evidence one click away.</p>
          <div className="row">
            <button className="btn primary" onClick={startRun} disabled={run.status === "running"}><Icon n="play" s={15} />{run.status === "running" ? "Sweeping…" : "Run sweep"}</button>
            <button className="btn" onClick={app.loadCuratedRealCohort} title="Load verified real African breakout artists with live metrics & audio"><Icon n="star" s={15} />Load Real Artists</button>
            <button className="btn" onClick={() => app.setSection("analyse")}>Open weekly review</button>
          </div>
        </div>
        <div className="tag" aria-hidden="true">Real talent.<br />Real evidence.</div>
      </div>

      <div className="tiles" style={{ marginTop: 14 }}>
        {tiles.map((t) => (<div key={t.l} className="tile"><IBadge n={t.n} tone={t.t} /><div className="v num">{t.v}</div><div className="l">{t.l}</div></div>))}
        <div className="tile"><IBadge n="bolt" tone="g" /><div className="v" style={{ fontSize: 17 }}>Mon {fmtDay(weekDate(LAST))}</div><div className="l">Last updated, simulated data</div></div>
      </div>

      <div style={{ marginTop: 14 }}><SweepConsole run={run} startRun={startRun} visibleCount={measuredCount} lastLabel={`Mon ${fmtDayY(weekDate(LAST))}`} /></div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="ch" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <IBadge n="discover" tone="l" />
            <div>
              <h2 className="disp" style={{ fontSize: 16 }}>Autonomous Scout Station</h2>
              <div className="sub">Continuous background radar sweeping 7 African music capitals for emerging talent</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="livebadge"><i style={{ width: 6, height: 6, borderRadius: "50%", background: autoScout ? "var(--lime)" : "var(--muted)" }} />{autoScout ? "AUTOPILOT ON" : "PAUSED"}</span>
            <button className="btn sm" onClick={() => setAutoScout(v => !v)}>{autoScout ? "Pause Scanner" : "Resume Scanner"}</button>
            <button className="btn sm primary" onClick={triggerHubScout} title="Immediately scout active hub"><Icon n="play" s={14} />Scout {activeHub.city} Now</button>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "230px minmax(0,1fr)", gap: 16, alignItems: "center" }}>
          <AutonomousRadarScanner activeHub={`${activeHub.city}, ${activeHub.country}`} scanning={autoScout} onToggleScan={() => setAutoScout(v => !v)} />
          <div className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 8, fontSize: 12 }}>
              <b>Active Target Hub:</b>
              <Chip tone="lime">{activeHub.city}, {activeHub.country}</Chip>
              <Chip tone="info">{activeHub.genre}</Chip>
              <span className="muted">Zone: {activeHub.focus}</span>
            </div>
            <div className="log" style={{ maxHeight: 130 }}>
              {scoutFeed.map((item, idx) => (
                <div key={idx} className="row" style={{ fontSize: 12.5, gap: 8, padding: "3px 0" }}>
                  <span className="muted" style={{ minWidth: 50 }}>{item.time}</span>
                  <Chip tone={item.tone}>{item.hub}</Chip>
                  <b>{item.artist}:</b>
                  <span className="muted">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="scope">
          <div className="field"><span className="lbl">Countries</span>
            <div className="pillgroup" role="group" aria-label="Countries">
              {countries.map((c) => (<button key={c} className="pill" aria-pressed={scope.countries.includes(c)} onClick={() => toggle("countries", c)}>{c}</button>))}
            </div></div>
          <div className="field"><span className="lbl">Genres</span>
            <div className="pillgroup" role="group" aria-label="Genres">
              {genres.map((g) => (<button key={g} className="pill" aria-pressed={scope.genres.includes(g)} onClick={() => toggle("genres", g)}>{g}</button>))}
            </div></div>
        </div>
        <div className="scope" style={{ marginTop: 12 }}>
          <div className="field"><label htmlFor="ceil">Audience size</label>
            <select id="ceil" value={scope.ceiling} onChange={(e) => setScope((s) => ({ ...s, ceiling: Number(e.target.value) }))}>
              {CEILINGS.map(([l, v]) => (<option key={l} value={v}>{l}</option>))}</select></div>
          <div className="field"><label htmlFor="mev">Minimum evidence</label>
            <select id="mev" value={scope.minEvidence} onChange={(e) => setScope((s) => ({ ...s, minEvidence: Number(e.target.value) }))}>
              <option value={0}>Show everything</option><option value={0.6}>At least 60%</option><option value={0.8}>At least 80%</option></select></div>
          <div className="field"><span className="lbl">Held artists</span>
            <button className="pill" aria-pressed={scope.showHeld} onClick={() => setScope((s) => ({ ...s, showHeld: !s.showHeld }))}>{scope.showHeld ? "Showing held list" : "Hidden"}</button></div>
          <div style={{ flex: 1 }} />
          {(scope.countries.length > 0 || scope.genres.length > 0) && <button className="btn sm ghost" onClick={() => setScope((s) => ({ ...s, countries: [], genres: [] }))}>Clear filters</button>}
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 14, alignItems: "start" }}>
        <div className="stack">
          <div className="card">
            <div className="ch"><IBadge n="trend" tone="l" /><div><h2 className="disp" style={{ fontSize: 16 }}>Today's breakouts</h2><div className="sub">Ranked by breakout index. The bar is the 90% range from 300 re-weighted simulations. A ranking, not a prediction of success.</div></div></div>
            {ranked.length === 0 ? (
              <div className="sig">No prospects match this scope. Clear a filter, the search box, or widen the audience size.</div>
            ) : (
              <div className="scroll-x">
                <table className="tbl">
                  <caption className="sr">Ranked prospects</caption>
                  <thead><tr><th>#</th><th>Artist</th><th>Breakout index</th><th>4-week growth</th><th>Stays top 3</th><th>Evidence</th><th>Shortlist</th></tr></thead>
                  <tbody>
                    {ranked.map((a) => {
                      const s = sc(a), mv = rankMove(a), on = watch.includes(a.id);
                      return (
                        <tr key={a.id} className={a.id === selectedId ? "sel" : ""}>
                          <td className="num">{s.rank}{mv != null && mv !== 0 && <span className="muted" style={{ fontSize: 12 }} title="Change since last week"> {mv > 0 ? "+" : "−"}{Math.abs(mv)}</span>}</td>
                          <td><div className="row" style={{ gap: 10, flexWrap: "nowrap" }}><Avatar name={a.name} id={a.id} size={34} /><div><button className="linkbtn" onClick={() => app.setSelectedId(a.id)}>{a.name}</button>
                            <div className="muted" style={{ fontSize: 12.5 }}>{a.city}, {a.country} · {a.genre}</div></div></div></td>
                          <td style={{ minWidth: 150 }}><div className="row" style={{ gap: 8 }}><b className="num" style={{ width: 28 }}>{s.idx.toFixed(0)}</b><div style={{ flex: 1 }}><RangeBar v={s.idx} lo={s.lo} hi={s.hi} /></div></div></td>
                          <td className="num"><b style={{ color: s.growth4 >= 0 ? "var(--s1)" : "var(--risk)" }}>{fmtSigned((Math.exp(s.growth4) - 1) * 100)}%</b><div className="muted" style={{ fontSize: 12 }}>{fmtSigned(s.growthVsPeers * 100)} vs peers</div></td>
                          <td className="num">{fmtPct(s.stability)}</td>
                          <td style={{ minWidth: 80 }}><div className="row" style={{ gap: 6 }}><Meter v={s.evidence} color={s.evidence < EVIDENCE_BAR ? "var(--warn)" : "var(--s2)"} /><span className="num" style={{ fontSize: 12.5 }}>{fmtPct(s.evidence)}</span></div></td>
                          <td><button className="btn sm" aria-pressed={on} onClick={() => toggleWatch(a.id)}>{on ? "On shortlist" : "Add"}</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {hiddenByEvidence > 0 && <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>{hiddenByEvidence} prospect{hiddenByEvidence > 1 ? "s" : ""} hidden by the evidence filter.</p>}
          </div>

          {scope.showHeld && held.length > 0 && (
            <div className="card">
              <div className="ch"><IBadge n="flag" tone="r" /><div><h2 className="disp" style={{ fontSize: 16 }}>Held for a human check</h2><div className="sub">Not ranked. These are flags to investigate, not verdicts.</div></div></div>
              {held.map((a) => (
                <div key={a.id} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <Avatar name={a.name} id={a.id} size={30} /><button className="linkbtn" onClick={() => app.setSelectedId(a.id)}>{a.name}</button>
                  <Chip tone={intTone(sc(a).integrity.status)}>{sc(a).integrity.label}</Chip>
                  <span className="muted" style={{ fontSize: 13 }}>{a.city}, {a.country}</span>
                </div>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div className="card">
              <h2 className="disp" style={{ fontSize: 16 }}>Identity verified, measurements pending</h2>
              {pending.map((a) => (
                <div key={a.id} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <Avatar name={a.name} id={a.id} size={30} /><b>{a.name}</b><Chip>{a.country || "Unknown country"}</Chip><Chip>{a.genre}</Chip>
                  <span className="muted" style={{ fontSize: 13 }}>No score shown until real observations arrive.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "sticky", top: 12 }}>
          {selected ? <ProspectDetail a={selected} sc={sc(selected)} app={app} /> : <div className="card">Select a prospect to see why it surfaced.</div>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }} id="signals">
        <div className="ch"><IBadge n="bolt" tone="a" /><div><h2 className="disp" style={{ fontSize: 16 }}>Signals detected</h2><div className="sub">Patterns found by this week's sweep. Select a card to open the artist.</div></div></div>
        <div className="sigcards">
          {feed.map((f, i) => (
            <button key={i} className="sigcard" onClick={() => f.artistId && app.setSelectedId(f.artistId)}>
              <IBadge n={f.icon} tone={signalTone[f.tone] || "c"} />
              <div><b>{f.title}</b><p>{f.text.length > 120 ? f.text.slice(0, 118) + "…" : f.text}</p><Chip tone={TONE[f.tone] || (f.tone === "lime" ? "lime" : "")}>{f.tag}</Chip></div>
            </button>))}
          {feed.length === 0 && <div className="sig">No unusual patterns this week.</div>}
        </div>
      </div>

      <div className="grid g2e" style={{ marginTop: 14, alignItems: "start" }}>
        <div className="card">
          <div className="ch"><IBadge n="pin" tone="c" /><div><h2 className="disp" style={{ fontSize: 16 }}>Market movers</h2><div className="sub">Median four-week audience growth by home city. Held artists are left out.</div></div></div>
          {movers.slice(0, 6).map((m) => (
            <div key={m.city} className="mm">
              <Avatar name={m.city} id={m.city} size={40} />
              <div><b>{m.city}</b><div className="muted" style={{ fontSize: 12.5 }}>{m.country} · {m.n} prospect{m.n > 1 ? "s" : ""}{m.flagged ? ` · ${m.flagged} held` : ""}</div></div>
              <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}><Spark values={m.series} color="var(--s1)" w={70} /><b className="num" style={{ color: m.growth >= 0 ? "var(--s1)" : "var(--risk)", minWidth: 60, textAlign: "right" }}>{fmtSigned((Math.exp(m.growth) - 1) * 100)}%</b></div>
            </div>))}
          {movers.length === 0 && <p className="muted">No ranked prospects in a market yet.</p>}
        </div>

        <div className="card">
          <div className="ch"><IBadge n="globe" tone="g" /><div><h2 className="disp" style={{ fontSize: 16 }}>Geographic expansion</h2><div className="sub">Dots are prospects at their home city (lime ranked, blue paid push, red held). Rings show where {selected ? selected.name + "'s" : "the selected artist's"} listeners are.</div></div></div>
          <div className="grid" style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", alignItems: "center" }}>
            <AfricaMap dots={mapDots} rings={mapRings} onPick={app.setSelectedId} height={330} />
            <div className="stack" style={{ gap: 6 }}>
              <b>{selected ? selected.name : "Select a prospect"}</b>
              {geoRows.map((g) => (<div key={g.k} className="bar2" style={{ gridTemplateColumns: "44px 1fr 92px" }}><span>{g.k}</span><div className="track"><div className="fill" style={{ left: 0, width: g.v * 100 + "%", background: g.d > 0.02 ? "var(--s1)" : "var(--s2)" }} /></div><span className="num">{fmtPct(g.v)} <span className="muted">{fmtSigned(g.d * 100, 0)}</span></span></div>))}
              {offMap.length > 0 && <div className="muted" style={{ fontSize: 12.5 }}>Outside the map: {offMap.map((g) => `${g.k} ${fmtPct(g.v)}`).join(", ")}.</div>}
              <div className="muted" style={{ fontSize: 12.5 }}>Change is in points over four weeks. Group totals only.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid g2e" style={{ marginTop: 14, alignItems: "start" }}>
        <div className="card">
          <div className="ch"><IBadge n="trend" tone="l" /><div><h2 className="disp" style={{ fontSize: 16 }}>Breakout Velocity & Acceleration</h2><div className="sub">Comparing 4-week acceleration pace vs prior trajectory across prospects.</div></div></div>
          <VelocityMomentumChart artists={live} height={230} />
        </div>
        <div className="card">
          <div className="ch"><IBadge n="users" tone="c" /><div><h2 className="disp" style={{ fontSize: 16 }}>Audience Reach vs. Fan Loyalty</h2><div className="sub">High-engagement prospects in the upper quadrant indicate deeply loyal fanbases.</div></div></div>
          <AudienceVsEngagementBubble artists={live} selectedId={selectedId} onPick={app.setSelectedId} height={230} />
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 14, alignItems: "start" }}>
        <div className="card">
          <div className="ch"><IBadge n="star" tone="l" /><div><h2 className="disp" style={{ fontSize: 16 }}>Top artists by underpriced potential</h2><div className="sub">Evidence rank minus visibility rank. A high gap means the data is strong and the audience is still small. A ranking gap, not a forecast.</div></div></div>
          <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
            <UnderpricedPlot rows={under} selectedId={selectedId} onPick={app.setSelectedId} />
            <div className="scroll-x"><table className="tbl"><caption className="sr">Underpriced potential</caption>
              <thead><tr><th>#</th><th>Artist</th><th>Audience</th><th>Index</th><th>Gap</th><th>Action</th></tr></thead>
              <tbody>{under.slice(0, 5).map((r, i) => (
                <tr key={r.a.id}><td className="num">{i + 1}</td>
                  <td><div className="row" style={{ gap: 8, flexWrap: "nowrap" }}><Avatar name={r.a.name} id={r.a.id} size={28} /><button className="linkbtn" onClick={() => app.setSelectedId(r.a.id)}>{r.a.name}</button></div></td>
                  <td className="num">{fmtN(r.aud)}</td><td className="num">{r.s.idx.toFixed(0)}</td>
                  <td className="num"><b style={{ color: r.gap > 0 ? "var(--s1)" : "var(--muted)" }}>{fmtSigned(r.gap, 0)}</b></td>
                  <td><button className={"pillbtn " + (r.action === "Investigate" ? "inv" : r.action === "Monitor" ? "mon" : "wat")} onClick={() => act(r)}>{r.action}</button></td></tr>))}</tbody></table></div>
          </div>
        </div>

        <div className="card">
          <div className="ch"><IBadge n="shield" tone="g" /><div><h2 className="disp" style={{ fontSize: 16 }}>Growth integrity</h2><div className="sub">Share of tracked artists with no integrity flag. Flags ask a person to look. They are not accusations.</div></div></div>
          <div className="row" style={{ gap: 18, alignItems: "center", flexWrap: "nowrap" }}>
            <Donut size={150} thick={20} label="Integrity mix of tracked artists" center={fmtPct(split.n ? split.clear / split.n : 0)} sub="Clear"
              parts={[{ label: "Clear", value: split.clear, color: "var(--ok)" }, { label: "Paid push", value: split.paid, color: "var(--s2)" }, { label: "Needs review", value: split.review, color: "var(--s4)" }, { label: "Synthetic risk", value: split.synthetic, color: "var(--risk)" }]} />
            <div className="legend" style={{ flex: 1 }}>
              {[["Clear", split.clear, "var(--ok)"], ["Probable paid push", split.paid, "var(--s2)"], ["Needs review", split.review, "var(--s4)"], ["Synthetic-catalogue risk", split.synthetic, "var(--risk)"]].map(([l, n, c]) => (<div key={l} className="it"><i style={{ background: c }} /><span>{l}</span><b className="num">{n}</b></div>))}
            </div>
          </div>
          <h3 className="disp" style={{ fontSize: 14, margin: "14px 0 6px" }}>Top risk signals</h3>
          <div className="stack" style={{ gap: 6 }}>
            {live.map((a) => ({ a, s: sc(a) })).filter((r) => r.s && r.s.integrity.status !== "clear").slice(0, 3).map((r) => {
              const sig = r.s.integrity.signals.find((x) => x.sev === "high") || r.s.integrity.signals.find((x) => x.sev === "info") || r.s.integrity.signals[0];
              return (<div key={r.a.id} className={"sig " + (sig ? sig.sev : "")}><b>{r.a.name}.</b> {sig ? (sig.text.length > 150 ? sig.text.slice(0, 148) + "…" : sig.text) : r.s.integrity.label}</div>);
            })}
            {flags === 0 && <div className="sig">No open flags.</div>}
          </div>
        </div>
      </div>

      <div className="grid g2e" style={{ marginTop: 14, alignItems: "start" }}>
        <div className="card">
          <div className="ch"><IBadge n="trend" tone="l" /><div><h2 className="disp" style={{ fontSize: 16 }}>Breakout Velocity & Acceleration</h2><div className="sub">Comparing 4-week acceleration pace vs prior trajectory across prospects.</div></div></div>
          <VelocityMomentumChart artists={live} height={230} />
        </div>
        <div className="card">
          <div className="ch"><IBadge n="users" tone="c" /><div><h2 className="disp" style={{ fontSize: 16 }}>Audience Reach vs. Fan Loyalty</h2><div className="sub">High-engagement prospects in the upper quadrant indicate deeply loyal fanbases.</div></div></div>
          <AudienceVsEngagementBubble artists={live} selectedId={selectedId} onPick={app.setSelectedId} height={230} />
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 14, alignItems: "start" }}>
        <IdentityLookup app={app} />
        <div className="card">
          <h2 className="disp" style={{ fontSize: 16 }}>YouTube quota plan</h2>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>One search costs 100 of your 10,000 daily units. Tracking channels costs 1 unit per batch of 50, so weekly tracking is cheap and discovery searches are the expensive part.</p>
          <div className="field" style={{ maxWidth: 260 }}><label htmlFor="srch">Discovery searches per sweep: <b>{searches}</b></label>
            <input id="srch" type="range" min="0" max="60" value={searches} onChange={(e) => setSearches(Number(e.target.value))} /></div>
          {(() => {
            const u = quotaUnits(searches, measuredCount);
            const share = u / 10000;
            return (<div style={{ marginTop: 10 }}>
              <div className="row"><b className="num">{fmtN(u)} units</b><span className="muted">of 10,000 a day for {measuredCount} tracked channels</span></div>
              <Meter v={share} color={share > 0.8 ? "var(--risk)" : "var(--s2)"} />
              {share > 0.8 && <div className="sig high" style={{ marginTop: 8 }}>This plan uses most of the day's quota. Cut searches or cache results. Do not open extra Google projects to get around the limit; the terms forbid it.</div>}
            </div>);
          })()}
        </div>
      </div>

      <ModelPanel />
    </div>
  );
}

export function SweepConsole({ run, startRun, visibleCount, lastLabel }) {
  const running = run.status === "running";
  return (
    <div className="console" aria-label="Autonomous sweep">
      <div className="row" style={{ marginBottom: 10 }}>
        <b className="disp" style={{ fontSize: 15, color: "#fff" }}>Autonomous sweep</b>
        <span style={{ color: "#93A4B8", fontSize: 13 }}>{running ? "Running" : run.summary ? `Finished ${run.summary.when}` : `Last sweep ${lastLabel} · ${visibleCount} artists tracked`}</span>
        <span className="chip sim" style={{ marginLeft: "auto" }}>Simulated run</span>
        <button className="btn primary" onClick={startRun} disabled={running}><Icon n="play" s={15} />{running ? "Sweeping…" : "Run sweep"}</button>
      </div>
      <div className="stages" aria-hidden="true">
        {STAGES.map((s, i) => (<span key={s.k} className={"stage " + (i < run.stage || run.status === "done" ? "done" : i === run.stage && running ? "now" : "")}>{s.name}</span>))}
      </div>
      <div className="log" aria-live="polite">
        {run.log.length === 0 && <span style={{ color: "#93A4B8" }}>Idle. A real deployment runs this every Monday on a scheduled job and writes the result to the database. Press Run sweep to watch the pipeline work on the demo universe.</span>}
        {run.log.map((l, i) => (<div key={i}><b>{l.name}</b> {l.text}</div>))}
      </div>
    </div>
  );
}

export function ProspectDetail({ a, sc, app }) {
  const on = app.watch.includes(a.id);
  if (!a.series || !sc) {
    return (<div className="card"><h2 className="disp" style={{ fontSize: 18 }}>{a.name}</h2><p>Identity verified{a.mbid ? " through MusicBrainz" : ""}. No audience measurements yet, so no score is shown. Connect a source or import an artist-authorized export to start monitoring.</p></div>);
  }
  const peer = peerMedianSeries(app.visible, LAST);
  const labels = weekLabels(LAST);
  const maxC = Math.max(1, ...sc.contributions.map((c) => Math.abs(c.value)));
  const compOf = (id) => app.allArtists.find((x) => x.id === id);
  const ps = Object.keys(a.series);
  const rows = ps.map((p) => ({ p, prov: PROVIDERS.find((x) => x.id === PLATFORMS[p].provider) }));
  return (
    <div className="card stack" style={{ maxHeight: "calc(100vh - 24px)", overflow: "auto" }}>
      <div>
        <div className="row"><Avatar name={a.name} id={a.id} size={46} picture={a.picture} /><div><div className="row"><h2 className="disp" style={{ fontSize: 20, margin: 0 }}>{a.name}</h2>{a.liveData ? <Chip tone="go">Live data</Chip> : <Chip tone="sim" title="Invented artist for demonstration">Simulated</Chip>}</div>
        <div className="muted" style={{ fontSize: 13.5 }}>{a.city}, {a.country} · {a.genre} · {a.language}</div></div></div>
        {(a.previewUrl || (a.tracks && a.tracks[0] && a.tracks[0].preview)) && (
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm primary" onClick={() => app.playTrack(a.tracks?.[0] || { title: a.name + " Top Track", preview: a.previewUrl }, a.name, a.picture)}>
              <Icon n="play" s={14} /> Listen to track ({a.tracks?.[0]?.title || "Preview"})
            </button>
            {a.deezerFans ? <span className="chip" style={{ fontSize: 12 }}>Deezer: {fmtN(a.deezerFans)} fans</span> : null}
          </div>
        )}
      </div>
      <div className="row" style={{ alignItems: "flex-end", gap: 18 }}>
        <div><div className="disp num" style={{ fontSize: 40, lineHeight: 1 }}>{sc.idx.toFixed(0)}</div><div className="muted" style={{ fontSize: 12.5 }}>Breakout index</div></div>
        <div style={{ flex: 1, minWidth: 140 }}>
          {sc.rank != null ? <><RangeBar v={sc.idx} lo={sc.lo} hi={sc.hi} /><div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>90% range {sc.lo.toFixed(0)} to {sc.hi.toFixed(0)}. Stays in the top 3 in {fmtPct(sc.stability)} of simulations.</div></> : <Chip tone="risk">Held: not ranked</Chip>}
        </div>
      </div>
      <p style={{ margin: 0 }}>{whySurfaced(a, sc)}</p>

      <div><h3 className="disp" style={{ fontSize: 14 }}>What moves the score</h3>
        <div className="stack" style={{ gap: 6 }}>
          {[...sc.contributions].sort((x, y) => y.value - x.value).map((c) => (
            <div key={c.key} className="bar2"><span>{c.label}</span>
              <div className="track" aria-hidden="true"><span style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: "var(--muted)" }} />
                <div className="fill" style={{ background: c.value >= 0 ? "var(--s2)" : "var(--risk)", left: c.value >= 0 ? "50%" : 50 - (Math.abs(c.value) / maxC) * 50 + "%", width: (Math.abs(c.value) / maxC) * 50 + "%" }} /></div>
              <span className="num" style={{ textAlign: "right" }}>{fmtSigned(c.value)}</span></div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Points above or below 50, after shrinking by evidence coverage ({fmtPct(sc.evidence)}). Missing signals are left out, never counted as zero.</p>
      </div>

      <div><h3 className="disp" style={{ fontSize: 14 }}>Audience index against the peer median</h3>
        <LineChart label={`${a.name} blended audience index against peer median`} labels={labels} height={220}
          series={[{ label: a.name, color: "var(--s1)", values: sc.B }, { label: "Peer median", color: "var(--s3)", dash: "5 4", thin: true, values: peer }]} markers={sc.integrity.markers} />
      </div>

      <div><div className="row"><h3 className="disp" style={{ fontSize: 14, margin: 0 }}>Integrity screen</h3><Chip tone={intTone(sc.integrity.status)}>{sc.integrity.label}</Chip></div>
        <div className="stack" style={{ gap: 6, marginTop: 8 }}>
          {sc.integrity.signals.length === 0 && <div className="sig">No unusual patterns found in surge shape, geography, engagement or audio.</div>}
          {sc.integrity.signals.map((s, i) => (<div key={i} className={"sig " + s.sev}>{s.text}</div>))}
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>A flag asks a person to look. It never proves wrongdoing, and paid promotion is normal marketing.</p>
      </div>

      <div><h3 className="disp" style={{ fontSize: 14 }}>Closest peers on the evidence</h3>
        <div className="row">{sc.comps.map((c) => { const o = compOf(c.id); return o ? (<Chip key={c.id} title="Cosine similarity of feature scores">{o.name} {c.sim.toFixed(2)}</Chip>) : null; })}</div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>In production these should be historical artists at the same career stage, so you can see how their paths unfolded.</p>
      </div>

      <div>
        <h3 className="disp" style={{ fontSize: 14 }}>Cross-platform audience share</h3>
        <PlatformDistributionBar platforms={Object.fromEntries(ps.map(p => [p, a.series[p].aud[LAST]]))} total={totalAud(a)} />
      </div>

      {a.audio && (
        <div style={{ marginTop: 8 }}>
          <h3 className="disp" style={{ fontSize: 14, marginBottom: 8 }}>Acoustic fingerprint</h3>
          <AudioSpectrumVisualizer audio={a.audio} isPlaying={app.playingTrack && app.playingTrack.artistName === a.name} />
        </div>
      )}

      <details><summary>Evidence ledger</summary>
        <div className="scroll-x"><table className="tbl" style={{ marginTop: 8 }}>
          <thead><tr><th>Signal</th><th>Latest</th><th>Source</th><th>Rights</th></tr></thead>
          <tbody>
            {rows.map(({ p, prov }) => (<tr key={p}><td>{PLATFORMS[p].label} {PLATFORMS[p].audLabel}</td><td className="num">{fmtN(a.series[p].aud[LAST])}</td><td>{prov.name}</td><td><Chip tone={prov.ml === "blocked" ? "risk" : prov.ml === "verify" ? "warn" : "go"}>{prov.status}</Chip></td></tr>))}
            <tr><td>Engagement per 1k views</td><td className="num">{a.engagement[LAST]}</td><td>YouTube Data API v3</td><td><Chip tone="warn">Verify terms</Chip></td></tr>
            <tr><td>Fan-content creators</td><td className="num">{a.ugcSeries ? a.ugcSeries[LAST] : "Not connected"}</td><td>Licensed feed (not contracted)</td><td><Chip tone="warn">Licence needed</Chip></td></tr>
            <tr><td>Audio descriptors</td><td>{a.audio.key} {a.audio.mode}, {a.audio.bpm} BPM</td><td>Essentia (simulated run)</td><td><Chip tone="go">Open tool</Chip></td></tr>
          </tbody></table></div>
        <p className="muted" style={{ fontSize: 12.5 }}>Every row carries a window and a refresh date in production. Snapshot taken Monday {fmtDayY(weekDate(LAST))}.</p>
      </details>

      <div className="row">
        <button className="btn primary" onClick={() => app.toggleWatch(a.id)}>{on ? "Remove from shortlist" : "Add to shortlist"}</button>
        {on && <button className="btn" onClick={() => { app.setAnalyseId(a.id); app.setSection("analyse"); }}>Open in Analyse</button>}
      </div>
    </div>
  );
}

export async function mbLookup(query) {
  const r = await fetch(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=6`);
  if (!r.ok) throw new Error("MusicBrainz answered with status " + r.status);
  const j = await r.json();
  return (j.artists || []).map((x) => ({
    mbid: x.id, name: x.name, country: x.country || "", area: (x.area && x.area.name) || "", disambiguation: x.disambiguation || "",
    type: x.type || "", tags: (x.tags || []).slice(0, 2).map((t) => t.name),
  }));
}

export function IdentityLookup({ app }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState({ status: "idle", results: [], err: null });
  const [multiQ, setMultiQ] = useState("");
  const [multiSt, setMultiSt] = useState({ status: "idle", results: [], err: null });
  const [hydrating, setHydrating] = useState(null);

  const go = async () => {
    if (!q.trim()) return;
    setSt({ status: "loading", results: [], err: null });
    try { setSt({ status: "ok", results: await app.adapters.lookupIdentity(q.trim()), err: null }); }
    catch (e) { setSt({ status: "error", results: [], err: String((e && e.message) || e) }); }
  };

  const goMulti = async () => {
    if (!multiQ.trim()) return;
    setMultiSt({ status: "loading", results: [], err: null });
    try {
      const results = await searchMultiSource(multiQ.trim());
      setMultiSt({ status: "ok", results, err: null });
    } catch (e) {
      setMultiSt({ status: "error", results: [], err: String((e && e.message) || e) });
    }
  };

  const ingestCandidate = async (raw) => {
    const key = raw.mbid || raw.deezerId || raw.name;
    setHydrating(key);
    app.say(`Fetching Deezer & Apple Music metrics for ${raw.name}...`);
    try {
      const hydrated = await hydrateArtistFromRealData(raw);
      app.addLiveArtist(hydrated);
    } catch (e) {
      app.say("Error ingesting artist: " + (e.message || e));
    } finally {
      setHydrating(null);
    }
  };

  return (
    <div className="card">
      <h2 className="disp" style={{ fontSize: 16 }}>Add an artist by identity</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Searches MusicBrainz (live, when your network allows it). A match only proves identity. The artist enters as pending until real audience data is attached.</p>
      <div className="row">
        <div className="field" style={{ flex: 1, minWidth: 160 }}><label htmlFor="mbq" className="sr">Artist name</label>
          <input id="mbq" type="text" placeholder="Artist name" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }} /></div>
        <button className="btn" onClick={go} disabled={st.status === "loading"}>{st.status === "loading" ? "Searching…" : "Search"}</button>
      </div>
      {st.status === "error" && <div className="sig medium" style={{ marginTop: 10 }}>Live lookup is not available here ({st.err}). It needs network access and a MusicBrainz-friendly origin. Pass your own <code>adapters.lookupIdentity</code> to route it through your server.</div>}
      {st.status === "ok" && st.results.length === 0 && <div className="sig" style={{ marginTop: 10 }}>No match found. If the artist is missing from MusicBrainz, add them manually in a later version rather than dropping them.</div>}
      {st.results.map((r) => {
        const already = app.allArtists.some((a) => a.mbid === r.mbid || (a.name && a.name.toLowerCase() === r.name.toLowerCase()));
        return (
          <div key={r.mbid} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ flex: 1, minWidth: 140 }}><b>{r.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{[r.type, r.country || r.area, r.disambiguation].filter(Boolean).join(" · ")}</div></div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm" disabled={already} onClick={() => app.addCandidate(r)}>{already ? "Added" : "Add as pending"}</button>
              <button className="btn sm primary" disabled={hydrating === r.mbid} onClick={() => ingestCandidate({ name: r.name, mbid: r.mbid, country: r.country, city: r.area, genre: r.tags?.[0] || "Afrobeats" })}>
                {hydrating === r.mbid ? "Scouting…" : "Ingest Live Metrics"}
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--line)" }}>
        <div className="row" style={{ marginBottom: 6 }}>
          <b style={{ fontSize: 13.5 }}>Multi-Source Live Scout</b>
          <Chip tone="go">Deezer + Apple Music + Wikipedia</Chip>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Search any real African artist across streaming & media sources to pull verified audience data and audio previews directly into the radar.</p>
        <div className="row">
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <input type="text" placeholder="e.g. Asake, Wakadinali, Tyla, Tems" value={multiQ} onChange={(e) => setMultiQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") goMulti(); }} />
          </div>
          <button className="btn primary" onClick={goMulti} disabled={multiSt.status === "loading"}>
            {multiSt.status === "loading" ? "Scouting…" : "Scout Sources"}
          </button>
        </div>
        {multiSt.status === "error" && <div className="sig medium" style={{ marginTop: 8 }}>Scouting error: {multiSt.err}</div>}
        {multiSt.status === "ok" && multiSt.results.length === 0 && <div className="sig" style={{ marginTop: 8 }}>No matching artists found across Deezer and Apple Music.</div>}
        {multiSt.results.map((res) => {
          const key = res.mbid || res.deezerId || res.name;
          const already = app.allArtists.some((a) => (a.name && a.name.toLowerCase() === res.name.toLowerCase()) || (res.deezerId && a.deezerId === res.deezerId));
          return (
            <div key={key} className="row" style={{ padding: "10px 0", borderTop: "1px solid var(--line)", alignItems: "center" }}>
              <Avatar name={res.name} id={key} size={38} picture={res.picture} />
              <div style={{ flex: 1, minWidth: 140 }}>
                <b>{res.name}</b>
                <div className="muted" style={{ fontSize: 12 }}>
                  {res.genre} · {res.fans ? `${fmtN(res.fans)} Deezer fans` : "Audience tracked"} · {res.sources.join(", ")}
                </div>
              </div>
              {res.tracks && res.tracks[0] && res.tracks[0].preview && (
                <button className="btn sm ghost" onClick={() => app.playTrack(res.tracks[0], res.name, res.picture)} title="Preview track">
                  <Icon n="play" s={14} /> Preview
                </button>
              )}
              <button className="btn sm primary" disabled={already || hydrating === key} onClick={() => ingestCandidate(res)}>
                {hydrating === key ? "Ingesting…" : already ? "In Radar" : "Scout & Ingest"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ModelPanel() {
  const needed = FEATURES.length * 10;
  const gates = [
    ["Outcome defined with the label (for example, a documented commercial threshold within 12 months)", false],
    ["Licensed historical data covering unsuccessful artists as well as successes", false],
    ["Point-in-time snapshots, so no future information leaks in", true],
    ["Time-based train and test split, with results on untouched later data", false],
    ["Calibration and precision at K reported to the Head of A&R", false],
  ];
  return (
    <details className="card" style={{ marginTop: 16 }}>
      <summary className="disp" style={{ fontSize: 16 }}>Model and readiness</summary>
      <div className="grid g2" style={{ marginTop: 12, alignItems: "start" }}>
        <div>
          <p style={{ marginTop: 0 }}><b>Current model: peer-relative ranking v0.</b> Expert-weighted and unsupervised. It is not trained on outcomes and not validated, so it shows no probabilities.</p>
          <ul className="dlist">
            <li>Each signal is scored against the peer cohort with robust z-scores (median and MAD), capped at ±2.5, then mapped to 0–100.</li>
            <li>The weighted score is shrunk toward 50 by evidence coverage, so thin data cannot rank high on confidence alone.</li>
            <li>Rank stability re-draws the weights (Dirichlet) and adds noise, 300 times, then re-ranks.</li>
            <li>Integrity flags use surge shape, retention, engagement, geography and a synthetic-audio screen.</li>
            <li>Every calculation takes a cutoff week and reads only data up to it, which is what makes honest backtesting possible later.</li>
          </ul>
          <div className="scroll-x"><table className="tbl"><thead><tr><th>Feature</th><th>Weight</th><th>What it measures</th></tr></thead>
            <tbody>{FEATURES.map((f) => (<tr key={f.key}><td>{f.label}</td><td className="num">{fmtPct(f.w)}</td><td className="muted">{f.note}</td></tr>))}</tbody></table></div>
        </div>
        <div>
          <h3 className="disp" style={{ fontSize: 14 }}>Before a supervised model is switched on</h3>
          <div className="row"><b className="num">0 of about {needed}</b><span className="muted">labelled positive outcomes (a common rule of thumb is ten per model feature)</span></div>
          <Meter v={0} color="var(--s2)" />
          <ul className="dlist" style={{ marginTop: 10 }}>
            {gates.map(([t, ok]) => (<li key={t}>{ok ? <Chip tone="go">Done</Chip> : <Chip tone="warn">Open</Chip>} {t}</li>))}
          </ul>
          <div className="sig" style={{ marginTop: 10 }}>Predicted-success probabilities stay disabled until every gate is done. Training a model on invented data would only teach it the rules used to invent it.</div>
        </div>
      </div>
    </details>
  );
}
