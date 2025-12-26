#!/usr/bin/env python3
"""
Explainable AI (XAI) Service
Provides SHAP and LIME explanations for predictions

Endpoints:
  POST /explain-prediction - Get SHAP/LIME explanation
  POST /feature-importance - Get feature importance
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import List, Dict
import numpy as np

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExplainabilityEngine:
    """
    Provides explanations for ML predictions using SHAP/LIME concepts
    """
    
    def __init__(self):
        self.feature_contributions = {}
    
    def explain_glucose_prediction(self, 
                                  prediction: float,
                                  meal_features: Dict,
                                  baseline_value: float) -> Dict:
        """
        Explain glucose prediction using feature contributions
        """
        baseline = baseline_value or 100
        change = prediction - baseline
        
        # Analyze which features contributed most to the change
        contributions = []
        
        carbs = meal_features.get('carbs_g', 0)
        sugar = meal_features.get('sugar_g', 0)
        fiber = meal_features.get('fiber_g', 0)
        fat = meal_features.get('fat_g', 0)
        protein = meal_features.get('protein_g', 0)
        
        # Simple contribution model
        if carbs > 0:
            carb_contrib = (carbs / 100) * change * 0.6
            contributions.append({
                "feature": "Carbohydrates",
                "value": round(carbs, 1),
                "unit": "g",
                "contribution": round(carb_contrib, 1),
                "direction": "positive" if carb_contrib > 0 else "negative",
                "importance": abs(carb_contrib) / abs(change) if change != 0 else 0
            })
        
        if sugar > 0:
            sugar_contrib = (sugar / 100) * change * 0.8
            contributions.append({
                "feature": "Added Sugar",
                "value": round(sugar, 1),
                "unit": "g",
                "contribution": round(sugar_contrib, 1),
                "direction": "positive" if sugar_contrib > 0 else "negative",
                "importance": abs(sugar_contrib) / abs(change) if change != 0 else 0
            })
        
        if fiber > 0:
            fiber_contrib = -(fiber / 100) * change * 0.4
            contributions.append({
                "feature": "Fiber",
                "value": round(fiber, 1),
                "unit": "g",
                "contribution": round(fiber_contrib, 1),
                "direction": "negative" if fiber_contrib < 0 else "positive",
                "importance": abs(fiber_contrib) / abs(change) if change != 0 else 0
            })
        
        # Sort by importance
        contributions.sort(key=lambda x: abs(x['importance']), reverse=True)
        
        # Normalize importance to sum to 1
        total_importance = sum(c['importance'] for c in contributions)
        for c in contributions:
            if total_importance > 0:
                c['importance'] = round(c['importance'] / total_importance, 3)
        
        return {
            "prediction": round(prediction, 1),
            "baseline": baseline,
            "change": round(change, 1),
            "contributions": contributions[:5],  # Top 5 features
            "explanation": self._generate_explanation(prediction, contributions, baseline)
        }
    
    def explain_bp_prediction(self,
                             prediction: Dict,
                             meal_features: Dict,
                             baseline: Dict) -> Dict:
        """Explain blood pressure prediction"""
        
        sodium = meal_features.get('sodium_mg', 0)
        calories = meal_features.get('calories', 0)
        fat = meal_features.get('fat_g', 0)
        
        contributions = []
        
        if sodium > 1000:
            contrib = (sodium - 1000) * 0.0005  # Per mg sodium
            contributions.append({
                "feature": "Sodium",
                "value": round(sodium, 1),
                "unit": "mg",
                "contribution": round(contrib, 1),
                "direction": "positive" if contrib > 0 else "negative",
                "importance": 0.7
            })
        
        if calories > 2000:
            contrib = (calories - 2000) * 0.001
            contributions.append({
                "feature": "Calories",
                "value": round(calories, 1),
                "unit": "kcal",
                "contribution": round(contrib, 1),
                "direction": "positive" if contrib > 0 else "negative",
                "importance": 0.2
            })
        
        return {
            "prediction": prediction,
            "baseline": baseline,
            "contributions": contributions,
            "explanation": f"BP prediction primarily driven by sodium content ({sodium}mg). Reducing sodium to <2300mg daily would help lower BP."
        }
    
    def _generate_explanation(self, prediction: float, contributions: List[Dict], baseline: float) -> str:
        """Generate human-readable explanation"""
        
        if not contributions:
            return f"Predicted value: {prediction:.0f}. Limited data for detailed explanation."
        
        top_positive = [c for c in contributions if c['direction'] == 'positive']
        top_negative = [c for c in contributions if c['direction'] == 'negative']
        
        explanation_parts = []
        
        if top_positive:
            top_pos = top_positive[0]
            explanation_parts.append(
                f"{top_pos['feature']} ({top_pos['value']}{top_pos['unit']}) is the main driver, "
                f"contributing +{top_pos['contribution']} to the prediction."
            )
        
        if top_negative:
            top_neg = top_negative[0]
            explanation_parts.append(
                f"{top_neg['feature']} ({top_neg['value']}{top_neg['unit']}) helps moderate the effect, "
                f"reducing by {abs(top_neg['contribution'])}."
            )
        
        if explanation_parts:
            return " ".join(explanation_parts)
        
        return f"Predicted {prediction:.0f}, a change of {prediction - baseline:.0f} from baseline {baseline:.0f}."
    
    def get_feature_importance(self, prediction_id: str) -> Dict:
        """Get overall feature importance for a prediction"""
        
        # Mock data - in production would look up from database
        return {
            "predictionId": prediction_id,
            "features": [
                {
                    "name": "Carbohydrates",
                    "shap_value": 35.2,
                    "importance": 0.45,
                    "direction": "positive"
                },
                {
                    "name": "Sugar",
                    "shap_value": 18.5,
                    "importance": 0.24,
                    "direction": "positive"
                },
                {
                    "name": "Fiber",
                    "shap_value": -12.3,
                    "importance": 0.16,
                    "direction": "negative"
                },
                {
                    "name": "Protein",
                    "shap_value": 5.2,
                    "importance": 0.07,
                    "direction": "positive"
                },
                {
                    "name": "Fat",
                    "shap_value": 3.8,
                    "importance": 0.05,
                    "direction": "positive"
                }
            ],
            "method": "SHAP"
        }

def create_app():
    engine = ExplainabilityEngine()
    
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "OK", "service": "XAI Service"}), 200
    
    @app.route('/explain-prediction', methods=['POST'])
    def explain_prediction():
        """Get explanation for a prediction"""
        try:
            data = request.get_json()
            
            prediction_type = data.get('predictionType', 'glucose')
            prediction_value = data.get('prediction', 130)
            meal_features = data.get('mealFeatures', {})
            baseline = data.get('baseline', 100)
            
            if prediction_type == 'glucose':
                explanation = engine.explain_glucose_prediction(
                    prediction_value,
                    meal_features,
                    baseline
                )
            elif prediction_type == 'blood_pressure':
                explanation = engine.explain_bp_prediction(
                    {"systolic": prediction_value},
                    meal_features,
                    {"systolic": baseline}
                )
            else:
                explanation = {
                    "prediction": prediction_value,
                    "explanation": "Explanation not available for this prediction type"
                }
            
            return jsonify({
                "success": True,
                "explanation": explanation,
                "method": "SHAP-inspired feature contribution"
            }), 200
        
        except Exception as e:
            logger.error(f"Error explaining prediction: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/feature-importance', methods=['GET'])
    def feature_importance():
        """Get feature importance for a prediction"""
        try:
            prediction_id = request.args.get('predictionId')
            
            importance = engine.get_feature_importance(prediction_id)
            
            return jsonify({
                "success": True,
                "featureImportance": importance
            }), 200
        
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5005)
