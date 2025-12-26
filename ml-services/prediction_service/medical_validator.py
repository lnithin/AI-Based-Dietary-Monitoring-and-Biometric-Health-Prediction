"""
Medical Validator for Glucose Prediction System
Enforces physiological constraints and medical safety per WHO/ADA guidelines
"""

class MedicalValidator:
    """Validates inputs and outputs against medical ranges and safety constraints"""
    
    # Nutritional Input Ranges (per meal)
    NUTRITION_RANGES = {
        'carbohydrates': (0, 300),      # grams
        'protein': (0, 150),            # grams
        'fat': (0, 150),                # grams
        'fiber': (0, 60),               # grams
        'sugar': (0, 150),              # grams
        'sodium': (0, 5000),            # milligrams
    }
    
    # Biometric Input Ranges
    BIOMETRIC_RANGES = {
        'heart_rate': (40, 180),        # bpm
        'activity_level': (0, 1),       # normalized 0-1
        'baseline_glucose': (50, 300),  # mg/dL
        'stress_level': (0, 1),         # normalized 0-1
        'sleep_quality': (0, 1),        # normalized 0-1
        'hydration_level': (0, 1),      # normalized 0-1
    }
    
    # Temporal Input Ranges
    TEMPORAL_RANGES = {
        'time_since_last_meal': (0, 24),    # hours
        'meal_interval': (1, 24),           # hours
        'medication_taken': (0, 1),         # boolean 0/1
    }
    
    # Glucose Safety Limits (Updated per medical requirements)
    GLUCOSE_MIN = 40      # mg/dL - Medical minimum (severe hypoglycemia)
    GLUCOSE_MAX = 450     # mg/dL - Maximum physiologically realistic (updated from 600)
    
    # Risk Classification (enforced)
    # <70 Hypoglycemia (safety category)
    # 70–99 Normal
    # 100–139 Elevated
    # 140–179 Elevated (Postprandial)
    # 180–249 High
    # ≥250 Critical
    RISK_THRESHOLDS = {
        'hypoglycemia': 70,
        'normal': 100,
        'elevated': 140,
        'high': 180,
        'critical': 250,
    }
    
    @staticmethod
    def validate_input(data):
        """
        Validate all input features against medical ranges
        
        Args:
            data (dict): Input features
            
        Returns:
            tuple: (is_valid, error_messages, validated_data)
        """
        errors = []
        validated = {}
        
        # Validate nutritional inputs
        for key, (min_val, max_val) in MedicalValidator.NUTRITION_RANGES.items():
            if key in data:
                value = float(data[key])
                if not (min_val <= value <= max_val):
                    errors.append(f"{key}: {value} outside range [{min_val}, {max_val}]")
                else:
                    validated[key] = value
            else:
                # Use medically informed defaults
                validated[key] = 0.0 if key != 'carbohydrates' else 50.0
        
        # Validate biometric inputs
        for key, (min_val, max_val) in MedicalValidator.BIOMETRIC_RANGES.items():
            if key in data:
                value = float(data[key])
                if not (min_val <= value <= max_val):
                    errors.append(f"{key}: {value} outside range [{min_val}, {max_val}]")
                else:
                    validated[key] = value
            else:
                # Defaults
                defaults = {
                    'heart_rate': 72,
                    'activity_level': 0.3,
                    'baseline_glucose': 100,
                    'stress_level': 0.3,
                    'sleep_quality': 0.7,
                    'hydration_level': 0.7,
                }
                validated[key] = defaults.get(key, 0.5)
        
        # Validate temporal inputs
        for key, (min_val, max_val) in MedicalValidator.TEMPORAL_RANGES.items():
            if key in data:
                value = float(data[key])
                if not (min_val <= value <= max_val):
                    errors.append(f"{key}: {value} outside range [{min_val}, {max_val}]")
                else:
                    validated[key] = value
            else:
                defaults = {
                    'time_since_last_meal': 4,
                    'meal_interval': 6,
                    'medication_taken': 0,
                }
                validated[key] = defaults.get(key, 0)
        
        is_valid = len(errors) == 0
        return is_valid, errors, validated
    
    @staticmethod
    def calculate_derived_features(data):
        """
        Calculate derived features from raw inputs
        
        Args:
            data (dict): Validated input data
            
        Returns:
            dict: Data with derived features added
        """
        enriched = data.copy()
        
        # Net carbohydrates (fiber reduces absorption)
        enriched['net_carbs'] = max(0, data['carbohydrates'] - data['fiber'])
        
        # Sugar ratio (simple vs complex carbs)
        if data['carbohydrates'] > 0:
            enriched['sugar_ratio'] = data['sugar'] / data['carbohydrates']
        else:
            enriched['sugar_ratio'] = 0
        
        # Carb-to-fat ratio (affects absorption speed)
        if data['fat'] > 0:
            enriched['carb_fat_ratio'] = data['carbohydrates'] / data['fat']
        else:
            enriched['carb_fat_ratio'] = data['carbohydrates']
        
        # Activity-adjusted glucose load (use the net_carbs we just calculated)
        enriched['activity_adjusted_load'] = enriched['net_carbs'] * (1 - data['activity_level'] * 0.3)
        
        # Stress adjustment factor
        enriched['stress_factor'] = 1 + (data['stress_level'] * 0.2)
        
        # Sleep quality impact
        enriched['sleep_impact'] = 1 + ((1 - data['sleep_quality']) * 0.15)
        
        return enriched
    
    @staticmethod
    def apply_safety_constraints(predicted_glucose, baseline_glucose):
        """
        Apply medical safety constraints to prediction
        
        Args:
            predicted_glucose (float): Raw model prediction
            baseline_glucose (float): Baseline glucose value
            
        Returns:
            tuple: (final_glucose, is_critical, warning_message)
        """
        # Ensure prediction is relative to baseline
        if predicted_glucose < baseline_glucose:
            # Model predicted decrease (uncommon after meal)
            final_glucose = baseline_glucose
            warning = "Prediction adjusted: glucose unlikely to decrease after meal"
        else:
            final_glucose = predicted_glucose
            warning = None
        
        # Apply hard limits
        is_critical = False
        if final_glucose > MedicalValidator.GLUCOSE_MAX:
            is_critical = True
            final_glucose = MedicalValidator.GLUCOSE_MAX
            warning = f">600 mg/dL (Critical - Emergency Medical Attention Required)"
        elif final_glucose < MedicalValidator.GLUCOSE_MIN:
            final_glucose = MedicalValidator.GLUCOSE_MIN
            warning = "Prediction below medical minimum - adjusted to 40 mg/dL"
        
        return final_glucose, is_critical, warning
    
    @staticmethod
    def classify_risk(glucose_value):
        """
        Classify glucose level according to WHO/ADA guidelines
        
        Args:
            glucose_value (float): Glucose level in mg/dL
            
        Returns:
            dict: Risk classification with interpretation
        """
        if glucose_value < MedicalValidator.RISK_THRESHOLDS['hypoglycemia']:
            level = "Hypoglycemia"
            interpretation = "Blood glucose is below normal range"
            color = "red"
            recommendation = "Consume fast-acting carbohydrates and monitor closely. Seek medical advice if symptoms persist."
        elif glucose_value < MedicalValidator.RISK_THRESHOLDS['normal']:
            level = "Normal"
            interpretation = "Blood glucose is within normal range"
            color = "green"
            recommendation = "Continue maintaining a balanced diet and regular activity"
        elif glucose_value < MedicalValidator.RISK_THRESHOLDS['elevated']:
            level = "Elevated"
            interpretation = "Blood glucose is mildly elevated"
            color = "yellow"
            recommendation = "Consider light physical activity if safe and reduce simple sugars in the next meal"
        elif glucose_value < MedicalValidator.RISK_THRESHOLDS['high']:
            level = "Elevated (Postprandial)"
            interpretation = "Blood glucose is moderately elevated after the meal"
            color = "yellow"
            recommendation = "Light physical activity and balanced meals with fiber may help reduce post-meal glucose rise"
        elif glucose_value < MedicalValidator.RISK_THRESHOLDS['critical']:
            level = "High"
            interpretation = "Blood glucose is high"
            color = "orange"
            recommendation = "Monitor closely and consider consulting a healthcare provider"
        else:
            level = "Critical"
            interpretation = "Blood glucose is critically high"
            color = "red"
            recommendation = "⚠️ Seek medical attention if you feel unwell or if this persists."
        
        return {
            'level': level,
            'interpretation': interpretation,
            'color': color,
            'recommendation': recommendation,
            'value_display': f"{glucose_value:.1f} mg/dL"
        }
    
    @staticmethod
    def calculate_confidence(features, prediction):
        """
        Calculate prediction confidence based on feature ranges and extremes
        
        Args:
            features (dict): Input features
            prediction (float): Predicted glucose value
            
        Returns:
            dict: Confidence information
        """
        # Check for extreme values that reduce confidence
        confidence_factors = []
        
        # Very high carbohydrate intake reduces confidence
        if features['carbohydrates'] > 200:
            confidence_factors.append("Very high carbohydrate intake")
        
        # Extreme activity levels
        if features['activity_level'] > 0.9 or features['activity_level'] < 0.1:
            confidence_factors.append("Extreme activity level")
        
        # Poor sleep quality
        if features['sleep_quality'] < 0.3:
            confidence_factors.append("Very poor sleep quality")
        
        # High stress
        if features['stress_level'] > 0.8:
            confidence_factors.append("Very high stress level")
        
        # Unusual meal timing
        if features['time_since_last_meal'] < 1:
            confidence_factors.append("Very short time since last meal")
        
        # Calculate confidence score
        if len(confidence_factors) == 0:
            confidence_level = "High"
            confidence_score = 0.9
            confidence_message = "Prediction is based on typical physiological parameters"
        elif len(confidence_factors) <= 2:
            confidence_level = "Moderate"
            confidence_score = 0.7
            confidence_message = "Some factors may affect prediction accuracy: " + ", ".join(confidence_factors)
        else:
            confidence_level = "Low"
            confidence_score = 0.5
            confidence_message = "⚠️ Prediction confidence is low due to: " + ", ".join(confidence_factors)
        
        return {
            'level': confidence_level,
            'score': confidence_score,
            'message': confidence_message,
            'factors': confidence_factors
        }
    
    @staticmethod
    def generate_medical_disclaimer():
        """Generate standard medical disclaimer"""
        return (
            "⚕️ MEDICAL DISCLAIMER: This prediction is for informational and educational purposes only. "
            "It is NOT a medical diagnosis and should NOT replace professional medical advice, diagnosis, "
            "or treatment. Always consult a qualified healthcare provider for medical concerns. "
            "This system is designed for preventive health monitoring and academic research."
        )
