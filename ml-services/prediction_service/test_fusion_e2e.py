#!/usr/bin/env python3
"""
End-to-End Tests for Multi-Modal Fusion Engine

Tests:
1. Fusion endpoint returns consistent results
2. Reliability score classification
3. Modality score computation
4. Explainability consistency validation
5. Driver analysis generation
"""

import pytest
import sys
from pathlib import Path

# Add prediction_service to path
prediction_service_path = Path(__file__).parent
sys.path.insert(0, str(prediction_service_path))

from fusion_engine import MultiModalFusionEngine, validate_fusion_inputs


@pytest.fixture
def fusion_engine():
    """Create fusion engine instance"""
    return MultiModalFusionEngine()


@pytest.fixture
def cv_data():
    """Computer Vision data"""
    return {
        'food_name': 'Vada',
        'confidence': 0.96
    }


@pytest.fixture
def nlp_data():
    """NLP/Nutrition data"""
    return {
        'saturated_fat_g': 15.0,
        'trans_fat_g': 0.5,
        'dietary_cholesterol_mg': 200.0,
        'fiber_g': 8.0,
        'sugar_g': 25.0,
        'sodium_mg': 1800.0
    }


@pytest.fixture
def biometric_data_cholesterol():
    """Biometric data for cholesterol"""
    return {
        'predicted_value': 205.9,
        'baseline': 185.5,
        'delta': 20.4,
        'risk_level': 'Borderline',
        'confidence': 0.80
    }


@pytest.fixture
def shap_data():
    """SHAP explainability data"""
    return {
        'ldl_drivers': [
            {'factor': 'Saturated Fat', 'contribution': 12.5, 'direction': 'increase'},
            {'factor': 'Fiber', 'contribution': -5.2, 'direction': 'decrease'},
            {'factor': 'Activity', 'contribution': -2.1, 'direction': 'decrease'}
        ],
        'hdl_drivers': [
            {'factor': 'Activity', 'contribution': 2.1, 'direction': 'increase'}
        ]
    }


def test_fusion_endpoint_returns_result(
    fusion_engine, cv_data, nlp_data, biometric_data_cholesterol, shap_data
):
    """Test that fusion endpoint returns consistent results"""
    result = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=cv_data,
        nlp_data=nlp_data,
        biometric_data=biometric_data_cholesterol,
        shap_data=shap_data
    )
    
    # Check result structure
    assert result is not None
    assert result.biomarker == 'cholesterol'
    assert result.final_prediction == 205.9
    assert result.risk_level == 'Borderline'
    assert result.fusion_score is not None
    assert result.reliability is not None
    assert result.modality_scores is not None
    assert result.explanation is not None
    
    print(f"✅ Fusion result generated: {result.biomarker} → {result.reliability} (score: {result.fusion_score})")


def test_reliability_score_classification(
    fusion_engine, cv_data, nlp_data, biometric_data_cholesterol
):
    """Test reliability score classification"""
    # High confidence scenario
    high_conf_cv = cv_data.copy()
    high_conf_cv['confidence'] = 0.98
    
    result_high = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=high_conf_cv,
        nlp_data=nlp_data,
        biometric_data=biometric_data_cholesterol
    )
    
    assert result_high.fusion_score >= 0.85
    assert result_high.reliability == 'High'
    
    # Low confidence scenario
    low_conf_cv = cv_data.copy()
    low_conf_cv['confidence'] = 0.40
    
    low_conf_nlp = nlp_data.copy()
    del low_conf_nlp['fiber_g']  # Missing field
    
    result_low = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=low_conf_cv,
        nlp_data=low_conf_nlp,
        biometric_data=biometric_data_cholesterol
    )
    
    assert result_low.fusion_score < 0.85
    assert result_low.reliability in ['Medium', 'Low']
    
    print(f"✅ Reliability classification: High={result_high.reliability} ({result_high.fusion_score}), Low={result_low.reliability} ({result_low.fusion_score})")


