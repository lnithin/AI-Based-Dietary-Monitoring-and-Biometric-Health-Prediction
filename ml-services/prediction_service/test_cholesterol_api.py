#!/usr/bin/env python3
"""
Unit tests for Cholesterol Prediction API
Tests medical constraints, physiological effects, and explainability.

Run: pytest test_cholesterol_api.py -v
"""

import pytest
import sys
from pathlib import Path

# Add prediction_service to path
prediction_service_path = Path(__file__).parent
sys.path.insert(0, str(prediction_service_path))

from cholesterol_prediction_model import CholesterolLSTMModel


@pytest.fixture
def cholesterol_model():
    """Create a cholesterol model instance for testing"""
    return CholesterolLSTMModel()


@pytest.fixture
def baseline_features():
    """Standard baseline feature set for testing"""
    return {
        'saturated_fat_g': 10.0,
        'trans_fat_g': 0.5,
        'dietary_cholesterol_mg': 150.0,
        'fiber_g': 10.0,
        'sugar_g': 20.0,
        'sodium_mg': 1500.0,
        'activity_level': 0.5,
        'stress_level': 0.4,
        'sleep_quality': 0.7,
        'hydration_level': 0.6,
        'age': 40,
        'weight_kg': 75.0,
        'baseline_ldl': 130.0,
        'baseline_hdl': 45.0
    }


def test_health_endpoint(cholesterol_model):
    """Test model initialization"""
    assert cholesterol_model is not None
    assert cholesterol_model.feature_dim == 14
    assert len(cholesterol_model.get_feature_names()) == 14


def test_high_fiber_reduces_ldl(cholesterol_model, baseline_features):
    """Test that high fiber intake reduces LDL cholesterol"""
    # Low fiber scenario
    low_fiber = baseline_features.copy()
    low_fiber['fiber_g'] = 2.0
    pred_low = cholesterol_model.predict(low_fiber)
    
    # High fiber scenario
    high_fiber = baseline_features.copy()
    high_fiber['fiber_g'] = 30.0
    pred_high = cholesterol_model.predict(high_fiber)
    
    # High fiber should result in lower LDL
    assert pred_high['ldl'] < pred_low['ldl'], \
        f"High fiber LDL ({pred_high['ldl']}) should be < low fiber LDL ({pred_low['ldl']})"
    
    # Delta should be more negative (or less positive) with high fiber
    assert pred_high['delta_ldl'] < pred_low['delta_ldl'], \
        f"High fiber delta ({pred_high['delta_ldl']}) should be < low fiber delta ({pred_low['delta_ldl']})"
    
    print(f"✅ Fiber effect: Low fiber LDL={pred_low['ldl']}, High fiber LDL={pred_high['ldl']}")


def test_saturated_fat_increases_ldl(cholesterol_model, baseline_features):
    """Test that saturated fat increases LDL cholesterol"""
    # Low saturated fat
    low_sat_fat = baseline_features.copy()
    low_sat_fat['saturated_fat_g'] = 3.0
    pred_low = cholesterol_model.predict(low_sat_fat)
    
    # High saturated fat
    high_sat_fat = baseline_features.copy()
    high_sat_fat['saturated_fat_g'] = 25.0
    pred_high = cholesterol_model.predict(high_sat_fat)
    
    # High saturated fat should increase LDL
    assert pred_high['ldl'] > pred_low['ldl'], \
        f"High sat fat LDL ({pred_high['ldl']}) should be > low sat fat LDL ({pred_low['ldl']})"
    
    # Delta should be more positive
    assert pred_high['delta_ldl'] > pred_low['delta_ldl'], \
        f"High sat fat delta ({pred_high['delta_ldl']}) should be > low sat fat delta ({pred_low['delta_ldl']})"
    
    print(f"✅ Saturated fat effect: Low={pred_low['ldl']}, High={pred_high['ldl']}")


def test_trans_fat_increases_ldl_reduces_hdl(cholesterol_model, baseline_features):
    """Test that trans fat increases LDL and reduces HDL (double whammy)"""
    # No trans fat
    no_trans = baseline_features.copy()
    no_trans['trans_fat_g'] = 0.0
    pred_no_trans = cholesterol_model.predict(no_trans)
    
    # High trans fat
    high_trans = baseline_features.copy()
    high_trans['trans_fat_g'] = 5.0
    pred_trans = cholesterol_model.predict(high_trans)
    
    # Trans fat should increase LDL
    assert pred_trans['ldl'] > pred_no_trans['ldl'], \
        f"Trans fat should increase LDL: {pred_trans['ldl']} > {pred_no_trans['ldl']}"
    
    # Trans fat should reduce HDL (bad cholesterol effect)
    assert pred_trans['hdl'] < pred_no_trans['hdl'], \
        f"Trans fat should reduce HDL: {pred_trans['hdl']} < {pred_no_trans['hdl']}"
    
    print(f"✅ Trans fat effect: LDL {pred_no_trans['ldl']}→{pred_trans['ldl']}, HDL {pred_no_trans['hdl']}→{pred_trans['hdl']}")


