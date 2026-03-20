"""
NightSafe Safety Scoring Model — Training Script

Trains a Random Forest regressor to predict a 0-100 safety score
for route segments based on crime density, lighting coverage,
CCTV presence, and pedestrian traffic.
"""

import os
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_DIR = Path(__file__).resolve().parent / "models"


def load_training_data() -> pd.DataFrame:
    """Load and merge route segment data with engineered features."""
    df = pd.read_csv(DATA_DIR / "route_segments.csv")

    # Encode categorical feature
    traffic_map = {"low": 0, "medium": 1, "high": 2}
    df["pedestrian_traffic_enc"] = df["pedestrian_traffic"].map(traffic_map)

    # Engineer a target safety score (0-100) from the raw features
    # Higher lighting + lower crime + CCTV + foot traffic = safer
    max_crime = df["crime_count"].max() or 1
    df["safety_score"] = (
        (1 - df["crime_count"] / max_crime) * 40
        + (df["avg_lighting_lux"] / 60) * 30
        + df["has_cctv"] * 15
        + (df["pedestrian_traffic_enc"] / 2) * 15
    ).clip(0, 100).round(1)

    return df


def train():
    """Train and save the safety scoring model."""
    df = load_training_data()

    feature_cols = [
        "crime_count",
        "avg_lighting_lux",
        "has_cctv",
        "pedestrian_traffic_enc",
        "distance_m",
    ]
    X = df[feature_cols]
    y = df["safety_score"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=100, max_depth=6, random_state=42
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"Training complete — MAE: {mae:.2f}, R²: {r2:.3f}")
    print(f"Features: {feature_cols}")

    MODEL_DIR.mkdir(exist_ok=True)
    model_path = MODEL_DIR / "safety_model.joblib"
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")


if __name__ == "__main__":
    train()