def test_modality_score_computation(
    fusion_engine, cv_data, nlp_data, biometric_data_cholesterol
):
    """Test individual modality score computation"""
    result = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=cv_data,
        nlp_data=nlp_data,
        biometric_data=biometric_data_cholesterol
    )
    
    # Check modality scores
    assert 'cv' in result.modality_scores
    assert 'nlp' in result.modality_scores
    assert 'biometric' in result.modality_scores
    assert 'explainability' in result.modality_scores
    
    # All scores should be 0-1
    for modality, score in result.modality_scores.items():
        assert 0 <= score <= 1, f"{modality} score {score} out of range"
    
    # CV confidence should propagate
    assert result.modality_scores['cv'] == cv_data['confidence']
    
    # NLP completeness should be high (all fields present)
    assert result.modality_scores['nlp'] >= 0.8
    
    # Biometric confidence should be > 0
    assert result.modality_scores['biometric'] > 0
    
    print(f"✅ Modality scores: CV={result.modality_scores['cv']:.2f}, NLP={result.modality_scores['nlp']:.2f}, BIO={result.modality_scores['biometric']:.2f}, EXPL={result.modality_scores['explainability']:.2f}")


def test_explainability_consistency_validation(
    fusion_engine, cv_data, nlp_data, biometric_data_cholesterol, shap_data
):
    """Test SHAP explainability consistency check"""
    # With explainability data
    result_with_shap = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=cv_data,
        nlp_data=nlp_data,
        biometric_data=biometric_data_cholesterol,
        shap_data=shap_data
    )
    
    # Explainability score should be > 0.5
    assert result_with_shap.modality_scores['explainability'] >= 0.5
    
    # Without explainability data (neutral score)
    result_no_shap = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=cv_data,
        nlp_data=nlp_data,
        biometric_data=biometric_data_cholesterol,
        shap_data=None
    )
    
    # Should use neutral score (0.7)
    assert result_no_shap.modality_scores['explainability'] == 0.7
    
    print(f"✅ Explainability consistency: With SHAP={result_with_shap.modality_scores['explainability']:.2f}, Without={result_no_shap.modality_scores['explainability']:.2f}")


def test_fusion_score_formula(
    fusion_engine, cv_data, nlp_data, biometric_data_cholesterol
):
    """Test fusion score formula computation"""
    result = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=cv_data,
        nlp_data=nlp_data,
        biometric_data=biometric_data_cholesterol
    )
    
    # Manual computation of expected fusion score
    cv = result.modality_scores['cv']
    nlp = result.modality_scores['nlp']
    bio = result.modality_scores['biometric']
    expl = result.modality_scores['explainability']
    
    expected_score = (
        0.25 * cv +
        0.25 * nlp +
        0.35 * bio +
        0.15 * expl
    )
    
    # Actual should match formula
    assert abs(result.fusion_score - expected_score) < 0.01, \
        f"Fusion score {result.fusion_score} != expected {expected_score}"
    
    print(f"✅ Fusion score formula validated: {result.fusion_score} = 0.25*{cv:.2f} + 0.25*{nlp:.2f} + 0.35*{bio:.2f} + 0.15*{expl:.2f}")


def test_risk_level_propagation(
    fusion_engine, cv_data, nlp_data
):
    """Test risk level propagation from biometric to fusion"""
    risk_levels = ['Optimal', 'Near Optimal', 'Borderline', 'Borderline High', 'High Risk']
    
    for risk in risk_levels:
        biometric = {
            'predicted_value': 150.0,
            'baseline': 130.0,
            'delta': 20.0,
            'risk_level': risk,
            'confidence': 0.75
        }
        
        result = fusion_engine.fuse(
            biomarker='cholesterol',
            cv_data=cv_data,
            nlp_data=nlp_data,
            biometric_data=biometric
        )
        
        # Risk level should be preserved
        assert result.risk_level == risk, f"Risk level should be {risk}, got {result.risk_level}"
    
    print(f"✅ Risk level propagation validated for all {len(risk_levels)} levels")


