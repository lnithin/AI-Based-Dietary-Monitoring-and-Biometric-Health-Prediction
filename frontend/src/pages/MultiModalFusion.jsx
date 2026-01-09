import React, { useState } from 'react';
import '../styles/Predictions.css';

const MultiModalFusion = () => {
  const [formData, setFormData] = useState({
    biomarker: 'cholesterol',
    food_name: '',
    cv_confidence: '',
    saturated_fat_g: '',
    trans_fat_g: '',
    dietary_cholesterol_mg: '',
    fiber_g: '',
    sugar_g: '',
    sodium_mg: '',
    predicted_value: '',
    baseline: '',
    risk_level: 'Borderline'
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validate = () => {
    const requiredFields = [
      'biomarker', 'food_name', 'cv_confidence',
      'saturated_fat_g', 'fiber_g', 'sugar_g',
      'predicted_value', 'baseline'
    ];

    const missing = requiredFields.filter(f => formData[f] === '');
    
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return false;
    }

    if (parseFloat(formData.cv_confidence) < 0 || parseFloat(formData.cv_confidence) > 1) {
      setError('CV confidence must be between 0 and 1');
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
      const payload = {
        biomarker: formData.biomarker,
        cv_data: {
          food_name: formData.food_name,
          confidence: parseFloat(formData.cv_confidence)
        },
        nlp_data: {
          saturated_fat_g: parseFloat(formData.saturated_fat_g) || 0,
          trans_fat_g: parseFloat(formData.trans_fat_g) || 0,
          dietary_cholesterol_mg: parseFloat(formData.dietary_cholesterol_mg) || 0,
          fiber_g: parseFloat(formData.fiber_g) || 0,
          sugar_g: parseFloat(formData.sugar_g) || 0,
          sodium_mg: parseFloat(formData.sodium_mg) || 0
        },
        biometric_data: {
          predicted_value: parseFloat(formData.predicted_value),
          baseline: parseFloat(formData.baseline),
          delta: parseFloat(formData.predicted_value) - parseFloat(formData.baseline),
          risk_level: formData.risk_level,
          confidence: 0.80
        }
      };

      const response = await fetch('http://localhost:5001/api/fusion/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.fusion_result) {
        setResult(data.fusion_result);
        setShowModal(true);
      } else {
        setError(data.error || 'Fusion prediction failed');
      }
    } catch (err) {
      setError('Failed to connect to fusion service');
      console.error('Fusion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getReliabilityColor = (reliability) => {
    switch (reliability) {
      case 'High':
        return '#10b981';
      case 'Medium':
        return '#f59e0b';
      case 'Low':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getRiskColor = (risk) => {
    const colors = {
      'Optimal': '#10b981',
      'Near Optimal': '#22c55e',
      'Borderline': '#f59e0b',
      'Borderline High': '#f97316',
      'High Risk': '#ef4444'
    };
    return colors[risk] || '#6b7280';
  };

  return (
    <div className="prediction-container">
      <div className="prediction-header">
        <h1>🔗 Multi-Modal Fusion</h1>
        <p className="subtitle">Fuses computer vision, nutrition, and biometric predictions</p>
      </div>

      <div className="prediction-content">
        <form onSubmit={submit} className="prediction-form">
          <div className="form-section">
            <h3>Prediction Settings</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="biomarker">Biomarker Type</label>
                <select
                  id="biomarker"
                  name="biomarker"
                  value={formData.biomarker}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '1rem',
                    background: '#f8fafc'
                  }}
                >
                  <option value="glucose">Glucose</option>
                  <option value="blood_pressure">Blood Pressure</option>
                  <option value="cholesterol">Cholesterol</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Computer Vision</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="food_name">Recognized Food</label>
                <input
                  type="text"
                  id="food_name"
                  name="food_name"
                  value={formData.food_name}
                  onChange={handleChange}
                  placeholder="e.g., Vada"
                  required
                />
                <span className="field-hint">Food identified by CV model</span>
              </div>

              <div className="form-group">
                <label htmlFor="cv_confidence">CV Confidence (0-1)</label>
                <input
                  type="number"
                  id="cv_confidence"
                  name="cv_confidence"
                  value={formData.cv_confidence}
                  onChange={handleChange}
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="0-1"
                  required
                />
                <span className="field-hint">How confident is food recognition</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Nutrition Data (NLP)</h3>
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
                  step="0.1"
                  required
                />
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
                  step="0.1"
                />
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
                  step="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="fiber_g">Fiber (g)</label>
                <input
                  type="number"
                  id="fiber_g"
                  name="fiber_g"
                  value={formData.fiber_g}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  required
                />
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
                  step="0.1"
                  required
                />
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
                  step="1"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Biometric Prediction</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="predicted_value">Predicted Value</label>
                <input
                  type="number"
                  id="predicted_value"
                  name="predicted_value"
                  value={formData.predicted_value}
                  onChange={handleChange}
                  step="0.1"
                  placeholder="Post-meal value"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="baseline">Baseline Value</label>
                <input
                  type="number"
                  id="baseline"
                  name="baseline"
                  value={formData.baseline}
                  onChange={handleChange}
                  step="0.1"
                  placeholder="Pre-meal value"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="risk_level">Risk Level</label>
                <select
                  id="risk_level"
                  name="risk_level"
                  value={formData.risk_level}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '1rem',
                    background: '#f8fafc'
                  }}
                >
                  <option value="Optimal">Optimal</option>
                  <option value="Near Optimal">Near Optimal</option>
                  <option value="Borderline">Borderline</option>
                  <option value="Borderline High">Borderline High</option>
                  <option value="High Risk">High Risk</option>
                </select>
              </div>
            </div>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '🔄 Fusing...' : '🔗 Fuse Predictions'}
          </button>
        </form>

        {result && (
          <div className="result-section">
            <h2>Fusion Result</h2>

            <div className="result-card">
              <div className="result-main">
                <div style={{ flex: 1 }}>
                  <div className="cholesterol-values">
                    <div className="cholesterol-item">
                      <h4>Final Prediction</h4>
                      <p className="value">{result.final_prediction}</p>
                    </div>

                    <div className="cholesterol-item">
                      <h4>Fusion Score</h4>
                      <p className="value">{(result.fusion_score * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    className="risk-badge"
                    style={{ backgroundColor: getReliabilityColor(result.reliability) }}
                  >
                    {result.reliability} Reliability
                  </div>
                  <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                    Risk: <strong style={{ color: getRiskColor(result.risk_level) }}>
                      {result.risk_level}
                    </strong>
                  </p>
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '1rem',
                marginTop: '1rem'
              }}>
                <h3 style={{ marginTop: 0, color: '#0f172a' }}>Modality Scores</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>🖼️ CV</p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {(result.modality_scores.cv * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>📝 NLP</p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {(result.modality_scores.nlp * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>📊 Biometric</p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {(result.modality_scores.biometric * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>✅ Explainability</p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {(result.modality_scores.explainability * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '10px',
                padding: '1rem',
                marginTop: '1rem',
                color: '#854d0e'
              }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  {result.explanation}
                </p>
              </div>

              {result.driver_analysis && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <h3 style={{ marginTop: 0, color: '#0f172a' }}>Driver Analysis</h3>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', color: '#111827' }}>🖼️ Computer Vision</h4>
                      <p style={{ margin: '0 0 0.35rem', color: '#666' }}>
                        <strong>Food:</strong> {result.driver_analysis.cv_modality.recognized_food}
                      </p>
                      <p style={{ margin: '0 0 0.35rem', color: '#666' }}>
                        <strong>Confidence:</strong> {(result.driver_analysis.cv_modality.confidence * 100).toFixed(0)}%
                      </p>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
                        {result.driver_analysis.cv_modality.impact}
                      </p>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', color: '#111827' }}>📝 NLP Nutrition</h4>
                      <p style={{ margin: '0 0 0.35rem', color: '#666' }}>
                        <strong>Nutrients:</strong> {result.driver_analysis.nlp_modality.key_nutrients.length}
                      </p>
                      {result.driver_analysis.nlp_modality.high_impact_nutrients.length > 0 && (
                        <p style={{ margin: '0 0 0.35rem', color: '#666', fontSize: '0.9rem' }}>
                          <strong>High Impact:</strong> {result.driver_analysis.nlp_modality.high_impact_nutrients.slice(0, 2).join(', ')}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
                        {result.driver_analysis.nlp_modality.impact}
                      </p>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', color: '#111827' }}>📊 Biometric</h4>
                      <p style={{ margin: '0 0 0.35rem', color: '#666' }}>
                        <strong>Delta:</strong> {result.driver_analysis.biometric_modality.delta > 0 ? '+' : ''}{result.driver_analysis.biometric_modality.delta?.toFixed(1)}
                      </p>
                      <p style={{ margin: '0 0 0.35rem', color: '#666' }}>
                        <strong>Trend:</strong> {result.driver_analysis.biometric_modality.trend}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
                        {result.driver_analysis.biometric_modality.impact}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiModalFusion;
