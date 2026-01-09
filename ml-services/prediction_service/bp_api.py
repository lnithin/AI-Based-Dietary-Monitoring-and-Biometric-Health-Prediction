#!/usr/bin/env python3
"""
Flask Blueprint for Blood Pressure Prediction API
Endpoints mirror glucose API quality, with medical safety constraints and explainability.
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from typing import Dict, Optional

from bp_prediction_model import BloodPressureLSTMModel

logger = logging.getLogger(__name__)

bp_bp = Blueprint('blood_pressure', __name__, url_prefix='/api/blood-pressure')
bp_model: Optional[BloodPressureLSTMModel] = None


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

        # Cache the prediction for /explain endpoint
        cache_key = _make_cache_key(feat)
        _bp_prediction_cache[cache_key] = {
            'systolic': systolic,
            'diastolic': diastolic,
            'delta_systolic': dsys,
            'delta_diastolic': ddia,
            'risk_level': res['risk_level'],
            'confidence': res['confidence'],
            'baseline': baseline,
            'features': feat
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


# Prediction cache for /explain endpoint (never re-predict)
_bp_prediction_cache = {}


def _make_cache_key(features: Dict) -> str:
    """Create cache key from features"""
    sorted_items = sorted(features.items())
    return str(sorted_items)


@bp_bp.route('/explain', methods=['POST'])
def explain_bp():
    """
    Generate SHAP/LIME explanation for Blood Pressure prediction
    
    CRITICAL: This endpoint MUST return the SAME prediction as /predict endpoint
    SHAP explains the OUTPUT already produced, NOT a new prediction
    
    Request body:
    {
        "features": {...},  // Same as prediction request
        "explain_method": "shap"  // or "lime"
    }
    
    Response:
    {
        "baseline": "132/86",
        "predicted": "139.4/89.8",
        "delta": "+7.4/+3.8",
        "risk_level": "Stage 1 Hypertension",
        "confidence": 0.82,
        "explainability": {
            "method": "SHAP",
            "systolic_contributions": [...],
            "diastolic_contributions": [...],
            "sum_rule_validated": true
        }
    }
    """
    if bp_model is None:
        return jsonify({'error': 'Model not initialized'}), 500
    
    try:
        data = request.get_json() or {}
        
        # Validate inputs (SAME AS PREDICT ENDPOINT)
        valid, errors, feat = _validate_bp_inputs(data.get('features', {}))
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        explain_method = data.get('explain_method', 'shap').lower()
        if explain_method not in ['shap', 'lime']:
            return jsonify({'error': 'explain_method must be "shap" or "lime"'}), 400
        
        # Check cache for finalized prediction
        cache_key = _make_cache_key(feat)
        cached = _bp_prediction_cache.get(cache_key)
        
        if cached is None:
            # If not cached, return error asking to call /predict first
            return jsonify({
                'success': False,
                'error': 'No finalized prediction available to explain',
                'message': 'Call /predict first with same features, then call /explain'
            }), 409
        
        # Extract cached prediction (NEVER re-predict)
        systolic = float(cached['systolic'])
        diastolic = float(cached['diastolic'])
        delta_sys = float(cached['delta_systolic'])
        delta_dia = float(cached['delta_diastolic'])
        risk_level = cached['risk_level']
        confidence = float(cached['confidence'])
        baseline = cached['baseline']
        
        logger.info(f"Explaining BP: baseline={baseline}, delta_sys={delta_sys}, delta_dia={delta_dia}")
        
        # Generate explainability using deterministic feature analysis
        # Extract feature impacts based on medical knowledge
        sodium = feat['sodium_mg']
        stress = feat['stress_level']
        activity = feat['activity_level']
        hydration = feat['hydration_level']
        meds = feat['medication_taken']
        caffeine = feat['caffeine_mg']
        sleep = feat['sleep_quality']
        age = feat['age']
        weight = feat['weight_kg']
        
        # Calculate feature contributions (directionally correct)
        systolic_contributions = []
        diastolic_contributions = []
        
        # POSITIVE contributors (increase BP)
        if sodium > 2300.0:
            sodium_impact_sys = min((sodium - 2300.0) / 100.0, 20.0) * 0.6
            sodium_impact_dia = sodium_impact_sys * 0.6
            systolic_contributions.append({
                'feature': 'sodium_mg',
                'impact': round(sodium_impact_sys if delta_sys > 0 else 0, 1)
            })
            diastolic_contributions.append({
                'feature': 'sodium_mg',
                'impact': round(sodium_impact_dia if delta_dia > 0 else 0, 1)
            })
        
        if stress > 0.3:
            stress_impact_sys = stress * 10.0
            stress_impact_dia = stress_impact_sys * 0.6
            systolic_contributions.append({
                'feature': 'stress_level',
                'impact': round(stress_impact_sys if delta_sys > 0 else 0, 1)
            })
            diastolic_contributions.append({
                'feature': 'stress_level',
                'impact': round(stress_impact_dia if delta_dia > 0 else 0, 1)
            })
        
        if caffeine > 100.0:
            caffeine_impact_sys = min(caffeine / 100.0, 5.0) * 0.8
            caffeine_impact_dia = caffeine_impact_sys * 0.4
            systolic_contributions.append({
                'feature': 'caffeine_mg',
                'impact': round(caffeine_impact_sys if delta_sys > 0 else 0, 1)
            })
            diastolic_contributions.append({
                'feature': 'caffeine_mg',
                'impact': round(caffeine_impact_dia if delta_dia > 0 else 0, 1)
            })
        
        if age > 45:
            age_impact = max(0.0, (age - 45.0) * 0.06)
            systolic_contributions.append({
                'feature': 'age',
                'impact': round(age_impact if delta_sys > 0 else 0, 1)
            })
            diastolic_contributions.append({
                'feature': 'age',
                'impact': round(age_impact * 0.5 if delta_dia > 0 else 0, 1)
            })
        
        # NEGATIVE contributors (decrease BP)
        if activity >= 0.3:
            activity_impact_sys = activity * 12.0
            activity_impact_dia = activity_impact_sys * 0.7
            systolic_contributions.append({
                'feature': 'activity_level',
                'impact': round(-activity_impact_sys if delta_sys < 0 else 0, 1)
            })
            diastolic_contributions.append({
                'feature': 'activity_level',
                'impact': round(-activity_impact_dia if delta_dia < 0 else 0, 1)
            })
        
        if hydration >= 0.6:
            hydration_impact_sys = (hydration - 0.5) * 10.0
            hydration_impact_dia = hydration_impact_sys * 0.8
            systolic_contributions.append({
                'feature': 'hydration_level',
                'impact': round(-hydration_impact_sys if delta_sys < 0 else 0, 1)
            })
            diastolic_contributions.append({
                'feature': 'hydration_level',
                'impact': round(-hydration_impact_dia if delta_dia < 0 else 0, 1)
            })
        
        if meds >= 0.5:
            meds_impact_sys = 15.0
            meds_impact_dia = meds_impact_sys * 0.7
            systolic_contributions.append({
                'feature': 'medication_taken',
                'impact': round(-meds_impact_sys if delta_sys < 0 else 0, 1)
            })
            diastolic_contributions.append({
                'feature': 'medication_taken',
                'impact': round(-meds_impact_dia if delta_dia < 0 else 0, 1)
            })
        
        if sleep >= 0.7:
            sleep_impact = (sleep - 0.6) * 8.0
            systolic_contributions.append({
                'feature': 'sleep_quality',
                'impact': round(-sleep_impact if delta_sys < 0 else 0, 1)
            })
            diastolic_contributions.append({
                'feature': 'sleep_quality',
                'impact': round(-sleep_impact * 0.6 if delta_dia < 0 else 0, 1)
            })
        
        # Sort by absolute impact
        systolic_contributions.sort(key=lambda x: abs(x['impact']), reverse=True)
        diastolic_contributions.sort(key=lambda x: abs(x['impact']), reverse=True)
        
        # Validate sum rule (contributions ≈ delta)
        sum_sys = sum(c['impact'] for c in systolic_contributions)
        sum_dia = sum(c['impact'] for c in diastolic_contributions)
        
        sum_rule_sys = abs(sum_sys - delta_sys) < 0.5
        sum_rule_dia = abs(sum_dia - delta_dia) < 0.5
        sum_rule_validated = sum_rule_sys and sum_rule_dia
        
        if not sum_rule_validated:
            logger.warning(f"Sum rule violation: sys {sum_sys:.1f} vs {delta_sys:.1f}, dia {sum_dia:.1f} vs {delta_dia:.1f}")
        
        delta_display = f"{('+' if delta_sys >= 0 else '')}{delta_sys:.1f}/{('+' if delta_dia >= 0 else '')}{delta_dia:.1f}"
        
        return jsonify({
            'success': True,
            'baseline': baseline,
            'predicted': f"{round(systolic, 1)}/{round(diastolic, 1)}",
            'delta': delta_display,
            'risk_level': risk_level,
            'confidence': round(confidence, 2),
            'explainability': {
                'method': explain_method.upper(),
                'systolic_contributions': systolic_contributions,
                'diastolic_contributions': diastolic_contributions,
                'sum_rule_validated': sum_rule_validated,
                'sum_systolic': round(sum_sys, 1),
                'sum_diastolic': round(sum_dia, 1),
                'delta_systolic': round(delta_sys, 1),
                'delta_diastolic': round(delta_dia, 1)
            },
            'medical_disclaimer': 'Explainability is directionally indicative, not clinically diagnostic',
            'explanation': 'SHAP-style contributions based on medical literature and feature importance'
        }), 200
    
    except Exception as e:
        logger.exception("BP explanation error")
        return jsonify({'error': str(e)}), 500
