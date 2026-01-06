import React, { useState, useEffect } from 'react';

function BloodPressurePrediction() {
  const [form, setForm] = useState({
    sodium_mg: '',
    stress_level: '',
    activity_level: '',
    age: '',
    weight_kg: '',
    caffeine_mg: '',
    sleep_quality: '',
    hydration_level: '',
    medication_taken: 0,
    baseline_systolic: '',
    baseline_diastolic: '',
    time_since_last_meal: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: name === 'medication_taken' ? Number(value) : value }));
  };

  const validate = () => {
    const required = Object.keys(form);
    for (const k of required) {
      if (form[k] === '' || form[k] === null || Number.isNaN(Number(form[k]))) {
        setError('Please fill all fields with valid numbers');
        return false;
      }
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch('http://localhost:5001/api/blood-pressure/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sodium_mg: parseFloat(form.sodium_mg),
          stress_level: parseFloat(form.stress_level),
          activity_level: parseFloat(form.activity_level),
          age: parseFloat(form.age),
          weight_kg: parseFloat(form.weight_kg),
          caffeine_mg: parseFloat(form.caffeine_mg),
          sleep_quality: parseFloat(form.sleep_quality),
          hydration_level: parseFloat(form.hydration_level),
          medication_taken: parseInt(form.medication_taken),
          baseline_systolic: parseFloat(form.baseline_systolic),
          baseline_diastolic: parseFloat(form.baseline_diastolic),
          time_since_last_meal: parseFloat(form.time_since_last_meal)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'API error');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (risk) => {
    const v = (risk || '').toLowerCase();
    if (v.includes('crisis')) return '#dc2626';
    if (v.includes('stage 2')) return '#f97316';
    if (v.includes('stage 1')) return '#f59e0b';
    if (v.includes('elevated')) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="glucose-prediction-container">
      <div className="prediction-header">
        <h2>🩺 Blood Pressure Prediction</h2>
        <p>Predict systolic/diastolic response from lifestyle and meal factors</p>
      </div>

      <form onSubmit={submit} className="prediction-form">
        <div className="form-section">
          <h3>Core Inputs</h3>
          <div className="form-grid">
            <div className="form-group"><label>Sodium (mg)</label><input name="sodium_mg" type="number" value={form.sodium_mg} onChange={onChange} min="0" max="6000" step="1" placeholder="500"/></div>
            <div className="form-group"><label>Stress (0–1)</label><input name="stress_level" type="number" value={form.stress_level} onChange={onChange} min="0" max="1" step="0.1" placeholder="0.3"/></div>
            <div className="form-group"><label>Activity (0–1)</label><input name="activity_level" type="number" value={form.activity_level} onChange={onChange} min="0" max="1" step="0.1" placeholder="0.4"/></div>
            <div className="form-group"><label>Age (years)</label><input name="age" type="number" value={form.age} onChange={onChange} min="18" max="90" step="1" placeholder="42"/></div>
            <div className="form-group"><label>Weight (kg)</label><input name="weight_kg" type="number" value={form.weight_kg} onChange={onChange} min="35" max="200" step="0.1" placeholder="78"/></div>
            <div className="form-group"><label>Caffeine (mg)</label><input name="caffeine_mg" type="number" value={form.caffeine_mg} onChange={onChange} min="0" max="500" step="1" placeholder="120"/></div>
          </div>
        </div>

        <div className="form-section">
          <h3>Wellness</h3>
          <div className="form-grid">
            <div className="form-group"><label>Sleep Quality (0–1)</label><input name="sleep_quality" type="number" value={form.sleep_quality} onChange={onChange} min="0" max="1" step="0.1" placeholder="0.8"/></div>
            <div className="form-group"><label>Hydration (0–1)</label><input name="hydration_level" type="number" value={form.hydration_level} onChange={onChange} min="0" max="1" step="0.1" placeholder="0.7"/></div>
            <div className="form-group"><label>Medication</label><select name="medication_taken" value={form.medication_taken} onChange={onChange}><option value={0}>No</option><option value={1}>Yes</option></select></div>
          </div>
        </div>

        <div className="form-section">
          <h3>Baseline & Timing</h3>
          <div className="form-grid">
            <div className="form-group"><label>Baseline Systolic</label><input name="baseline_systolic" type="number" value={form.baseline_systolic} onChange={onChange} min="80" max="200" step="1" placeholder="128"/></div>
            <div className="form-group"><label>Baseline Diastolic</label><input name="baseline_diastolic" type="number" value={form.baseline_diastolic} onChange={onChange} min="50" max="130" step="1" placeholder="82"/></div>
            <div className="form-group"><label>Hours Since Meal</label><input name="time_since_last_meal" type="number" value={form.time_since_last_meal} onChange={onChange} min="0" max="24" step="0.1" placeholder="1.5"/></div>
          </div>
        </div>

        {error && <div className="prediction-error">{error}</div>}
        <button type="submit" className="predict-btn" disabled={loading}>{loading ? '🔄 Predicting...' : '📊 Get BP Prediction'}</button>
      </form>

      {result && (
        <div className="prediction-result">
          <div className="result-header"><h3>Prediction Result</h3></div>
          <div className="result-main">
            <div className="glucose-value">
              <span className="value" style={{ color: riskColor(result.risk_level) }}>
                {result.prediction.systolic}/{result.prediction.diastolic} mmHg
              </span>
              <span className="unit" style={{ display: 'block' }}>Baseline {result.prediction.baseline} • Δ {result.prediction.delta}</span>
            </div>
            <div className="result-details">
              <div className="detail-row"><span className="label">Risk:</span><span className="value" style={{ color: riskColor(result.risk_level), fontWeight: 'bold' }}>{result.risk_level}</span></div>
              <div className="detail-row"><span className="label">Confidence:</span><span className="value">{Math.round(result.confidence * 100)}%</span></div>
              {result.derived_metrics && (
                <div style={{marginTop: '12px', padding: '10px', background: '#f9fafb', borderRadius: '6px'}}>
                  <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '6px'}}>📊 Derived Metrics</div>
                  <div style={{fontSize: '13px'}}>High Sodium: {result.derived_metrics.sodium_high ? 'Yes' : 'No'}</div>
                  <div style={{fontSize: '13px'}}>Activity Protective: {result.derived_metrics.activity_protective ? 'Yes' : 'No'}</div>
                  <div style={{fontSize: '13px'}}>Hydration Protective: {result.derived_metrics.hydration_protective ? 'Yes' : 'No'}</div>
                  <div style={{fontSize: '13px'}}>Medication Effective: {result.derived_metrics.medication_effective ? 'Yes' : 'No'}</div>
                </div>
              )}
              {result.explainability && result.explainability.drivers && (
                <div style={{marginTop: '12px', padding: '10px', background: '#eef2ff', borderRadius: '6px'}}>
                  <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '6px'}}>🧠 SHAP-style Contributions (Systolic)</div>
                  {result.explainability.drivers.map((d, idx) => (
                    <div key={idx} style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px'}}>
                      <span>{d.feature} {d.direction === '+' ? '↑' : '↓'}</span>
                      <span>{d.impact_systolic} mmHg</span>
                    </div>
                  ))}
                  <div style={{fontSize: '12px', color: '#4f46e5', marginTop: '6px'}}>{result.explainability.sum_rule}</div>
                </div>
              )}
              {result.medical_disclaimer && (
                <div style={{marginTop: '12px', padding: '10px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '12px', color: '#92400e'}}>
                  Predictions are for educational use only and not a substitute for medical advice.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BloodPressurePrediction;
