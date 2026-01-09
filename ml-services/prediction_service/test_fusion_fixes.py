#!/usr/bin/env python3
"""
Multi-Modal Fusion Output Validation Tests

Tests all 5 critical fixes:
1. Prediction Arithmetic Validation (final = baseline + delta)
2. Risk Level + Trend Alignment
3. Fusion Score Justification Logic
4. Explainability Direction Consistency
5. NLP Completeness Score Safeguard

Academic Alignment: Viva-Ready Test Evidence
"""

import requests
import json
from typing import Dict

# Service URL
FUSION_API_URL = "http://localhost:5001/api/fusion/predict"


def test_1_prediction_arithmetic():
    """
    TEST 1: Prediction Arithmetic Validation
    
    Verify: final_prediction = baseline + delta
    """
    print("\n" + "="*80)
    print("TEST 1: Prediction Arithmetic Validation")
    print("="*80)
    
    test_data = {
        "biomarker": "cholesterol",
        "cv_data": {
            "food_name": "Vada",
            "confidence": 0.95
        },
        "nlp_data": {
            "saturated_fat_g": 12.0,
            "trans_fat_g": 0.3,
            "dietary_cholesterol_mg": 180.0,
            "fiber_g": 6.0,
            "sugar_g": 20.0,
            "sodium_mg": 1500.0
        },
        "biometric_data": {
            "predicted_value": 195.5,  # Should equal baseline + delta
            "baseline": 180.0,
            "delta": 15.5,
            "risk_level": "Borderline",
            "confidence": 0.82
        }
    }
    
    response = requests.post(FUSION_API_URL, json=test_data, timeout=10)
    
    if response.status_code != 200:
        print(f"❌ FAIL: API returned {response.status_code}")
        return False
    
    result = response.json()['fusion_result']
    
    # Extract values
    final = result['final_prediction']
    baseline = result['baseline']
    delta = result['delta']
    
    # Calculate expected
    expected_final = baseline + delta
    
    # Check arithmetic
    arithmetic_correct = abs(final - expected_final) < 0.01
    
    print(f"\n📊 Results:")
    print(f"  Baseline:         {baseline}")
    print(f"  Delta:            {delta:+.1f}")
    print(f"  Final Prediction: {final}")
    print(f"  Expected Final:   {expected_final}")
    print(f"  Arithmetic Valid: {arithmetic_correct}")
    
    if arithmetic_correct:
        print(f"\n✅ PASS: final_prediction = baseline + delta")
        return True
    else:
        print(f"\n❌ FAIL: Arithmetic inconsistency detected!")
        return False


def test_2_risk_level_trend_alignment():
    """
    TEST 2: Risk Level + Trend Alignment
    
    Verify: Risk level reflects both absolute value AND direction
    """
    print("\n" + "="*80)
    print("TEST 2: Risk Level + Trend Alignment")
    print("="*80)
    
    # Scenario: Improving trend (delta < 0)
    test_data = {
        "biomarker": "cholesterol",
        "cv_data": {
            "food_name": "Salad",
            "confidence": 0.90
        },
        "nlp_data": {
            "saturated_fat_g": 2.0,
            "trans_fat_g": 0.0,
            "dietary_cholesterol_mg": 50.0,
            "fiber_g": 15.0,
            "sugar_g": 8.0,
            "sodium_mg": 800.0
        },
        "biometric_data": {
            "predicted_value": 165.1,
            "baseline": 185.5,
            "delta": -20.4,  # IMPROVING
            "risk_level": "Borderline",
            "confidence": 0.85
        }
    }
    
    response = requests.post(FUSION_API_URL, json=test_data, timeout=10)
    
    if response.status_code != 200:
        print(f"❌ FAIL: API returned {response.status_code}")
        return False
    
    result = response.json()['fusion_result']
    
    risk_level = result['risk_level']
    delta = result['delta']
    
    # Check if risk level reflects improving trend
    trend_reflected = (
        'Improving' in risk_level or 
        'Downward' in risk_level or 
        'Decreasing' in risk_level
    )
    
    print(f"\n📊 Results:")
    print(f"  Delta:       {delta:+.1f}")
    print(f"  Risk Level:  {risk_level}")
    print(f"  Trend Shown: {trend_reflected}")
    
    if delta < 0 and trend_reflected:
        print(f"\n✅ PASS: Risk level reflects improving trend")
        return True
    else:
        print(f"\n❌ FAIL: Risk level does NOT reflect trend direction")
        return False