def test_driver_analysis_generation(
    fusion_engine, cv_data, nlp_data, biometric_data_cholesterol
):
    """Test driver analysis generation"""
    result = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=cv_data,
        nlp_data=nlp_data,
        biometric_data=biometric_data_cholesterol
    )
    
    # Check driver analysis structure
    assert result.driver_analysis is not None
    assert 'cv_modality' in result.driver_analysis
    assert 'nlp_modality' in result.driver_analysis
    assert 'biometric_modality' in result.driver_analysis
    assert 'explainability' in result.driver_analysis
    
    # CV modality should have recognized food
    assert result.driver_analysis['cv_modality']['recognized_food'] == 'Vada'
    
    # NLP modality should list nutrients
    assert len(result.driver_analysis['nlp_modality']['key_nutrients']) > 0
    
    # Biometric modality should have delta
    assert result.driver_analysis['biometric_modality']['delta'] == 20.4
    
    print(f"✅ Driver analysis: CV={result.driver_analysis['cv_modality']['recognized_food']}, NLP nutrients={len(result.driver_analysis['nlp_modality']['key_nutrients'])}, Bio delta={result.driver_analysis['biometric_modality']['delta']}")


def test_input_validation():
    """Test fusion input validation"""
    # Valid inputs
    cv = {'confidence': 0.8}
    nlp = {'saturated_fat_g': 10.0, 'fiber_g': 5.0}
    bio = {'predicted_value': 150.0, 'baseline': 130.0, 'delta': 20.0, 'risk_level': 'Borderline'}
    
    is_valid, error = validate_fusion_inputs(cv, nlp, bio)
    assert is_valid, f"Valid inputs rejected: {error}"
    
    # Missing CV confidence
    is_valid, error = validate_fusion_inputs({}, nlp, bio)
    assert not is_valid
    assert 'CV' in error
    
    # Invalid confidence (>1)
    cv_invalid = {'confidence': 1.5}
    is_valid, error = validate_fusion_inputs(cv_invalid, nlp, bio)
    assert not is_valid
    assert '0 and 1' in error
    
    # Missing biometric field
    bio_invalid = {'predicted_value': 150.0}
    is_valid, error = validate_fusion_inputs(cv, nlp, bio_invalid)
    assert not is_valid
    
    print("✅ Input validation passed all checks")


def test_trend_strength_calculation(fusion_engine):
    """Test biometric trend strength calculation"""
    # Small delta (weak signal)
    weak_bio = {
        'predicted_value': 132.0,
        'baseline': 130.0,
        'delta': 2.0,
        'risk_level': 'Borderline',
        'confidence': 0.75
    }
    
    # Large delta (strong signal)
    strong_bio = {
        'predicted_value': 160.0,
        'baseline': 130.0,
        'delta': 30.0,
        'risk_level': 'High Risk',
        'confidence': 0.75
    }
    
    cv_data = {'food_name': 'Test', 'confidence': 0.8}
    nlp_data = {'saturated_fat_g': 10.0, 'fiber_g': 5.0}
    
    result_weak = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=cv_data,
        nlp_data=nlp_data,
        biometric_data=weak_bio
    )
    
    result_strong = fusion_engine.fuse(
        biomarker='cholesterol',
        cv_data=cv_data,
        nlp_data=nlp_data,
        biometric_data=strong_bio
    )
    
    # Strong signal should have higher biometric score
    assert result_strong.modality_scores['biometric'] > result_weak.modality_scores['biometric'], \
        f"Strong signal should have higher biometric score"
    
    print(f"✅ Trend strength: Weak delta={weak_bio['delta']} → {result_weak.modality_scores['biometric']:.2f}, Strong delta={strong_bio['delta']} → {result_strong.modality_scores['biometric']:.2f}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
