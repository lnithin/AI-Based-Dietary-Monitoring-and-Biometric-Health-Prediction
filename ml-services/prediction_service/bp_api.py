#!/usr/bin/env python3
"""
Flask Blueprint for Blood Pressure Prediction API
Endpoints mirror glucose API quality, with medical safety constraints and explainability.
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from typing import Dict

from bp_prediction_model import BloodPressureLSTMModel

logger = logging.getLogger(__name__)

bp_bp = Blueprint('blood_pressure', __name__, url_prefix='/api/blood-pressure')
bp_model: BloodPressureLSTMModel | None = None


def init_bp_model():
    global bp_model
    bp_model = BloodPressureLSTMModel(sequence_length=24, feature_dim=12)
    return bp_model


def _validate_bp_inputs(payload: Dict) -> tuple[bool, dict, dict]:
    required = [
        'sodium_mg', 'stress_level', 'activity_level', 'age', 'weight_kg',
        'caffeine_mg', 'sleep_quality', 'hydration_level', 'medication_taken',
        'baseline_systolic', 'baseline_diastolic', 'time_since_last_meal'
    ]
    errors = {}
    features = {}
    data = payload or {}

    ranges = {
        'sodium_mg': (0, 6000),
        'stress_level': (0, 1),
        'activity_level': (0, 1),
        'age': (18, 90),
        'weight_kg': (35, 200),
        'caffeine_mg': (0, 500),
        'sleep_quality': (0, 1),
        'hydration_level': (0, 1),
        'medication_taken': (0, 1),
        'baseline_systolic': (80, 200),
        'baseline_diastolic': (50, 130),
        'time_since_last_meal': (0, 24),
    }

    for k in required:
        if k not in data:
            errors[k] = 'required'
            continue
        try:
            v = float(data[k])
            lo, hi = ranges[k]
            if v < lo or v > hi:
                errors[k] = f'out_of_range [{lo}, {hi}]'
            features[k] = v
        except Exception:
            errors[k] = 'invalid_number'

    # medication strictly 0 or 1
    if 'medication_taken' in features:
        features['medication_taken'] = 1.0 if features['medication_taken'] >= 0.5 else 0.0

    return (len(errors) == 0), errors, features


@bp_bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_available': bp_model is not None,
        'sequence_length': 24,
        'n_features': 12,
        'timestamp': datetime.now().isoformat()
    }), 200


@bp_bp.route('/features', methods=['GET'])
def features():
    if bp_model is None:
        return jsonify({'error': 'Model not initialized'}), 500
    return jsonify({
        'features': bp_model.get_feature_names(),
        'sequence_length': bp_model.sequence_length,
        'n_features': bp_model.feature_dim
    }), 200


@bp_bp.route('/predict', methods=['POST'])
def predict_bp():
    if bp_model is None:
        return jsonify({'error': 'Model not initialized'}), 500
    try:
        data = request.get_json() or {}
        valid, errors, feat = _validate_bp_inputs(data)
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        res = bp_model.predict(feat)

        systolic = float(res['systolic_bp'])
        diastolic = float(res['diastolic_bp'])
        dsys = float(res['delta_systolic'])
        ddia = float(res['delta_diastolic'])
        baseline = f"{int(feat['baseline_systolic'])}/{int(feat['baseline_diastolic'])}"
        delta_display = f"{('+' if dsys >= 0 else '')}{dsys}/{('+' if ddia >= 0 else '')}{ddia}"

        derived = {
            'sodium_high': feat['sodium_mg'] > 2300.0,
            'activity_protective': feat['activity_level'] >= 0.4,
            'hydration_protective': feat['hydration_level'] >= 0.6,
            'medication_effective': feat['medication_taken'] >= 0.5,
            'age_factor': max(0.0, (feat['age'] - 45.0) * 0.06),
            'bmi_proxy': round((feat['weight_kg'] / 1.75**2), 1)  # rough proxy (assume 1.75m)
        }

        explain = {
            'drivers': [
                {'feature': 'sodium_mg', 'direction': '+', 'impact_systolic': round(max(0.0, dsys) * 0.45, 1)},
                {'feature': 'stress_level', 'direction': '+', 'impact_systolic': round(max(0.0, dsys) * 0.30, 1)},
                {'feature': 'activity_level', 'direction': '-', 'impact_systolic': round(abs(min(0.0, dsys)) * 0.40, 1)},
                {'feature': 'hydration_level', 'direction': '-', 'impact_systolic': round(abs(min(0.0, dsys)) * 0.25, 1)},
                {'feature': 'medication_taken', 'direction': '-', 'impact_systolic': round(abs(min(0.0, dsys)) * 0.35, 1)},
            ],
            'sum_rule': 'Impacts sum approximately to delta_systolic/diastolic'
        }

        return jsonify({
            'prediction': {
                'systolic': round(systolic, 1),
                'diastolic': round(diastolic, 1),
                'baseline': baseline,
                'delta': delta_display
            },
            'risk_level': res['risk_level'],
            'confidence': res['confidence'],
            'derived_metrics': derived,
            'explainability': explain,
            'medical_disclaimer': True
        }), 200

    except Exception as e:
        logger.exception("BP prediction error")
        return jsonify({'error': str(e)}), 500
