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
import React, { useState, useMemo, useEffect, useRef } from "react";

/* ───────────────────────── 1. Constants ───────────────────────── */

export const AS_OF = "2026-10-19"; // Monday of the review week
export const WEEKS = 26;
const LAST = WEEKS - 1;

export const PLATFORMS = {
  yt: { label: "YouTube", audLabel: "subscribers", actLabel: "weekly views", provider: "youtube" },
  dz: { label: "Deezer", audLabel: "fans", actLabel: null, provider: "deezer" },
  am: { label: "Audiomack", audLabel: "followers", actLabel: "weekly plays", provider: "soundcharts" },
  bp: { label: "Boomplay", audLabel: "followers", actLabel: "weekly plays", provider: "soundcharts" },
  ig: { label: "Instagram", audLabel: "followers", actLabel: "weekly reel views", provider: "first_party" },
};

/* Source ledger. Facts were checked on 21 Oct 2026; re-check before any contract or build decision. */
export const PROVIDERS = [
  {
    id: "musicbrainz", name: "MusicBrainz", status: "Live-capable", ml: "allowed",
    role: "Identity and catalogue metadata",
    facts: ["Open metadata. It holds no audience or popularity figures.", "Used to give each artist one canonical ID across platform handles."],
    note: "Identity only. Never a growth signal.",
  },
  {
    id: "youtube", name: "YouTube Data API v3", status: "Live-capable", ml: "verify",
    role: "Channel statistics, upload cadence, video engagement",
    facts: [
      "Default quota is 10,000 units per day per Google Cloud project.",
      "search.list costs 100 units. channels.list and videos.list cost 1 unit and take up to 50 IDs per call.",
      "Creating extra projects to multiply quota breaches the API terms.",
    ],
    note: "Use playlistItems and batched list calls for weekly tracking. Keep search for discovery only.",
  },
  {
    id: "deezer", name: "Deezer public API", status: "Live-capable", ml: "verify",
    role: "Artist fan counts",
    facts: ["Artist fan counts (nb_fan) are public and need no login.", "Third-party documentation reports about 50 requests per 5 seconds."],
    note: "Confirm Deezer's terms allow commercial analytics before relying on it.",
  },
  {
    id: "soundcharts", name: "Soundcharts", status: "Licence needed", ml: "verify",
    role: "Audiomack and Boomplay audience and plays, charts, radio airplay",
    facts: [
      "Lists Audiomack followers and plays, and Boomplay followers, plays and charts.",
      "Announced an Audiomack data partnership in December 2025, aimed at African coverage gaps.",
    ],
    note: "Get written confirmation that stored, derived data and ML training are permitted.",
  },
  {
    id: "chartmetric", name: "Chartmetric", status: "Licence needed", ml: "verify",
    role: "Cross-platform performance, Boomplay included",
    facts: ["Added Boomplay to its cross-platform performance metric (announced 2020)."],
    note: "Alternative or second vendor for cross-checking.",
  },
  {
    id: "first_party", name: "Artist-authorized exports", status: "Artist-authorized", ml: "allowed",
    role: "Audience, geography and retention data that public APIs do not expose",
    facts: ["Creator dashboards such as YouTube Studio and the Audiomack Creator App hold this data.", "Store the artist's written permission and the metric definitions with every import."],
    note: "Strongest rights position. Needs the artist's consent.",
  },
  {
    id: "spotify", name: "Spotify Web API", status: "Restricted", ml: "blocked",
    role: "Not used for scoring",
    facts: [
      "From the February 2026 changes, artist followers and popularity are no longer returned to Development Mode apps.",
      "Developer Terms v10 prohibit using Spotify content to train or feed machine-learning models.",
    ],
    note: "Blocked from every feature. Enforced in code, not just in policy.",
  },
  {
    id: "tiktok", name: "TikTok", status: "Not available", ml: "blocked",
    role: "Fan-content signal (unavailable)",
    facts: [
      "The Research API is limited to qualifying non-profit academics, is capped around 1,000 requests a day, and excludes commercial use.",
      "The Commercial Content API covers EU advertising data only.",
    ],
    note: "Use creator-authorized exports or a licensed vendor for fan-content data.",
  },
  {
    id: "deezer_ai", name: "Deezer AI-music detection", status: "Licence needed", ml: "allowed",
    role: "Synthetic-catalogue screening",
    facts: [
      "Licensable to the wider industry since January 2026.",
      "Deezer reported AI tracks at 44% of daily uploads in April 2026 and above 50% on peak days in June 2026.",
      "Deezer says up to 85% of streams on fully AI-generated tracks were fraudulent in 2025.",
    ],
    note: "Screening is no longer optional. The demo uses a simulated detector score.",
  },
  {
    id: "essentia", name: "Essentia", status: "Open tool", ml: "allowed",
    role: "Audio descriptors: key, tempo, loudness, pitch, voice activity",
    facts: ["Open-source audio analysis library with key and scale, tempo, EBU R128 loudness and pitch tools.", "Licensed under AGPLv3, with a proprietary licence available."],
    note: "Our caution: key profiles are tuned on mostly Western music. Check them on non-Western tonal systems.",
  },
];

/* ───────────────────────── 2. Math helpers ───────────────────────── */

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function gammaSample(r, shape) {
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = gauss(r); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = r();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const sum = (a) => a.reduce((x, y) => x + y, 0);
const mean = (a) => (a.length ? sum(a) / a.length : NaN);
function median(a) {
  const s = [...a].sort((x, y) => x - y), n = s.length;
  if (!n) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
const mad = (a) => { const m = median(a); return median(a.map((x) => Math.abs(x - m))); };
const stdev = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1)); };
function quantile(sorted, q) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
function entropyNorm(pairs) {
  const s = sum(pairs.map(([, v]) => v));
  let h = 0;
  for (const [, v] of pairs) { const p = v / s; if (p > 0) h -= p * Math.log(p); }
  return h / Math.log(pairs.length);
}

/* ───────────────────────── 3. Simulated universe ───────────────────────── */
/* Invented artists. Any resemblance to real people is coincidental. */

