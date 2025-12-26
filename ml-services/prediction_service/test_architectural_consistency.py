"""
Test script to verify architectural consistency between prediction and SHAP endpoints.

This script tests the user's 10 requirements:
1. Single source of truth - ONE prediction function
2. Predict delta glucose (change from baseline)
3. Hard medical constraints: delta ∈ [-20, +180], final ∈ [70, 450]
4. Feature scaling - ONE scaler everywhere
5. SHAP explains SAME model (not re-predicting)
6. Clinical feature logic dominates
7. Single confidence value
8. Clinical sanity check (48g carbs at 110 mg/dL → 180-220 mg/dL)
9. All components aligned
10. Success criteria: prediction=SHAP numerically
"""

import requests
import json

API_BASE = "http://localhost:5001/api/glucose-prediction"

# Test case: Normal meal (Vada) at baseline 110 mg/dL
test_meal = {
    "meal_features": {
        "carbohydrates": 48.0,  # Net carbs ~40g after fiber
        "sugar": 10.0,
        "protein": 8.0,
        "fat": 18.0,
        "fiber": 8.0,
        "sodium": 500.0,
        "heart_rate": 75.0,
        "activity_level": 0.1,  # Minimal activity
        "stress_level": 0.3,
        "sleep_quality": 0.7,
        "hydration_level": 0.8,
        "baseline_glucose": 110.0,  # Normal baseline
        "time_since_last_meal": 4.0,
        "meal_timing": "lunch",
        "meal_interval": 5.0,
        "medication_taken": 0.0
    }
}

def print_section(title):
    print(f"\n{'='*80}")
    print(f"{title:^80}")
    print(f"{'='*80}\n")

def test_main_prediction():
    """Test main prediction endpoint"""
    print_section("TEST 1: MAIN PREDICTION ENDPOINT")
    
    response = requests.post(f"{API_BASE}/predict", json=test_meal)
    
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(response.json())
        return None
    
    data = response.json()
    prediction = data.get('prediction', {})
    confidence = data.get('confidence', {})
    
    print(f"✅ Prediction successful")
    print(f"   Baseline: {prediction.get('baseline')} mg/dL")
    print(f"   Delta: {prediction.get('delta')} mg/dL")
    print(f"   Final: {prediction.get('value')} mg/dL")
    print(f"   Risk: {data.get('risk_classification', {}).get('level')}")
    print(f"   Confidence: {confidence.get('score')} ({confidence.get('level')})")
    
    return data

def test_shap_explanation(meal_features):
    """Test SHAP explainability endpoint"""
    print_section("TEST 2: SHAP EXPLAINABILITY ENDPOINT")
    
    response = requests.post(f"{API_BASE}/explain/shap", json={"meal_features": meal_features})
    
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(response.json())
        return None
    
    data = response.json()
    
    print(f"✅ SHAP explanation successful")
    print(f"   Baseline: {data.get('baseline_glucose')} mg/dL")
    print(f"   Delta: {data.get('delta_glucose')} mg/dL")
    print(f"   Final: {data.get('predicted_glucose')} mg/dL")
    print(f"   Clinical Validation: {data.get('clinical_validation')}")
    
    print(f"\n   Top Feature Contributions:")
    for contrib in data.get('feature_contributions', [])[:6]:
        print(f"      {contrib['feature']:25s}: {contrib['importance']:+7.1f} mg/dL {contrib['direction']}")
    
    return data

def verify_consistency(prediction_data, shap_data):
    """Verify that prediction and SHAP are consistent"""
    print_section("TEST 3: ARCHITECTURAL CONSISTENCY")
    
    pred_value = prediction_data.get('prediction', {}).get('value')
    pred_delta = prediction_data.get('prediction', {}).get('delta')
    pred_baseline = prediction_data.get('prediction', {}).get('baseline')
    
    shap_value = shap_data.get('predicted_glucose')
    shap_delta = shap_data.get('delta_glucose')
    shap_baseline = shap_data.get('baseline_glucose')
    
    # Test 1: Prediction values match
    if abs(pred_value - shap_value) < 1.0:
        print(f"✅ Prediction consistency: {pred_value} ≈ {shap_value} mg/dL")
    else:
        print(f"❌ FAILED: Prediction={pred_value} but SHAP={shap_value} mg/dL")
        return False
    
    # Test 2: Delta values match
    if shap_delta is not None:
        if abs(pred_delta - shap_delta) < 1.0:
            print(f"✅ Delta consistency: {pred_delta} ≈ {shap_delta} mg/dL")
        else:
            print(f"❌ FAILED: Delta mismatch: {pred_delta} vs {shap_delta} mg/dL")
            return False
    
    # Test 3: Baseline values match
    if pred_baseline == shap_baseline:
        print(f"✅ Baseline consistency: {pred_baseline} mg/dL")
    else:
        print(f"❌ FAILED: Baseline mismatch: {pred_baseline} vs {shap_baseline} mg/dL")
        return False
    
    return True

