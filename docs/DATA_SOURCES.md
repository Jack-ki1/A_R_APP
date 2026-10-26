# Data sources and rights

Checked on 21 October 2026. Terms change. Re-check before building an ingestion job or signing a contract. The in-app **Source ledger** shows the same information.

| Source | Use here | Status | Scoring use | What the research found |
|---|---|---|---|---|
| MusicBrainz | Identity and catalogue metadata | Live-capable | Allowed (identity only) | Open metadata. It holds no popularity or audience figures. |
| YouTube Data API v3 | Channel statistics, upload cadence, engagement | Live-capable | Verify terms | Default quota 10,000 units a day. `search.list` costs 100 units. `channels.list`, `videos.list` take up to 50 IDs per 1-unit call. Extra Google projects to multiply quota breach the terms. |
| Deezer public API | Artist fan counts, top tracks, 30s master previews | Live-capable | Verify terms | Fan counts (`nb_fan`) and top tracks with 30s previews are public. Third-party documentation reports about 50 requests per 5 seconds. |
| Apple Music / iTunes API | Releases, primary genres, artwork, audio preview streams | Live-capable | Allowed | Free public search API with native CORS support. Used for live multi-source enrichment and playable audio previews. |
| Wikimedia Pageviews API | 26-week public attention curves | Live-capable | Allowed | Open REST API providing daily and weekly Wikipedia pageviews. Used for historical attention trajectory calibration. |
| Soundcharts | Audiomack and Boomplay audience, plays, charts, airplay | Licence needed | Verify terms | Lists Audiomack and Boomplay metrics. Announced an Audiomack data partnership in December 2025 aimed at African coverage gaps. |
| Chartmetric | Cross-platform performance incl. Boomplay | Licence needed | Verify terms | Added Boomplay in 2020. Useful as a second vendor. |
| Artist-authorised exports | Audience, geography, retention | Artist-authorised | Allowed | Strongest rights position. Needs written permission and metric definitions on every import. |
| Spotify Web API | None | Restricted | **Blocked** | From the February 2026 changes, artist followers and popularity no longer reach Development Mode apps. Developer Terms v10 prohibit using Spotify content to train or feed ML models. |
| TikTok | None | Not available | **Blocked** | Research API is for qualifying non-profit academics, capped around 1,000 requests a day, no commercial use. Commercial Content API covers EU advertising data only. |
| Deezer AI-music detection | Synthetic-catalogue screening | Licence needed | Allowed | Licensable since January 2026. Deezer reported AI tracks at 44% of daily uploads in April 2026 and over 50% on peak days in June 2026, and says up to 85% of streams on fully AI-generated tracks were fraudulent in 2025. |
| Essentia | Audio descriptors | Open tool | Allowed | Open-source audio analysis (key, tempo, loudness, pitch). AGPLv3 with a proprietary licence available. Our caution, not a sourced finding: key profiles are tuned on mostly Western music, so check them against non-Western tonal systems. |

## Sources consulted

- Spotify, February 2026 Web API Dev Mode migration guide: developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- TechCrunch, 6 Feb 2026, on Spotify's Development Mode changes: techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/
- Music Ally, 12 Feb 2026, on Spotify's stated AI reasons for the restrictions: musically.com/2026/02/12/spotify-says-ai-risks-are-reason-for-new-developer-restrictions/
- Deezer newsroom, July 2026, on AI music above 50% of daily uploads: newsroom-deezer.com/2026/07/ai-music-exceeds-50-percent-daily-uploads-deezer/
- Music Ally, 12 Dec 2025, on Soundcharts and Audiomack: musically.com/2025/12/12/soundcharts-fills-data-gaps-on-african-music-with-audiomack-deal/
- Soundcharts, Boomplay analytics page: soundcharts.com/en/boomplay-analytics-africa
- Music In Africa, Chartmetric adds Boomplay: musicinafrica.net/magazine/chartmetric-doubles-data-sources-adds-boomplay/
- TikTok developer changelog and third-party summaries of Research API limits (Datashake, Phyllo)
- Essentia: essentia.upf.edu
- Third-party YouTube quota breakdowns (Late, OutlierKit) for per-endpoint costs

## Before any source goes live

1. Written confirmation that storing derived data is permitted.
2. Written confirmation on ML training use, which is separate from API access.
3. Quota and rate-limit plan with caching.
4. Rights reference stored with every observation: source, definition version, window, geography, ingestion run.