def test_3_fusion_score_justification():
    """
    TEST 3: Fusion Score Justification Logic
    
    Verify: High fusion score with moderate explainability includes justification
    """
    print("\n" + "="*80)
    print("TEST 3: Fusion Score Justification Logic")
    print("="*80)
    
    # Scenario: High fusion score (0.91) but low explainability (0.65)
    test_data = {
        "biomarker": "cholesterol",
        "cv_data": {
            "food_name": "Biryani",
            "confidence": 0.98  # Very high
        },
        "nlp_data": {
            "saturated_fat_g": 18.0,
            "trans_fat_g": 0.5,
            "dietary_cholesterol_mg": 250.0,
            "fiber_g": 4.0,
            "sugar_g": 30.0,
            "sodium_mg": 2200.0
        },
        "biometric_data": {
            "predicted_value": 220.0,
            "baseline": 185.0,
            "delta": 35.0,
            "risk_level": "High Risk",
            "confidence": 0.92  # Very high
        },
        "shap_data": {
            "ldl_drivers": [
                {"factor": "Saturated Fat", "contribution": 20.0, "direction": "increase"},
                {"factor": "Fiber", "contribution": -5.0, "direction": "decrease"}
            ]
        }
    }
    
    response = requests.post(FUSION_API_URL, json=test_data, timeout=10)
    
    if response.status_code != 200:
        print(f"❌ FAIL: API returned {response.status_code}")
        return False
    
    result = response.json()['fusion_result']
    
    fusion_score = result['fusion_score']
    explainability = result['modality_scores']['explainability']
    explanation = result['explanation']
    
    # Check for justification if fusion high but explainability moderate
    needs_justification = (fusion_score >= 0.85 and explainability < 0.8)
    justification_present = (
        'compensates' in explanation.lower() or 
        'strong consensus' in explanation.lower() or
        'cross-modal' in explanation.lower()
    )
    
    print(f"\n📊 Results:")
    print(f"  Fusion Score:       {fusion_score}")
    print(f"  Explainability:     {explainability}")
    print(f"  Needs Justification: {needs_justification}")
    print(f"  Justification Found: {justification_present}")
    print(f"\n  Explanation: {explanation}")
    
    if needs_justification and justification_present:
        print(f"\n✅ PASS: Fusion score justification present")
        return True
    elif not needs_justification:
        print(f"\n✅ PASS: No justification needed (explainability high)")
        return True
    else:
        print(f"\n❌ FAIL: High fusion score lacks justification")
        return False


def test_4_explainability_direction_consistency():
    """
    TEST 4: Explainability Direction Consistency
    
    Verify: Drivers include medical directionality (↑ ↓)
    """
    print("\n" + "="*80)
    print("TEST 4: Explainability Direction Consistency")
    print("="*80)
    
    test_data = {
        "biomarker": "cholesterol",
        "cv_data": {
            "food_name": "Fried Chicken",
            "confidence": 0.94
        },
        "nlp_data": {
            "saturated_fat_g": 25.0,  # HIGH - should increase LDL
            "trans_fat_g": 1.0,
            "dietary_cholesterol_mg": 300.0,
            "fiber_g": 10.0,  # HIGH - should decrease LDL
            "sugar_g": 15.0,
            "sodium_mg": 1800.0
        },
        "biometric_data": {
            "predicted_value": 210.0,
            "baseline": 180.0,
            "delta": 30.0,  # Increased
            "risk_level": "Borderline",
            "confidence": 0.88
        }
    }
    
    response = requests.post(FUSION_API_URL, json=test_data, timeout=10)
    
    if response.status_code != 200:
        print(f"❌ FAIL: API returned {response.status_code}")
        return False
    
    result = response.json()['fusion_result']
    
    driver_summary = result.get('driver_summary', [])
    
    print(f"\n📊 Driver Summary:")
    for i, driver in enumerate(driver_summary, 1):
        print(f"  {i}. {driver}")
    
    # Check for directional indicators
    has_directionality = any(
        '↑' in driver or '↓' in driver or 'increased' in driver.lower() or 'decreased' in driver.lower()
        for driver in driver_summary
    )
    
    # Check for medical correctness
    sat_fat_mentioned = any('saturated fat' in driver.lower() for driver in driver_summary)
    fiber_mentioned = any('fiber' in driver.lower() for driver in driver_summary)
    
    print(f"\n  Has Directionality:    {has_directionality}")
    print(f"  Saturated Fat Mentioned: {sat_fat_mentioned}")
    print(f"  Fiber Mentioned:       {fiber_mentioned}")
    
    if has_directionality and (sat_fat_mentioned or fiber_mentioned):
        print(f"\n✅ PASS: Driver analysis includes medical directionality")
        return True
    else:
        print(f"\n❌ FAIL: Missing directional or medical context")
        return False


