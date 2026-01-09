#!/usr/bin/env python3
"""
Cholesterol Prediction API - Flask Blueprint
Provides endpoints for cholesterol prediction with medical constraints and explainability.

Endpoints:
  GET  /api/cholesterol/health        - Service health check
  GET  /api/cholesterol/features      - List of input features with metadata
  POST /api/cholesterol/predict       - Predict cholesterol levels
  POST /api/cholesterol/explain       - Get SHAP-style explanations
"""

from flask import Blueprint, request, jsonify
from cholesterol_prediction_model import CholesterolLSTMModel
import logging

logger = logging.getLogger(__name__)

# Create blueprint
cholesterol_bp = Blueprint('cholesterol', __name__)

# Global model instance (initialized in run_api.py)
cholesterol_model = None


def init_cholesterol_model():
    """Initialize the cholesterol prediction model"""
    global cholesterol_model
    try:
        cholesterol_model = CholesterolLSTMModel()
        logger.info("✅ Cholesterol prediction model initialized")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize cholesterol model: {str(e)}")
        return False


def _validate_cholesterol_inputs(data: dict) -> tuple:
    """
    Validate cholesterol prediction inputs against medical ranges.
    
    Returns: (is_valid, error_message)
    """
    required_fields = [
        'saturated_fat_g', 'trans_fat_g', 'dietary_cholesterol_mg', 'fiber_g',
        'sugar_g', 'sodium_mg', 'activity_level', 'stress_level',
        'sleep_quality', 'hydration_level', 'age', 'weight_kg',
        'baseline_ldl', 'baseline_hdl'
    ]
    
    # Check all required fields present
    missing = [f for f in required_fields if f not in data]
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"
    
    # Validation ranges (medical + physiological)
    validations = {
        'saturated_fat_g': (0.0, 100.0, "Saturated fat"),
        'trans_fat_g': (0.0, 10.0, "Trans fat"),
        'dietary_cholesterol_mg': (0.0, 1000.0, "Dietary cholesterol"),
        'fiber_g': (0.0, 60.0, "Fiber"),
        'sugar_g': (0.0, 150.0, "Sugar"),
        'sodium_mg': (0.0, 6000.0, "Sodium"),
        'activity_level': (0.0, 1.0, "Activity level"),
        'stress_level': (0.0, 1.0, "Stress level"),
        'sleep_quality': (0.0, 1.0, "Sleep quality"),
        'hydration_level': (0.0, 1.0, "Hydration level"),
        'age': (18.0, 90.0, "Age"),
        'weight_kg': (35.0, 200.0, "Weight"),
        'baseline_ldl': (40.0, 250.0, "Baseline LDL"),
        'baseline_hdl': (20.0, 100.0, "Baseline HDL")
    }
    
    # Validate each field
    for field, (min_val, max_val, label) in validations.items():
        try:
            value = float(data[field])
            if not (min_val <= value <= max_val):
                return False, f"{label} must be between {min_val} and {max_val} (got {value})"
        except (ValueError, TypeError):
            return False, f"{label} must be a valid number"
    
    return True, None


@cholesterol_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = {
        'service': 'cholesterol_prediction',
        'status': 'healthy' if cholesterol_model is not None else 'unhealthy',
        'model_loaded': cholesterol_model is not None,
        'model_type': 'LSTM with deterministic core',
        'version': '1.0.0'
    }
    status_code = 200 if cholesterol_model is not None else 503
    return jsonify(status), status_code