const ALL = ["yt", "dz", "am", "bp", "ig"];
const SPECS = [
  { id: "KE-0142", name: "Kito Mwende", country: "KE", city: "Nairobi", genre: "Afro-fusion", language: "Swahili / English",
    plat: { yt: [14200, .006], dz: [2300, .005], am: [5100, .007], bp: [2900, .006], ig: [21800, .005] },
    vpa: { yt: 3.0, am: 2.2, bp: 1.8, ig: 2.5 }, takeoff: { w: 19, boost: .055, on: ALL },
    eng: 41, topShare: .41, repeat: 4.4,
    geo: [["KE", .52], ["UG", .16], ["TZ", .13], ["NG", .06], ["US", .05], ["Other", .08]],
    geoPrev: [["KE", .62], ["UG", .12], ["TZ", .10], ["NG", .04], ["US", .04], ["Other", .08]],
    ugc: { c: 48, g: .045, top: .09 }, art: .82, synth: .03, dup: .04 },
  { id: "UG-0087", name: "Ayiko Boy", country: "UG", city: "Kampala", genre: "Luganda Afrobeats", language: "Luganda / English",
    plat: { yt: [9800, .007], dz: [1400, .006], am: [7400, .009], bp: [1800, .005], ig: [15400, .006] },
    vpa: { yt: 2.6, am: 2.9, bp: 1.4, ig: 2.2 }, takeoff: { w: 17, boost: .040, on: ALL },
    eng: 33, topShare: .55, repeat: 3.5,
    geo: [["UG", .58], ["KE", .14], ["TZ", .07], ["RW", .05], ["UK", .05], ["Other", .11]],
    geoPrev: [["UG", .62], ["KE", .12], ["TZ", .06], ["RW", .05], ["UK", .04], ["Other", .11]],
    ugc: { c: 35, g: .030, top: .14 }, art: .70, synth: .04, dup: .05 },
  { id: "TZ-0211", name: "Nuru Chande", country: "TZ", city: "Dar es Salaam", genre: "Bongo Flava", language: "Swahili",
    plat: { yt: [18700, .006], dz: [1100, .004], am: [3600, .006], bp: [5200, .008], ig: [26400, .005] },
    vpa: { yt: 3.4, am: 1.9, bp: 2.4, ig: 2.0 }, takeoff: { w: 17, boost: .012, on: ALL },
    eng: 36, topShare: .38, repeat: 4.1,
    geo: [["TZ", .66], ["KE", .12], ["UG", .05], ["RW", .03], ["ZA", .04], ["Other", .10]],
    geoPrev: [["TZ", .67], ["KE", .12], ["UG", .05], ["RW", .03], ["ZA", .04], ["Other", .09]],
    ugc: { c: 52, g: .012, top: .10 }, art: .76, synth: .02, dup: .03 },
  { id: "TZ-0230", name: "Mapema", country: "TZ", city: "Mwanza", genre: "Singeli", language: "Swahili", hidden: true,
    plat: { yt: [6100, .008], dz: [420, .004], am: [2100, .010], bp: [900, .006], ig: [11800, .012] },
    vpa: { yt: 4.0, am: 3.1, bp: 1.2, ig: 3.6 }, takeoff: { w: 22, boost: .070, on: ALL },
    eng: 29, topShare: .81, repeat: 2.7,
    geo: [["TZ", .78], ["KE", .08], ["UG", .03], ["RW", .02], ["UK", .03], ["Other", .06]],
    geoPrev: [["TZ", .82], ["KE", .07], ["UG", .03], ["RW", .02], ["UK", .02], ["Other", .04]],
    ugc: { c: 120, g: .080, top: .07 }, art: .68, synth: .03, dup: .06 },
  { id: "RW-0049", name: "Ineza Rugira", country: "RW", city: "Kigali", genre: "Afro-R&B", language: "Kinyarwanda / English",
    plat: { yt: [5200, .004], dz: [900, .003], am: [1700, .004], bp: [800, .003], ig: [9300, .004] },
    vpa: { yt: 2.4, am: 1.6, bp: 1.1, ig: 1.8 }, takeoff: null,
    eng: 52, topShare: .33, repeat: 5.2,
    geo: [["RW", .46], ["UG", .13], ["KE", .10], ["US", .10], ["UK", .08], ["Other", .13]],
    geoPrev: [["RW", .46], ["UG", .13], ["KE", .10], ["US", .10], ["UK", .08], ["Other", .13]],
    ugc: { c: 14, g: .006, top: .21 }, art: .90, synth: .02, dup: .02 },
  { id: "KE-0166", name: "Faida", country: "KE", city: "Nakuru", genre: "Gengetone", language: "Sheng / Swahili",
    plat: { yt: [8300, .005], dz: [600, .004], am: [3100, .006], bp: [700, .004], ig: [19000, .006] },
    vpa: { yt: 3.0, am: 2.0, bp: 1.0, ig: 2.4 }, spike: { w: 21, mag: 2.6, on: ["yt", "ig"], keep: .40, fade: 4 },
    eng: 22, engDrop: .38, topShare: .72, repeat: 2.1,
    geo: [["KE", .34], ["US", .21], ["UK", .17], ["DE", .10], ["FR", .08], ["Other", .10]],
    geoPrev: [["KE", .71], ["US", .08], ["UK", .06], ["DE", .03], ["FR", .02], ["Other", .10]],
    ugc: { c: 20, g: .0, top: .55 }, art: .45, synth: .08, dup: .10 },
  { id: "KE-0171", name: "Pwani Static", country: "KE", city: "Mombasa", genre: "Coastal electronic", language: "Swahili / English",
    plat: { yt: [3900, .006], dz: [700, .005], am: [1800, .007], bp: [1300, .005], ig: [6200, .006] },
    vpa: { yt: 2.8, am: 2.0, bp: 1.5, ig: 2.1 }, takeoff: { w: 20, boost: .020, on: ALL },
    eng: 44, topShare: .36, repeat: 3.9,
    geo: [["KE", .57], ["TZ", .14], ["UK", .08], ["US", .07], ["DE", .06], ["Other", .08]],
    geoPrev: [["KE", .59], ["TZ", .13], ["UK", .08], ["US", .07], ["DE", .06], ["Other", .07]],
    ugc: { c: 9, g: .010, top: .30 }, art: .64, synth: .05, dup: .04 },
  { id: "UG-0102", name: "Lwanga Beats", country: "UG", city: "Kampala", genre: "Kidandali", language: "Luganda",
    plat: { yt: [12400, .005], dz: [900, .004], am: [4400, .006], bp: [1500, .004], ig: [30100, .006] },
    vpa: { yt: 2.9, am: 2.2, bp: 1.2, ig: 2.6 }, ads: { w: 19, len: 4, lift: .065, on: ["yt", "ig"] },
    eng: 34, topShare: .60, repeat: 2.9,
    geo: [["UG", .72], ["KE", .08], ["TZ", .05], ["RW", .04], ["UK", .03], ["Other", .08]],
    geoPrev: [["UG", .73], ["KE", .08], ["TZ", .05], ["RW", .04], ["UK", .03], ["Other", .07]],
    ugc: { c: 25, g: .0, top: .33 }, art: .55, synth: .04, dup: .06 },
  { id: "NG-0310", name: "Kelechi Vane", country: "NG", city: "Enugu", genre: "Afro-soul", language: "English / Igbo", hidden: true,
    plat: { yt: [22400, .006], dz: [2600, .005], am: [5800, .007], bp: [6900, .008], ig: [34200, .006] },
    vpa: { yt: 3.1, am: 2.0, bp: 2.2, ig: 2.4 }, takeoff: { w: 18, boost: .020, on: ALL },
    eng: 40, topShare: .45, repeat: 4.0,
    geo: [["NG", .41], ["US", .18], ["UK", .16], ["GH", .07], ["ZA", .05], ["Other", .13]],
    geoPrev: [["NG", .43], ["US", .17], ["UK", .15], ["GH", .07], ["ZA", .05], ["Other", .13]],
    ugc: { c: 40, g: .020, top: .12 }, art: .78, synth: .03, dup: .03 },
  { id: "GH-0123", name: "Efua Sarr", country: "GH", city: "Accra", genre: "Highlife-pop", language: "English / Twi",
    plat: { yt: [11100, .004], dz: [1700, .004], am: [2900, .005], bp: [1400, .004], ig: [17800, .004] },
    vpa: { yt: 2.5, am: 1.8, bp: 1.3, ig: 2.0 }, takeoff: null,
    eng: 37, topShare: .40, repeat: 3.8,
    geo: [["GH", .52], ["NG", .12], ["UK", .12], ["US", .09], ["KE", .04], ["Other", .11]],
    geoPrev: [["GH", .52], ["NG", .12], ["UK", .12], ["US", .09], ["KE", .04], ["Other", .11]],
    ugc: { c: 18, g: .004, top: .18 }, art: .72, synth: .02, dup: .03 },
  { id: "ZA-0275", name: "Thando Mvuyo", country: "ZA", city: "Durban", genre: "Amapiano", language: "Zulu / English",
    plat: { yt: [27000, .008], dz: [3900, .006], am: [9100, .010], bp: [2100, .007], ig: [48000, .008] },
    vpa: { yt: 3.2, am: 2.6, bp: 1.4, ig: 2.8 }, takeoff: { w: 19, boost: .075, on: ALL },
    eng: 27, topShare: .66, repeat: 2.8,
    geo: [["ZA", .60], ["ZW", .08], ["BW", .06], ["NG", .05], ["UK", .07], ["Other", .14]],
    geoPrev: [["ZA", .62], ["ZW", .08], ["BW", .06], ["NG", .05], ["UK", .06], ["Other", .13]],
    ugc: { c: 210, g: .040, top: .06 }, art: .58, synth: .06, dup: .08 },
  { id: "KE-0188", name: "Kilele", country: "KE", city: "Eldoret", genre: "Gospel-Afro", language: "Swahili",
    plat: { yt: [4200, .007], dz: [380, .006] },
    vpa: { yt: 3.4 }, takeoff: { w: 20, boost: .020, on: ["yt", "dz"] },
    eng: 47, topShare: .50, repeat: 3.3,
    geo: [["KE", .80], ["UG", .07], ["TZ", .04], ["US", .03], ["UK", .02], ["Other", .04]],
    geoPrev: [["KE", .81], ["UG", .07], ["TZ", .04], ["US", .03], ["UK", .02], ["Other", .03]],
    ugc: null, art: .66, synth: .03, dup: .03 },
  { id: "KE-0199", name: "Savanna Loop", country: "KE", city: "Nairobi", genre: "Afro-chill", language: "Instrumental", instrumental: true,
    plat: { yt: [15600, .011], dz: [2900, .010], am: [6200, .010], bp: [2400, .009], ig: [4100, .008] },
    vpa: { yt: 1.2, am: .9, bp: .8, ig: .7 }, takeoff: null,
    eng: 6, topShare: .18, repeat: 1.4,
    geo: [["KE", .18], ["US", .30], ["DE", .14], ["BR", .12], ["UK", .12], ["Other", .14]],
    geoPrev: [["KE", .19], ["US", .29], ["DE", .14], ["BR", .12], ["UK", .12], ["Other", .14]],
    ugc: null, art: .35, synth: .86, dup: .44 },
  { id: "UG-0120", name: "Tau Mirembe", country: "UG", city: "Kampala", genre: "Afro-pop", language: "Luganda / English", hidden: true,
    plat: { yt: [3100, .005], dz: [520, .005], am: [2600, .008], bp: [800, .004], ig: [7400, .006] },
    vpa: { yt: 3.0, am: 2.4, bp: 1.2, ig: 2.2 }, takeoff: { w: 15, boost: .028, on: ALL },
    eng: 49, topShare: .39, repeat: 4.6,
    geo: [["UG", .60], ["KE", .11], ["RW", .07], ["TZ", .05], ["UK", .06], ["Other", .11]],
    geoPrev: [["UG", .63], ["KE", .10], ["RW", .06], ["TZ", .05], ["UK", .06], ["Other", .10]],
    ugc: { c: 22, g: .035, top: .11 }, art: .74, synth: .02, dup: .03 },
];

const KEYS = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const BPM = { "Afro-fusion": 104, "Luganda Afrobeats": 102, "Bongo Flava": 98, Singeli: 186, "Afro-R&B": 88, Gengetone: 116,
  "Coastal electronic": 118, Kidandali: 100, "Afro-soul": 92, "Highlife-pop": 106, Amapiano: 112, "Gospel-Afro": 96, "Afro-chill": 84, "Afro-pop": 108 };

function genAudio(spec, rng) {
  const art = spec.art, inst = !!spec.instrumental;
  return {
    key: KEYS[Math.floor(rng() * 12)], mode: rng() < 0.55 ? "minor" : "major",
    keyStrength: +clamp(0.5 + 0.35 * art + 0.06 * gauss(rng), 0.4, 0.95).toFixed(2),
    bpm: Math.round((BPM[spec.genre] || 100) + (rng() - 0.5) * 8),
    lufs: +(-8.5 - rng() * 4.5 - (1 - art) * 1.5).toFixed(1),
    pitchDev: inst ? null : Math.round(clamp(38 - 26 * art + 4 * gauss(rng), 6, 45)),
    vocalRange: inst ? null : Math.round(clamp(10 + 13 * art + 1.5 * gauss(rng), 8, 26)),
    hook: +clamp(0.3 + 0.35 * art + 0.05 * gauss(rng), 0.15, 0.85).toFixed(2),
    lyricDiv: inst ? null : +clamp(0.27 + 0.24 * art + 0.03 * gauss(rng), 0.2, 0.6).toFixed(2),
  };
}

function buildArtist(spec) {
  const rng = mulberry32(hashStr(spec.id));
  const series = {};
  for (const p of Object.keys(spec.plat)) {
    const [b, g] = spec.plat[p];
    const aud = [];
    let level = b * (0.8 + 0.1 * rng());
    for (let t = 0; t < WEEKS; t++) {
      let growth = g + 0.006 * gauss(rng);
      if (spec.takeoff && t >= spec.takeoff.w && spec.takeoff.on.includes(p)) growth += spec.takeoff.boost * (0.85 + 0.3 * rng());
      if (spec.ads && t >= spec.ads.w && t < spec.ads.w + spec.ads.len && spec.ads.on.includes(p)) growth += spec.ads.lift * (0.85 + 0.3 * rng());
      level *= Math.exp(growth);
      if (spec.spike && spec.spike.on.includes(p)) {
        const s = spec.spike;
        if (t === s.w) level *= 1 + s.mag;
        else if (t > s.w && t <= s.w + s.fade) level *= Math.pow((1 + s.mag * s.keep) / (1 + s.mag), 1 / s.fade);
      }
      aud.push(Math.max(1, Math.round(level)));
    }
    const v = spec.vpa && spec.vpa[p];
    const act = v ? aud.map((a) => Math.round(a * v * Math.exp(0.1 * gauss(rng)))) : null;
    series[p] = { aud, act };
  }
  const engagement = [];
  for (let t = 0; t < WEEKS; t++) {
    let e = spec.eng * (1 + 0.07 * gauss(rng));
    if (spec.spike && t >= spec.spike.w && t <= spec.spike.w + spec.spike.fade) e *= spec.engDrop || 0.4;
    engagement.push(+e.toFixed(1));
  }
  const ugcSeries = spec.ugc
    ? Array.from({ length: WEEKS }, (_, t) => Math.max(1, Math.round(spec.ugc.c * Math.exp(spec.ugc.g * (t - LAST) + 0.07 * gauss(rng)))))
    : null;
  return { ...spec, series, engagement, ugcSeries, audio: genAudio(spec, rng), measured: true, hidden: !!spec.hidden };
}

