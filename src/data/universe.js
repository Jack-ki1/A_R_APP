import { LAST, WEEKS } from "../engine/constants";
import { clamp, gauss, hashStr, mulberry32 } from "../engine/math";

/* ───────────────────────── 3. Simulated universe ───────────────────────── */
/* Invented artists. Any resemblance to real people is coincidental. */

export const ALL = ["yt", "dz", "am", "bp", "ig"];
export const SPECS = [
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

export const KEYS = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export const BPM = { "Afro-fusion": 104, "Luganda Afrobeats": 102, "Bongo Flava": 98, Singeli: 186, "Afro-R&B": 88, Gengetone: 116,
  "Coastal electronic": 118, Kidandali: 100, "Afro-soul": 92, "Highlife-pop": 106, Amapiano: 112, "Gospel-Afro": 96, "Afro-chill": 84, "Afro-pop": 108 };

export function genAudio(spec, rng) {
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

export function buildArtist(spec) {
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
export const D = ["song", "voc", "key", "prod", "orig", "live", "cat", "auth"];
export const mkReview = (arr, notes) => ({ scores: Object.fromEntries(D.map((k, i) => [k, arr[i]])), notes, at: "2026-10-12", seeded: true });
export const SEED_REVIEWS = {
  "KE-0142": { amina: mkReview([4.5, 4, 4, 3.5, 4.5, 4, 3.5, 5], "Hooks land on first listen. Swahili wordplay is natural, not forced."), daniel: mkReview([4, 4.5, 4, 3.5, 4, 3.5, 4, 4.5], "Mix is a little thin on low end. Songwriting carries it.") },
  "UG-0087": { amina: mkReview([3.5, 4, 3.5, 3.5, 3.5, 4.5, 3, 4.5], "Strong live energy. Catalogue leans on one formula.") },
  "TZ-0211": { daniel: mkReview([4, 4.5, 4, 4, 3.5, 4, 4, 4], "Controlled vocal, consistent across releases."), grace: mkReview([3.5, 4, 3.5, 4, 3, 3.5, 4, 4.5], "Polished but close to the genre template.") },
  "RW-0049": { amina: mkReview([5, 4.5, 4.5, 4, 4.5, 3.5, 4.5, 4.5], "Exceptional writing. Audience is still small."), grace: mkReview([4.5, 5, 4.5, 4, 4.5, 4, 4, 5], "Rare vocal control. Needs a bigger stage and a plan.") },
  "NG-0310": { daniel: mkReview([4, 4, 4, 3.5, 3.5, 3.5, 3.5, 4], "Warm voice, good arrangements. Not yet distinctive.") },
  "ZA-0275": { amina: mkReview([3, 3.5, 3, 4, 2.5, 4, 3, 3.5], "Great groove, but sits inside a crowded sound.") },
  "UG-0102": { daniel: mkReview([3, 3, 3, 3.5, 2.5, 4, 2.5, 3.5], "Crowd-pleaser. Songs blur together.") },
};
export const SEED_WATCH = ["KE-0142", "UG-0087", "TZ-0211", "RW-0049", "ZA-0275", "UG-0102", "KE-0166"];