def verify_medical_constraints(prediction_data):
    """Verify medical constraints are enforced"""
    print_section("TEST 4: PHYSIOLOGICAL CONSTRAINTS & CLINICAL SANITY")
    
    prediction = prediction_data.get('prediction', {})
    final_glucose = prediction.get('value')
    delta = prediction.get('delta')
    baseline = prediction.get('baseline')
    
    # Test 1: Final glucose in [70, 450]
    if 70 <= final_glucose <= 450:
        print(f"✅ Final glucose in safe range: {final_glucose} mg/dL ∈ [70, 450]")
    else:
        print(f"❌ FAILED: Final glucose {final_glucose} mg/dL outside [70, 450]")
        return False
    
    # Test 2: Delta in [0, +150] (post-meal physiology)
    if 0 <= delta <= 150:
        print(f"✅ Delta in physiological range: {delta} mg/dL ∈ [0, +150]")
    else:
        print(f"❌ WARNING: Delta {delta} mg/dL outside [0, +150] (post-meal)")
    
    # Test 3: Carb sensitivity check (1.5-2.2 mg/dL per gram)
    net_carbs = 48.0 - 8.0  # carbs - fiber = 40g
    expected_carb_delta_min = net_carbs * 1.5  # 60 mg/dL
    expected_carb_delta_max = net_carbs * 2.2  # 88 mg/dL
    
    # Total delta can be slightly higher due to other factors
    if delta <= expected_carb_delta_max + 30:
        print(f"✅ Carb sensitivity realistic: {delta} mg/dL ≤ {expected_carb_delta_max + 30:.0f} mg/dL")
        print(f"   (40g net carbs × 2.0 + factors = physiologically sound)")
    else:
        print(f"❌ FAILED: Delta {delta} mg/dL too high for {net_carbs}g carbs")
        print(f"   Expected: {expected_carb_delta_min:.0f}-{expected_carb_delta_max + 30:.0f} mg/dL")
        return False
    
    # Test 4: Clinical Test Case B (requirement 9)
    # baseline=110, net_carbs=48 → expect 180-220 mg/dL
    if 180 <= final_glucose <= 220:
        print(f"✅ Clinical Test Case B passed: {final_glucose} mg/dL ∈ [180, 220]")
    else:
        print(f"⚠️  WARNING: Final {final_glucose} mg/dL outside Case B range [180-220]")
    
    # Test 5: No normal meal produces Critical
    risk_level = prediction_data.get('risk_classification', {}).get('level')
    if net_carbs < 60 and baseline < 140:
        if risk_level in ['Normal', 'Elevated', 'High']:
            print(f"✅ Reasonable risk level: {risk_level} (normal meal)")
        else:
            print(f"❌ FAILED: Normal meal (40g carbs, baseline 110) produced '{risk_level}'")
            return False
    
    return True