export function buildUniverse() { return SPECS.map(buildArtist); }

/* Reviewers and seeded demo reviews (simulated). Order: song, voc, key, prod, orig, live, cat, auth */
export const REVIEWERS = [
  { id: "amina", name: "Amina", role: "Scout" },
  { id: "daniel", name: "Daniel", role: "Analyst" },
  { id: "grace", name: "Grace", role: "Head of A&R" },
];
const D = ["song", "voc", "key", "prod", "orig", "live", "cat", "auth"];
const mk = (arr, notes) => ({ scores: Object.fromEntries(D.map((k, i) => [k, arr[i]])), notes, at: "2026-10-12", seeded: true });
export const SEED_REVIEWS = {
  "KE-0142": { amina: mk([4.5, 4, 4, 3.5, 4.5, 4, 3.5, 5], "Hooks land on first listen. Swahili wordplay is natural, not forced."), daniel: mk([4, 4.5, 4, 3.5, 4, 3.5, 4, 4.5], "Mix is a little thin on low end. Songwriting carries it.") },
  "UG-0087": { amina: mk([3.5, 4, 3.5, 3.5, 3.5, 4.5, 3, 4.5], "Strong live energy. Catalogue leans on one formula.") },
  "TZ-0211": { daniel: mk([4, 4.5, 4, 4, 3.5, 4, 4, 4], "Controlled vocal, consistent across releases."), grace: mk([3.5, 4, 3.5, 4, 3, 3.5, 4, 4.5], "Polished but close to the genre template.") },
  "RW-0049": { amina: mk([5, 4.5, 4.5, 4, 4.5, 3.5, 4.5, 4.5], "Exceptional writing. Audience is still small."), grace: mk([4.5, 5, 4.5, 4, 4.5, 4, 4, 5], "Rare vocal control. Needs a bigger stage and a plan.") },
  "NG-0310": { daniel: mk([4, 4, 4, 3.5, 3.5, 3.5, 3.5, 4], "Warm voice, good arrangements. Not yet distinctive.") },
  "ZA-0275": { amina: mk([3, 3.5, 3, 4, 2.5, 4, 3, 3.5], "Great groove, but sits inside a crowded sound.") },
  "UG-0102": { daniel: mk([3, 3, 3, 3.5, 2.5, 4, 2.5, 3.5], "Crowd-pleaser. Songs blur together.") },
};
export const SEED_WATCH = ["KE-0142", "UG-0087", "TZ-0211", "RW-0049", "ZA-0275", "UG-0102", "KE-0166"];

/* ───────────────────────── 4. Engine ───────────────────────── */
/* Every function takes a cutoff week T and reads only data up to T (point-in-time). */

export const FEATURES = [
  { key: "growth", label: "Growth vs peers (4 weeks)", w: 0.28, note: "Four-week change in a blended audience index, compared with the peer median." },
  { key: "accel", label: "Acceleration", w: 0.14, note: "Is the last four weeks faster than the four before?" },
  { key: "breadth", label: "Cross-platform breadth", w: 0.12, note: "Share of platforms growing at the same time. Single-platform jumps score low." },
  { key: "catalogue", label: "Catalogue depth", w: 0.12, note: "One minus the share of demand held by the top track." },
  { key: "engagement", label: "Engagement quality", w: 0.12, note: "Likes and comments per 1,000 views, last four weeks." },
  { key: "geo", label: "Market breadth", w: 0.08, note: "Spread of listeners across countries, and whether it is widening." },
  { key: "ugc", label: "Fan-content pulse", w: 0.08, note: "Growth and diversity of creators making content with the artist's music." },
  { key: "repeat", label: "Repeat listening", w: 0.06, note: "Plays per listener, a proxy for depth of fandom." },
];

export function blendedIndex(a, T) {
  const ps = Object.keys(a.series), out = [];
  for (let t = 0; t <= T; t++) {
    let s = 0;
    for (const p of ps) s += Math.log(a.series[p].aud[t] / a.series[p].aud[0]);
    out.push(100 * Math.exp(s / ps.length));
  }
  return out;
}

function surgeRuns(aud, T) {
  const lg = [null];
  for (let t = 1; t <= T; t++) lg.push(Math.log(aud[t] / aud[t - 1]));
  const hist = lg.slice(1);
  const med = median(hist), scale = Math.max(1.4826 * mad(hist), 0.004);
  const runs = [];
  let cur = null;
  for (let t = 1; t <= T; t++) {
    const z = (lg[t] - med) / scale;
    if (z > 3.5 && lg[t] > 0.03) {
      if (cur && cur.end === t - 1) { cur.end = t; cur.lgs.push(lg[t]); }
      else { cur = { start: t, end: t, lgs: [lg[t]] }; runs.push(cur); }
    }
  }
  // a lone week must be a big jump; otherwise it is noise on a small platform
  return { runs: runs.filter((r) => r.end > r.start || r.lgs[0] > 0.1), lg };
}

const pctS = (x, d = 0) => `${(x * 100).toFixed(d)}%`;

export const INTEGRITY_LABEL = {
  clear: "Clear",
  paid: "Probable paid promotion",
  review: "Needs integrity review",
  synthetic: "Synthetic-catalogue risk",
};

/* Flags for a human to check. Paid promotion is not misconduct and is never penalised as such. */
export function screen(a, T, ctx = {}) {
  const signals = [];
  let status = "clear";
  const rank = { clear: 0, paid: 1, review: 2, synthetic: 3 };
  const raise = (s) => { if (rank[s] > rank[status]) status = s; };
  const ps = Object.keys(a.series);

  if (a.synth >= 0.6) {
    raise("synthetic");
    signals.push({ sev: "high", text: `Audio screen (simulated detector): ${pctS(a.synth)} likelihood the catalogue is machine-generated, and ${pctS(a.dup)} of top tracks are near-duplicates. Confirm a human artist exists before any spend.` });
  }

  const byPlat = {};
  for (const p of ps) { const r = surgeRuns(a.series[p].aud, T); if (r.runs.length) byPlat[p] = r; }
  const surgePlats = Object.keys(byPlat);
  const markers = [];
  if (surgePlats.length) {
    const breadth = surgePlats.length / ps.length;
    const first = Math.min(...surgePlats.map((p) => byPlat[p].runs[0].start));
    const last = Math.max(...surgePlats.map((p) => byPlat[p].runs[byPlat[p].runs.length - 1].end));
    if (breadth >= 0.6 && surgePlats.length >= 2) {
      signals.push({ sev: "info", text: `Growth surge is broad-based: ${surgePlats.length} of ${ps.length} platforms rose together. This is the pattern organic breakouts usually show.` });
      markers.push({ i: first, kind: "surge", label: "Broad surge" });
    } else {
      const lbl = surgePlats.map((p) => PLATFORMS[p].label).join(" and ");
      let verdict = "pending", text = "";
      for (const p of surgePlats) {
        const aud = a.series[p].aud;
        for (const run of byPlat[p].runs) {
          const gain = Math.exp(Math.log(aud[run.end] / aud[run.start - 1])) - 1;
          const len = run.end - run.start + 1;
          const post = T - run.end >= 3 ? aud[Math.min(T, run.end + 4)] / aud[run.end] : null;
          const postL = [];
          for (let t = run.end + 1; t <= Math.min(T, run.end + 3); t++) postL.push(byPlat[p].lg[t]);
          const postRate = postL.length >= 3 ? mean(postL) : null;
          const inRate = mean(run.lgs);
          const engBefore = median(a.engagement.slice(Math.max(0, run.start - 6), run.start));
          const engDuring = median(a.engagement.slice(run.start, Math.min(T, run.end) + 1));
          const engRatio = engBefore > 0 ? engDuring / engBefore : 1;
          if (engRatio < 0.6 || (post != null && post < 0.75)) {
            verdict = "review";
            text = `Surge on ${lbl}: +${Math.round(gain * 100)}% in ${len} week${len > 1 ? "s" : ""} while the other platforms stayed flat. ${post != null ? `Only ${pctS(post)} of that audience level remained four weeks later. ` : ""}Engagement per 1,000 views ran at ${pctS(engRatio)} of its prior level.`;
          } else if (verdict !== "review" && len >= 3 && postRate != null && postRate / inRate < 0.35 && engRatio >= 0.8) {
            verdict = "paid";
            text = `Growth on ${lbl} ran well above normal for ${len} weeks, then returned to its old pace. Engagement held steady. This matches a time-boxed campaign. Confirm with the artist's team.`;
          } else if (verdict === "pending") {
            text = `Surge on ${lbl} (+${Math.round(gain * 100)}% in ${len} week${len > 1 ? "s" : ""}). Too early to tell a campaign from organic pickup. Re-check next week.`;
          }
          markers.push({ i: run.start, kind: verdict === "review" ? "risk" : verdict === "paid" ? "paid" : "surge", label: verdict === "paid" ? "Campaign window" : verdict === "review" ? "Spike" : "Surge" });
        }
      }
      if (verdict === "review") raise("review");
      else if (verdict === "paid") raise("paid");
      signals.push({ sev: verdict === "review" ? "high" : verdict === "paid" ? "info" : "low", text });
      void last;
    }
  }

  const homeNow = a.geo[0][1], homePrev = a.geoPrev[0][1];
  // geography is a latest-week snapshot in this demo, so it is only checked at the latest cutoff
  if (T === LAST && homePrev - homeNow > 0.25) {
    raise("review");
    signals.push({ sev: "high", text: `The audience's home-market share fell from ${pctS(homePrev)} to ${pctS(homeNow)} in four weeks. Check where the new listeners come from.` });
  }
  const engNow = median(a.engagement.slice(T - 3, T + 1));
  if (ctx.peerEng && engNow < 0.4 * ctx.peerEng) {
    signals.push({ sev: "medium", text: `Engagement per 1,000 views is ${pctS(engNow / ctx.peerEng)} of the peer median. Large audiences with little reaction deserve a closer look.` });
  }
  const seen = new Set();
  const uniq = markers.filter((m) => { const k = m.kind + m.i; if (seen.has(k)) return false; seen.add(k); return true; });
  return { status, label: INTEGRITY_LABEL[status], held: status === "review" || status === "synthetic", signals, markers: uniq };
}

