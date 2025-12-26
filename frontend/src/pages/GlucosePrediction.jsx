import React, { useState, useEffect } from 'react';
import '../styles/GlucosePrediction.css';

function GlucosePrediction({ token, userBiometrics }) {
  const [mealData, setMealData] = useState({
    carbohydrates: '',
    protein: '',
    fat: '',
    fiber: '',
    sugar: '',
    sodium: '',
    heart_rate: userBiometrics?.heart_rate || '',
    activity_level: '',
    time_since_last_meal: '',
    meal_interval: '',
    baseline_glucose: userBiometrics?.glucose || '',
    stress_level: '',
    sleep_quality: '',
    hydration_level: '',
    medication_taken: 0,
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/health', {
        method: 'GET',
      });
      setApiHealth(response.ok);
    } catch (err) {
      console.error('Backend health check failed:', err);
      setApiHealth(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMealData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value) || value,
    }));
  };

  const validateInputs = () => {
    const numericFields = [
      'carbohydrates', 'protein', 'fat', 'fiber', 'sugar',
      'sodium', 'heart_rate', 'activity_level', 'time_since_last_meal',
      'meal_interval', 'baseline_glucose', 'stress_level',
      'sleep_quality', 'hydration_level'
    ];

    for (let field of numericFields) {
      if (mealData[field] === '' || mealData[field] === null) {
        setError(`Please fill in all fields`);
        return false;
      }
      const val = parseFloat(mealData[field]);
      if (isNaN(val)) {
        setError(`${field} must be a valid number`);
        return false;
      }
    }
    return true;
  };

  const handlePredict = async (e) => {
    e.preventDefault();

    if (!validateInputs()) return;

    setLoading(true);
    setError(null);
    setPrediction(null);
    setExplanation(null);
    setShowExplanation(false);

    try {
      // Call new medical-validated API endpoint directly
      const response = await fetch('http://localhost:5001/api/glucose-prediction/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          meal_features: {
            carbohydrates: parseFloat(mealData.carbohydrates),
            protein: parseFloat(mealData.protein),
            fat: parseFloat(mealData.fat),
            fiber: parseFloat(mealData.fiber),
            sugar: parseFloat(mealData.sugar),
            sodium: parseFloat(mealData.sodium),
            heart_rate: parseFloat(mealData.heart_rate),
            activity_level: parseFloat(mealData.activity_level),
            time_since_last_meal: parseFloat(mealData.time_since_last_meal),
            meal_interval: parseFloat(mealData.meal_interval),
            baseline_glucose: parseFloat(mealData.baseline_glucose),
            stress_level: parseFloat(mealData.stress_level),
            sleep_quality: parseFloat(mealData.sleep_quality),
            hydration_level: parseFloat(mealData.hydration_level),
            medication_taken: parseInt(mealData.medication_taken)
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();

      // Extract enhanced prediction data
      setPrediction({
        value: result.prediction.value,
        display: result.prediction.display,
        baseline: result.prediction.baseline,
        delta: result.prediction.delta,
        riskLevel: result.risk_classification.level,
        interpretation: result.risk_classification.interpretation,
        riskColor: result.risk_classification.color,
        recommendation: result.risk_classification.recommendation,
        confidence: result.confidence.level,
        confidenceScore: result.confidence.score,
        confidenceMessage: result.confidence.message,
        sanityCheckPassed: Boolean(result?.confidence?.sanity_check),
        isCritical: result.medical_safety.is_critical,
        warning: result.medical_safety.warning,
        disclaimer: result.medical_safety.disclaimer,
        derivedFeatures: result.derived_features,
        explainability: result.explainability
      });
    } catch (err) {
      console.error('Prediction error:', err);
      setError(`Failed to get prediction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainPrediction = async () => {
    if (!prediction) return;

    setExplainLoading(true);
    setError(null);

    try {
      // Use the same meal_features format as prediction request
      const response = await fetch('http://localhost:5001/api/glucose-prediction/explain/shap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meal_features: {
            carbohydrates: parseFloat(mealData.carbohydrates),
            protein: parseFloat(mealData.protein),
            fat: parseFloat(mealData.fat),
            fiber: parseFloat(mealData.fiber),
            sugar: parseFloat(mealData.sugar),
            sodium: parseFloat(mealData.sodium),
            heart_rate: parseFloat(mealData.heart_rate),
            activity_level: parseFloat(mealData.activity_level),
            time_since_last_meal: parseFloat(mealData.time_since_last_meal),
            meal_interval: parseFloat(mealData.meal_interval),
            baseline_glucose: parseFloat(mealData.baseline_glucose),
            stress_level: parseFloat(mealData.stress_level),
            sleep_quality: parseFloat(mealData.sleep_quality),
            hydration_level: parseFloat(mealData.hydration_level),
            medication_taken: parseInt(mealData.medication_taken)
          },
          // Ensures /explain/shap never needs to re-predict.
          prediction_context: {
            baseline_glucose: prediction.baseline,
            delta_glucose: prediction.delta,
            final_glucose: prediction.value,
            confidence: prediction.confidenceScore,
            sanity_check_passed: Boolean(prediction?.sanityCheckPassed)
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setExplanation(data);
        setShowExplanation(true);
      } else {
        setError('Failed to generate explanation: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setError('Explanation error: ' + err.message);
    } finally {
      setExplainLoading(false);
    }
  };


  const getRiskColor = (riskLevel) => {
    const normalized = (riskLevel || '').toLowerCase();

    if (normalized.startsWith('elevated')) {
      return '#ffd700';
    }

    switch (normalized) {
      case 'hypoglycemia':
        return '#ef4444';
      case 'critical':
        return '#ff4444';
      case 'high':
        return '#ff8c00';
      case 'normal':
        return '#4caf50';
      default:
        return '#2196f3';
    }
  };

  if (!apiHealth) {
    return (
      <div className="glucose-prediction-container">
        <div className="prediction-error-alert">
          <h3>⚠️ API Connection Required</h3>
          <p>The LSTM glucose prediction API is not running.</p>
          <p>Please start the API server:</p>
          <code>python ml-services/prediction_service/run_api.py</code>
        </div>
      </div>
    );
  }

  return (
    <div className="glucose-prediction-container">
      <div className="prediction-header">
        <h2>🧬 LSTM Glucose Prediction</h2>
        <p>Predict blood glucose levels based on meal composition and biometric data</p>
      </div>

      <form onSubmit={handlePredict} className="prediction-form">
        <div className="form-section">
          <h3>Meal Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Carbohydrates (g)</label>
              <input
                type="number"
                name="carbohydrates"
                value={mealData.carbohydrates}
                onChange={handleInputChange}
                placeholder="45"
                step="0.1"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Protein (g)</label>
              <input
                type="number"
                name="protein"
                value={mealData.protein}
                onChange={handleInputChange}
                placeholder="20"
                step="0.1"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Fat (g)</label>
              <input
                type="number"
                name="fat"
                value={mealData.fat}
                onChange={handleInputChange}
                placeholder="15"
                step="0.1"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Fiber (g)</label>
              <input
                type="number"
                name="fiber"
                value={mealData.fiber}
                onChange={handleInputChange}
                placeholder="5"
                step="0.1"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Sugar (g)</label>
              <input
                type="number"
                name="sugar"
                value={mealData.sugar}
                onChange={handleInputChange}
                placeholder="20"
                step="0.1"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Sodium (mg)</label>
              <input
                type="number"
                name="sodium"
                value={mealData.sodium}
                onChange={handleInputChange}
                placeholder="400"
                step="1"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Biometric Data</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Heart Rate (bpm)</label>
              <input
                type="number"
                name="heart_rate"
                value={mealData.heart_rate}
                onChange={handleInputChange}
                placeholder="75"
                step="1"
                min="30"
              />
            </div>
            <div className="form-group">
              <label>Activity Level (0-1)</label>
              <input
                type="number"
                name="activity_level"
                value={mealData.activity_level}
                onChange={handleInputChange}
                placeholder="0.3"
                step="0.1"
                min="0"
                max="1"
              />
            </div>
            <div className="form-group">
              <label>Baseline Glucose (mg/dL)</label>
              <input
                type="number"
                name="baseline_glucose"
                value={mealData.baseline_glucose}
                onChange={handleInputChange}
                placeholder="105"
                step="1"
                min="50"
              />
            </div>
            <div className="form-group">
              <label>Stress Level (0-1)</label>
              <input
                type="number"
                name="stress_level"
                value={mealData.stress_level}
                onChange={handleInputChange}
                placeholder="0.4"
                step="0.1"
                min="0"
                max="1"
              />
            </div>
            <div className="form-group">
              <label>Sleep Quality (0-1)</label>
              <input
                type="number"
                name="sleep_quality"
                value={mealData.sleep_quality}
                onChange={handleInputChange}
                placeholder="0.8"
                step="0.1"
                min="0"
                max="1"
              />
            </div>
            <div className="form-group">
              <label>Hydration Level (0-1)</label>
              <input
                type="number"
                name="hydration_level"
                value={mealData.hydration_level}
                onChange={handleInputChange}
                placeholder="0.7"
                step="0.1"
                min="0"
                max="1"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Temporal Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Time Since Last Meal (hours)</label>
              <input
                type="number"
                name="time_since_last_meal"
                value={mealData.time_since_last_meal}
                onChange={handleInputChange}
                placeholder="0.5"
                step="0.1"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Meal Interval (hours)</label>
              <input
                type="number"
                name="meal_interval"
                value={mealData.meal_interval}
                onChange={handleInputChange}
                placeholder="4"
                step="0.5"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Medication Taken</label>
              <select
                name="medication_taken"
                value={mealData.medication_taken}
                onChange={handleInputChange}
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div className="prediction-error">{error}</div>}

        <button type="submit" className="predict-btn" disabled={loading}>
          {loading ? '🔄 Predicting...' : '📊 Get Prediction'}
        </button>
      </form>

      {prediction && (
        <div className="prediction-result">
          <div className="result-header">
            <h3>Prediction Result</h3>
          </div>
          <div className="result-main">
            <div className="glucose-value">
              <span className="value" style={{ color: getRiskColor(prediction.riskLevel) }}>
                {prediction.display}
              </span>
              <span className="unit">
                {prediction.isCritical && <span style={{fontSize: '14px', display: 'block', marginTop: '5px'}}>⚠️ CRITICAL</span>}
              </span>
            </div>
            <div className="result-details">
              <div className="detail-row">
                <span className="label">Risk Level:</span>
                <span
                  className="value"
                  style={{
                    color: getRiskColor(prediction.riskLevel),
                    fontWeight: 'bold',
                  }}
                >
                  {prediction.riskLevel}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Baseline → Predicted:</span>
                <span className="value">{prediction.baseline} → {prediction.value} mg/dL ({prediction.delta > 0 ? '+' : ''}{prediction.delta})</span>
              </div>
              <div className="detail-row">
                <span className="label">Interpretation:</span>
                <span className="value">{prediction.interpretation}</span>
              </div>
              <div className="detail-row">
                <span className="label">Recommendation:</span>
                <span className="value" style={{fontWeight: '500'}}>{prediction.recommendation}</span>
              </div>
              <div className="detail-row">
                <span className="label">Confidence:</span>
                <span className="value">{prediction.confidence} ({Math.round(prediction.confidenceScore * 100)}%)</span>
              </div>
              {prediction.confidenceMessage && (
                <div className="detail-row" style={{marginTop: '10px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px'}}>
                  <span className="value" style={{fontSize: '13px'}}>{prediction.confidenceMessage}</span>
                </div>
              )}
              {prediction.warning && (
                <div className="detail-row" style={{marginTop: '10px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '6px'}}>
                  <span className="value" style={{fontSize: '13px', color: '#dc2626', fontWeight: '600'}}>⚠️ {prediction.warning}</span>
                </div>
              )}
              {prediction.derivedFeatures && (
                <div style={{marginTop: '15px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px'}}>
                  <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px'}}>📊 Calculated Metrics:</div>
                  <div style={{fontSize: '13px'}}>
                    <div>Net Carbs: {prediction.derivedFeatures.net_carbs}g</div>
                    <div>Sugar Ratio: {(prediction.derivedFeatures.sugar_ratio * 100).toFixed(0)}%</div>
                    <div>Activity-Adjusted Load: {prediction.derivedFeatures.activity_adjusted_load}g</div>
                  </div>
                </div>
              )}
              {prediction.disclaimer && (
                <div style={{marginTop: '15px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b'}}>
                  <div style={{fontSize: '12px', color: '#92400e', lineHeight: '1.5'}}>{prediction.disclaimer}</div>
                </div>
              )}
            </div>
          </div>

          {/* Explainability Button */}
          <div className="explainability-section">
            <h4 style={{ margin: '20px 0 10px 0', color: '#4338ca', textAlign: 'center' }}>
              🔍 Understand This Prediction (AI Explainability)
            </h4>
            <button
              onClick={handleExplainPrediction}
              disabled={explainLoading}
              className="explain-button"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: explainLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '16px',
                opacity: explainLoading ? 0.6 : 1
              }}
            >
              {explainLoading ? '⏳ Generating SHAP Explanation...' : '📊 Explain with SHAP'}
            </button>
          </div>
        </div>
      )}

      {/* Explanation Results */}
      {showExplanation && explanation && (
        <div className="explanation-box" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          marginTop: '20px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          border: '2px solid #8b5cf6'
        }}>
          <h3 style={{ color: '#6366f1', marginBottom: '20px' }}>
            🧠 SHAP Explainability Analysis
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
              Feature importance shows how each feature contributed to the prediction. Positive values increase prediction, negative values decrease it. Calculated using perturbation analysis.
            </p>
          </div>

          <div style={{
            backgroundColor: '#f3f4f6',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Predicted Glucose Level</h4>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50', margin: 0 }}>
              {explanation.predicted_glucose?.toFixed(1) || 'N/A'} mg/dL
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '5px 0 0 0' }}>
              Baseline: {explanation.baseline_glucose?.toFixed(1) || 'N/A'} mg/dL
            </p>
          </div>

          {explanation.feature_contributions && explanation.feature_contributions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '15px' }}>Feature Importance Rankings</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px'
              }}>
                {explanation.feature_contributions
                  .slice(0, 8)
                  .map((contrib) => (
                    <div key={contrib.feature} style={{
                      padding: '10px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ fontWeight: '600', color: '#374151' }}>{contrib.feature}</div>
                      <div style={{
                        fontSize: '14px',
                        color: contrib.importance > 0 ? '#10b981' : '#ef4444',
                        marginTop: '5px'
                      }}>
                        {contrib.direction} {Math.abs(contrib.importance).toFixed(1)} mg/dL
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {explanation.explanation && (
            <div style={{
              backgroundColor: '#eff6ff',
              padding: '15px',
              borderRadius: '8px',
              marginTop: '20px',
              border: '1px solid #bfdbfe'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>SHAP Explanation</h4>
              <p style={{ margin: 0, color: '#1e3a8a', lineHeight: '1.6' }}>
                {explanation.explanation}
              </p>
            </div>
          )}

          {explanation.confidence && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
              <span style={{ fontWeight: '600', color: '#15803d' }}>
                Confidence: {explanation.confidence.level} ({(explanation.confidence.score * 100).toFixed(0)}%)
              </span>
            </div>
          )}

          <button
            onClick={() => setShowExplanation(false)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              marginTop: '20px'
            }}
          >
            Close Explanation
          </button>
        </div>
      )}
    </div>
  );
}

export default GlucosePrediction;