def test_5_nlp_completeness_safeguard():
    """
    TEST 5: NLP Completeness Score Safeguard
    
    Verify: NLP completeness capped at 95-98%, never 100%
    """
    print("\n" + "="*80)
    print("TEST 5: NLP Completeness Score Safeguard")
    print("="*80)
    
    # All nutrients present with perfect values
    test_data = {
        "biomarker": "cholesterol",
        "cv_data": {
            "food_name": "Grilled Fish",
            "confidence": 0.96
        },
        "nlp_data": {
            "saturated_fat_g": 5.0,
            "trans_fat_g": 0.0,
            "dietary_cholesterol_mg": 100.0,
            "fiber_g": 8.0,
            "sugar_g": 5.0,
            "sodium_mg": 1200.0
        },
        "biometric_data": {
            "predicted_value": 175.0,
            "baseline": 180.0,
            "delta": -5.0,
            "risk_level": "Near Optimal",
            "confidence": 0.85
        }
    }
    
    response = requests.post(FUSION_API_URL, json=test_data, timeout=10)
    
    if response.status_code != 200:
        print(f"❌ FAIL: API returned {response.status_code}")
        return False
    
    result = response.json()['fusion_result']
    
    nlp_completeness = result['modality_scores']['nlp']
    
    print(f"\n📊 Results:")
    print(f"  NLP Completeness: {nlp_completeness * 100:.1f}%")
    
    # Check safeguard: should be ≤ 98%
    safeguard_active = nlp_completeness <= 0.98
    
    if safeguard_active:
        print(f"\n✅ PASS: NLP completeness capped (safeguard active)")
        return True
    else:
        print(f"\n❌ FAIL: NLP completeness = 100% (safeguard failed)")
        return False


def run_all_tests():
    """Execute all validation tests"""
    print("\n" + "="*80)
    print(" MULTI-MODAL FUSION OUTPUT VALIDATION ".center(80, "="))
    print(" Academic Alignment & Viva-Ready Evidence ".center(80, "="))
    print("="*80)
    
    tests = [
        ("Prediction Arithmetic", test_1_prediction_arithmetic),
        ("Risk Level Trend Alignment", test_2_risk_level_trend_alignment),
        ("Fusion Score Justification", test_3_fusion_score_justification),
        ("Explainability Directionality", test_4_explainability_direction_consistency),
        ("NLP Completeness Safeguard", test_5_nlp_completeness_safeguard)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            passed = test_func()
            results.append((test_name, passed))
        except Exception as e:
            print(f"\n❌ ERROR in {test_name}: {str(e)}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "="*80)
    print(" TEST SUMMARY ".center(80, "="))
    print("="*80)
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}  {test_name}")
    
    print(f"\n  Total: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print(f"\n🎓 VERDICT: SYSTEM READY FOR ACADEMIC DEFENSE")
        print(f"   All fusion output fixes validated")
        print(f"   Mathematical consistency: ✅")
        print(f"   Medical correctness: ✅")
        print(f"   Academic defensibility: ✅")
        return 0
    else:
        print(f"\n⚠️  VERDICT: FIXES NEEDED")
        print(f"   {total_count - passed_count} test(s) failed")
        return 1


if __name__ == "__main__":
    import sys
    exit_code = run_all_tests()
    sys.exit(exit_code)
