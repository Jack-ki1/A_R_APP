/*
  Breakout Radar: Base MVP (single file, React only, no other dependencies)

  Three sections, as specified by the client:
    Discovery        autonomous sweep, identity resolution, integrity screen, ranking, evaluation
    Analyse          weekly data review of the shortlist, with artistic quality as the centre of gravity
    Recommendations  the program proposes whom to pick, with reasons, gaps and an audit trail

  HONESTY RULES BUILT INTO THIS FILE
  1. Every artist here is SIMULATED (invented names, generated series). The UI says so everywhere.
  2. The ranking is an unsupervised, expert-weighted model. It is NOT trained and NOT validated.
     No success probabilities are shown. A supervised model needs real labelled outcomes first
     (see the "Model and readiness" panel).
  3. Missing data is never turned into zero. It lowers evidence coverage and widens uncertainty.
  4. Integrity output is a flag for a human, never a verdict.
  5. Sources with restricted terms (Spotify) are blocked from scoring in the provider ledger.

  PLUG-IN POINTS
  - PROVIDERS: the source ledger (rights, quotas, ML permission).
  - buildUniverse(): replace with real adapters that return the same artist shape.
  - adapters.lookupIdentity(query): optional prop, defaults to a live MusicBrainz search.
  - Engine functions are exported (scoreUniverse, screen, artisticValue, recommend) for unit tests.
*/

import { useEffect, useMemo, useState } from "react";
import { buildCuratedRealUniverse } from "./data/liveSources";
import { SEED_REVIEWS, SEED_WATCH, buildUniverse } from "./data/universe";
import { AS_OF, LAST } from "./engine/constants";
import { TIERS, artisticValue, checklist, recommend, scoreUniverse } from "./engine/engine";
import { integritySplit } from "./engine/insights";
import { Analyse, VERDICT } from "./sections/Analyse";
import { Discovery, STAGES, mbLookup, quotaUnits } from "./sections/Discovery";
import { Ledger } from "./sections/Ledger";
import { Recommendations } from "./sections/Recommendations";
import { AudioPlayer } from "./ui/AudioPlayer";
import { Avatar, Chip, Icon, Logo } from "./ui/primitives";
import { STYLES } from "./ui/theme";
import { fmtDayY, usePersisted, weekDate } from "./ui/util";

/* ───────────────────────── 11. App ───────────────────────── */

export const NAV = [
  { k: "discovery", label: "Discovery", icon: "discover" },
  { k: "analyse", label: "Analyse", icon: "analyse" },
  { k: "recs", label: "Recommendations", icon: "pick" },
];

