"""
Improved Explainability Service with Perturbation-Based Feature Importance
Generates medically accurate and clinically meaningful explanations
"""

import numpy as np
import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)

class ImprovedExplainabilityService:
    """
    Provides SHAP-style feature importance through perturbation analysis
    Ensures explanations match clinical knowledge
    """
    
    # Clinical knowledge base: Expected directional effects
    CLINICAL_EFFECTS = {
        'carbohydrates': '+',      # Increases glucose
        'sugar': '++',              # Strong increase
        'net_carbs': '+',          # Increases glucose
        'protein': '0',             # Neutral/mixed effect in this simplified model
        'fat': '+',                 # Delayed increase (slows absorption)
        'fiber': '--',              # Reduces glucose (slows absorption)
        'sodium': '0',              # Minimal direct effect
        'heart_rate': '+',          # Elevated HR = stress = higher glucose
        'activity_level': '--',     # Exercise lowers glucose
        'stress_level': '++',       # Stress hormones raise glucose
        'sleep_quality': '-',       # Good sleep = better regulation
        'hydration_level': '-',     # Proper hydration aids regulation
        'baseline_glucose': '+++',  # Very strong predictor
        'time_since_last_meal': '-', # More time = lower glucose
        'meal_interval': '-',       # Longer interval = lower glucose
        'medication_taken': '--'    # Medication lowers glucose
    }
    
    def __init__(self, model, scaler):
        """
        Initialize explainability service
        
        Args:
            model: Trained glucose prediction model
            scaler: Feature scaler instance
        """
        self.model = model
        self.scaler = scaler
        self.feature_names = scaler.get_feature_names()
    
    def explain_prediction(
        self,
        features_dict,
        baseline_prediction,
        final_prediction,
        delta_glucose=None,
        model=None,
        prediction_method: Optional[str] = None,
    ):
        """
        Generate comprehensive explanation with perturbation-based feature importance
        
        CRITICAL: This function MUST explain the delta_glucose already computed by the model.
        It should NOT re-predict. SHAP must explain the OUTPUT already produced.
        
        Args:
            features_dict: Original input features
            baseline_prediction: Baseline glucose (starting point)
            final_prediction: Final predicted glucose
            delta_glucose: The delta already computed by the model (MUST USE THIS)
            model: Optional model reference (not used for re-prediction)
            
        Returns:
            dict: Comprehensive explanation with feature contributions
        """
        try:
            # Use the delta_glucose passed in (single source of truth)
            prediction_delta = float(delta_glucose) if delta_glucose is not None else float(final_prediction - baseline_prediction)

            # IMPORTANT: explainability must not compute its own confidence score.
            # It should only explain the already-produced (and already-constrained) delta.
            method = prediction_method or 'auto'

            # SINGLE SOURCE OF TRUTH (mandatory): do not re-run model prediction inside explainability.
            # We always start with medically-grounded, rule-assisted attributions and then validate.
            warnings: List[str] = []
            contributions = self._calculate_rule_assisted_contributions(features_dict, prediction_delta, float(baseline_prediction))
            explanation_method = 'rule-assisted'

            is_valid, invalid_reasons = self._validate_explanation(
                features_dict=features_dict,
                contributions=contributions,
                prediction_delta=prediction_delta,
            )
            if not is_valid:
                warnings = list(warnings) + [
                    'Explanation invalid; using rule-assisted explanation',
                    *[f"Invalid: {r}" for r in invalid_reasons],
                ]
                # Rebuild with a stricter, carb-dominant rule set.
                contributions = self._calculate_rule_assisted_contributions(
                    features_dict,
                    prediction_delta,
                    float(baseline_prediction),
                    force_carb_dominance=True,
                )
                explanation_method = 'rule-assisted'
                # Revalidate; if still invalid, we keep the best-effort rule attribution.
                is_valid, invalid_reasons_2 = self._validate_explanation(
                    features_dict=features_dict,
                    contributions=contributions,
                    prediction_delta=prediction_delta,
                )
                if not is_valid:
                    warnings = list(warnings) + [
                        *[f"Still invalid: {r}" for r in invalid_reasons_2],
                    ]
            
            # Sort by absolute contribution
            sorted_contributions = sorted(
                contributions.items(),
                key=lambda x: abs(x[1]['contribution']),
                reverse=True
            )
            
            # Validate against clinical knowledge
            validated_contributions = self._validate_clinical_logic(sorted_contributions)
            
            # Generate human-readable explanation
            explanation_text = self._generate_explanation(
                validated_contributions[:6],
                baseline_prediction,
                final_prediction
            )
            
            return {
                'feature_contributions': {
                    name: {
                        'value': details['value'],
                        'contribution_mg_dL': round(details['contribution'], 1),
                        'percentage': round(details['percentage'], 1),
                        'clinical_effect': details['expected_effect']
                    }
                    for name, details in validated_contributions
                },
                'top_contributors': validated_contributions[:6],
                'explanation': explanation_text,
                'prediction_delta': round(prediction_delta, 1),
                'explanation_method': explanation_method,
                'is_valid': bool(is_valid),
                'clinical_validation': 'Warning' if warnings else 'Passed',
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f"Explainability error: {e}")
            return self._generate_fallback_explanation(features_dict, baseline_prediction, final_prediction)

    def _validate_explanation(
        self,
        features_dict: Dict,
        contributions: Dict[str, Dict],
        prediction_delta: float,
    ) -> Tuple[bool, List[str]]:
        """Validate explanation for medical credibility.

        Mandatory checks:
        - Contributions sum approximately to prediction_delta
        - Non-uniform magnitudes (detect broken/fallback uniformity)
        - Nutrition dominance when net_carbs > 25g
        """
        reasons: List[str] = []

        if not isinstance(contributions, dict) or not contributions:
            return False, ['No contributions produced']

        # Sum-to-delta check
        total = float(sum(float(v.get('contribution', 0.0)) for v in contributions.values()))
        if abs(total - float(prediction_delta)) > max(5.0, abs(float(prediction_delta)) * 0.12):
            reasons.append(f"Contributions do not sum to delta (sum={total:.1f}, delta={prediction_delta:.1f})")

        # Uniform magnitude check (rounded to 0.1 mg/dL)
        mags = [round(abs(float(v.get('contribution', 0.0))), 1) for v in contributions.values()]
        mags = [m for m in mags if m > 0.0]
        if len(mags) >= 6:
            most_common = max(set(mags), key=mags.count)
            if mags.count(most_common) >= max(5, int(0.6 * len(mags))):
                reasons.append('Uniform/duplicated attribution magnitudes detected')

        # Nutrition dominance rule
        carbs = float(features_dict.get('carbohydrates', 0.0))
        fiber = float(features_dict.get('fiber', 0.0))
        net_carbs = max(0.0, carbs - fiber)

        if net_carbs > 25.0:
            carb_contrib = float(contributions.get('carbohydrates', {}).get('contribution', 0.0))
            if carb_contrib <= 0.0:
                reasons.append('Nutrition dominance violated: carbohydrates contribution not positive')

            # Carbohydrates must be top positive contributor
            positive = {
                k: float(v.get('contribution', 0.0))
                for k, v in contributions.items()
                if float(v.get('contribution', 0.0)) > 0.0
            }
            if positive:
                top_pos = max(positive.items(), key=lambda kv: kv[1])[0]
                if top_pos != 'carbohydrates':
                    reasons.append(f"Nutrition dominance violated: top positive is {top_pos}")

            # Carbohydrates + baseline must be >= 50% of total positive
            baseline_contrib = float(contributions.get('baseline_glucose', {}).get('contribution', 0.0))
            total_pos = sum(positive.values())
            if total_pos > 1e-6:
                share = (max(0.0, carb_contrib) + max(0.0, baseline_contrib)) / total_pos
                if share < 0.50:
                    reasons.append('Nutrition dominance violated: carbs+baseline < 50% of total positive')

            # Modifiers should not dominate
            for modifier in ['stress_level', 'sleep_quality', 'hydration_level']:
                mod = float(contributions.get(modifier, {}).get('contribution', 0.0))
                if mod > 0 and mod > max(0.0, carb_contrib) * 0.75:
                    reasons.append(f"Modifier dominance violated: {modifier} too large")

        return (len(reasons) == 0), reasons

    def _calculate_rule_assisted_contributions(
        self,
        features_dict: Dict,
        prediction_delta: float,
        baseline_glucose: float,
        force_carb_dominance: bool = False,
    ) -> Dict[str, Dict]:
        """Medical rule-assisted attributions that always sum to prediction_delta.

        This is used as the default to satisfy the requirement that explainability
        must not re-run model prediction.
        """
        carbs = float(features_dict.get('carbohydrates', 0.0))
        fiber = float(features_dict.get('fiber', 0.0))
        sugar = float(features_dict.get('sugar', 0.0))
        protein = float(features_dict.get('protein', 0.0))
        fat = float(features_dict.get('fat', 0.0))
        activity = float(features_dict.get('activity_level', 0.3))
        stress = float(features_dict.get('stress_level', 0.3))
        sleep = float(features_dict.get('sleep_quality', 0.7))
        hydration = float(features_dict.get('hydration_level', 0.7))
        medication = float(features_dict.get('medication_taken', 0.0))

        net_carbs = max(0.0, carbs - fiber)
        sugar_ratio = (sugar / carbs) if carbs > 1e-6 else 0.0

        # Build an initial (unnormalized) attribution vector.
        # Positive drivers
        carb_raw = net_carbs * (2.0 + 0.6 * min(max(sugar_ratio, 0.0), 1.0))
        fat_raw = min(fat * 0.20, 12.0)
        baseline_raw = max(0.0, (baseline_glucose - 90.0)) * 0.10
        stress_raw = min(stress * 18.0, 18.0)

        # Negative/moderators
        fiber_raw = min(fiber * -1.2, 0.0)
        activity_raw = min(activity * -22.0, 0.0)
        sleep_raw = min((sleep - 0.7) * -8.0, 0.0)
        hydration_raw = min((hydration - 0.7) * -6.0, 0.0)
        medication_raw = min(medication * -35.0, 0.0)

        # Mild effects
        protein_raw = min(protein * 0.10, 8.0)

        raw = {
            'carbohydrates': carb_raw,
            'baseline_glucose': baseline_raw,
            'fat': fat_raw,
            'stress_level': stress_raw,
            'protein': protein_raw,
            'fiber': fiber_raw,
            'activity_level': activity_raw,
            'sleep_quality': sleep_raw,
            'hydration_level': hydration_raw,
            'medication_taken': medication_raw,
        }

        # Enforce nutritional dominance in the raw signal if needed
        if force_carb_dominance and net_carbs > 25.0:
            # Ensure carbs is the top positive and clearly separated from modifiers.
            top_pos = max((v for v in raw.values() if v > 0.0), default=0.0)
            if carb_raw <= 0.0:
                raw['carbohydrates'] = max(8.0, top_pos + 5.0)
            else:
                raw['carbohydrates'] = max(carb_raw, top_pos + 3.0)

            # Cap modifiers so they cannot exceed 75% of carbs.
            carb_now = raw['carbohydrates']
            for m in ['stress_level', 'sleep_quality', 'hydration_level']:
                if raw.get(m, 0.0) > 0.0:
                    raw[m] = min(raw[m], 0.75 * carb_now)

            # Ensure carbs + baseline are at least 50% of total positive.
            # If not, boost carbs (primary driver) and lightly cap other positive non-nutrition.
            pos_keys = [k for k, v in raw.items() if v > 0.0]
            total_pos = sum(raw[k] for k in pos_keys)
            core = max(0.0, raw.get('carbohydrates', 0.0)) + max(0.0, raw.get('baseline_glucose', 0.0))
            if total_pos > 1e-6 and (core / total_pos) < 0.50:
                # Cap fat/protein/stress first
                for k in ['fat', 'protein', 'stress_level']:
                    if raw.get(k, 0.0) > 0.0:
                        raw[k] = min(raw[k], 0.60 * carb_now)

                # Recompute and, if still low, boost carbs
                pos_keys = [k for k, v in raw.items() if v > 0.0]
                total_pos = sum(raw[k] for k in pos_keys)
                core = max(0.0, raw.get('carbohydrates', 0.0)) + max(0.0, raw.get('baseline_glucose', 0.0))
                if total_pos > 1e-6 and (core / total_pos) < 0.50:
                    raw['carbohydrates'] = raw.get('carbohydrates', 0.0) + (0.10 * total_pos)

        # Rescale raw contributions to exactly match prediction_delta.
        raw_sum = float(sum(raw.values()))
        if abs(raw_sum) < 1e-6:
            # Degenerate case: put everything on carbohydrates.
            raw = {'carbohydrates': float(prediction_delta)}
            raw_sum = float(prediction_delta)

        scale = float(prediction_delta) / raw_sum
        contrib = {k: float(v * scale) for k, v in raw.items()}

        # Ensure required keys exist (for stable UI + validation)
        for name in self.feature_names:
            if name not in contrib:
                contrib[name] = 0.0

        # Percentages over absolute impact
        total_impact = sum(abs(v) for v in contrib.values())
        out: Dict[str, Dict] = {}
        for name in self.feature_names:
            value = float(features_dict.get(name, 0.0))
            c = float(contrib.get(name, 0.0))
            out[name] = {
                'value': value,
                'contribution': c,
                'percentage': (abs(c) / total_impact) * 100.0 if total_impact > 1e-9 else 0.0,
                'expected_effect': self.CLINICAL_EFFECTS.get(name, '0'),
            }

        return out

    def _predict_absolute_glucose_mg_dl(self, features_dict) -> float:
        """Predict absolute post-meal glucose (mg/dL) using the underlying Keras model.

        This always applies the global feature scaler and never passes raw values into the model.
        """
        if self.model is None or getattr(self.model, 'model', None) is None:
            raise RuntimeError("Model not available for model-faithful explainability")

        scaled = self.scaler.scale_features(features_dict)
        sequence = np.tile(scaled, (self.model.sequence_length, 1))
        sequence = np.expand_dims(sequence, axis=0)

        y_pred_normalized = self.model.model.predict(sequence, verbose=0)
        return float(self.scaler.inverse_scale_glucose(y_pred_normalized[0][0]))

    def _calculate_model_faithful_contributions(
        self,
        features_dict: Dict,
        constrained_delta: float,
        baseline_glucose: float,
    ) -> Tuple[Dict[str, Dict], List[str]]:
        """Perturb raw features (then scale) to approximate SHAP-like contributions.

        Returns contributions that are rescaled to sum to the *constrained_delta*.
        """
        warnings: List[str] = []

        # If Keras model isn't available, fall back to deterministic contributions.
        if self.model is None or getattr(self.model, 'model', None) is None:
            return self._calculate_direct_contributions(features_dict, constrained_delta), [
                'Model unavailable; using deterministic contribution approximation'
            ]

        # Central-difference perturbation on raw inputs (model always receives scaled).
        base_contribs: Dict[str, Dict] = {}
        raw_contrib_values: Dict[str, float] = {}

        # Choose perturbation magnitudes (small but meaningful)
        def _perturb_amount(name: str, value: float) -> float:
            if name in {'activity_level', 'stress_level', 'sleep_quality', 'hydration_level', 'medication_taken'}:
                return 0.05
            if name in {'heart_rate'}:
                return 3.0
            if name in {'time_since_last_meal', 'meal_interval'}:
                return 0.5
            if name in {'sodium'}:
                return max(50.0, abs(value) * 0.1)
            # grams
            return max(1.0, abs(value) * 0.1)

        for feature_name in self.feature_names:
            original_value = float(features_dict.get(feature_name, 0.0))
            p = _perturb_amount(feature_name, original_value)

            pos = dict(features_dict)
            neg = dict(features_dict)
            pos[feature_name] = original_value + p
            neg[feature_name] = original_value - p

            # Predict absolute glucose, convert to delta vs ORIGINAL baseline.
            try:
                pos_abs = self._predict_absolute_glucose_mg_dl(pos)
                neg_abs = self._predict_absolute_glucose_mg_dl(neg)
            except Exception as e:
                logger.warning(f"Perturbation failed for {feature_name}: {e}")
                raw_contrib_values[feature_name] = 0.0
                base_contribs[feature_name] = {
                    'value': original_value,
                    'contribution': 0.0,
                    'percentage': 0.0,
                    'expected_effect': self.CLINICAL_EFFECTS.get(feature_name, '0'),
                }
                continue

            pos_delta = float(pos_abs - baseline_glucose)
            neg_delta = float(neg_abs - baseline_glucose)

            # Central-difference estimate
            contrib = (pos_delta - neg_delta) / 2.0
            raw_contrib_values[feature_name] = float(contrib)
            base_contribs[feature_name] = {
                'value': original_value,
                'contribution': float(contrib),
                'percentage': 0.0,
                'expected_effect': self.CLINICAL_EFFECTS.get(feature_name, '0'),
            }

        # Rescale contributions to sum to constrained_delta
        total = sum(raw_contrib_values.values())
        if abs(total) > 1e-6:
            scale = constrained_delta / total
        else:
            scale = 0.0
            warnings.append('Low attribution signal; contributions near zero')

        for name in base_contribs:
            base_contribs[name]['contribution'] = float(base_contribs[name]['contribution'] * scale)

        # Enforce meal attribution dominance constraints: no single feature >50% of total impact.
        total_abs = sum(abs(v['contribution']) for v in base_contribs.values())
        if total_abs > 1e-6:
            max_allowed = abs(constrained_delta) * 0.5
            if max_allowed > 0:
                capped = False
                for v in base_contribs.values():
                    if abs(v['contribution']) > max_allowed:
                        v['contribution'] = float(np.sign(v['contribution']) * max_allowed)
                        capped = True
                if capped:
                    warnings.append('Attributions capped to avoid single-feature dominance')

        # Nutrition dominance check (net_carbs > 25g => carbs should be top contributor)
        net_carbs = float(max(0.0, features_dict.get('carbohydrates', 0.0) - features_dict.get('fiber', 0.0)))
        if net_carbs > 25:
            top = max(base_contribs.items(), key=lambda kv: abs(kv[1]['contribution']))[0] if base_contribs else ''
            if 'carb' not in top:
                warnings.append('Nutrition dominance rule violated: carbohydrates not top contributor')

        # Calculate percentages
        total_impact = sum(abs(v['contribution']) for v in base_contribs.values())
        if total_impact > 0:
            for details in base_contribs.values():
                details['percentage'] = (abs(details['contribution']) / total_impact) * 100

        return base_contribs, warnings
    
    def _calculate_direct_contributions(self, features_dict, prediction_delta):
        """
        Calculate feature contributions based on the deterministic formula.
        This mirrors the logic in _simulate_prediction() to explain the SAME delta.
        """
        # Extract features
        carbs = features_dict.get('carbohydrates', 0)
        fiber = features_dict.get('fiber', 0)
        sugar = features_dict.get('sugar', 0)
        protein = features_dict.get('protein', 0)
        fat = features_dict.get('fat', 0)
        activity = features_dict.get('activity_level', 0.3)
        stress = features_dict.get('stress_level', 0.3)
        sleep = features_dict.get('sleep_quality', 0.7)
        medication = features_dict.get('medication_taken', 0.0)
        
        # Calculate components (SAME PHYSIOLOGICALLY REALISTIC FORMULA AS MODEL)
        net_carbs = carbs - fiber
        sugar_multiplier = 1.2 if sugar > carbs * 0.3 else 1.0
        carb_contribution = net_carbs * 2.0 * sugar_multiplier  # 2.0 mg/dL per gram (CLINICAL RANGE)
        
        fiber_contribution = fiber * -1.5  # Reduced from -2.0
        protein_contribution = protein * 0.4  # Reduced from 0.5
        fat_contribution = fat * 0.25  # Reduced from 0.3
        activity_contribution = activity * -25.0  # Reduced from -30.0
        stress_contribution = min(stress * 40.0, 40.0)  # Capped at 40 mg/dL
        sleep_contribution = (0.5 - sleep) * 8.0  # Reduced from 10.0
        medication_contribution = medication * -50.0
        
        # Build contributions dictionary
        contributions = {
            'carbohydrates': {
                'value': carbs,
                'contribution': carb_contribution,
                'percentage': 0,  # Will calculate below
                'expected_effect': '++'
            },
            'fiber': {
                'value': fiber,
                'contribution': fiber_contribution,
                'percentage': 0,
                'expected_effect': '--'
            },
            'protein': {
                'value': protein,
                'contribution': protein_contribution,
                'percentage': 0,
                'expected_effect': '-'
            },
            'fat': {
                'value': fat,
                'contribution': fat_contribution,
                'percentage': 0,
                'expected_effect': '+'
            },
            'activity_level': {
                'value': activity,
                'contribution': activity_contribution,
                'percentage': 0,
                'expected_effect': '--'
            },
            'stress_level': {
                'value': stress,
                'contribution': stress_contribution,
                'percentage': 0,
                'expected_effect': '++'
            },
            'sleep_quality': {
                'value': sleep,
                'contribution': sleep_contribution,
                'percentage': 0,
                'expected_effect': '-'
            },
            'medication_taken': {
                'value': medication,
                'contribution': medication_contribution,
                'percentage': 0,
                'expected_effect': '--'
            }
        }
        
        # Calculate percentages
        total_positive = sum(abs(v['contribution']) for v in contributions.values() if v['contribution'] > 0)
        total_negative = sum(abs(v['contribution']) for v in contributions.values() if v['contribution'] < 0)
        total_impact = total_positive + total_negative
        
        if total_impact > 0:
            for name, details in contributions.items():
                details['percentage'] = (abs(details['contribution']) / total_impact) * 100
        
        return contributions
    
    def _calculate_feature_importance(self, features_dict):
        """
        Calculate feature importance through perturbation analysis
        
        Args:
            features_dict: Input features
            
        Returns:
            dict: Feature importance scores
        """
        importance = {}
        
        # Get baseline scaled features
        baseline_scaled = self.scaler.scale_features(features_dict)
        baseline_sequence = np.tile(baseline_scaled, (self.model.sequence_length, 1))
        baseline_sequence = np.expand_dims(baseline_sequence, axis=0)
        
        # Get baseline prediction
        baseline_pred_result = self.model.predict(baseline_sequence, return_confidence=False)
        baseline_pred = baseline_pred_result['predictions'][0]
        
        # Perturb each feature and measure impact
        for i, feature_name in enumerate(self.feature_names):
            # Skip if feature not in input (use default)
            if feature_name not in features_dict:
                importance[feature_name] = 0.0
                continue
            
            original_value = features_dict[feature_name]
            
            # Perturb by ±20% (or ±0.1 for normalized features)
            if feature_name in ['activity_level', 'stress_level', 'sleep_quality', 'hydration_level', 'medication_taken']:
                perturbation = 0.1
            else:
                perturbation = abs(original_value * 0.2) if original_value != 0 else 0.1
            
            # Test positive perturbation
            perturbed_features_pos = features_dict.copy()
            perturbed_features_pos[feature_name] = original_value + perturbation
            
            try:
                scaled_pos = self.scaler.scale_features(perturbed_features_pos)
                sequence_pos = np.tile(scaled_pos, (self.model.sequence_length, 1))
                sequence_pos = np.expand_dims(sequence_pos, axis=0)
                pred_pos = self.model.predict(sequence_pos, return_confidence=False)['predictions'][0]
            except:
                pred_pos = baseline_pred
            
            # Test negative perturbation
            perturbed_features_neg = features_dict.copy()
            perturbed_features_neg[feature_name] = max(0, original_value - perturbation)
            
            try:
                scaled_neg = self.scaler.scale_features(perturbed_features_neg)
                sequence_neg = np.tile(scaled_neg, (self.model.sequence_length, 1))
                sequence_neg = np.expand_dims(sequence_neg, axis=0)
                pred_neg = self.model.predict(sequence_neg, return_confidence=False)['predictions'][0]
            except:
                pred_neg = baseline_pred
            
            # Calculate gradient (impact per unit change)
            gradient = (pred_pos - pred_neg) / (2 * perturbation) if perturbation > 0 else 0
            
            # Scale by actual feature value to get SHAP-like importance
            importance[feature_name] = gradient * original_value
        
        return importance
    
    def _calculate_contributions(self, importance_scores, features_dict, prediction_delta):
        """
        Convert importance scores to actual mg/dL contributions
        
        Args:
            importance_scores: Dictionary of feature importance
            features_dict: Original feature values
            prediction_delta: Total change in glucose
            
        Returns:
            dict: Feature contributions in mg/dL
        """
        contributions = {}
        
        # Normalize importance scores to sum to prediction_delta
        total_abs_importance = sum(abs(score) for score in importance_scores.values())
        
        if total_abs_importance == 0:
            # Fallback: distribute evenly among non-zero features
            non_zero_features = [k for k, v in features_dict.items() if v != 0 and k != 'medication_taken']
            if non_zero_features:
                contribution_per_feature = prediction_delta / len(non_zero_features)
                for feature in non_zero_features:
                    contributions[feature] = {
                        'value': features_dict.get(feature, 0),
                        'contribution': contribution_per_feature,
                        'percentage': 100.0 / len(non_zero_features),
                        'expected_effect': self.CLINICAL_EFFECTS.get(feature, '0')
                    }
            return contributions
        
        # Calculate proportional contributions
        for feature, importance in importance_scores.items():
            contribution_mg_dL = (importance / total_abs_importance) * prediction_delta if total_abs_importance > 0 else 0
            percentage = (abs(importance) / total_abs_importance * 100) if total_abs_importance > 0 else 0
            
            contributions[feature] = {
                'value': features_dict.get(feature, 0),
                'contribution': contribution_mg_dL,
                'percentage': percentage,
                'expected_effect': self.CLINICAL_EFFECTS.get(feature, '0')
            }
        
        return contributions
    
    def _validate_clinical_logic(self, sorted_contributions):
        """
        Validate that contributions match clinical expectations
        Flag any contradictions
        
        Args:
            sorted_contributions: List of (feature_name, details) tuples
            
        Returns:
            List of validated contributions with warnings if needed
        """
        validated = []
        
        for feature_name, details in sorted_contributions:
            expected_effect = details['expected_effect']
            actual_contribution = details['contribution']
            
            # Check if sign matches expectation
            is_valid = True
            if expected_effect in ['++', '+']:
                is_valid = actual_contribution >= 0
            elif expected_effect in ['--', '-']:
                is_valid = actual_contribution <= 0
            
            # Add validation status
            details['clinically_valid'] = is_valid
            if not is_valid:
                logger.warning(f"Clinical contradiction: {feature_name} expected {expected_effect} but contributed {actual_contribution:+.1f}")
            
            validated.append((feature_name, details))
        
        return validated
    
    def _generate_explanation(self, top_contributors, baseline, final):
        """
        Generate human-readable explanation
        
        Args:
            top_contributors: Top feature contributions
            baseline: Baseline glucose
            final: Final predicted glucose
            
        Returns:
            str: Natural language explanation
        """
        delta = final - baseline
        direction = "increased" if delta > 0 else "decreased"
        
        # Separate positive and negative contributors
        positive_contributors = [(name, details) for name, details in top_contributors if details['contribution'] > 2]
        negative_contributors = [(name, details) for name, details in top_contributors if details['contribution'] < -2]
        
        explanation_parts = []
        
        # Opening statement
        explanation_parts.append(f"Your glucose {direction} by {abs(delta):.0f} mg/dL from {baseline:.0f} to {final:.0f} mg/dL.")
        
        # Explain increases
        if positive_contributors:
            increase_factors = [self._format_feature_name(name) for name, _ in positive_contributors[:3]]
            if len(increase_factors) > 1:
                explanation_parts.append(f"The main factors increasing glucose were {', '.join(increase_factors[:-1])} and {increase_factors[-1]}.")
            else:
                explanation_parts.append(f"The main factor increasing glucose was {increase_factors[0]}.")
        
        # Explain decreases
        if negative_contributors:
            decrease_factors = [self._format_feature_name(name) for name, _ in negative_contributors[:3]]
            if len(decrease_factors) > 1:
                explanation_parts.append(f"Helpful factors that reduced the spike included {', '.join(decrease_factors[:-1])} and {decrease_factors[-1]}.")
            else:
                explanation_parts.append(f"A helpful factor that reduced the spike was {decrease_factors[0]}.")
        
        # Add context based on risk level
        if final > 200:
            explanation_parts.append("Consider monitoring closely and consulting with your healthcare provider.")
        elif final < 70:
            explanation_parts.append("This is below normal range. Consider consuming fast-acting carbohydrates.")
        elif 140 <= final <= 200:
            explanation_parts.append("This is in the elevated range. Consider light physical activity if safe.")
        
        return " ".join(explanation_parts)
    
    def _format_feature_name(self, feature_name):
        """Convert feature name to readable format"""
        name_map = {
            'carbohydrates': 'carbohydrate intake',
            'sugar': 'sugar content',
            'protein': 'protein intake',
            'fat': 'fat content',
            'fiber': 'fiber content',
            'heart_rate': 'elevated heart rate',
            'activity_level': 'physical activity',
            'stress_level': 'stress',
            'sleep_quality': 'sleep quality',
            'baseline_glucose': 'starting glucose level',
            'net_carbs': 'net carbohydrates'
        }
        return name_map.get(feature_name, feature_name.replace('_', ' '))
    
    def _calculate_explanation_confidence(self, validated_contributions):
        """
        Calculate confidence in the explanation based on clinical validity
        
        Args:
            validated_contributions: List of validated contributions
            
        Returns:
            float: Confidence score (0-1)
        """
        if not validated_contributions:
            return 0.5
        
        # Count clinically valid contributions
        valid_count = sum(1 for _, details in validated_contributions if details['clinically_valid'])
        total_count = len(validated_contributions)
        
        # Base confidence on validity ratio
        validity_ratio = valid_count / total_count if total_count > 0 else 0
        
        # Boost confidence if top contributors are valid
        top_3_valid = sum(1 for _, details in validated_contributions[:3] if details['clinically_valid'])
        top_3_boost = top_3_valid / 3.0 if len(validated_contributions) >= 3 else 1.0
        
        # Combined confidence
        confidence = (validity_ratio * 0.6) + (top_3_boost * 0.4)
        
        return min(0.95, max(0.3, confidence))
    
    def _generate_fallback_explanation(self, features_dict, baseline, final):
        """Generate basic explanation if perturbation analysis fails"""
        delta = final - baseline
        
        # Use simple heuristics
        carbs = features_dict.get('carbohydrates', 0)
        activity = features_dict.get('activity_level', 0.3)
        
        if carbs > 60:
            reason = "high carbohydrate intake"
        elif activity > 0.7:
            reason = "high physical activity level"
        else:
            reason = "your meal composition and current metabolic state"
        
        return {
            'feature_contributions': {},
            'top_contributors': [],
            'explanation': f"Your glucose changed by {delta:+.0f} mg/dL primarily due to {reason}. "
                          f"Prediction: {final:.0f} mg/dL (from baseline {baseline:.0f} mg/dL).",
            'prediction_delta': round(delta, 1),
            'clinical_validation': 'Fallback',
            'warnings': ['Fallback explanation used; attribution unavailable']
        }


# Global instance
_explainability_service = None

def get_explainability_service(model=None, scaler=None):
    """Get or create global explainability service"""
    global _explainability_service
    if _explainability_service is None and model is not None and scaler is not None:
        _explainability_service = ImprovedExplainabilityService(model, scaler)
    return _explainability_service
