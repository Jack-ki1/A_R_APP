import modelJson from "../../ml/model.json";

type Model = {
  version: string;
  trained_at: string;
  features: string[];
  means: number[];
  stds: number[];
  coefficients: number[];
  intercept: number;
  auc_on_synthetic: number;
  training_data: string;
  n_samples: number;
  disclaimer: string;
};

const model = modelJson as Model;

export type ArtistFeatures = {
  growth30d: number | null;
  expectedGrowth30d: number | null;
  audienceSize: number | null;
  commentsPerThousandViews: number | null;
  saveShare: number | null;
  integrity: string;
  evidenceCoverage: number | null;
  momentumScore: number | null;
  hasObservations: boolean;
  hasSnapshots: boolean;
};

export type Prediction = {
  score: number;
  confidence: "low" | "medium" | "high";
  modelVersion: string;
  featuresUsed: Record<string, number | null>;
  disclaimer: string;
};

function integrityEncoded(integrity: string): number {
  if (integrity === "organic" || integrity === "paid_promo") return 1.0;
  if (integrity === "unknown") return 0.5;
  return 0.0;
}

function extractFeatures(a: ArtistFeatures): Record<string, number | null> {
  const growthRatio =
    a.growth30d != null && a.expectedGrowth30d != null && a.expectedGrowth30d > 0
      ? a.growth30d / a.expectedGrowth30d
      : null;
  const audienceLog =
    a.audienceSize != null && a.audienceSize > 0 ? Math.log(a.audienceSize) : null;
  return {
    growth_ratio: growthRatio,
    audience_log: audienceLog,
    engagement_ratio: a.commentsPerThousandViews,
    save_share: a.saveShare,
    integrity_encoded: integrityEncoded(a.integrity),
    evidence_coverage: a.evidenceCoverage,
    has_observations: a.hasObservations ? 1 : 0,
    has_snapshots: a.hasSnapshots ? 1 : 0,
    momentum_score: a.momentumScore,
  };
}

function computeScore(features: Record<string, number | null>): number | null {
  const values = model.features.map((name, idx) => {
    const raw = features[name];
    if (raw == null) return 0;
    const mean = model.means[idx] ?? 0;
    const std = model.stds[idx] ?? 1;
    return (raw - mean) / std;
  });
  let logit = model.intercept;
  for (let i = 0; i < values.length; i++) {
    const coef = model.coefficients[i] ?? 0;
    logit += (values[i] ?? 0) * coef;
  }
  return 1 / (1 + Math.exp(-logit));
}

function confidenceFromCoverage(
  features: Record<string, number | null>,
): "low" | "medium" | "high" {
  let present = 0;
  let total = 0;
  for (const [key, value] of Object.entries(features)) {
    if (key === "has_observations" || key === "has_snapshots") continue;
    total++;
    if (value != null) present++;
  }
  const ratio = total > 0 ? present / total : 0;
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}

export function predictBreakout(a: ArtistFeatures): Prediction {
  const featuresUsed = extractFeatures(a);
  const score = computeScore(featuresUsed);
  if (score == null)
    return {
      score: 0.5,
      confidence: "low",
      modelVersion: model.version,
      featuresUsed,
      disclaimer: model.disclaimer,
    };
  return {
    score: Math.round(score * 10000) / 10000,
    confidence: confidenceFromCoverage(featuresUsed),
    modelVersion: model.version,
    featuresUsed,
    disclaimer: model.disclaimer,
  };
}

export function getModelInfo() {
  return {
    version: model.version,
    trainedAt: model.trained_at,
    features: model.features,
    aucOnSynthetic: model.auc_on_synthetic,
    trainingData: model.training_data,
    nSamples: model.n_samples,
    disclaimer: model.disclaimer,
  };
}