def test_activity_improves_hdl(cholesterol_model, baseline_features):
    """Test that physical activity improves HDL cholesterol"""
    # Sedentary
    sedentary = baseline_features.copy()
    sedentary['activity_level'] = 0.1
    pred_sedentary = cholesterol_model.predict(sedentary)
    
    # Very active
    active = baseline_features.copy()
    active['activity_level'] = 0.9
    pred_active = cholesterol_model.predict(active)
    
    # Activity should increase HDL (good cholesterol)
    assert pred_active['hdl'] > pred_sedentary['hdl'], \
        f"High activity HDL ({pred_active['hdl']}) should be > sedentary HDL ({pred_sedentary['hdl']})"
    
    # Activity also reduces LDL
    assert pred_active['ldl'] < pred_sedentary['ldl'], \
        f"High activity should also reduce LDL: {pred_active['ldl']} < {pred_sedentary['ldl']}"
    
    print(f"✅ Activity effect: HDL {pred_sedentary['hdl']}→{pred_active['hdl']}, LDL {pred_sedentary['ldl']}→{pred_active['ldl']}")


def test_medical_constraints_enforced(cholesterol_model):
    """Test that medical safety constraints are enforced"""
    # Extreme unhealthy inputs
    extreme_unhealthy = {
        'saturated_fat_g': 80.0,  # Very high
        'trans_fat_g': 8.0,  # Very high
        'dietary_cholesterol_mg': 800.0,
        'fiber_g': 0.0,  # No fiber
        'sugar_g': 120.0,
        'sodium_mg': 5000.0,
        'activity_level': 0.0,  # Sedentary
        'stress_level': 1.0,  # Maximum stress
        'sleep_quality': 0.2,  # Poor sleep
        'hydration_level': 0.2,
        'age': 60,
        'weight_kg': 150.0,
        'baseline_ldl': 160.0,  # Already high
        'baseline_hdl': 35.0  # Already low
    }
    
    pred = cholesterol_model.predict(extreme_unhealthy)
    
    # LDL must stay within physiological bounds
    assert 40.0 <= pred['ldl'] <= 250.0, \
        f"LDL must be 40-250, got {pred['ldl']}"
    
    # HDL must stay within bounds
    assert 20.0 <= pred['hdl'] <= 100.0, \
        f"HDL must be 20-100, got {pred['hdl']}"
    
    # Total cholesterol must stay within bounds
    assert 100.0 <= pred['total_cholesterol'] <= 400.0, \
        f"Total must be 100-400, got {pred['total_cholesterol']}"
    
    # Daily LDL delta must be capped
    assert abs(pred['delta_ldl']) <= 30.0, \
        f"LDL delta must be ≤30, got {pred['delta_ldl']}"
    
    # Daily HDL delta must be capped
    assert abs(pred['delta_hdl']) <= 10.0, \
        f"HDL delta must be ≤10, got {pred['delta_hdl']}"
    
    print(f"✅ Medical constraints enforced: LDL={pred['ldl']}, HDL={pred['hdl']}, Total={pred['total_cholesterol']}")


