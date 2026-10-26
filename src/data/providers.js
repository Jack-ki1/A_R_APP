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
    role: "Artist fan counts, top tracks, 30s master audio previews",
    facts: ["Artist fan counts (nb_fan) are public and need no login.", "Provides 30-second master previews for audio evaluation.", "Third-party documentation reports about 50 requests per 5 seconds."],
    note: "Used for live multi-source ingestion and in-app A&R audio previews.",
  },
  {
    id: "itunes", name: "Apple Music / iTunes API", status: "Live-capable", ml: "allowed",
    role: "Releases, primary genres, artwork, audio stream previews",
    facts: ["Free public search API with native CORS support.", "Returns official high-resolution cover artwork and audio stream previews."],
    note: "Used for live multi-source discovery search and artwork enrichment.",
  },
  {
    id: "wikimedia", name: "Wikimedia Pageviews API", status: "Live-capable", ml: "allowed",
    role: "26-week public attention curves and velocity tracking",
    facts: ["Open REST API covering global Wikipedia pageviews by article.", "Used to construct calibrated 26-week historical interest trajectories."],
    note: "Zero rate limits for reasonable Scout traffic; CORS enabled.",
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
