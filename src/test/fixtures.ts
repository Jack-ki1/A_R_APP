import type { Artist } from "@/lib/artists";

let sequence = 0;

/** Complete artist row fixture; overrides mirror real intake output (null metrics). */
export function makeArtist(overrides: Partial<Artist> = {}): Artist {
  sequence += 1;
  return {
    id: `00000000-0000-0000-0000-00000000000${sequence}`,
    canonical_id: `musicbrainz:${sequence}`,
    name: `Artist ${sequence}`,
    aliases: [],
    artistic_status: "Not reviewed",
    audience_current: null,
    city: "Nairobi",
    country: "Kenya",
    created_at: "2026-10-19T00:00:00Z",
    events: [],
    evidence: {},
    evidence_confidence: null,
    expected_growth_30d: null,
    genre: "Afrobeats",
    growth_30d: null,
    integrity: "unknown",
    is_demo: false,
    language: "Swahili",
    next_action: null,
    next_action_due: null,
    pipeline_stage: "identified",
    portrait_seed: 1,
    scores: {},
    scout_owner: null,
    series: [],
    stage: "identified",
    unsigned: true,
    updated_at: "2026-10-19T00:00:00Z",
    why_now: "Data collection pending",
    ...overrides,
  };
}
