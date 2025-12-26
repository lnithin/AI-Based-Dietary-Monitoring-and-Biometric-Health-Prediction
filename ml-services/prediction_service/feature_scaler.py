"""
Feature Scaling and Normalization for Glucose Prediction
Ensures numerical stability and prevents exploding predictions
"""

import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import logging
import json
import os

logger = logging.getLogger(__name__)

class GlucoseFeatureScaler:
    """
    Handles scaling and normalization of all features for glucose prediction
    Uses different scalers for different feature types for optimal performance
    """
    
    def __init__(self):
        # Nutrition features: Use MinMaxScaler (bounded ranges)
        self.nutrition_scaler = MinMaxScaler(feature_range=(0, 1))
        
        # Biometric features: Use StandardScaler (can vary widely)
        self.biometric_scaler = StandardScaler()
        
        # Temporal features: Use MinMaxScaler (bounded ranges)
        self.temporal_scaler = MinMaxScaler(feature_range=(0, 1))
        
        # Target (glucose): Use MinMaxScaler with strict medical range
        self.glucose_scaler = MinMaxScaler(feature_range=(0, 1))
        
        self.is_fitted = False
        
        # Initialize with medical ranges
        self._initialize_with_medical_ranges()
    
    def _initialize_with_medical_ranges(self):
        """Initialize scalers with medically valid ranges"""
        
        # Nutrition features (carbs, protein, fat, fiber, sugar, sodium)
        # Create sample data at min and max for each feature
        nutrition_min = np.array([[0, 0, 0, 0, 0, 0]])
        nutrition_max = np.array([[120, 60, 80, 40, 50, 2300]])
        nutrition_data = np.vstack([nutrition_min, nutrition_max])
        self.nutrition_scaler.fit(nutrition_data)
        
        # Biometric features (heart_rate, activity, stress, sleep, hydration)
        biometric_min = np.array([[40, 0, 0, 0, 0]])
        biometric_max = np.array([[180, 1, 1, 1, 1]])
        biometric_data = np.vstack([biometric_min, biometric_max])
        self.biometric_scaler.fit(biometric_data)
        
        # Temporal features (time_since_meal, meal_interval, medication)
        temporal_min = np.array([[0, 1, 0]])
        temporal_max = np.array([[24, 12, 1]])
        temporal_data = np.vstack([temporal_min, temporal_max])
        self.temporal_scaler.fit(temporal_data)
        
        # Glucose target (70-450 mg/dL)
        glucose_data = np.array([[70], [450]])
        self.glucose_scaler.fit(glucose_data)
        
        self.is_fitted = True
        logger.info("Feature scalers initialized with medical ranges")
    
    def scale_features(self, features_dict):
        """
        Scale all features for model input
        
        Args:
            features_dict: Dictionary with keys:
                - carbs, protein, fat, fiber, sugar, sodium
                - heart_rate, activity_level, stress_level, sleep_quality, hydration_level
                - time_since_last_meal, meal_interval, medication_taken
                - baseline_glucose
                
        Returns:
            np.array: Scaled feature vector (15 features)
        """
        if not self.is_fitted:
            raise ValueError("Scalers not fitted. Call fit() first.")
        
        # Extract and scale nutrition features
        nutrition_features = np.array([[
            features_dict.get('carbohydrates', 50),
            features_dict.get('protein', 15),
            features_dict.get('fat', 10),
            features_dict.get('fiber', 5),
            features_dict.get('sugar', 10),
            features_dict.get('sodium', 500)
        ]])
        nutrition_scaled = self.nutrition_scaler.transform(nutrition_features)
        
        # Extract and scale biometric features
        biometric_features = np.array([[
            features_dict.get('heart_rate', 72),
            features_dict.get('activity_level', 0.3),
            features_dict.get('stress_level', 0.3),
            features_dict.get('sleep_quality', 0.7),
            features_dict.get('hydration_level', 0.7)
        ]])
        biometric_scaled = self.biometric_scaler.transform(biometric_features)
        
        # Extract and scale temporal features
        temporal_features = np.array([[
            features_dict.get('time_since_last_meal', 4),
            features_dict.get('meal_interval', 6),
            float(features_dict.get('medication_taken', 0))
        ]])
        temporal_scaled = self.temporal_scaler.transform(temporal_features)
        
        # Baseline glucose is special - scale separately
        baseline_glucose = features_dict.get('baseline_glucose', 100)
        baseline_scaled = self.glucose_scaler.transform([[baseline_glucose]])[0]
        
        # Concatenate all scaled features
        scaled_features = np.concatenate([
            nutrition_scaled[0],
            biometric_scaled[0],
            temporal_scaled[0],
            baseline_scaled
        ])
        
        return scaled_features
    
    def inverse_scale_glucose(self, scaled_glucose):
        """
        Convert scaled glucose back to mg/dL
        
        Args:
            scaled_glucose: Scaled value (0-1)
            
        Returns:
            float: Glucose in mg/dL
        """
        if isinstance(scaled_glucose, (list, np.ndarray)):
            scaled_glucose = np.array(scaled_glucose).reshape(-1, 1)
        else:
            scaled_glucose = np.array([[scaled_glucose]])
        
        glucose_mg_dL = self.glucose_scaler.inverse_transform(scaled_glucose)[0][0]
        
        # Apply hard safety clip
        return np.clip(glucose_mg_dL, 70, 450)
    
    def scale_glucose(self, glucose_mg_dL):
        """
        Scale glucose from mg/dL to 0-1 range
        
        Args:
            glucose_mg_dL: Glucose in mg/dL
            
        Returns:
            float: Scaled glucose (0-1)
        """
        # Clip to safe range first
        clipped = np.clip(glucose_mg_dL, 70, 450)
        return self.glucose_scaler.transform([[clipped]])[0][0]
    
    def get_feature_names(self):
        """Return ordered list of feature names"""
        return [
            'carbohydrates', 'protein', 'fat', 'fiber', 'sugar', 'sodium',
            'heart_rate', 'activity_level', 'stress_level', 'sleep_quality', 'hydration_level',
            'time_since_last_meal', 'meal_interval', 'medication_taken',
            'baseline_glucose'
        ]
    
    def save_scalers(self, path='./models/scalers.npz'):
        """Save scaler parameters"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        np.savez(
            path,
            nutrition_min=self.nutrition_scaler.data_min_,
            nutrition_max=self.nutrition_scaler.data_max_,
            biometric_mean=self.biometric_scaler.mean_,
            biometric_std=self.biometric_scaler.scale_,
            temporal_min=self.temporal_scaler.data_min_,
            temporal_max=self.temporal_scaler.data_max_,
            glucose_min=self.glucose_scaler.data_min_,
            glucose_max=self.glucose_scaler.data_max_
        )
        logger.info(f"Scalers saved to {path}")
    
    def load_scalers(self, path='./models/scalers.npz'):
        """Load scaler parameters"""
        if not os.path.exists(path):
            logger.warning(f"Scaler file not found: {path}. Using defaults.")
            return False
        
        data = np.load(path)
        
        self.nutrition_scaler.data_min_ = data['nutrition_min']
        self.nutrition_scaler.data_max_ = data['nutrition_max']
        self.biometric_scaler.mean_ = data['biometric_mean']
        self.biometric_scaler.scale_ = data['biometric_std']
        self.temporal_scaler.data_min_ = data['temporal_min']
        self.temporal_scaler.data_max_ = data['temporal_max']
        self.glucose_scaler.data_min_ = data['glucose_min']
        self.glucose_scaler.data_max_ = data['glucose_max']
        
        self.is_fitted = True
        logger.info(f"Scalers loaded from {path}")
        return True
    
    def get_feature_names(self):
        """
        Get list of feature names in the order expected by the model
        
        Returns:
            list: Feature names
        """
        return [
            'carbohydrates',
            'protein',
            'fat',
            'fiber',
            'sugar',
            'sodium',
            'heart_rate',
            'activity_level',
            'stress_level',
            'sleep_quality',
            'hydration_level',
            'time_since_last_meal',
            'meal_interval',
            'medication_taken',
            'baseline_glucose'
        ]


# Global scaler instance
_global_scaler = None

def get_global_scaler():
    """Get or create global scaler instance"""
    global _global_scaler
    if _global_scaler is None:
        _global_scaler = GlucoseFeatureScaler()
    return _global_scaler