export function rawFeatures(a, T) {
  const B = blendedIndex(a, T);
  const g4 = Math.log(B[T] / B[T - 4]);
  const g4p = Math.log(B[T - 4] / B[T - 8]);
  const ps = Object.keys(a.series);
  const pos = ps.filter((p) => Math.log(a.series[p].aud[T] / a.series[p].aud[T - 4]) > 0.02).length;
  const hN = entropyNorm(a.geo), hP = entropyNorm(a.geoPrev);
  return {
    growth: g4,
    accel: g4 - g4p,
    breadth: pos / ps.length,
    catalogue: 1 - a.topShare,
    engagement: median(a.engagement.slice(T - 3, T + 1)),
    geo: 0.7 * hN + 0.3 * clamp(0.5 + (hN - hP) * 5, 0, 1),
    ugc: a.ugcSeries ? Math.log(a.ugcSeries[T] / a.ugcSeries[T - 4]) + 0.8 * (1 - a.ugc.top) : null,
    repeat: a.repeat,
    _g4: g4,
  };
}

/* Peer-relative scoring. Robust z-scores against the cohort, shrunk toward 50 by evidence coverage. */
export function scoreUniverse(artists, T = LAST, draws = 0, seed = 7) {
  const live = artists.filter((a) => a.series);
  const raws = new Map(live.map((a) => [a.id, rawFeatures(a, T)]));
  const stats = {};
  for (const f of FEATURES) {
    const vals = [...raws.values()].map((r) => r[f.key]).filter((v) => v != null && isFinite(v));
    stats[f.key] = { med: median(vals), scale: Math.max(1.4826 * mad(vals), 0.6 * stdev(vals), 1e-6) };
  }
  const peerEng = median([...raws.values()].map((r) => r.engagement));
  const byId = new Map();
  for (const a of live) {
    const r = raws.get(a.id);
    const sc = {};
    let wAvail = 0, acc = 0;
    for (const f of FEATURES) {
      const v = r[f.key];
      if (v == null || !isFinite(v)) { sc[f.key] = null; continue; }
      sc[f.key] = 100 * phi(clamp((v - stats[f.key].med) / stats[f.key].scale, -2.5, 2.5));
      wAvail += f.w; acc += f.w * sc[f.key];
    }
    const rawScore = wAvail ? acc / wAvail : null;
    const platCov = Object.keys(a.series).length / Object.keys(PLATFORMS).length;
    const evidence = wAvail * (0.4 + 0.6 * platCov) * Math.min(1, (T + 1) / 12);
    const idx = rawScore == null ? null : 50 + evidence * (rawScore - 50);
    const contributions = FEATURES.filter((f) => sc[f.key] != null).map((f) => ({
      key: f.key, label: f.label, score: sc[f.key], value: evidence * (f.w / wAvail) * (sc[f.key] - 50),
    }));
    const B = blendedIndex(a, T);
    byId.set(a.id, {
      id: a.id, T, measured: true, raw: r, scores: sc, evidence, idx, lo: idx, hi: idx, stability: null,
      contributions, integrity: screen(a, T, { peerEng }),
      growth4: r._g4, growthVsPeers: r._g4 - stats.growth.med, B,
      rank: null, comps: [],
    });
  }
  const eligible = [...byId.values()].filter((s) => s.idx != null && !s.integrity.held).sort((x, y) => y.idx - x.idx);
  eligible.forEach((s, i) => { s.rank = i + 1; });

  // comparables: cosine similarity on centred feature scores
  const vec = (s) => FEATURES.map((f) => (s.scores[f.key] == null ? 0 : s.scores[f.key] - 50));
  const cos = (u, v) => { const d = Math.sqrt(sum(u.map((x) => x * x)) * sum(v.map((x) => x * x))); return d ? sum(u.map((x, i) => x * v[i])) / d : 0; };
  for (const s of byId.values()) {
    const v = vec(s);
    s.comps = [...byId.values()].filter((o) => o.id !== s.id).map((o) => ({ id: o.id, sim: cos(v, vec(o)) })).sort((x, y) => y.sim - x.sim).slice(0, 3);
  }
  if (draws > 0 && eligible.length) monteCarlo(eligible, draws, seed);
  return { byId, stats, T, peerEng, eligibleIds: eligible.map((s) => s.id) };
}

/* Rank stability: re-draw feature weights (Dirichlet) and feature noise, then re-rank. Not a probability of success. */
function monteCarlo(eligible, draws, seed) {
  const rng = mulberry32(seed);
  const K = 60;
  const W0 = FEATURES.map((f) => f.w);
  const store = new Map(eligible.map((s) => [s.id, []]));
  const top3 = new Map(eligible.map((s) => [s.id, 0]));
  for (let d = 0; d < draws; d++) {
    const g = W0.map((w) => gammaSample(rng, w * K));
    const tot = sum(g);
    const w = g.map((x) => x / tot);
    const vals = eligible.map((s) => {
      let wa = 0, ac = 0;
      FEATURES.forEach((f, i) => {
        const v = s.scores[f.key];
        if (v == null) return;
        const noisy = clamp(v + (4 + 14 * (1 - s.evidence)) * gauss(rng), 0, 100);
        wa += w[i]; ac += w[i] * noisy;
      });
      return { id: s.id, idx: wa ? 50 + s.evidence * (ac / wa - 50) : 50 };
    });
    for (const x of vals) store.get(x.id).push(x.idx);
    vals.sort((x, y) => y.idx - x.idx).slice(0, 3).forEach((x) => top3.set(x.id, top3.get(x.id) + 1));
  }
  for (const s of eligible) {
    const arr = store.get(s.id).sort((x, y) => x - y);
    s.lo = quantile(arr, 0.05); s.hi = quantile(arr, 0.95);
    s.stability = top3.get(s.id) / draws;
  }
}

export function peerMedianSeries(artists, T) {
  const bs = artists.filter((a) => a.series).map((a) => blendedIndex(a, T));
  return Array.from({ length: T + 1 }, (_, t) => median(bs.map((b) => b[t])));
}

/* ───────── Artistic quality (human-led) ───────── */

export const RUBRIC = [
  { key: "song", label: "Songwriting", w: 0.20, hint: "Melody, lyrics, hook craft, structure", lo: "Derivative", hi: "Memorable and original" },
  { key: "voc", label: "Vocals", w: 0.16, hint: "Tone, pitch control, range, delivery", lo: "Unsteady", hi: "Distinctive and controlled" },
  { key: "key", label: "Key and harmony", w: 0.10, hint: "Tonal choices, stability, harmonic interest", lo: "Static", hi: "Confident and interesting" },
  { key: "prod", label: "Production", w: 0.10, hint: "Mix clarity, loudness, arrangement", lo: "Muddy", hi: "Release-ready" },
  { key: "orig", label: "Originality", w: 0.16, hint: "A recognisable identity within the genre", lo: "Template", hi: "Unmistakable" },
  { key: "live", label: "Live presence", w: 0.10, hint: "Stage energy and consistency", lo: "Flat", hi: "Commanding" },
  { key: "cat", label: "Catalogue depth", w: 0.08, hint: "Repeatability across songs", lo: "One-song artist", hi: "Strong across the catalogue" },
  { key: "auth", label: "Cultural authenticity", w: 0.10, hint: "Language, idiom, rootedness, audience resonance", lo: "Borrowed", hi: "Rooted and resonant" },
];

const complete = (r) => r && r.scores && RUBRIC.every((d) => typeof r.scores[d.key] === "number");
export const rubricValue = (scores) => 100 * sum(RUBRIC.map((d) => d.w * (scores[d.key] - 1) / 4));

export function artisticValue(revs) {
  const done = Object.entries(revs || {}).filter(([, r]) => complete(r));
  if (!done.length) return { value: null, reviewers: 0, agreement: null, perDim: {}, each: [] };
  const each = done.map(([id, r]) => ({ id, value: rubricValue(r.scores), notes: r.notes, at: r.at, seeded: !!r.seeded }));
  const perDim = Object.fromEntries(RUBRIC.map((d) => [d.key, mean(done.map(([, r]) => r.scores[d.key]))]));
  let agreement = null;
  if (done.length > 1) {
    const spread = mean(RUBRIC.map((d) => { const v = done.map(([, r]) => r.scores[d.key]); return Math.max(...v) - Math.min(...v); }));
    agreement = { spread, label: spread <= 0.5 ? "High" : spread <= 1 ? "Moderate" : "Low" };
  }
  return { value: mean(each.map((e) => e.value)), reviewers: done.length, agreement, perDim, each };
}

/* ───────── Recommendation logic ───────── */

export const TIERS = {
  pursue: { label: "Pursue now", tone: "go", rankOrder: 1 },
  "pursue-2nd": { label: "Pursue after a second review", tone: "go", rankOrder: 2 },
  develop: { label: "Develop first", tone: "info", rankOrder: 3 },
  momentum: { label: "Watch: momentum without artistry", tone: "warn", rankOrder: 4 },
  provisional: { label: "Provisional: thin evidence", tone: "warn", rankOrder: 5 },
  "needs-review": { label: "Needs artistic review", tone: "warn", rankOrder: 6 },
  hold: { label: "Hold: integrity", tone: "risk", rankOrder: 7 },
  pass: { label: "Pass for now", tone: "mute", rankOrder: 8 },
  pending: { label: "Awaiting measurement", tone: "mute", rankOrder: 9 },
};
export const MOMENTUM_BAR = 55;
export const ARTISTRY_BAR = 65;
export const EVIDENCE_BAR = 0.6;