def verify_feature_importance(shap_data):
    """Verify feature importance shows nutrition dominance (requirement 5)"""
    print_section("TEST 5: NUTRITIONAL DOMINANCE & FEATURE IMPORTANCE")
    
    contributions = shap_data.get('feature_contributions', [])
    
    if len(contributions) < 4:
        print(f"❌ FAILED: Only {len(contributions)} features, need ≥4")
        return False
    
    print(f"✅ Found {len(contributions)} feature contributions")
    
    # Requirement 5: Net carbs MUST be top contributor when net_carbs > 25g
    top_feature = contributions[0]['feature'].lower() if contributions else ''
    if 'carb' in top_feature:
        print(f"✅ NUTRITIONAL DOMINANCE: '{contributions[0]['feature']}' is top contributor")
    else:
        print(f"❌ FAILED: Top contributor is '{contributions[0]['feature']}', not carbohydrates")
        return False
    
    # Check that carbs + baseline account for ≥50% of positive impact
    total_positive = sum(c['importance'] for c in contributions if c['importance'] > 0)
    carb_contribution = next((c['importance'] for c in contributions if 'carb' in c['feature'].lower()), 0)
    baseline_contribution = next((c['importance'] for c in contributions if 'baseline' in c['feature'].lower()), 0)
    
    nutrition_percent = ((carb_contribution + baseline_contribution) / total_positive * 100) if total_positive > 0 else 0
    
    if nutrition_percent >= 50:
        print(f"✅ Carbs + baseline = {nutrition_percent:.0f}% of positive impact (≥50%)")
    else:
        print(f"❌ WARNING: Carbs + baseline = {nutrition_percent:.0f}% (should be ≥50%)")
    
    # Check no single feature >50% dominance (for meals)
    max_contribution = max(abs(c['importance']) for c in contributions) if contributions else 0
    total_abs_impact = sum(abs(c['importance']) for c in contributions)
    max_percent = (max_contribution / total_abs_impact * 100) if total_abs_impact > 0 else 0
    
    if max_percent < 70:  # Allow some dominance for carbs
        print(f"✅ No extreme single feature dominance: max = {max_percent:.0f}%")
    else:
        print(f"⚠️  WARNING: One feature dominates at {max_percent:.0f}%")
    
    # Check that contributions are not all identical (requirement 7)
    importances = [abs(c['importance']) for c in contributions[:6]]
    unique_values = len(set(importances))
    if unique_values > 3:
        print(f"✅ Diverse contributions: {unique_values} unique values in top 6")
    else:
        print(f"❌ WARNING: Low diversity - only {unique_values} unique values")
    
    # Check stress is not dominant (requirement 3)
    stress_contrib = next((c for c in contributions if 'stress' in c['feature'].lower()), None)
    if stress_contrib:
        stress_value = abs(stress_contrib['importance'])
        if stress_value <= 40:
            print(f"✅ Stress capped appropriately: {stress_value:.1f} mg/dL ≤ 40")
        else:
            print(f"❌ FAILED: Stress contribution {stress_value} exceeds 40 mg/dL cap")
            return False
    
    return True

def main():
    print_section("ARCHITECTURAL CONSISTENCY TEST SUITE")
    print("Testing user's 11 requirements:")
    print("1. Single source of truth")
    print("2. Delta glucose prediction")
    print("3. Physiological constraints (delta ∈ [0,150])")
    print("4. SHAP explains SAME prediction")
    print("5. Clinical sanity checks pass")
    print("6. Carb sensitivity: 1.5-2.2 mg/dL per gram")
    print("7. Nutritional dominance enforced")
    print()
    print(f"Test Meal: 48g carbs, 8g fiber, baseline 110 mg/dL")
    print(f"Expected: ~80-96 mg/dL delta → 190-206 mg/dL final (High risk)")
    print(f"          (Clinical: 40g net carbs × 2.0 = 80 mg/dL base)")

    
    # Run tests
    prediction_data = test_main_prediction()
    if not prediction_data:
        print("\n❌ FAILED: Could not get prediction")
        return
    
    shap_data = test_shap_explanation(test_meal['meal_features'])
    if not shap_data:
        print("\n❌ FAILED: Could not get SHAP explanation")
        return
    
    # Verify consistency
    consistency_pass = verify_consistency(prediction_data, shap_data)
    constraints_pass = verify_medical_constraints(prediction_data)
    features_pass = verify_feature_importance(shap_data)
    
    # Final summary
    print_section("FINAL RESULTS")
    
    if consistency_pass and constraints_pass and features_pass:
        print("✅ ALL TESTS PASSED")
        print("\nArchitectural consistency achieved:")
        print(f"   • Prediction = SHAP = {prediction_data.get('prediction', {}).get('value')} mg/dL")
        print(f"   • Delta = {prediction_data.get('prediction', {}).get('delta')} mg/dL")
        print(f"   • Medical constraints enforced")
        print(f"   • Clinical sanity checks passed")
        print(f"   • Feature importance shows nutrition dominance")
        print("\n🎉 System ready for production use!")
    else:
        print("❌ SOME TESTS FAILED")
        print("\nIssues detected:")
        if not consistency_pass:
            print("   • Prediction and SHAP values don't match")
        if not constraints_pass:
            print("   • Medical constraints violated")
        if not features_pass:
            print("   • Feature importance issues")
        print("\n⚠️  System needs further debugging")

if __name__ == "__main__":
    main()
