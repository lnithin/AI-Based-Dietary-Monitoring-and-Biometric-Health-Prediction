#!/usr/bin/env python3
"""
Blood Pressure LSTM-style Model (lightweight wrapper)
Implements medically-constrained prediction with a deterministic core and optional Keras LSTM.

Inputs (12, ordered):
  1. sodium_mg              (0–6000)
  2. stress_level           (0–1)
  3. activity_level         (0–1)
  4. age                    (18–90)
  5. weight_kg              (35–200)
  6. caffeine_mg            (0–500)
  7. sleep_quality          (0–1)
  8. hydration_level        (0–1)
  9. medication_taken       (0/1)
 10. baseline_systolic      (80–200)
 11. baseline_diastolic     (50–130)
 12. time_since_last_meal   (0–24)

Outputs:
  {
    systolic_bp: float,
    diastolic_bp: float,
    delta_systolic: float,
    delta_diastolic: float,
    risk_level: str,
    confidence: float
  }
"""

from typing import Dict, Tuple
import numpy as np

try:
    import tensorflow as tf  # noqa: F401
    TENSORFLOW_AVAILABLE = True
except Exception:
    TENSORFLOW_AVAILABLE = False


class BloodPressureLSTMModel:
    def __init__(self, sequence_length: int = 24, feature_dim: int = 12):
        self.sequence_length = sequence_length
        self.feature_dim = feature_dim
        self.model = None
        self.is_trained = False

        if TENSORFLOW_AVAILABLE:
            try:
                from tensorflow import keras
                inputs = keras.Input(shape=(sequence_length, feature_dim))
                x = keras.layers.LSTM(48, return_sequences=True)(inputs)
                x = keras.layers.Dropout(0.2)(x)
                x = keras.layers.LSTM(24)(x)
                x = keras.layers.Dense(32, activation='relu')(x)
                outputs = keras.layers.Dense(2, activation='linear')(x)  # systolic, diastolic deltas
                model = keras.Model(inputs, outputs)
                model.compile(optimizer='adam', loss='mae')
                self.model = model
            except Exception:
                # Fall back to deterministic core only
                self.model = None

    def get_feature_names(self):
        return [
            'sodium_mg', 'stress_level', 'activity_level', 'age', 'weight_kg',
            'caffeine_mg', 'sleep_quality', 'hydration_level', 'medication_taken',
            'baseline_systolic', 'baseline_diastolic', 'time_since_last_meal'
        ]

    # Core deterministic physiology + rules; sums with modifiers and clamps
    def _deterministic_prediction(self, features: Dict) -> Tuple[float, float, float, float, float]:
        sodium = float(features.get('sodium_mg', 0.0))
        stress = float(features.get('stress_level', 0.0))
        activity = float(features.get('activity_level', 0.0))
        age = float(features.get('age', 40.0))
        weight = float(features.get('weight_kg', 75.0))
        caffeine = float(features.get('caffeine_mg', 0.0))
        sleep = float(features.get('sleep_quality', 0.7))
        hydration = float(features.get('hydration_level', 0.6))
        meds = float(features.get('medication_taken', 0.0))
        base_sys = float(features.get('baseline_systolic', 120.0))
        base_dia = float(features.get('baseline_diastolic', 80.0))
        tlast = float(features.get('time_since_last_meal', 2.0))

        # Baseline-based buffers
        crisis_prone = (base_sys >= 160.0 or base_dia >= 100.0)

        # Positive drivers (raise BP)
        sodium_factor = 0.0
        if sodium > 2300.0:
            sodium_factor = min((sodium - 2300.0) / 100.0, 20.0) * 0.6  # up to ~12 mmHg
        else:
            sodium_factor = (sodium / 2300.0) * 3.0  # sub-2300 still contributes mildly (≤3)

        stress_factor = min(max(stress, 0.0), 1.0) * 10.0  # up to +10
        caffeine_factor = min(caffeine / 100.0, 5.0) * 0.8  # up to +4

        # Age/weight mild trends
        age_factor = max(0.0, (age - 45.0) * 0.06)  # +1.2 at 65
        weight_factor = max(0.0, (weight - 80.0) * 0.04)  # +4 at 180kg

        # Negative drivers (reduce BP)
        activity_factor = -min(max(activity, 0.0), 1.0) * 12.0  # up to -12
        hydration_factor = -max(0.0, (hydration - 0.5)) * 10.0  # up to -5
        sleep_factor = -max(0.0, (sleep - 0.6)) * 8.0  # up to -3.2
        meds_factor = -min(max(meds, 0.0), 1.0) * 15.0  # up to -15

        # Meal timing small: closer to meal slightly increases
        timing_factor = 2.0 * np.exp(-tlast)  # decays with hours

        delta_sys_raw = (
            sodium_factor + stress_factor + caffeine_factor + age_factor + weight_factor + timing_factor
            + activity_factor + hydration_factor + sleep_factor + meds_factor
        )
        delta_dia_raw = (
            0.6 * sodium_factor + 0.6 * stress_factor + 0.4 * caffeine_factor + 0.5 * age_factor + 0.4 * weight_factor
            + 0.5 * timing_factor + 0.7 * activity_factor + 0.8 * hydration_factor + 0.6 * sleep_factor + 0.7 * meds_factor
        )

        # Per-meal delta caps (MANDATORY)
        delta_sys = float(np.clip(delta_sys_raw, -20.0, 40.0))
        delta_dia = float(np.clip(delta_dia_raw, -15.0, 25.0))

        # Apply to baseline
        sys = base_sys + delta_sys
        dia = base_dia + delta_dia

        # Absolute physiological bounds
        sys = float(np.clip(sys, 90.0, 220.0))
        dia = float(np.clip(dia, 60.0, 140.0))

        # No meal may push into crisis unless baseline already high
        # Crisis threshold: systolic>180 or diastolic>120
        if not crisis_prone:
            if sys > 180.0:
                sys = 179.0
                delta_sys = sys - base_sys
            if dia > 120.0:
                dia = 119.0
                delta_dia = dia - base_dia

        # Confidence heuristic
        confidence = 0.82
        # Penalize if many clamps
        clamps = int(abs(delta_sys_raw - delta_sys) > 1e-6) + int(abs(delta_dia_raw - delta_dia) > 1e-6)
        if clamps:
            confidence -= 0.12
        confidence = float(np.clip(confidence, 0.5, 0.95))

        return sys, dia, delta_sys, delta_dia, confidence

    def predict(self, features: Dict) -> Dict:
        # In this project, we use deterministic core (no re-train requirement)
        sys, dia, dsys, ddia, conf = self._deterministic_prediction(features)

        # Risk classification (AHA)
        risk = 'Normal'
        if sys < 120 and dia < 80:
            risk = 'Normal'
        elif 120 <= sys < 130 and dia < 80:
            risk = 'Elevated'
        elif (130 <= sys < 140) or (80 <= dia < 90):
            risk = 'Stage 1 Hypertension'
        elif (140 <= sys <= 180) or (90 <= dia <= 120):
            risk = 'Stage 2 Hypertension'
        elif sys > 180 or dia > 120:
            risk = 'Hypertensive Crisis'

        return {
            'systolic_bp': round(sys, 1),
            'diastolic_bp': round(dia, 1),
            'delta_systolic': round(dsys, 1),
            'delta_diastolic': round(ddia, 1),
            'risk_level': risk,
            'confidence': round(conf, 2)
        }