export function recommend(sc, art) {
  if (!sc || sc.idx == null) return { tier: "pending", pick: null, momentum: null, why: "No measurements yet. Identity is verified; audience data is pending." };
  const paid = sc.integrity.status === "paid";
  const momentum = paid ? 50 + 0.6 * (sc.idx - 50) : sc.idx;
  const base = { momentum, paid, quadrant: null };
  if (sc.integrity.held) return { ...base, tier: "hold", pick: null, why: sc.integrity.status === "synthetic" ? "The catalogue shows machine-generation signals. A human must confirm the artist is real before anything else." : "Integrity signals need a human decision before this artist can be ranked." };
  if (!art || art.reviewers === 0) return { ...base, tier: "needs-review", pick: null, why: "The data looks interesting, but nobody has scored the music yet. Artistry decides this one." };
  const pick = 0.5 * momentum + 0.5 * art.value;
  const hiM = momentum >= MOMENTUM_BAR, hiA = art.value >= ARTISTRY_BAR;
  const quadrant = hiM && hiA ? "hh" : !hiM && hiA ? "ha" : hiM && !hiA ? "hm" : "ll";
  if (sc.evidence < EVIDENCE_BAR) return { ...base, quadrant, tier: "provisional", pick, why: "Evidence coverage is below the bar. Connect more sources before any commitment." };
  if (quadrant === "hh") return { ...base, quadrant, tier: art.reviewers >= 2 ? "pursue" : "pursue-2nd", pick, why: art.reviewers >= 2 ? "Strong momentum and strong artistry, confirmed by two reviewers." : "Strong on both counts, but signing needs a second independent artistic review." };
  if (quadrant === "ha") return { ...base, quadrant, tier: "develop", pick, why: "The music is strong and the audience is early. A development deal or release plan fits better than a bidding race." };
  if (quadrant === "hm") return { ...base, quadrant, tier: "momentum", pick, why: "The numbers are moving, but reviewers rate the music below the bar. Attention may not turn into loyalty." };
  return { ...base, quadrant, tier: "pass", pick, why: "Neither momentum nor artistry clears the bar this week." };
}

export function checklist(sc, art, rec) {
  const items = [];
  if (art && art.reviewers < 2) items.push("Second independent artistic review");
  if (sc && sc.integrity.status === "paid") items.push("Confirm the paid campaign with the artist's team");
  if (sc && sc.integrity.held) items.push("Resolve the integrity flag with evidence");
  if (sc && sc.evidence < EVIDENCE_BAR) items.push("Connect more sources and re-score next Monday");
  items.push("Verify identity and who owns the masters and publishing");
  if (rec && (rec.tier === "pursue" || rec.tier === "pursue-2nd" || rec.tier === "develop")) items.push("Live audition or listening session");
  return items;
}

export function whySurfaced(a, sc) {
  if (!sc || sc.idx == null) return "Identity is verified. Audience measurements are pending, so no score is shown.";
  const gv = sc.growthVsPeers * 100, g4 = (Math.exp(sc.growth4) - 1) * 100;
  const ps = Object.keys(a.series);
  const pos = ps.filter((p) => a.series[p].aud[sc.T] / a.series[p].aud[sc.T - 4] > 1.02).length;
  const sorted = [...sc.contributions].sort((x, y) => y.value - x.value);
  const top = sorted.slice(0, 2).filter((c) => c.value > 0.5).map((c) => c.label.toLowerCase());
  const low = sorted.slice(-1).filter((c) => c.value < -0.5).map((c) => c.label.toLowerCase());
  const accel = sc.raw.accel;
  let s = `${a.name}'s blended audience moved ${g4 >= 0 ? "+" : ""}${g4.toFixed(1)}% over four weeks, ${Math.abs(gv).toFixed(1)} points ${gv >= 0 ? "above" : "below"} the peer median`;
  s += accel > 0.01 ? " and is speeding up." : accel < -0.01 ? " but is slowing." : ", at a steady pace.";
  s += ` Growth shows on ${pos} of ${ps.length} platforms.`;
  if (top.length) s += ` Strongest drivers: ${top.join(" and ")}.`;
  if (low.length) s += ` Weakest area: ${low[0]}.`;
  if (sc.evidence < EVIDENCE_BAR) s += ` Evidence coverage is only ${pctS(sc.evidence)}, so treat this as a lead, not a finding.`;
  return s;
}

export function buildMemo({ week, rows, capacity }) {
  const lines = [`# A&R board memo, week of ${week}`, "", "_Simulated data. Rankings come from an unvalidated, expert-weighted model._", ""];
  const picks = rows.filter((r) => r.recommended);
  lines.push(`## Recommended picks (capacity ${capacity})`, "");
  if (!picks.length) lines.push("No artist clears the bar this week. Not filling slots on purpose.", "");
  for (const r of picks) {
    lines.push(`### ${r.a.name} (${r.a.city}, ${r.a.genre})`, `- Verdict: ${TIERS[r.rec.tier].label}`, `- Pick score ${r.rec.pick.toFixed(0)}; momentum ${r.rec.momentum.toFixed(0)}; artistic value ${r.art.value.toFixed(0)} from ${r.art.reviewers} reviewer(s)`, `- Why: ${r.rec.why}`, `- Before signing: ${r.list.join("; ")}`, "");
  }
  const rest = rows.filter((r) => !r.recommended);
  if (rest.length) { lines.push("## Everyone else", ""); for (const r of rest) lines.push(`- ${r.a.name}: ${TIERS[r.rec.tier].label}. ${r.rec.why}`); }
  return lines.join("\n");
}

/* ───────── Portfolio helpers (derived only from scored data, never invented) ───────── */

export function totalAudience(a, T = LAST) { return sum(Object.values(a.series).map((s) => s.aud[T])); }

export function marketMovers(artists, scores) {
  const by = {};
  for (const a of artists) {
    const s = a.series && scores.byId.get(a.id);
    if (!s) continue;
    if (!by[a.city]) by[a.city] = { city: a.city, country: a.country, items: [] };
    by[a.city].items.push({ a, s });
  }
  return Object.values(by).map((g0) => {
    const g = { ...g0, items: g0.items.filter((x) => !x.s.integrity.held) }; // held artists never inflate a market's growth
    if (!g.items.length) return null;
    const n = g.items.length;
    const len = Math.min(...g.items.map((x) => x.s.B.length));
    const series = Array.from({ length: 12 }, (_, k) => mean(g.items.map((x) => x.s.B[len - 12 + k])));
    return { city: g.city, country: g.country, n, growth: median(g.items.map((x) => x.s.growth4)), series, flagged: g0.items.length - g.items.length };
  }).filter(Boolean).sort((x, y) => y.growth - x.growth);
}

export function integritySplit(artists, scores) {
  const out = { clear: 0, paid: 0, review: 0, synthetic: 0 };
  for (const a of artists) { const s = a.series && scores.byId.get(a.id); if (s) out[s.integrity.status] += 1; }
  return out;
}

export function signalsFeed(artists, scores) {
  const feed = [];
  for (const a of artists) {
    const s = a.series && scores.byId.get(a.id);
    if (!s) continue;
    const first = (sev) => s.integrity.signals.find((x) => (sev ? x.sev === sev : true));
    if (s.integrity.status === "synthetic") feed.push({ pri: 0, artistId: a.id, tone: "risk", tag: "Synthetic risk", icon: "shield", title: `${a.name}: catalogue may be machine-made`, text: first("high").text });
    else if (s.integrity.status === "review") feed.push({ pri: 0, artistId: a.id, tone: "risk", tag: "Integrity alert", icon: "flag", title: `${a.name}: unusual growth pattern`, text: first("high").text });
    else if (s.integrity.status === "paid") feed.push({ pri: 1, artistId: a.id, tone: "info", tag: "Campaign window", icon: "bolt", title: `${a.name}: likely paid push`, text: first("info").text });
    else if (s.integrity.markers.some((m) => m.kind === "surge")) feed.push({ pri: 2, artistId: a.id, tone: "lime", tag: "Breakout signal", icon: "trend", title: `${a.name}: broad-based surge`, text: (first("info") || s.integrity.signals[0] || { text: "Several platforms rose together." }).text });
  }
  const mv = marketMovers(artists, scores)[0];
  if (mv) feed.push({ pri: 3, artistId: null, tone: "go", tag: "Market", icon: "pin", title: `${mv.city} leads on growth`, text: `Median four-week audience growth of ${(Math.exp(mv.growth) * 100 - 100).toFixed(1)}% across ${mv.n} tracked artist${mv.n > 1 ? "s" : ""}.` });
  return feed.sort((x, y) => x.pri - y.pri);
}

/* Underpriced potential: how far the evidence-based rank sits above the visibility rank. A ranking gap, not a probability. */
export function underpriced(artists, scores) {
  const rows = artists.filter((a) => a.series).map((a) => ({ a, s: scores.byId.get(a.id), aud: totalAudience(a) })).filter((r) => r.s && r.s.rank != null);
  if (!rows.length) return [];
  const pctRank = (vals, v) => (100 * vals.filter((x) => x < v).length) / Math.max(1, vals.length - 1);
  const idxs = rows.map((r) => r.s.idx), auds = rows.map((r) => r.aud);
  for (const r of rows) {
    r.gap = pctRank(idxs, r.s.idx) - pctRank(auds, r.aud);
    r.action = r.gap >= 25 && r.s.stability >= 0.5 && r.s.evidence >= 0.8 ? "Investigate" : r.gap > 0 ? "Monitor" : "Watch";
  }
  return rows.sort((x, y) => y.gap - x.gap);
}

export function pipelineCounts({ live, watch, reviews, recs, decisions }) {
  const reviewed = live.filter((a) => artisticValue(reviews[a.id]).reviewers > 0 && (watch.includes(a.id))).length;
  return [
    { k: "disc", label: "Discovered", n: live.length },
    { k: "short", label: "Shortlisted", n: live.filter((a) => watch.includes(a.id)).length },
    { k: "rev", label: "Artistically reviewed", n: reviewed },
    { k: "rec", label: "Recommended", n: recs.count },
    { k: "dec", label: "Decision logged", n: new Set(decisions.filter((d) => d.week === AS_OF).map((d) => d.artistId)).size },
  ];
}

