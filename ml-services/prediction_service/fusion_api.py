#!/usr/bin/env python3
"""
Multi-Modal Fusion API
Provides endpoints for late-fusion prediction combining CV, NLP, and biometric data.

Endpoints:
  GET  /api/fusion/health      - Service health check
  POST /api/fusion/predict     - Fuse predictions from all modalities
  GET  /api/fusion/info        - Fusion engine information
"""

from flask import Blueprint, request, jsonify
from fusion_engine import MultiModalFusionEngine, validate_fusion_inputs
import logging

logger = logging.getLogger(__name__)

# Create blueprint
fusion_bp = Blueprint('fusion', __name__)

# Global fusion engine instance
fusion_engine = None


def init_fusion_engine():
    """Initialize the fusion engine"""
    global fusion_engine
    try:
        fusion_engine = MultiModalFusionEngine()
        logger.info("✅ Multi-Modal Fusion Engine initialized")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize fusion engine: {str(e)}")
        return False


@fusion_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = {
        'service': 'multi_modal_fusion',
        'status': 'healthy' if fusion_engine is not None else 'unhealthy',
        'engine_loaded': fusion_engine is not None,
        'fusion_type': 'late-fusion',
        'version': '1.0.0'
    }
    status_code = 200 if fusion_engine is not None else 503
    return jsonify(status), status_code


@fusion_bp.route('/info', methods=['GET'])
def fusion_info():
    """Get fusion engine information"""
    return jsonify({
        'service': 'multi_modal_fusion',
        'architecture': 'late-fusion (decision-level)',
        'modalities': ['computer_vision', 'nlp_nutrition', 'biometric_prediction'],
        'fusion_weights': {
            'cv_confidence': 0.25,
            'nlp_completeness': 0.25,
            'biometric_confidence': 0.35,
            'explainability_agreement': 0.15
        },
        'reliability_thresholds': {
            'high': '≥ 0.85',
            'medium': '0.65 - 0.85',
            'low': '< 0.65'
        },
        'clinical_thresholds_mg_dl': {
            'glucose': 30.0,
            'blood_pressure': 15.0,
            'cholesterol': 20.0
        },
        'paper_claim': (
            'The system employs late-fusion to integrate visual, textual, and '
            'biometric modalities into a unified health prediction with '
            'quantified reliability.'
        )
    }), 200


@fusion_bp.route('/predict', methods=['POST'])
def predict_fusion():
    """
    Fuse multi-modal predictions into single health prediction.
    
    Request body:
        {
            "biomarker": "cholesterol",
            "cv_data": {
                "food_name": "Vada",
                "confidence": 0.96
            },
            "nlp_data": {
                "saturated_fat_g": 15.0,
                "trans_fat_g": 0.5,
                "dietary_cholesterol_mg": 200.0,
                "fiber_g": 8.0,
                "sugar_g": 25.0,
                "sodium_mg": 1800.0
            },
            "biometric_data": {
                "predicted_value": 205.9,
                "baseline": 185.5,
                "delta": 20.4,
                "risk_level": "Borderline",
                "confidence": 0.80
            },
            "shap_data": {
                "ldl_drivers": [
                    {"factor": "Saturated Fat", "contribution": 12.5, "direction": "increase"}
                ],
                "hdl_drivers": []
            }
        }
    
    Response:
        {
            "fusion_result": {
                "biomarker": "cholesterol",
                "final_prediction": 205.9,
                "risk_level": "Borderline",
                "fusion_score": 0.91,
                "reliability": "High",
                "modality_scores": {
                    "cv": 0.96,
                    "nlp": 0.92,
                    "biometric": 0.88,
                    "explainability": 0.89
                },
                "explanation": "Prediction reliability is High (91%)...",
                "driver_analysis": {
                    "cv_modality": {...},
                    "nlp_modality": {...},
                    "biometric_modality": {...},
                    "explainability": {...}
                }
            },
            "status": "success"
        }
    """
    if fusion_engine is None:
        return jsonify({
            'error': 'Fusion engine not initialized',
            'status': 'service_unavailable'
        }), 503
    
    try:
        data = request.get_json()
        
        # Extract fusion components
        biomarker = data.get('biomarker', '').lower()
        cv_data = data.get('cv_data', {})
        nlp_data = data.get('nlp_data', {})
        biometric_data = data.get('biometric_data', {})
        shap_data = data.get('shap_data', None)
        
        # Validate inputs
        is_valid, error_msg = validate_fusion_inputs(cv_data, nlp_data, biometric_data)
        if not is_valid:
            return jsonify({
                'error': error_msg,
                'status': 'validation_error'
            }), 400
        
        # Validate biomarker
        valid_biomarkers = ['glucose', 'blood_pressure', 'cholesterol']
        if biomarker not in valid_biomarkers:
            return jsonify({
                'error': f'Invalid biomarker. Must be one of: {", ".join(valid_biomarkers)}',
                'status': 'validation_error'
            }), 400
        
        # Perform fusion
        result = fusion_engine.fuse(
            biomarker=biomarker,
            cv_data=cv_data,
            nlp_data=nlp_data,
            biometric_data=biometric_data,
            shap_data=shap_data
        )
        
        # Convert result to dict
        fusion_result = {
            'biomarker': result.biomarker,
            'final_prediction': result.final_prediction,
            'baseline': result.driver_analysis.get('biometric_modality', {}).get('baseline'),
            'delta': result.driver_analysis.get('biometric_modality', {}).get('delta'),
            'risk_level': result.risk_level,
            'fusion_score': result.fusion_score,
            'reliability': result.reliability,
            'modality_scores': result.modality_scores,
            'explanation': result.explanation,
            'driver_summary': result.driver_analysis.get('driver_summary', []),
            'driver_analysis': result.driver_analysis
        }
        
        response = {
            'fusion_result': fusion_result,
            'status': 'success'
        }
        
        logger.info(f"✅ Fusion prediction: {biomarker} → {result.risk_level} (score: {result.fusion_score})")
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"❌ Fusion prediction error: {str(e)}")
        return jsonify({
            'error': f'Fusion failed: {str(e)}',
            'status': 'server_error'
        }), 500


@fusion_bp.route('/validate', methods=['POST'])
def validate_inputs():
    """
    Validate fusion inputs without performing fusion.
    
    Useful for frontend to check data completeness before submission.
    """
    try:
        data = request.get_json()
        
        cv_data = data.get('cv_data', {})
        nlp_data = data.get('nlp_data', {})
        biometric_data = data.get('biometric_data', {})
        
        is_valid, error_msg = validate_fusion_inputs(cv_data, nlp_data, biometric_data)
        
        if is_valid:
            return jsonify({
                'valid': True,
                'message': 'All inputs valid',
                'status': 'success'
            }), 200
        else:
            return jsonify({
                'valid': False,
                'error': error_msg,
                'status': 'validation_error'
            }), 400
            
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': f'Validation error: {str(e)}',
            'status': 'server_error'
        }), 500
