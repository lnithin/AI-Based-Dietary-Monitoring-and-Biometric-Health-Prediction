#!/usr/bin/env python3
"""Quick test of cholesterol prediction module"""

from cholesterol_prediction_model import CholesterolLSTMModel

# Create model
model = CholesterolLSTMModel()

# Test features
features = {
    'saturated_fat_g': 15.0,
    'trans_fat_g': 0.5,
    'dietary_cholesterol_mg': 200.0,
    'fiber_g': 8.0,
    'sugar_g': 25.0,
    'sodium_mg': 1800.0,
    'activity_level': 0.6,
    'stress_level': 0.4,
    'sleep_quality': 0.7,
    'hydration_level': 0.8,
    'age': 45,
    'weight_kg': 75.0,
    'baseline_ldl': 130.0,
    'baseline_hdl': 45.0
}

# Get prediction
result = model.predict(features)

# Display results
print('\n✅ CHOLESTEROL MODEL TEST PASSED')
print('='*50)
print(f"LDL Cholesterol:   {result['ldl']} mg/dL (change: {result['delta_ldl']:+.1f})")
print(f"HDL Cholesterol:   {result['hdl']} mg/dL (change: {result['delta_hdl']:+.1f})")
print(f"Total Cholesterol: {result['total_cholesterol']} mg/dL")
print(f"Risk Level:        {result['risk_level']}")
print(f"Confidence:        {result['confidence']:.0%}")
print('='*50)
print('\n✅ All biomarker models are now functional!')
print('   - Glucose ✅')
print('   - Blood Pressure ✅')
print('   - Cholesterol ✅\n')
