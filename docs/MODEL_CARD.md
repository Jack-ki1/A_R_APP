# Model card: heuristic priority index

## Current status

**Not trained. Not validated. Not production ML. No breakout probabilities are available.** The current weights are hand-authored heuristic configurations operating over legacy score fields that the repository identifies as synthetic fixtures.

## Intended use

At most, the index can demonstrate UI behavior in a visibly labeled local demo. It is not suitable for signing, scouting prioritization, artist comparison, causal claims, or external publication.

## Inputs and baseline

Two weighted configurations reference momentum, fan depth, UGC impact, organic/integrity-related score, market expansion and audience evolution. The Phase 0 implementation returns a value only when at least 80% of configured positive weight is present. This threshold is provisional, not empirically calibrated; missing features are shown as incomplete and do not silently yield a renormalized score below the gate.

## Target and exclusions

No outcome target, labeled training dataset, model artifact, point-in-time feature store, license evidence for ML use, or held-out evaluation report exists in the repository. Therefore no probability target or validation claim is made. Future training must exclude unauthorized or synthetic operational data and prevent post-cutoff leakage.

## Evaluation required before any validation claim

Define a market-aware measurable outcome and eligible cohort first. Use chronological rolling-origin splits, deduplicated canonical artist identities, signed and unsigned artists, censored labels, coverage reporting, baseline comparisons, precision/recall at scout capacity K, lead time, uncertainty intervals, and calibration metrics only if probabilities are trained. Stratify by territory/genre/stage and data availability.

## Limitations

Legacy feature values can be synthetic, stale, missing, or based on incompatible sources. The UI index is not an estimate of artistic merit or breakout probability. Human artistic review and integrity review remain separate. No feature coverage threshold repairs poor provenance or data rights.