/* Grounded explainer. Every sentence is built from scored numbers. An LLM may phrase these later, but only from these facts. */
export function explainCompare(A, B) {
  const va = Object.fromEntries(A.sc.contributions.map((c) => [c.key, c])), vb = Object.fromEntries(B.sc.contributions.map((c) => [c.key, c]));
  const diffs = FEATURES.filter((f) => va[f.key] && vb[f.key]).map((f) => ({ label: f.label, d: va[f.key].value - vb[f.key].value })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 3);
  const lines = [`${A.a.name} has breakout index ${A.sc.idx.toFixed(0)} against ${B.a.name}'s ${B.sc.idx.toFixed(0)}.`];
  for (const d of diffs) lines.push(`${d.label}: ${d.d >= 0 ? A.a.name : B.a.name} leads by ${Math.abs(d.d).toFixed(1)} points.`);
  if (A.art.value != null && B.art.value != null) lines.push(`Artistic value: ${A.art.value.toFixed(0)} against ${B.art.value.toFixed(0)}.`);
  else lines.push("At least one of them has no artistic review yet, so artistry cannot be compared.");
  lines.push(`Evidence coverage: ${fmtPct(A.sc.evidence)} against ${fmtPct(B.sc.evidence)}.`);
  return lines;
}
export function explainChanges(a, sc) {
  const g4 = (Math.exp(sc.growth4) - 1) * 100, acc = sc.raw.accel * 100;
  const lines = [`Blended audience moved ${fmtSigned(g4)}% in four weeks, ${fmtSigned(sc.growthVsPeers * 100)} points against the peer median.`, `Acceleration versus the prior four weeks: ${fmtSigned(acc)} points.`];
  const shift = a.geo.map(([k, v], i) => ({ k, d: v - a.geoPrev[i][1] })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
  lines.push(`Biggest audience-mix shift: ${shift.k} ${fmtSigned(shift.d * 100, 0)} points.`);
  const eN = median(a.engagement.slice(LAST - 3)), eP = median(a.engagement.slice(LAST - 7, LAST - 3));
  lines.push(`Engagement per 1,000 views: ${eN.toFixed(0)} now, ${eP.toFixed(0)} before.`);
  if (sc.integrity.signals.length) lines.push(`Integrity: ${sc.integrity.label}.`);
  return lines;
}
export function explainLookalikes(sc, nameOf) { return sc.comps.map((c) => `${nameOf(c.id)}: similarity ${c.sim.toFixed(2)} on the feature profile.`).concat(["These are peers in this demo universe. In production, compare with historical artists at the same career stage."]); }
export function explainMissing(row) { return row.list.map((x) => x); }


export function scoreChips(sc, art) {
  const f = (k) => (sc && sc.scores[k] != null ? sc.scores[k] : null);
  const fan = [f("engagement"), f("repeat")].filter((v) => v != null);
  return [
    { k: "Momentum", v: sc && sc.idx != null ? sc.idx : null, color: "var(--s1)" },
    { k: "Fandom", v: fan.length ? mean(fan) : null, color: "var(--s2)" },
    { k: "Music quality", v: art && art.value != null ? art.value : null, color: "var(--s3)" },
    { k: "Market", v: f("geo"), color: "var(--s4)" },
    { k: "Live", v: art && art.perDim && art.perDim.live != null ? ((art.perDim.live - 1) / 4) * 100 : null, color: "var(--ok)" },
  ];
}
/* ───────────────────────── 5. Styles ───────────────────────── */
/* Visual direction: dark navy with a lime signal colour, taken from the client's reference dashboard. A light theme is kept as an option. */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Instrument+Sans:wght@400;500;600&display=swap');
.br{--ink:#050F1D;--paper:#EBEFF3;--panel:#FFFFFF;--panel2:#F4F6F9;--line:#D3DAE3;--muted:#566474;--text:#0E1B2C;
--lime:#B8F500;--limeInk:#142100;--s1:#0E1B2C;--s2:#1594AA;--s3:#6B4FE0;--s4:#B7791F;--risk:#C23B32;--ok:#2B7F54;--warn:#A66A0B;
--riskBg:#FBE9E7;--okBg:#E3F4EA;--warnBg:#FBF0DA;--infoBg:#E3F1F5;--muteBg:#ECEFF3;--card:#FFFFFF;--glow:none;
font-family:'Instrument Sans',system-ui,-apple-system,Segoe UI,sans-serif;color:var(--text);background:var(--paper);min-height:100vh;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
.br[data-theme=dark]{--paper:#030B16;--panel:#0A1828;--panel2:#0E2038;--line:#15304F;--muted:#8197AE;--text:#EAF2FA;--s1:#B8F500;--s2:#22D3EE;--s3:#A58BFF;--s4:#F5A524;--risk:#FF6B6B;--ok:#4ADE80;--warn:#F5A524;
--riskBg:#3A1B22;--okBg:#0F3326;--warnBg:#37290E;--infoBg:#0D3040;--muteBg:#132A44;--card:linear-gradient(180deg,rgba(15,36,62,.78),rgba(8,22,40,.92));--glow:0 0 0 1px rgba(34,211,238,.04),0 10px 30px rgba(0,0,0,.25);
background:radial-gradient(1200px 600px at 70% -10%,rgba(80,60,200,.16),transparent 60%),radial-gradient(900px 500px at 10% 0%,rgba(34,211,238,.07),transparent 60%),#030B16}
.br *{box-sizing:border-box}
.br button,.br select,.br input,.br textarea{font:inherit;color:inherit}
.br :focus-visible{outline:2px solid var(--s2);outline-offset:2px;border-radius:4px}
.br .disp{font-family:'Unbounded','Instrument Sans',system-ui,sans-serif;font-weight:500;letter-spacing:-.01em}
.br .num{font-variant-numeric:tabular-nums}
.br .muted{color:var(--muted)}
.br .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.br-shell{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100vh}
.br-rail{background:#050F1D;color:#E8EEF5;padding:20px 14px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh;border-right:1px solid #10263F}
.br-brand{padding:4px 8px 22px;display:flex;gap:10px;align-items:center}
.br-brand b{display:block;font-size:15px;color:#fff;line-height:1.1}
.br-brand span{font-size:11.5px;color:#8197AE}
.br-nav{display:flex;flex-direction:column;gap:6px}
.br-navbtn{display:flex;align-items:center;gap:12px;text-align:left;border:0;background:transparent;color:#B9C8D9;padding:11px 12px;border-radius:10px;cursor:pointer}
.br-navbtn:hover{background:#0F2238}
.br-navbtn[aria-current=page]{background:var(--lime);color:var(--limeInk);font-weight:600}
.br-navbtn .badge{margin-left:auto;font-size:12px;padding:1px 8px;border-radius:999px;background:#16304D;color:#E8EEF5}
.br-navbtn[aria-current=page] .badge{background:#142100;color:#B8F500}
.br-railnote{margin-top:auto;font-size:12px;color:#8197AE;padding:10px 6px;border-top:1px solid #10263F;display:flex;gap:10px;align-items:center}
.br-main{padding:0 26px 40px;min-width:0}
.br-top{display:flex;align-items:center;gap:10px;padding:14px 0;flex-wrap:wrap}
.br-top .grow{flex:1}
.searchbox{display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:0 12px;min-width:240px;flex:1;max-width:460px}
.searchbox input{border:0;background:transparent;outline:0;padding:9px 0;width:100%}
.searchbox:focus-within{border-color:var(--s2)}
.bellbtn{position:relative}
.bellbtn .dot{position:absolute;top:-6px;right:-6px;background:var(--risk);color:#fff;font-size:11px;border-radius:999px;padding:0 6px;line-height:17px}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:2px 10px;border-radius:999px;background:var(--muteBg);color:var(--text);white-space:nowrap;border:1px solid transparent}
.chip.go{background:var(--okBg);color:var(--ok)}.chip.warn{background:var(--warnBg);color:var(--warn)}
.chip.risk{background:var(--riskBg);color:var(--risk)}.chip.info{background:var(--infoBg);color:var(--s2)}
.chip.sim{background:var(--warnBg);color:var(--warn);border-color:var(--warn);font-weight:600}
.chip.lime{background:var(--lime);color:var(--limeInk);font-weight:600}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:9px;padding:8px 14px;border:1px solid var(--line);background:var(--panel);cursor:pointer;font-weight:500}
.btn:hover{border-color:var(--s2)}
.btn.primary{background:var(--lime);color:var(--limeInk);border-color:var(--lime);font-weight:600}
.btn.primary:hover{filter:brightness(.95)}
.btn.ghost{border-color:transparent;background:transparent}
.btn.sm{padding:4px 10px;font-size:13px}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.pillbtn{border-radius:999px;border:0;padding:5px 14px;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap}
.pillbtn.inv{background:var(--lime);color:var(--limeInk)}.pillbtn.mon{background:#1E6FE8;color:#fff}.pillbtn.wat{background:var(--muteBg);color:var(--text)}
.page-h{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin:6px 0 16px}
.page-h h1{margin:0;font-size:26px;line-height:1.15}
.page-h p{margin:4px 0 0;color:var(--muted);max-width:64ch}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:var(--glow)}
.card h2,.card h3{margin:0 0 8px;font-size:16px}
.card.flat{background:var(--panel2)}
.ch{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.ch h2,.ch h3{margin:0}.ch .sub{color:var(--muted);font-size:12.5px}
.ibadge{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none}
.ibadge.v{background:rgba(139,92,246,.2);color:#B49BFF}.ibadge.c{background:rgba(34,211,238,.16);color:#22D3EE}
.ibadge.l{background:rgba(184,245,0,.16);color:#B8F500}.ibadge.a{background:rgba(245,165,36,.18);color:#F5A524}
.ibadge.r{background:rgba(255,107,107,.18);color:#FF6B6B}.ibadge.g{background:rgba(74,222,128,.16);color:#4ADE80}
.grid{display:grid;gap:16px}
.g2{grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)}
.g2e{grid-template-columns:repeat(2,minmax(0,1fr))}
.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.stack{display:flex;flex-direction:column;gap:10px}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th{text-align:left;font-weight:500;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap;font-size:13px}
.tbl td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:middle}
.tbl tr.sel td{background:rgba(184,245,0,.06)}
.tbl tr.sel td:first-child{box-shadow:inset 3px 0 0 var(--lime)}
.linkbtn{background:none;border:0;padding:0;text-align:left;cursor:pointer;font-weight:600}
.linkbtn:hover{text-decoration:underline}
.scroll-x{overflow-x:auto}
.scope{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.field{display:flex;flex-direction:column;gap:4px;font-size:13px}
.field label,.field .lbl{color:var(--muted)}
.field select,.field input[type=text],.field textarea{border:1px solid var(--line);background:var(--panel2);border-radius:8px;padding:6px 8px;min-height:34px}
.pillgroup{display:flex;gap:6px;flex-wrap:wrap}
.pill{border:1px solid var(--line);background:var(--panel2);border-radius:999px;padding:3px 11px;font-size:13px;cursor:pointer}
.pill[aria-pressed=true]{background:var(--lime);border-color:var(--lime);color:var(--limeInk);font-weight:600}
.meter{height:6px;border-radius:99px;background:var(--muteBg);overflow:hidden;min-width:60px}
.meter>i{display:block;height:100%;background:var(--s1);border-radius:99px}
.rangebar{position:relative;height:8px;border-radius:99px;background:var(--muteBg);min-width:90px}
.rangebar .span{position:absolute;top:0;bottom:0;background:var(--s2);opacity:.45;border-radius:99px}
.rangebar .dot{position:absolute;top:-2px;width:12px;height:12px;border-radius:50%;background:var(--s1);border:2px solid var(--panel);transform:translateX(-50%)}
.hero{position:relative;overflow:hidden;border-radius:18px;border:1px solid var(--line);min-height:250px;background:#06101F;display:flex;align-items:center}
.hero svg.art{position:absolute;inset:0;width:100%;height:100%}
.hero .copy{position:relative;padding:28px 30px;max-width:560px}
.hero h1{margin:6px 0 8px;font-size:34px;line-height:1.1;color:#fff}
.hero h1 em{font-style:normal;color:var(--lime);display:block}
.hero p{color:#B9C8D9;margin:0 0 16px;max-width:46ch}
.hero .tag{position:absolute;right:28px;top:26px;color:var(--lime);font-style:italic;font-weight:600;text-align:right;transform:rotate(-4deg);font-size:19px;line-height:1.15;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.hero .eyebrow{display:flex;gap:8px;align-items:center;color:#B9C8D9;font-size:12.5px}
.tiles{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:var(--glow)}
.tile .v{font-size:26px;font-family:'Unbounded',system-ui,sans-serif;font-weight:500;line-height:1}
.tile .l{font-size:12.5px;color:var(--muted)}
.mm{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}
.mm:first-of-type{border-top:0}
.sigcards{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}
.sigcard{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:12px;display:flex;gap:12px;text-align:left;cursor:pointer}
.sigcard:hover{border-color:var(--s2)}
.sigcard b{display:block;font-size:14px}
.sigcard p{margin:2px 0 6px;color:var(--muted);font-size:12.5px}
.legend{display:flex;flex-direction:column;gap:7px;font-size:13.5px}
.legend .it{display:grid;grid-template-columns:14px 1fr auto;gap:8px;align-items:center}
.legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
.scorechips{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.scorechip{border-radius:12px;padding:10px 12px;border:1px solid var(--line);background:var(--panel2)}
.scorechip .v{font-family:'Unbounded',system-ui,sans-serif;font-size:22px}
.scorechip .l{font-size:12px;color:var(--muted)}
.funnel{display:flex;align-items:stretch;gap:0;overflow-x:auto}
.funnel .st{flex:1;min-width:112px;text-align:center;padding:10px 6px;position:relative}
.funnel .st+.st::before{content:"";position:absolute;left:-5px;top:50%;width:10px;height:10px;border-top:2px solid var(--muted);border-right:2px solid var(--muted);transform:translateY(-50%) rotate(45deg)}
.funnel .ring{width:46px;height:46px;border-radius:50%;margin:0 auto 6px;display:grid;place-items:center;font-weight:700;border:2px solid var(--s2);background:var(--panel2)}
.funnel .st.hot .ring{border-color:var(--lime);color:var(--lime)}
.chat{display:flex;flex-direction:column;gap:10px}
.bubble{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:14px}
.bubble.q{align-self:flex-end;background:rgba(34,211,238,.12);border-color:transparent;max-width:88%}
.suggest{display:flex;flex-direction:column;gap:6px}
.suggest button{text-align:left;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer;font-size:13.5px}
.suggest button:hover{border-color:var(--lime)}
.console{background:#050E1B;color:#D7E1EC;border-radius:14px;padding:14px;border:1px solid #14304D}
.stages{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.stage{font-size:12.5px;padding:3px 10px;border-radius:999px;border:1px solid #2A4562;color:#8197AE;display:flex;gap:6px;align-items:center}
.stage.done{color:#142100;background:var(--lime);border-color:var(--lime)}
.stage.now{color:#fff;border-color:#B8F500;animation:pulse 1s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 3px rgba(184,245,0,.25)}}
.log{font-size:13px;max-height:150px;overflow:auto;display:flex;flex-direction:column;gap:3px;color:#BFCDDC}
.log b{color:#B8F500;font-weight:500}
.drawer-bg{position:fixed;inset:0;background:rgba(2,8,16,.6);z-index:40;display:flex;justify-content:flex-end}
.drawer{width:min(560px,100%);height:100%;background:var(--paper);overflow:auto;padding:20px;border-left:1px solid var(--line)}
.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.kpi .v{font-size:24px;font-family:'Unbounded',system-ui,sans-serif;font-weight:500}
.kpi .l{font-size:12.5px;color:var(--muted)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:14px}
.tab{border:0;background:none;padding:9px 14px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;font-weight:500}
.tab[aria-selected=true]{color:var(--text);border-bottom-color:var(--s1)}
.seg{display:flex;gap:4px}
.seg input{position:absolute;opacity:0;width:0;height:0}
.seg label{width:34px;height:32px;display:grid;place-items:center;border:1px solid var(--line);border-radius:7px;cursor:pointer;background:var(--panel2);font-variant-numeric:tabular-nums}
.seg input:checked+label{background:var(--lime);border-color:var(--lime);color:var(--limeInk);font-weight:700}
.seg input:focus-visible+label{outline:2px solid var(--s2);outline-offset:2px}
.rub{display:grid;grid-template-columns:minmax(150px,1fr) auto;gap:6px 14px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.rub .hint{grid-column:1/-1;font-size:12.5px;color:var(--muted)}
.layout-a{display:grid;grid-template-columns:260px minmax(0,1fr);gap:16px;align-items:start}
.listbtn{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:9px 10px;border:1px solid transparent;border-radius:10px;background:transparent;cursor:pointer}
.listbtn:hover{background:var(--panel2)}
.listbtn[aria-current=true]{background:var(--panel2);border-color:var(--line);box-shadow:inset 3px 0 0 var(--lime)}
.sig{padding:8px 10px;border-radius:8px;font-size:13.5px;background:var(--muteBg)}
.sig.high{background:var(--riskBg)}.sig.medium{background:var(--warnBg)}.sig.info{background:var(--infoBg)}
.bar2{display:grid;grid-template-columns:150px 1fr 48px;gap:8px;align-items:center;font-size:13px}
.bar2 .track{position:relative;height:8px;background:var(--muteBg);border-radius:99px}
.bar2 .fill{position:absolute;top:0;bottom:0;border-radius:99px}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#0B1B2E;color:#fff;padding:10px 16px;border-radius:10px;z-index:60;font-size:14px;border:1px solid #2A4562}
.dlist{margin:0;padding-left:18px}
.foot{margin-top:30px;padding:18px 0 0;border-top:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap;color:var(--muted);font-size:13px}
.foot .tagline{color:var(--lime);margin:0 auto;text-align:center}
details>summary{cursor:pointer;font-weight:500}
@media (max-width:1180px){.g2{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.g4{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:1fr}.tiles{grid-template-columns:repeat(3,minmax(0,1fr))}.scorechips{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:900px){
 .br-shell{grid-template-columns:1fr}
 .br-rail{position:sticky;z-index:30;height:auto;flex-direction:row;align-items:center;padding:8px 10px;overflow-x:auto;border-right:0;border-bottom:1px solid #10263F}
 .br-brand,.br-railnote{display:none}.br-nav{flex-direction:row}
 .br-navbtn{padding:8px 12px;white-space:nowrap}
 .br-main{padding:0 14px 40px}.layout-a,.g2e{grid-template-columns:1fr}.hero .tag{display:none}.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (prefers-reduced-motion:reduce){.stage.now{animation:none}.br *{transition:none!important}}
`;

/* ───────────────────────── 6. Helpers and primitives ───────────────────────── */

const fmtN = (n) => (n == null ? "–" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(Math.round(n)));
const fmtPct = (x, d = 0) => (x == null ? "–" : (x * 100).toFixed(d) + "%");
const fmtSigned = (x, d = 1) => (x == null ? "–" : (x >= 0 ? "+" : "") + x.toFixed(d));
const dayMs = 864e5;
const weekDate = (i) => new Date(Date.parse(AS_OF + "T00:00:00Z") - (LAST - i) * 7 * dayMs);
const fmtDay = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtDayY = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const weekLabels = (T) => Array.from({ length: T + 1 }, (_, i) => fmtDay(weekDate(i)));
const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const storage = (() => {
  const mem = {};
  return {
    get(k) { try { const v = window.localStorage.getItem(k); if (v != null) return v; } catch (e) { /* unavailable */ } return mem[k] != null ? mem[k] : null; },
    set(k, v) { mem[k] = v; try { window.localStorage.setItem(k, v); } catch (e) { /* unavailable */ } },
  };
})();
function usePersisted(key, init) {
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
function useGid() { const r = useRef(null); if (r.current == null) r.current = "g" + ++gidCounter; return r.current; }

const ICONS = {
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
function Icon({ n, s = 18 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n] || ""} /></svg>);
}
const IBadge = ({ n, tone = "l" }) => (<span className={"ibadge " + tone}><Icon n={n} s={18} /></span>);

function Logo({ size = 30 }) {
  return (<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><path d="M2 17h5l3-9 5 17 4-12 2 4h9" fill="none" stroke="#B8F500" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}

/* Generated avatar: no real faces. Initials over a gradient derived from the id. */
function Avatar({ name, id, size = 36 }) {
  const h = hashStr(id || name) % 360;
  return (
    <span title={name + " (simulated)"} aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff",
      background: `linear-gradient(135deg,hsl(${h} 68% 46%),hsl(${(h + 70) % 360} 70% 26%))`, boxShadow: "0 0 0 2px rgba(184,245,0,.35)" }}>{initials(name)}</span>
  );
}

const TONE = { go: "go", info: "info", warn: "warn", risk: "risk", mute: "" };
const Chip = ({ tone, children, title }) => (<span className={"chip " + (tone || "")} title={title}>{children}</span>);
const intTone = (s) => (s === "clear" ? "go" : s === "paid" ? "info" : "risk");

function RangeBar({ v, lo, hi }) {
  const L = clamp(lo, 0, 100), H = clamp(hi, 0, 100);
  return (
    <div className="rangebar" role="img" aria-label={`Index ${v.toFixed(0)}, 90% range ${lo.toFixed(0)} to ${hi.toFixed(0)}`}>
      <div className="span" style={{ left: L + "%", width: Math.max(2, H - L) + "%" }} />
      <div className="dot" style={{ left: clamp(v, 0, 100) + "%" }} />
    </div>
  );
}
function Meter({ v, color }) { return (<div className="meter" aria-hidden="true"><i style={{ width: clamp(v, 0, 1) * 100 + "%", background: color }} /></div>); }

function Spark({ values, color = "var(--s1)", w = 90, h = 26 }) {
  const lo = Math.min(...values), hi = Math.max(...values), r = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - lo) / r) * (h - 4)}`).join(" ");
  return (<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" /></svg>);
}

/* Line and area chart. Set area:true on a series for a gradient fill. */
function LineChart({ series, labels, height = 250, markers = [], label, yFmt = (v) => v.toFixed(0), zeroBase = false }) {
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

function RadarChart({ values, labels, size = 260 }) {
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
function Donut({ parts, size = 150, thick = 20, center, sub, label }) {
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
function HeatGrid({ rows, cols, vmax = 0.08, label }) {
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
const AFRICA = [[-5.9,35.8],[-2,35.1],[1,36.5],[3,36.8],[7,37.1],[10.2,37.3],[11,35.5],[10.3,34],[11.2,33.3],[13.5,32.8],[15.2,32.4],[19,30.3],[20.2,32],[22.5,32.9],[25,31.7],[29,30.9],[32.3,31.3],[32.6,29.9],[33.7,27.8],[35.5,24],[37.2,21],[37.5,18.5],[38.6,17.4],[40,15.4],[42.5,13],[43.3,11.8],[44.5,10.4],[47,11.2],[51.2,11.8],[51,10.4],[50.8,8],[48,5],[45,2],[42,-0.8],[40.5,-2.5],[39.3,-4.7],[39,-7],[40.5,-10.5],[40.6,-15],[37,-17.8],[35,-20],[35.5,-24],[32.9,-26],[32.6,-28.9],[31,-30],[28,-33],[25.5,-34],[20,-34.8],[18.4,-34],[17.9,-32],[16.5,-28.5],[15,-26],[14.5,-22.5],[13,-20],[11.8,-17.2],[13.7,-12.5],[13,-9],[12.3,-6],[11.8,-4.5],[9.3,-1],[9,0.5],[9.7,3.9],[8.5,4.6],[6,4.3],[4.5,6.3],[1.5,6.2],[-2,4.8],[-4,5.2],[-7.5,4.4],[-10.8,6.3],[-13.2,8.5],[-15,10.8],[-16.8,12.5],[-17.5,14.7],[-16.5,19.3],[-17,21],[-16,24],[-13,27.7],[-10,29.5],[-9.8,31.4],[-8.5,33.5],[-6.8,34.2]];
const MADAGASCAR = [[49.3,-12],[50.4,-15.5],[49.6,-17.5],[47.8,-24.8],[45,-25.5],[43.4,-23.5],[44,-20],[44.4,-16.2],[47,-15]];
export const CITIES = { Nairobi: [36.82, -1.29], Mombasa: [39.67, -4.04], Eldoret: [35.27, 0.52], Nakuru: [36.07, -0.3], Kampala: [32.58, 0.35], "Dar es Salaam": [39.28, -6.79], Mwanza: [32.9, -2.52], Kigali: [30.06, -1.95], Enugu: [7.5, 6.46], Accra: [-0.19, 5.6], Durban: [31.02, -29.86] };
export const COUNTRY_XY = { KE: [37.9, 0.5], UG: [32.4, 1.4], TZ: [34.8, -6.3], RW: [29.9, -2], NG: [8.1, 9.6], GH: [-1.2, 7.9], ZA: [24.7, -29], ZW: [29.9, -19], BW: [23.8, -22.3] };

function AfricaMap({ dots = [], rings = [], onPick, height = 360 }) {
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
function HeroArt() {
  const bars = Array.from({ length: 46 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.7) * 46 + Math.cos(i * 0.31) * 26));
  return (
    <svg className="art" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#06101F" /><stop offset="55%" stopColor="#0B1C3A" /><stop offset="100%" stopColor="#25124F" /></linearGradient>
        <linearGradient id="hc1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity=".55" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient>
        <linearGradient id="hc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22D3EE" stopOpacity=".5" /><stop offset="100%" stopColor="#22D3EE" stopOpacity="0" /></linearGradient>
        <linearGradient id="hc3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#B8F500" stopOpacity=".35" /><stop offset="100%" stopColor="#B8F500" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="1000" height="300" fill="url(#hg1)" />
      <polygon points="640,-10 700,-10 860,300 520,300" fill="url(#hc1)" />
      <polygon points="760,-10 820,-10 1000,300 700,300" fill="url(#hc2)" />
      <polygon points="560,-10 600,-10 700,300 470,300" fill="url(#hc3)" />
      {[60, 100, 140, 180].map((r, i) => (<circle key={r} cx="760" cy="300" r={r + 40} fill="none" stroke="#B8F500" strokeOpacity={0.28 - i * 0.05} />))}
      <g transform="translate(560 300)">{bars.map((h, i) => (<rect key={i} x={i * 9.5} y={-h} width="5" height={h} rx="2.5" fill={i % 5 === 0 ? "#B8F500" : "#22D3EE"} opacity={0.18 + (i % 7) * 0.05} />))}</g>
      <path d="M0 250 Q120 200 240 245 T480 235 T700 255" fill="none" stroke="#B8F500" strokeOpacity=".35" strokeWidth="2" />
    </svg>
  );
}

/* ───────────────────────── 7. Discovery ───────────────────────── */

const STAGES = [
  { k: "plan", name: "Plan scope", line: (c) => `Scope: ${c.scopeText}. Quota plan ${fmtN(c.units)} of 10,000 YouTube units.` },
  { k: "sweep", name: "Sweep sources", line: (c) => `Pulled from ${c.sources} sources and saw ${c.handles} public handles (simulated counts).` },
  { k: "resolve", name: "Resolve identities", line: (c) => `Merged handles into ${c.identities} canonical artists. ${c.ambiguous} ambiguous matches queued for a human.` },
  { k: "screen", name: "Screen integrity", line: (c) => `Checked surge patterns and audio. ${c.held} held for review, ${c.paid} probable campaign, ${c.synth} synthetic-risk.` },
  { k: "score", name: "Score and rank", line: (c) => `Scored ${c.scored} artists on ${FEATURES.length} features, with 300 re-weighted simulations for rank stability.` },
  { k: "evaluate", name: "Evaluate audio", line: (c) => `Extracted key, tempo, loudness and pitch descriptors for ${c.scored} catalogues (simulated).` },
  { k: "publish", name: "Publish", line: (c) => (c.newCount ? `${c.newCount} new prospect${c.newCount > 1 ? "s" : ""} added to the ranked list. Shortlist them to start weekly review.` : "No new prospects since the last sweep. The ranked list is unchanged.") },
];

const CEILINGS = [["Any size", 1e12], ["Under 250k", 250000], ["Under 100k", 100000], ["Under 50k", 50000]];
const totalAud = (a) => (a.series ? sum(Object.values(a.series).map((s) => s.aud[LAST])) : 0);
const quotaUnits = (searches, channels) => searches * 100 + Math.ceil(channels / 50) + channels + Math.ceil((channels * 8) / 50);

function UnderpricedPlot({ rows, selectedId, onPick }) {
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

function Discovery({ app }) {
  const { allArtists, visible, scores, prev, scope, setScope, run, startRun, watch, toggleWatch, revealed, query } = app;
  const [searches, setSearches] = useState(6);
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

function SweepConsole({ run, startRun, visibleCount, lastLabel }) {
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

function ProspectDetail({ a, sc, app }) {
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
        <div className="row"><Avatar name={a.name} id={a.id} size={46} /><div><div className="row"><h2 className="disp" style={{ fontSize: 20, margin: 0 }}>{a.name}</h2><Chip tone="sim" title="Invented artist for demonstration">Simulated</Chip></div>
        <div className="muted" style={{ fontSize: 13.5 }}>{a.city}, {a.country} · {a.genre} · {a.language}</div></div></div>
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

async function mbLookup(query) {
  const r = await fetch(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=6`);
  if (!r.ok) throw new Error("MusicBrainz answered with status " + r.status);
  const j = await r.json();
  return (j.artists || []).map((x) => ({
    mbid: x.id, name: x.name, country: x.country || "", area: (x.area && x.area.name) || "", disambiguation: x.disambiguation || "",
    type: x.type || "", tags: (x.tags || []).slice(0, 2).map((t) => t.name),
  }));
}

function IdentityLookup({ app }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState({ status: "idle", results: [], err: null });
  const go = async () => {
    if (!q.trim()) return;
    setSt({ status: "loading", results: [], err: null });
    try { setSt({ status: "ok", results: await app.adapters.lookupIdentity(q.trim()), err: null }); }
    catch (e) { setSt({ status: "error", results: [], err: String((e && e.message) || e) }); }
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
        const already = app.allArtists.some((a) => a.mbid === r.mbid);
        return (
          <div key={r.mbid} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ flex: 1, minWidth: 140 }}><b>{r.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{[r.type, r.country || r.area, r.disambiguation].filter(Boolean).join(" · ")}</div></div>
            <button className="btn sm" disabled={already} onClick={() => app.addCandidate(r)}>{already ? "Added" : "Add as pending"}</button>
          </div>
        );
      })}
    </div>
  );
}

function ModelPanel() {
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

/* ───────────────────────── 8. Analyse ───────────────────────── */

const MIN_T = LAST - 8;
const VERDICT = { advance: { label: "Advance to recommendations", tone: "go" }, watch: { label: "Keep watching", tone: "info" }, drop: { label: "Dropped", tone: "mute" } };

function Analyse({ app }) {
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
              <div className="row" style={{ flexWrap: "nowrap", gap: 12 }}><Avatar name={sel.name} id={sel.id} size={54} /><div><div className="row"><h2 className="disp" style={{ fontSize: 20, margin: 0 }}>{sel.name}</h2><Chip tone="sim">Simulated</Chip></div>
                <div className="muted" style={{ fontSize: 13.5 }}>{sel.city}, {sel.country} · {sel.genre} · {sel.language}</div></div></div>
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

function Kpi({ l, v, sub }) { return (<div className="kpi"><div className="v num">{v}</div><div className="l">{l}</div>{sub && <div className="muted" style={{ fontSize: 12.5 }}>{sub}</div>}</div>); }

function WeekTab({ a, sc, sp, T, live }) {
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

const DESC = (a) => {
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

function ArtisticTab({ a, app }) {
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

function TrailTab({ a, live }) {
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

function VerdictBar({ a, app }) {
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

/* ───────────────────────── 9. Recommendations ───────────────────────── */

function downloadText(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    const el = document.createElement("a");
    el.href = url; el.download = name; document.body.appendChild(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) { return false; }
}

const QUAD_COLOR = { go: "var(--ok)", info: "var(--s2)", warn: "var(--warn)", risk: "var(--risk)", mute: "var(--muted)" };

function Matrix({ rows, selectedId, onPick }) {
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

function RecCard({ row, app, selected }) {
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

function Copilot({ rows, app }) {
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

function Recommendations({ app }) {
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

/* ───────────────────────── 10. Source ledger ───────────────────────── */

function Ledger({ onClose }) {
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

/* ───────────────────────── 11. App ───────────────────────── */

const NAV = [
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
  };
  const badge = { discovery: scores.eligibleIds.length, analyse: dueCount, recs: recs.count };

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
            <Chip>Week of {fmtDayY(weekDate(LAST))}</Chip>
            <div className="grow" />
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
    </div>
  );
}
