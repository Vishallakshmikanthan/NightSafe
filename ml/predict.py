"""
NightSafe Safety Scoring Model — Prediction Script

Loads the trained model and scores route segments.
"""

import joblib
import pandas as pd
import numpy as np
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_DIR = Path(__file__).resolve().parent / "models"


def load_model():
    model_path = MODEL_DIR / "safety_model.joblib"
    if not model_path.exists():
        raise FileNotFoundError(
            f"No trained model found at {model_path}. Run train.py first."
        )
    return joblib.load(model_path)


def predict_safety(segments_df: pd.DataFrame) -> np.ndarray:
    """Predict safety scores for a DataFrame of route segments."""
    model = load_model()

    traffic_map = {"low": 0, "medium": 1, "high": 2}
    if "pedestrian_traffic_enc" not in segments_df.columns:
        segments_df = segments_df.copy()
        segments_df["pedestrian_traffic_enc"] = segments_df[
            "pedestrian_traffic"
        ].map(traffic_map)

    feature_cols = [
        "crime_count",
        "avg_lighting_lux",
        "has_cctv",
        "pedestrian_traffic_enc",
        "distance_m",
    ]
    X = segments_df[feature_cols]
    scores = model.predict(X)
    return np.clip(scores, 0, 100).round(1)


def main():
    """Run predictions on the sample route segments."""
    df = pd.read_csv(DATA_DIR / "route_segments.csv")
    scores = predict_safety(df)

    df["predicted_safety_score"] = scores
    print(df[["segment_id", "crime_count", "avg_lighting_lux", "predicted_safety_score"]])


if __name__ == "__main__":
    main()
