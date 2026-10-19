#!/usr/bin/env python3
"""Train a breakout-prediction model and export weights to JSON for Node.js inference.

Usage:
    python ml/train.py

Reads nothing from the database. Generates a synthetic training set with a known
signal pattern (high growth ratio + engagement + clean integrity => breakout),
trains a logistic regression, and writes ml/model.json.

The exported JSON contains feature means/stds for normalization, coefficients,
and an intercept — all Node.js needs to compute sigmoid(w·x + b) at inference time.

This is a BASELINE. It is trained on synthetic data and is NOT validated against
real outcomes. Replace the synthetic generator with a real labelled dataset before
any operational use.
"""

import json
import os
from datetime import datetime, timezone

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

FEATURE_NAMES = [
    "growth_ratio",
    "audience_log",
    "engagement_ratio",
    "save_share",
    "integrity_encoded",
    "evidence_coverage",
    "has_observations",
    "has_snapshots",
    "momentum_score",
]

N_SAMPLES = 4000
RANDOM_SEED = 42


def generate_synthetic(n: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """Return (X, y) with a learnable signal plus noise."""
    rng = np.random.default_rng(seed)

    growth_ratio = rng.gamma(2.0, 0.8, n)
    audience_log = rng.normal(10.0, 2.5, n)
    engagement_ratio = rng.gamma(1.5, 0.4, n)
    save_share = rng.beta(2, 8, n)
    integrity_encoded = rng.choice([0.0, 0.5, 1.0], n, p=[0.15, 0.25, 0.60])
    evidence_coverage = rng.beta(3, 2, n)
    has_observations = rng.binomial(1, 0.5, n).astype(float)
    has_snapshots = rng.binomial(1, 0.4, n).astype(float)
    momentum_score = rng.normal(50, 20, n).clip(0, 100)

    X = np.column_stack([
        growth_ratio, audience_log, engagement_ratio, save_share,
        integrity_encoded, evidence_coverage, has_observations,
        has_snapshots, momentum_score,
    ])

    logit = (
        1.2 * np.log(growth_ratio + 0.1)
        + 0.4 * engagement_ratio
        + 0.8 * integrity_encoded
        + 0.6 * evidence_coverage
        + 0.3 * has_observations
        + 0.2 * momentum_score / 100.0
        - 1.5
        + rng.normal(0, 0.5, n)
    )
    proba = 1.0 / (1.0 + np.exp(-logit))
    y = (rng.uniform(0, 1, n) < proba).astype(int)
    return X, y


def main() -> None:
    X, y = generate_synthetic(N_SAMPLES, RANDOM_SEED)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    means = X_train.mean(axis=0)
    stds = X_train.std(axis=0)
    stds[stds == 0] = 1.0
    X_train_scaled = (X_train - means) / stds
    X_test_scaled = (X_test - means) / stds

    model = LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)
    model.fit(X_train_scaled, y_train)

    y_proba = model.predict_proba(X_test_scaled)[:, 1]
    auc = float(roc_auc_score(y_test, y_proba))

    model_json = {
        "version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "features": FEATURE_NAMES,
        "means": [round(float(m), 6) for m in means],
        "stds": [round(float(s), 6) for s in stds],
        "coefficients": [round(float(c), 6) for c in model.coef_[0]],
        "intercept": round(float(model.intercept_[0]), 6),
        "auc_on_synthetic": round(auc, 4),
        "training_data": "synthetic_baseline_v1",
        "n_samples": N_SAMPLES,
        "disclaimer": (
            "UNVALIDATED MODEL — trained on synthetic data with a known signal pattern. "
            "AUC reflects separation on synthetic labels, not real-world predictive power. "
            "Replace with a real labelled dataset and complete governance review before "
            "any operational use. No source in this repository is approved for model training."
        ),
    }

    out_path = os.path.join(os.path.dirname(__file__), "model.json")
    with open(out_path, "w") as f:
        json.dump(model_json, f, indent=2)

    print(f"Model written to {out_path}")
    print(f"  AUC (synthetic test set): {auc:.4f}")
    print(f"  Features: {len(FEATURE_NAMES)}")
    print(f"  Samples: {N_SAMPLES}")


if __name__ == "__main__":
    main()
