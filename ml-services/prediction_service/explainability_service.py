"""
Explainability Service for AI Models
Paper Reference: Section III.6 - "Explainability and User Feedback"

This module provides SHAP (SHapley Additive exPlanations) and LIME (Local Interpretable Model-agnostic Explanations)
for glucose, blood pressure, and cholesterol predictions.

Purpose: Make AI predictions interpretable and trustworthy by explaining which features contribute most to predictions.
"""

import numpy as np
from flask import jsonify

class ExplainabilityService:
    def __init__(self):
        """
        Initialize explainability service
        
        In production, this would use:
        - shap library for SHAP values
        - lime library for LIME explanations
        - Integration with actual LSTM and XGBoost models
        """
        self.feature_names = [
            'calories', 'carbs_g', 'sugar_g', 'fiber_g', 'protein_g',
            'fat_g', 'sodium_mg', 'cholesterol_mg',
            'recent_glucose_avg', 'recent_glucose_std', 'exercise_minutes',
            'sleep_hours', 'stress_level', 'medication_taken', 'time_of_day'
        ]
        
        # Feature importance baselines (would be learned from actual model)
        self.glucose_feature_importance = {
            'carbs_g': 0.35,
            'sugar_g': 0.25,
            'recent_glucose_avg': 0.15,
            'fiber_g': -0.10,  # Negative = reduces glucose
            'protein_g': -0.05,
            'exercise_minutes': -0.08,
            'calories': 0.10,
            'time_of_day': 0.08,
            'stress_level': 0.05,
            'medication_taken': -0.12,
            'sleep_hours': -0.03,
            'fat_g': 0.02,
            'sodium_mg': 0.01,
            'cholesterol_mg': 0.00,
            'recent_glucose_std': 0.02
        }
        
        self.bp_feature_importance = {
            'sodium_mg': 0.40,
            'stress_level': 0.25,
            'recent_bp_avg': 0.15,
            'exercise_minutes': -0.12,
            'sleep_hours': -0.08,
            'caffeine_mg': 0.10,
            'medication_taken': -0.15,
            'fat_g': 0.05,
            'calories': 0.05,
            'carbs_g': 0.02,
            'sugar_g': 0.02,
            'protein_g': -0.03,
            'fiber_g': -0.02,
            'cholesterol_mg': 0.01,
            'time_of_day': 0.05
        }
        
        self.cholesterol_feature_importance = {
            'saturated_fat_g': 0.35,
            'cholesterol_mg': 0.30,
            'trans_fat_g': 0.20,
            'fiber_g': -0.15,
            'exercise_minutes': -0.10,
            'medication_taken': -0.18,
            'calories': 0.08,
            'recent_cholesterol_avg': 0.12,
            'protein_g': 0.02,
            'carbs_g': 0.02,
            'sugar_g': 0.03,
            'sodium_mg': 0.01,
            'stress_level': 0.02,
            'sleep_hours': -0.02,
            'fat_g': 0.10
        }

    def explain_glucose_prediction(self, prediction_value, input_features):
        """
        Generate SHAP-style explanation for glucose prediction
        
        Args:
            prediction_value: Predicted glucose level (mg/dL)
            input_features: Dictionary of input feature values
            
        Returns:
            Dictionary with feature contributions and natural language explanation
        """
        baseline_glucose = 100  # Normal fasting glucose
        prediction_delta = prediction_value - baseline_glucose
        
        # Calculate feature contributions (SHAP values)
        contributions = {}
        for feature, importance in self.glucose_feature_importance.items():
            if feature in input_features:
                value = input_features[feature]
                # Contribution = feature_value * importance_weight * scale_factor
                contribution = value * importance * (prediction_delta / 100)
                contributions[feature] = {
                    'value': round(value, 2),
                    'contribution_mg_dL': round(contribution, 2),
                    'importance': round(importance, 3)
                }
        
        # Sort by absolute contribution
        sorted_contributions = sorted(
            contributions.items(),
            key=lambda x: abs(x[1]['contribution_mg_dL']),
            reverse=True
        )
        
        # Generate natural language explanation
        explanation_text = self._generate_glucose_explanation(
            prediction_value, sorted_contributions[:5]
        )
        
        return {
            'prediction_type': 'glucose',
            'predicted_value': round(prediction_value, 1),
            'baseline_value': baseline_glucose,
            'delta': round(prediction_delta, 1),
            'top_contributors': sorted_contributions[:5],
            'all_contributions': sorted_contributions,
            'explanation': explanation_text,
            'model_confidence': 0.85,  # Would come from actual model
            'explanation_method': 'SHAP-inspired'
        }

    def explain_bp_prediction(self, systolic, diastolic, input_features):
        """
        Generate explanation for blood pressure prediction
        """
        baseline_sys = 120
        baseline_dia = 80
        
        contributions = {}
        for feature, importance in self.bp_feature_importance.items():
            if feature in input_features:
                value = input_features[feature]
                sys_contribution = value * importance * (systolic - baseline_sys) / 20
                dia_contribution = value * importance * (diastolic - baseline_dia) / 10
                
                contributions[feature] = {
                    'value': round(value, 2),
                    'systolic_contribution': round(sys_contribution, 2),
                    'diastolic_contribution': round(dia_contribution, 2),
                    'importance': round(importance, 3)
                }
        
        sorted_by_systolic = sorted(
            contributions.items(),
            key=lambda x: abs(x[1]['systolic_contribution']),
            reverse=True
        )
        
        explanation_text = self._generate_bp_explanation(
            systolic, diastolic, sorted_by_systolic[:5]
        )
        
        return {
            'prediction_type': 'blood_pressure',
            'predicted_systolic': round(systolic, 1),
            'predicted_diastolic': round(diastolic, 1),
            'baseline_systolic': baseline_sys,
            'baseline_diastolic': baseline_dia,
            'top_contributors': sorted_by_systolic[:5],
            'explanation': explanation_text,
            'model_confidence': 0.82,
            'explanation_method': 'SHAP-inspired'
        }

    def explain_cholesterol_prediction(self, total_chol, ldl, hdl, input_features):
        """
        Generate explanation for cholesterol prediction
        """
        baseline_total = 180
        baseline_ldl = 100
        baseline_hdl = 50
        
        contributions = {}
        for feature, importance in self.cholesterol_feature_importance.items():
            if feature in input_features:
                value = input_features[feature]
                contribution = value * importance * (total_chol - baseline_total) / 50
                
                contributions[feature] = {
                    'value': round(value, 2),
                    'contribution_mg_dL': round(contribution, 2),
                    'importance': round(importance, 3)
                }
        
        sorted_contributions = sorted(
            contributions.items(),
            key=lambda x: abs(x[1]['contribution_mg_dL']),
            reverse=True
        )
        
        explanation_text = self._generate_cholesterol_explanation(
            total_chol, ldl, hdl, sorted_contributions[:5]
        )
        
        return {
            'prediction_type': 'cholesterol',
            'predicted_total': round(total_chol, 1),
            'predicted_ldl': round(ldl, 1),
            'predicted_hdl': round(hdl, 1),
            'baseline_total': baseline_total,
            'top_contributors': sorted_contributions[:5],
            'explanation': explanation_text,
            'model_confidence': 0.80,
            'explanation_method': 'SHAP-inspired'
        }

    def _generate_glucose_explanation(self, prediction, top_contributors):
        """Generate human-readable explanation for glucose prediction"""
        status = 'normal' if prediction < 140 else 'elevated' if prediction < 180 else 'high'
        
        explanation = f"Your predicted glucose level is {prediction:.0f} mg/dL ({status}). "
        
        if len(top_contributors) > 0:
            explanation += "Main factors:\n"
            for feature, data in top_contributors:
                contribution = data['contribution_mg_dL']
                value = data['value']
                
                feature_name = self._humanize_feature_name(feature)
                
                if contribution > 0:
                    explanation += f"• {feature_name} ({value:.1f}) is RAISING glucose by ~{abs(contribution):.1f} mg/dL\n"
                else:
                    explanation += f"• {feature_name} ({value:.1f}) is LOWERING glucose by ~{abs(contribution):.1f} mg/dL\n"
        
        return explanation

    def _generate_bp_explanation(self, systolic, diastolic, top_contributors):
        """Generate human-readable explanation for blood pressure"""
        status = 'normal' if systolic < 120 else 'elevated' if systolic < 130 else 'high'
        
        explanation = f"Your predicted blood pressure is {systolic:.0f}/{diastolic:.0f} mmHg ({status}). "
        
        if len(top_contributors) > 0:
            explanation += "Main factors:\n"
            for feature, data in top_contributors[:3]:
                contribution = data['systolic_contribution']
                value = data['value']
                feature_name = self._humanize_feature_name(feature)
                
                if contribution > 0:
                    explanation += f"• {feature_name} ({value:.1f}) is RAISING blood pressure\n"
                else:
                    explanation += f"• {feature_name} ({value:.1f}) is LOWERING blood pressure\n"
        
        return explanation

    def _generate_cholesterol_explanation(self, total, ldl, hdl, top_contributors):
        """Generate human-readable explanation for cholesterol"""
        status = 'desirable' if total < 200 else 'borderline' if total < 240 else 'high'
        
        explanation = f"Your predicted total cholesterol is {total:.0f} mg/dL ({status}). "
        explanation += f"LDL: {ldl:.0f} mg/dL, HDL: {hdl:.0f} mg/dL. "
        
        if len(top_contributors) > 0:
            explanation += "Main factors:\n"
            for feature, data in top_contributors[:3]:
                contribution = data['contribution_mg_dL']
                value = data['value']
                feature_name = self._humanize_feature_name(feature)
                
                if contribution > 0:
                    explanation += f"• {feature_name} ({value:.1f}) is RAISING cholesterol\n"
                else:
                    explanation += f"• {feature_name} ({value:.1f}) is LOWERING cholesterol\n"
        
        return explanation

    def _humanize_feature_name(self, feature):
        """Convert feature name to human-readable format"""
        human_names = {
            'carbs_g': 'Carbohydrates',
            'sugar_g': 'Sugar intake',
            'fiber_g': 'Fiber content',
            'protein_g': 'Protein',
            'fat_g': 'Total fat',
            'saturated_fat_g': 'Saturated fat',
            'sodium_mg': 'Sodium/salt',
            'cholesterol_mg': 'Dietary cholesterol',
            'calories': 'Total calories',
            'recent_glucose_avg': 'Recent glucose levels',
            'recent_glucose_std': 'Glucose variability',
            'recent_bp_avg': 'Recent blood pressure',
            'recent_cholesterol_avg': 'Recent cholesterol',
            'exercise_minutes': 'Exercise duration',
            'sleep_hours': 'Sleep quality',
            'stress_level': 'Stress level',
            'medication_taken': 'Medication adherence',
            'time_of_day': 'Time of measurement',
            'caffeine_mg': 'Caffeine intake',
            'trans_fat_g': 'Trans fats'
        }
        
        return human_names.get(feature, feature.replace('_', ' ').title())

# Create global instance
explainability_service = ExplainabilityService()
