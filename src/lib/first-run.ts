// First-run onboarding model (tested in src/test/first-run.test.tsx).

export const FIRST_RUN_STEPS: { title: string; detail: string }[] = [
  {
    title: "Find an artist",
    detail: "Search the live MusicBrainz catalog from Discover or Settings.",
  },
  {
    title: "Verify identity",
    detail: "Check name, country, MBID and the source link before saving anything.",
  },
  {
    title: "Add to Radar",
    detail: "Confirm the identity to record it. Repeating the import returns the same artist.",
  },
  {
    title: "View the artist profile",
    detail:
      "Shows Monitoring pending, Audience not available and No artistic reviews — honest gaps, not zeros.",
  },
  {
    title: "Attach authorized data",
    detail: "Import a rights-cleared metric or audience export to record the first observation.",
  },
  {
    title: "Create the first A&R action",
    detail: "Assign a scout, request a review, or place the artist on the watchlist.",
  },
];

/**
 * Three-step evidence progress. Step 3 is only ever shown as in-progress because derived
 * intelligence (ranking, expected growth, probabilities) requires the governed analytics layer.
 */
export function progressStepStates(hasArtists: boolean, hasObservations: boolean) {
  return [
    { label: "Artist added", done: hasArtists, current: !hasArtists },
    {
      label: "Source observations recorded",
      done: hasObservations,
      current: hasArtists && !hasObservations,
    },
    { label: "Intelligence available", done: false, current: hasObservations },
  ];
}