@cholesterol_bp.route('/features', methods=['GET'])
def get_features():
    """Get list of input features with metadata"""
    features = [
        {
            'name': 'saturated_fat_g',
            'type': 'float',
            'range': [0.0, 100.0],
            'unit': 'grams',
            'description': 'Saturated fat intake in meal'
        },
        {
            'name': 'trans_fat_g',
            'type': 'float',
            'range': [0.0, 10.0],
            'unit': 'grams',
            'description': 'Trans fat intake in meal'
        },
        {
            'name': 'dietary_cholesterol_mg',
            'type': 'float',
            'range': [0.0, 1000.0],
            'unit': 'mg',
            'description': 'Dietary cholesterol intake'
        },
        {
            'name': 'fiber_g',
            'type': 'float',
            'range': [0.0, 60.0],
            'unit': 'grams',
            'description': 'Dietary fiber intake'
        },
        {
            'name': 'sugar_g',
            'type': 'float',
            'range': [0.0, 150.0],
            'unit': 'grams',
            'description': 'Sugar intake in meal'
        },
        {
            'name': 'sodium_mg',
            'type': 'float',
            'range': [0.0, 6000.0],
            'unit': 'mg',
            'description': 'Sodium intake'
        },
        {
            'name': 'activity_level',
            'type': 'float',
            'range': [0.0, 1.0],
            'unit': 'normalized',
            'description': 'Physical activity level (0=sedentary, 1=very active)'
        },
        {
            'name': 'stress_level',
            'type': 'float',
            'range': [0.0, 1.0],
            'unit': 'normalized',
            'description': 'Stress level (0=relaxed, 1=very stressed)'
        },
        {
            'name': 'sleep_quality',
            'type': 'float',
            'range': [0.0, 1.0],
            'unit': 'normalized',
            'description': 'Sleep quality (0=poor, 1=excellent)'
        },
        {
            'name': 'hydration_level',
            'type': 'float',
            'range': [0.0, 1.0],
            'unit': 'normalized',
            'description': 'Hydration status (0=dehydrated, 1=well hydrated)'
        },
        {
            'name': 'age',
            'type': 'integer',
            'range': [18, 90],
            'unit': 'years',
            'description': 'Patient age'
        },
        {
            'name': 'weight_kg',
            'type': 'float',
            'range': [35.0, 200.0],
            'unit': 'kg',
            'description': 'Body weight'
        },
        {
            'name': 'baseline_ldl',
            'type': 'float',
            'range': [40.0, 250.0],
            'unit': 'mg/dL',
            'description': 'Pre-meal LDL cholesterol level'
        },
        {
            'name': 'baseline_hdl',
            'type': 'float',
            'range': [20.0, 100.0],
            'unit': 'mg/dL',
            'description': 'Pre-meal HDL cholesterol level'
        }
    ]
    
    return jsonify({
        'feature_count': 14,
        'features': features
    }), 200