def test_risk_classification(cholesterol_model):
    """Test cholesterol risk level classification"""
    # Optimal scenario
    optimal = {
        'saturated_fat_g': 3.0,
        'trans_fat_g': 0.0,
        'dietary_cholesterol_mg': 50.0,
        'fiber_g': 30.0,
        'sugar_g': 10.0,
        'sodium_mg': 1200.0,
        'activity_level': 0.8,
        'stress_level': 0.2,
        'sleep_quality': 0.9,
        'hydration_level': 0.9,
        'age': 30,
        'weight_kg': 70.0,
        'baseline_ldl': 85.0,  # Optimal
        'baseline_hdl': 65.0  # Protective
    }
    
    pred_optimal = cholesterol_model.predict(optimal)
    assert pred_optimal['risk_level'] in ['Optimal', 'Near Optimal'], \
        f"Optimal diet should give low risk, got {pred_optimal['risk_level']}"
    
    # High risk scenario
    high_risk = {
        'saturated_fat_g': 30.0,
        'trans_fat_g': 5.0,
        'dietary_cholesterol_mg': 500.0,
        'fiber_g': 2.0,
        'sugar_g': 80.0,
        'sodium_mg': 4000.0,
        'activity_level': 0.1,
        'stress_level': 0.8,
        'sleep_quality': 0.3,
        'hydration_level': 0.3,
        'age': 55,
        'weight_kg': 110.0,
        'baseline_ldl': 170.0,  # Already high
        'baseline_hdl': 35.0  # Low
    }
    
    pred_high = cholesterol_model.predict(high_risk)
    assert pred_high['risk_level'] in ['Borderline High', 'High Risk'], \
        f"Unhealthy profile should give high risk, got {pred_high['risk_level']}"
    
    print(f"✅ Risk classification: Optimal={pred_optimal['risk_level']}, High={pred_high['risk_level']}")


def test_combined_protective_factors(cholesterol_model, baseline_features):
    """Test synergistic effect of multiple protective factors"""
    # Baseline
    baseline = baseline_features.copy()
    pred_baseline = cholesterol_model.predict(baseline)
    
    # Combined protective factors
    protected = baseline_features.copy()
    protected['fiber_g'] = 35.0  # High fiber
    protected['activity_level'] = 0.9  # Very active
    protected['sleep_quality'] = 0.9  # Excellent sleep
    protected['stress_level'] = 0.2  # Low stress
    protected['hydration_level'] = 0.9  # Well hydrated
    
    pred_protected = cholesterol_model.predict(protected)
    
    # Protected profile should have:
    # - Lower LDL
    assert pred_protected['ldl'] < pred_baseline['ldl'], \
        "Protected profile should have lower LDL"
    
    # - Higher HDL
    assert pred_protected['hdl'] > pred_baseline['hdl'], \
        "Protected profile should have higher HDL"
    
    # - Better risk level
    risk_hierarchy = ['High Risk', 'Borderline High', 'Borderline', 'Near Optimal', 'Optimal']
    baseline_idx = risk_hierarchy.index(pred_baseline['risk_level'])
    protected_idx = risk_hierarchy.index(pred_protected['risk_level'])
    
    assert protected_idx >= baseline_idx, \
        f"Protected profile should have equal or better risk: {pred_protected['risk_level']} vs {pred_baseline['risk_level']}"
    
    print(f"✅ Combined protection: LDL {pred_baseline['ldl']}→{pred_protected['ldl']}, HDL {pred_baseline['hdl']}→{pred_protected['hdl']}")


def test_explainability_sum_to_delta(cholesterol_model, baseline_features):
    """Test that SHAP contributions approximately sum to predicted deltas"""
    pred = cholesterol_model.predict(baseline_features)
    
    # Get features for explainability calculation
    from cholesterol_api import _generate_explainability
    
    explainability = _generate_explainability(baseline_features, pred)
    
    # Sum LDL contributions
    ldl_contrib_sum = sum(driver['contribution'] for driver in explainability['ldl_drivers'])
    
    # Sum HDL contributions
    hdl_contrib_sum = sum(driver['contribution'] for driver in explainability['hdl_drivers'])
    
    # Should approximately sum to deltas (within 10% tolerance)
    delta_ldl = pred['delta_ldl']
    delta_hdl = pred['delta_hdl']
    
    ldl_error = abs(ldl_contrib_sum - delta_ldl)
    ldl_tolerance = abs(delta_ldl) * 0.1 + 0.5  # 10% + 0.5 absolute
    
    assert ldl_error <= ldl_tolerance, \
        f"LDL contributions ({ldl_contrib_sum:.2f}) should sum to delta ({delta_ldl:.2f}), error={ldl_error:.2f}"
    
    hdl_error = abs(hdl_contrib_sum - delta_hdl)
    hdl_tolerance = abs(delta_hdl) * 0.1 + 0.5
    
    assert hdl_error <= hdl_tolerance, \
        f"HDL contributions ({hdl_contrib_sum:.2f}) should sum to delta ({delta_hdl:.2f}), error={hdl_error:.2f}"
    
    print(f"✅ Explainability validated: LDL sum={ldl_contrib_sum:.2f} (delta={delta_ldl:.2f}), HDL sum={hdl_contrib_sum:.2f} (delta={delta_hdl:.2f})")


if __name__ == '__main__':
    # Run tests with verbose output
    pytest.main([__file__, '-v', '--tb=short'])
