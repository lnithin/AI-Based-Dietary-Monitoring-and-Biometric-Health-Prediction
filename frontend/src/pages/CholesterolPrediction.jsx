import React, { useState } from 'react';
import '../styles/Predictions.css';

const CholesterolPrediction = () => {
  const [formData, setFormData] = useState({
    saturated_fat_g: '',
    trans_fat_g: '',
    dietary_cholesterol_mg: '',
    fiber_g: '',
    sugar_g: '',
    sodium_mg: '',
    activity_level: '',
    stress_level: '',
    sleep_quality: '',
    hydration_level: '',
    age: '',
    weight_kg: '',
    baseline_ldl: '',
    baseline_hdl: ''
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validate = () => {
    const allFieldsFilled = Object.values(formData).every(val => val !== '');
    if (!allFieldsFilled) {
      setError('Please fill in all fields');
      return false;
    }
    setError(null);
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/cholesterol/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Prediction failed');
      }
    } catch (err) {
      setError('Failed to connect to prediction service');
      console.error('Cholesterol prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    const riskColors = {
      'Optimal': '#10b981',
      'Near Optimal': '#22c55e',
      'Borderline': '#f59e0b',
      'Borderline High': '#f97316',
      'High Risk': '#ef4444'
    };
    return riskColors[risk] || '#6b7280';
  };

  return (
    <div className="prediction-container">
      <div className="prediction-header">
        <h1>🧬 Cholesterol Prediction</h1>
        <p className="subtitle">LSTM-based prediction with medical constraints</p>
      </div>

      <div className="prediction-content">
        <form onSubmit={submit} className="prediction-form">
          <div className="form-section">
            <h3>Dietary Fats</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="saturated_fat_g">Saturated Fat (g)</label>
                <input
                  type="number"
                  id="saturated_fat_g"
                  name="saturated_fat_g"
                  value={formData.saturated_fat_g}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0-100"
                  required
                />
                <span className="field-hint">0-100g, typical: 5-20g</span>
              </div>

              <div className="form-group">
                <label htmlFor="trans_fat_g">Trans Fat (g)</label>
                <input
                  type="number"
                  id="trans_fat_g"
                  name="trans_fat_g"
                  value={formData.trans_fat_g}
                  onChange={handleChange}
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="0-10"
                  required
                />
                <span className="field-hint">0-10g, keep {'<'} 2g</span>
              </div>

              <div className="form-group">
                <label htmlFor="dietary_cholesterol_mg">Dietary Cholesterol (mg)</label>
                <input
                  type="number"
                  id="dietary_cholesterol_mg"
                  name="dietary_cholesterol_mg"
                  value={formData.dietary_cholesterol_mg}
                  onChange={handleChange}
                  min="0"
                  max="1000"
                  step="1"
                  placeholder="0-1000"
                  required
                />
                <span className="field-hint">0-1000mg, typical: 50-300mg</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Protective Nutrients</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fiber_g">Fiber (g)</label>
                <input
                  type="number"
                  id="fiber_g"
                  name="fiber_g"
                  value={formData.fiber_g}
                  onChange={handleChange}
                  min="0"
                  max="60"
                  step="0.1"
                  placeholder="0-60"
                  required
                />
                <span className="field-hint">0-60g, target: {'>'} 25g/day</span>
              </div>

              <div className="form-group">
                <label htmlFor="sugar_g">Sugar (g)</label>
                <input
                  type="number"
                  id="sugar_g"
                  name="sugar_g"
                  value={formData.sugar_g}
                  onChange={handleChange}
                  min="0"
                  max="150"
                  step="0.1"
                  placeholder="0-150"
                  required
                />
                <span className="field-hint">0-150g, limit: {'<'} 50g/day</span>
              </div>

              <div className="form-group">
                <label htmlFor="sodium_mg">Sodium (mg)</label>
                <input
                  type="number"
                  id="sodium_mg"
                  name="sodium_mg"
                  value={formData.sodium_mg}
                  onChange={handleChange}
                  min="0"
                  max="6000"
                  step="1"
                  placeholder="0-6000"
                  required
                />
                <span className="field-hint">0-6000mg, limit: {'<'} 2300mg/day</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Lifestyle Factors</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="activity_level">Activity Level (0-1)</label>
                <input
                  type="number"
                  id="activity_level"
                  name="activity_level"
                  value={formData.activity_level}
                  onChange={handleChange}
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0-1"
                  required
                />
                <span className="field-hint">0=sedentary, 1=very active</span>
              </div>

              <div className="form-group">
                <label htmlFor="stress_level">Stress Level (0-1)</label>
                <input
                  type="number"
                  id="stress_level"
                  name="stress_level"
                  value={formData.stress_level}
                  onChange={handleChange}
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0-1"
                  required
                />
                <span className="field-hint">0=relaxed, 1=highly stressed</span>
              </div>

              <div className="form-group">
                <label htmlFor="sleep_quality">Sleep Quality (0-1)</label>
                <input
                  type="number"
                  id="sleep_quality"
                  name="sleep_quality"
                  value={formData.sleep_quality}
                  onChange={handleChange}
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0-1"
                  required
                />
                <span className="field-hint">0=poor, 1=excellent</span>
              </div>

              <div className="form-group">
                <label htmlFor="hydration_level">Hydration (0-1)</label>
                <input
                  type="number"
                  id="hydration_level"
                  name="hydration_level"
                  value={formData.hydration_level}
                  onChange={handleChange}
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0-1"
                  required
                />
                <span className="field-hint">0=dehydrated, 1=well hydrated</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Patient Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="age">Age (years)</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="18"
                  max="90"
                  step="1"
                  placeholder="18-90"
                  required
                />
                <span className="field-hint">18-90 years</span>
              </div>

              <div className="form-group">
                <label htmlFor="weight_kg">Weight (kg)</label>
                <input
                  type="number"
                  id="weight_kg"
                  name="weight_kg"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  min="35"
                  max="200"
                  step="0.1"
                  placeholder="35-200"
                  required
                />
                <span className="field-hint">35-200 kg</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Baseline Cholesterol</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="baseline_ldl">Baseline LDL (mg/dL)</label>
                <input
                  type="number"
                  id="baseline_ldl"
                  name="baseline_ldl"
                  value={formData.baseline_ldl}
                  onChange={handleChange}
                  min="40"
                  max="250"
                  step="1"
                  placeholder="40-250"
                  required
                />
                <span className="field-hint">40-250 mg/dL, optimal: {'<'} 100</span>
              </div>

              <div className="form-group">
                <label htmlFor="baseline_hdl">Baseline HDL (mg/dL)</label>
                <input
                  type="number"
                  id="baseline_hdl"
                  name="baseline_hdl"
                  value={formData.baseline_hdl}
                  onChange={handleChange}
                  min="20"
                  max="100"
                  step="1"
                  placeholder="20-100"
                  required
                />
                <span className="field-hint">20-100 mg/dL, target: {'>'} 60</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '🔄 Predicting...' : '🧬 Predict Cholesterol'}
          </button>
        </form>

        {result && result.prediction && (
          <div className="result-section">
            <h2>Prediction Results</h2>

            <div className="result-card">
              <div className="result-main">
                <div className="cholesterol-values">
                  <div className="cholesterol-item">
                    <h4>LDL Cholesterol</h4>
                    <p className="value">{result.prediction.ldl} <span className="unit">mg/dL</span></p>
                    <p className="delta" style={{ color: result.prediction.delta_ldl > 0 ? '#ef4444' : '#10b981' }}>
                      {result.prediction.delta_ldl > 0 ? '↑' : '↓'} {Math.abs(result.prediction.delta_ldl)} mg/dL
                    </p>
                  </div>
                  
                  <div className="cholesterol-item">
                    <h4>HDL Cholesterol</h4>
                    <p className="value">{result.prediction.hdl} <span className="unit">mg/dL</span></p>
                    <p className="delta" style={{ color: result.prediction.delta_hdl < 0 ? '#ef4444' : '#10b981' }}>
                      {result.prediction.delta_hdl > 0 ? '↑' : '↓'} {Math.abs(result.prediction.delta_hdl)} mg/dL
                    </p>
                  </div>
                  
                  <div className="cholesterol-item">
                    <h4>Total Cholesterol</h4>
                    <p className="value">{result.prediction.total_cholesterol} <span className="unit">mg/dL</span></p>
                  </div>
                </div>

                <div className="risk-badge" style={{ backgroundColor: getRiskColor(result.prediction.risk_level) }}>
                  {result.prediction.risk_level}
                </div>

                <div className="confidence-meter">
                  <p>Model Confidence: {(result.prediction.confidence * 100).toFixed(0)}%</p>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill" 
                      style={{ width: `${result.prediction.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {result.derived_metrics && (
                <div className="derived-metrics">
                  <h3>Derived Metrics</h3>
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <span className="metric-label">Fiber Protection:</span>
                      <span className={`metric-value ${result.derived_metrics.fiber_protection.toLowerCase()}-risk`}>
                        {result.derived_metrics.fiber_protection}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Fat Risk:</span>
                      <span className={`metric-value ${result.derived_metrics.fat_risk.toLowerCase()}-risk`}>
                        {result.derived_metrics.fat_risk}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">LDL/HDL Ratio:</span>
                      <span className="metric-value">{result.derived_metrics.ldl_hdl_ratio}</span>
                      <span className="metric-hint">(optimal: {'<'} 3.5)</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Total/HDL Ratio:</span>
                      <span className="metric-value">{result.derived_metrics.total_hdl_ratio}</span>
                      <span className="metric-hint">(optimal: {'<'} 5.0)</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Non-HDL Cholesterol:</span>
                      <span className="metric-value">{result.derived_metrics.non_hdl_cholesterol} mg/dL</span>
                      <span className="metric-hint">(target: {'<'} 130)</span>
                    </div>
                  </div>
                </div>
              )}

              {result.explainability && (
                <div className="explainability-section">
                  <h3>SHAP Explainability</h3>
                  
                  <div className="explainability-group">
                    <h4>LDL Cholesterol Drivers</h4>
                    {result.explainability.ldl_drivers.map((driver, idx) => (
                      <div key={idx} className="contribution-bar">
                        <span className="contribution-label">{driver.factor}</span>
                        <div className="contribution-visual">
                          <div 
                            className={`contribution-fill ${driver.direction}`}
                            style={{ 
                              width: `${Math.abs(driver.contribution) * 3}px`,
                              minWidth: '5px'
                            }}
                          />
                          <span className="contribution-value">
                            {driver.contribution > 0 ? '+' : ''}{driver.contribution}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="explainability-group">
                    <h4>HDL Cholesterol Drivers</h4>
                    {result.explainability.hdl_drivers.map((driver, idx) => (
                      <div key={idx} className="contribution-bar">
                        <span className="contribution-label">{driver.factor}</span>
                        <div className="contribution-visual">
                          <div 
                            className={`contribution-fill ${driver.direction}`}
                            style={{ 
                              width: `${Math.abs(driver.contribution) * 5}px`,
                              minWidth: '5px'
                            }}
                          />
                          <span className="contribution-value">
                            {driver.contribution > 0 ? '+' : ''}{driver.contribution}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="explainability-note">
                    ℹ️ {result.explainability.note}
                  </p>
                </div>
              )}
            </div>

            <div className="medical-disclaimer">
              <h4>⚕️ Medical Disclaimer</h4>
              <p>
                This prediction is for educational purposes only and should not replace professional medical advice.
                Cholesterol levels are influenced by many factors and individual responses vary.
                Consult your healthcare provider for personalized cholesterol management.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CholesterolPrediction;