@cholesterol_bp.route('/predict', methods=['POST'])
def predict_cholesterol():
    """
    Predict cholesterol levels from dietary and lifestyle inputs.
    
    Request body:
        {
            "saturated_fat_g": 15.0,
            "trans_fat_g": 0.5,
            "dietary_cholesterol_mg": 200.0,
            "fiber_g": 8.0,
            "sugar_g": 25.0,
            "sodium_mg": 1800.0,
            "activity_level": 0.6,
            "stress_level": 0.4,
            "sleep_quality": 0.7,
            "hydration_level": 0.8,
            "age": 45,
            "weight_kg": 75.0,
            "baseline_ldl": 130.0,
            "baseline_hdl": 45.0
        }
    
    Response:
        {
            "prediction": {
                "ldl": 145.2,
                "hdl": 46.8,
                "total_cholesterol": 205.5,
                "delta_ldl": 15.2,
                "delta_hdl": 1.8,
                "risk_level": "Borderline",
                "confidence": 0.78
            },
            "derived_metrics": {
                "fiber_protection": "Moderate",
                "fat_risk": "High",
                "ldl_hdl_ratio": 3.1,
                "total_hdl_ratio": 4.4
            },
            "explainability": {
                "ldl_drivers": [...],
                "hdl_drivers": [...]
            }
        }
    """
    if cholesterol_model is None:
        return jsonify({
            'error': 'Cholesterol prediction model not initialized',
            'status': 'service_unavailable'
        }), 503
    
    try:
        data = request.get_json()
        
        # Validate inputs
        is_valid, error_msg = _validate_cholesterol_inputs(data)
        if not is_valid:
            return jsonify({
                'error': error_msg,
                'status': 'validation_error'
            }), 400
        
        # Make prediction
        prediction = cholesterol_model.predict(data)
        
        # Calculate derived metrics
        derived = _calculate_derived_metrics(data, prediction)
        
        # Generate explainability
        explainability = _generate_explainability(data, prediction)
        
        response = {
            'prediction': prediction,
            'derived_metrics': derived,
            'explainability': explainability,
            'status': 'success'
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Cholesterol prediction error: {str(e)}")
        return jsonify({
            'error': f'Prediction failed: {str(e)}',
            'status': 'server_error'
        }), 500


def _calculate_derived_metrics(inputs: dict, prediction: dict) -> dict:
    """Calculate additional interpretable metrics"""
    fiber = inputs['fiber_g']
    sat_fat = inputs['saturated_fat_g']
    trans_fat = inputs['trans_fat_g']
    ldl = prediction['ldl']
    hdl = prediction['hdl']
    total = prediction['total_cholesterol']
    
    # Fiber protection level
    if fiber >= 25:
        fiber_protection = "High"
    elif fiber >= 10:
        fiber_protection = "Moderate"
    else:
        fiber_protection = "Low"
    
    # Fat risk level
    total_bad_fat = sat_fat + (trans_fat * 2)  # Trans fat counts double
    if total_bad_fat >= 20:
        fat_risk = "High"
    elif total_bad_fat >= 10:
        fat_risk = "Moderate"
    else:
        fat_risk = "Low"
    
    # LDL/HDL ratio (optimal < 3.5)
    ldl_hdl_ratio = round(ldl / hdl, 2) if hdl > 0 else 999.0
    
    # Total/HDL ratio (optimal < 5.0)
    total_hdl_ratio = round(total / hdl, 2) if hdl > 0 else 999.0
    
    # Non-HDL cholesterol (should be < 130)
    non_hdl = round(total - hdl, 1)
    
    return {
        'fiber_protection': fiber_protection,
        'fat_risk': fat_risk,
        'ldl_hdl_ratio': ldl_hdl_ratio,
        'total_hdl_ratio': total_hdl_ratio,
        'non_hdl_cholesterol': non_hdl
    }


def _generate_explainability(inputs: dict, prediction: dict) -> dict:
    """
    Generate SHAP-style explanations for cholesterol predictions.
    
    Contributions should sum approximately to deltas.
    """
    # Extract inputs
    sat_fat = inputs['saturated_fat_g']
    trans_fat = inputs['trans_fat_g']
    dietary_chol = inputs['dietary_cholesterol_mg']
    fiber = inputs['fiber_g']
    sugar = inputs['sugar_g']
    activity = inputs['activity_level']
    stress = inputs['stress_level']
    sleep = inputs['sleep_quality']
    
    delta_ldl = prediction['delta_ldl']
    delta_hdl = prediction['delta_hdl']
    
    # LDL contributions (should sum to delta_ldl)
    ldl_sat_fat = min(sat_fat * 2.5, 40.0)
    ldl_trans_fat = min(trans_fat * 4.0, 30.0)
    ldl_dietary_chol = min(dietary_chol / 100.0, 15.0)
    ldl_sugar = min(sugar / 30.0, 8.0)
    ldl_stress = stress * 6.0
    ldl_fiber = -min(fiber * 1.8, 25.0)
    ldl_activity = -activity * 8.0
    ldl_sleep = -(sleep - 0.6) * 5.0 if sleep > 0.6 else 0.0
    
    # Normalize to sum to delta_ldl
    ldl_sum = ldl_sat_fat + ldl_trans_fat + ldl_dietary_chol + ldl_sugar + ldl_stress + ldl_fiber + ldl_activity + ldl_sleep
    scale_factor = delta_ldl / ldl_sum if abs(ldl_sum) > 0.1 else 1.0
    
    ldl_drivers = [
        {'factor': 'Saturated Fat', 'contribution': round(ldl_sat_fat * scale_factor, 2), 'direction': 'increase'},
        {'factor': 'Trans Fat', 'contribution': round(ldl_trans_fat * scale_factor, 2), 'direction': 'increase'},
        {'factor': 'Dietary Cholesterol', 'contribution': round(ldl_dietary_chol * scale_factor, 2), 'direction': 'increase'},
        {'factor': 'Sugar', 'contribution': round(ldl_sugar * scale_factor, 2), 'direction': 'increase'},
        {'factor': 'Stress', 'contribution': round(ldl_stress * scale_factor, 2), 'direction': 'increase'},
        {'factor': 'Fiber', 'contribution': round(ldl_fiber * scale_factor, 2), 'direction': 'decrease'},
        {'factor': 'Physical Activity', 'contribution': round(ldl_activity * scale_factor, 2), 'direction': 'decrease'},
        {'factor': 'Sleep Quality', 'contribution': round(ldl_sleep * scale_factor, 2), 'direction': 'decrease'}
    ]
    
    # HDL contributions (should sum to delta_hdl)
    hdl_activity = activity * 5.0
    hdl_sleep = (sleep - 0.7) * 3.0 if sleep > 0.7 else 0.0
    hdl_trans_fat = -trans_fat * 1.5
    hdl_sugar = -min(sugar / 50.0, 4.0)
    hdl_stress = -stress * 3.0
    
    hdl_sum = hdl_activity + hdl_sleep + hdl_trans_fat + hdl_sugar + hdl_stress
    hdl_scale = delta_hdl / hdl_sum if abs(hdl_sum) > 0.1 else 1.0
    
    hdl_drivers = [
        {'factor': 'Physical Activity', 'contribution': round(hdl_activity * hdl_scale, 2), 'direction': 'increase'},
        {'factor': 'Sleep Quality', 'contribution': round(hdl_sleep * hdl_scale, 2), 'direction': 'increase'},
        {'factor': 'Trans Fat', 'contribution': round(hdl_trans_fat * hdl_scale, 2), 'direction': 'decrease'},
        {'factor': 'Sugar', 'contribution': round(hdl_sugar * hdl_scale, 2), 'direction': 'decrease'},
        {'factor': 'Stress', 'contribution': round(hdl_stress * hdl_scale, 2), 'direction': 'decrease'}
    ]
    
    return {
        'ldl_drivers': sorted(ldl_drivers, key=lambda x: abs(x['contribution']), reverse=True),
        'hdl_drivers': sorted(hdl_drivers, key=lambda x: abs(x['contribution']), reverse=True),
        'note': 'Contributions sum approximately to predicted deltas'
    }


@cholesterol_bp.route('/explain', methods=['POST'])
def explain_cholesterol():
    """
    Dedicated endpoint for SHAP-style explanations.
    
    Same input as /predict, but returns only explainability.
    """
    if cholesterol_model is None:
        return jsonify({
            'error': 'Cholesterol prediction model not initialized',
            'status': 'service_unavailable'
        }), 503
    
    try:
        data = request.get_json()
        
        # Validate inputs
        is_valid, error_msg = _validate_cholesterol_inputs(data)
        if not is_valid:
            return jsonify({
                'error': error_msg,
                'status': 'validation_error'
            }), 400
        
        # Make prediction to get deltas
        prediction = cholesterol_model.predict(data)
        
        # Generate explainability
        explainability = _generate_explainability(data, prediction)
        
        response = {
            'explainability': explainability,
            'prediction_summary': {
                'delta_ldl': prediction['delta_ldl'],
                'delta_hdl': prediction['delta_hdl']
            },
            'status': 'success'
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Cholesterol explanation error: {str(e)}")
        return jsonify({
            'error': f'Explanation failed: {str(e)}',
            'status': 'server_error'
        }), 500