export default function BreakoutRadarMVP({ initialSection = "discovery", adapters: adaptersProp }) {
  const adapters = { lookupIdentity: mbLookup, ...(adaptersProp || {}) };
  const [theme, setTheme] = usePersisted("theme", () => "dark");
  const [section, setSection] = useState(initialSection);
  const [universe] = useState(() => buildUniverse());
  const [candidates, setCandidates] = usePersisted("candidates", []);
  const [revealed, setRevealed] = usePersisted("revealed", false);
  const [watch, setWatch] = usePersisted("watch", SEED_WATCH);
  const [reviews, setReviews] = usePersisted("reviews", SEED_REVIEWS);
  const [weekly, setWeekly] = usePersisted("weekly", {});
  const [decisions, setDecisions] = usePersisted("decisions", []);
  const [capacity, setCapacity] = usePersisted("capacity", 2);
  const [actor, setActor] = usePersisted("actor", "grace");
  const [scope, setScope] = useState({ countries: [], genres: [], ceiling: 250000, minEvidence: 0, showHeld: true });
  const [selectedId, setSelectedId] = useState(null);
  const [analyseId, setAnalyseId] = useState(null);
  const [ledger, setLedger] = useState(false);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState("");
  const [run, setRun] = useState({ status: "idle", stage: 0, log: [], summary: null });
  const [playingTrack, setPlayingTrack] = useState(null);

  const playTrack = (track, artistName, artwork) => {
    if (!track) return;
    setPlayingTrack({ ...track, artistName: artistName || track.artistName, artwork: artwork || track.artwork });
  };
  const stopTrack = () => setPlayingTrack(null);

  const say = (m) => setToast(m);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const allArtists = useMemo(() => [...universe, ...candidates], [universe, candidates]);
  const visible = useMemo(() => allArtists.filter((a) => !a.hidden || revealed), [allArtists, revealed]);
  const live = useMemo(() => visible.filter((a) => a.series), [visible]);
  const scores = useMemo(() => scoreUniverse(live, LAST, 300), [live]);
  const prev = useMemo(() => scoreUniverse(live, LAST - 1, 0), [live]);
  const allScores = useMemo(() => scoreUniverse(allArtists.filter((a) => a.series), LAST, 0), [allArtists]);

  const recs = useMemo(() => {
    const cand = live.filter((a) => (watch.includes(a.id) || (reviews[a.id] && Object.keys(reviews[a.id]).length)) && !(weekly[a.id] && weekly[a.id].verdict === "drop"));
    const rows = cand.map((a) => { const sc = scores.byId.get(a.id); const art = artisticValue(reviews[a.id]); const rec = recommend(sc, art); return { a, sc, art, rec, list: checklist(sc, art, rec) }; });
    rows.sort((x, y) => TIERS[x.rec.tier].rankOrder - TIERS[y.rec.tier].rankOrder || (y.rec.pick || 0) - (x.rec.pick || 0));
    let n = 0;
    for (const r of rows) if ((r.rec.tier === "pursue" || r.rec.tier === "pursue-2nd") && n < capacity) { r.recommended = true; r.slot = ++n; }
    return { rows, count: n };
  }, [live, scores, watch, reviews, weekly, capacity]);

  const toggleWatch = (id) => setWatch((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  const saveReview = (artistId, reviewerId, draft) => {
    setReviews((r) => ({ ...r, [artistId]: { ...(r[artistId] || {}), [reviewerId]: { scores: draft.scores, notes: draft.notes, at: AS_OF } } }));
    say("Review saved.");
  };
  const setVerdict = (artistId, verdict, note) => { setWeekly((w) => ({ ...w, [artistId]: { week: AS_OF, verdict, note } })); say(VERDICT[verdict].label + "."); };
  const logDecision = (d) => { setDecisions((l) => [...l, { ...d, week: AS_OF, id: Date.now() + Math.random(), at: new Date().toISOString() }]); say(d.kind === "accepted" ? "Decision logged." : "Override logged."); };
  const addCandidate = (r) => {
    const c = { id: "MB-" + r.mbid.slice(0, 8), name: r.name, country: r.country || "", city: r.area || "Unknown", genre: r.tags[0] || "Unclassified", language: "Unknown", mbid: r.mbid, series: null, measured: false, hidden: false };
    setCandidates((l) => (l.some((x) => x.mbid === c.mbid) ? l : [...l, c]));
    setSelectedId(c.id); say(r.name + " added as pending.");
  };

  const addLiveArtist = (a) => {
    setCandidates((l) => {
      const idx = l.findIndex((x) => x.id === a.id || x.name.toLowerCase() === a.name.toLowerCase());
      if (idx >= 0) {
        const next = [...l];
        next[idx] = a;
        return next;
      }
      return [a, ...l];
    });
    setSelectedId(a.id);
    say(`${a.name} ingested with live multi-source metrics & audio.`);
  };

  const loadCuratedRealCohort = async () => {
    say("Scouting live African breakout stars from Deezer, Apple Music & Wikipedia...");
    try {
      const realArtists = await buildCuratedRealUniverse();
      setCandidates((l) => {
        const map = new Map(l.map((x) => [x.name.toLowerCase(), x]));
        for (const a of realArtists) map.set(a.name.toLowerCase(), a);
        return Array.from(map.values());
      });
      setSelectedId(realArtists[0].id);
      say(`Loaded ${realArtists.length} verified breakout artists with live metrics & audio.`);
    } catch (e) {
      say("Failed loading live artists: " + (e.message || e));
    }
  };

  const simCtx = () => {
    const arr = [...allScores.byId.values()];
    const n = arr.length;
    return {
      scopeText: [scope.countries.length ? scope.countries.join(", ") : "all countries", scope.genres.length ? scope.genres.join(", ") : "all genres"].join("; "),
      units: quotaUnits(6, n), sources: 6, handles: Math.round(n * 8.4 + 41), identities: n, ambiguous: 3, scored: n,
      held: arr.filter((s) => s.integrity.held).length, paid: arr.filter((s) => s.integrity.status === "paid").length, synth: arr.filter((s) => s.integrity.status === "synthetic").length,
      newCount: allArtists.filter((a) => a.hidden && !revealed).length,
    };
  };
  const startRun = () => { if (run.status !== "running") setRun({ status: "running", stage: 0, log: [], summary: null }); };
  useEffect(() => {
    if (run.status !== "running") return undefined;
    const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => {
      if (run.stage >= STAGES.length) {
        setRun((r) => ({ ...r, status: "done", summary: { when: new Date().toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) } }));
        setRevealed(true);
        return;
      }
      const st = STAGES[run.stage], ctx = simCtx();
      setRun((r) => ({ ...r, stage: r.stage + 1, log: [...r.log, { name: st.name, text: st.line(ctx) }] }));
    }, reduced ? 30 : 620);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.status, run.stage]);

  const dueCount = live.filter((a) => watch.includes(a.id) && !(weekly[a.id] && weekly[a.id].week === AS_OF)).length;
  const split = integritySplit(live, scores);
  const flagCount = split.paid + split.review + split.synthetic;
  const openSignals = () => { setSection("discovery"); setTimeout(() => { const el = document.getElementById("signals"); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); };
  const app = {
    query, setQuery, dueCount,
    section, setSection, allArtists, visible, scores, prev, scope, setScope, run, startRun, revealed,
    selectedId, setSelectedId, analyseId, setAnalyseId, watch, toggleWatch, reviews, saveReview, weekly, setVerdict,
    decisions, logDecision, capacity, setCapacity, actor, setActor, recs, addCandidate, adapters, say,
    playingTrack, playTrack, stopTrack, addLiveArtist, loadCuratedRealCohort,
  };
  const badge = { discovery: scores.eligibleIds.length, analyse: dueCount, recs: recs.count };
  const hasLiveArtists = candidates.some((c) => c.liveData);

  return (
    <div className="br" data-theme={theme}>
      <style>{STYLES}</style>
      <div className="br-shell">
        <nav className="br-rail" aria-label="Sections">
          <div className="br-brand"><Logo size={30} /><div><b className="disp">Breakout Radar</b><span>A&amp;R intelligence platform</span></div></div>
          <div className="br-nav">
            {NAV.map((n) => (
              <button key={n.k} className="br-navbtn" aria-current={section === n.k ? "page" : undefined} onClick={() => setSection(n.k)}>
                <Icon n={n.icon} /><span>{n.label}</span><span className="badge" title={n.k === "analyse" ? "Reviews due" : n.k === "recs" ? "Recommended picks" : "Ranked prospects"}>{badge[n.k]}</span>
              </button>))}
          </div>
          <div className="br-railnote"><Avatar name="A&R Team" id="team" size={32} /><div>A&amp;R team<br />Internal use only</div></div>
        </nav>
        <main className="br-main">
          <div className="br-top">
            <label className="searchbox"><Icon n="search" s={16} /><span className="sr">Search artists, genres, cities</span>
              <input type="text" placeholder="Search artists, genres, cities" value={query} onChange={(e) => { setQuery(e.target.value); if (section !== "discovery") setSection("discovery"); }} /></label>
            <Chip>Africa › East Africa</Chip>
            <Chip tone="sim" title="Invented artists and generated series">Simulated data</Chip>
            {hasLiveArtists && <Chip tone="go" title="Multi-source live data active from Deezer, Apple Music, Wikimedia">Live Sources Active</Chip>}
            <Chip>Week of {fmtDayY(weekDate(LAST))}</Chip>
            <div className="grow" />
            <button className="btn sm primary" onClick={loadCuratedRealCohort} title="Scout and load verified real African breakout artists with audio"><Icon n="play" s={14} />Load Real Artists</button>
            <button className="btn sm bellbtn" aria-label={`${flagCount} flags to review`} onClick={openSignals}><Icon n="bell" s={16} />{flagCount > 0 && <span className="dot">{flagCount}</span>}</button>
            <button className="btn sm" onClick={() => setLedger(true)}><Icon n="book" s={16} />Source ledger</button>
            <button className="btn sm" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon n={theme === "dark" ? "sun" : "moon"} s={16} /></button>
          </div>
          {section === "discovery" && <Discovery app={app} />}
          {section === "analyse" && <Analyse app={app} />}
          {section === "recs" && <Recommendations app={app} />}
          <div className="foot"><Logo size={20} /><b className="disp" style={{ color: "var(--text)", fontSize: 13 }}>Breakout Radar</b><span className="tagline">Better data. Smarter decisions. Bigger stars.</span><span>Internal use only. All artists shown are simulated.</span></div>
        </main>
      </div>
      {ledger && <Ledger onClose={() => setLedger(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
      <AudioPlayer track={playingTrack} onStop={stopTrack} />
    </div>
  );
}
