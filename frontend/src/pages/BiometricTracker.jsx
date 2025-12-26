import React, { useState, useEffect } from 'react';

function BiometricTracker({ token, user }) {
  const [biometricType, setBiometricType] = useState('glucose_mg_dl');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [biometrics, setBiometrics] = useState([]);
  const [stats, setStats] = useState(null);
  const [bmiClassification, setBmiClassification] = useState(null);

  useEffect(() => {
    fetchBiometrics();
  }, [token, biometricType]);

  const fetchBiometrics = async () => {
    try {
      // Reset states when switching types
      setBiometrics([]);
      setStats(null);
      
      let biometricTypeMap = {
        'glucose_mg_dl': 'glucose',
        'blood_pressure': 'blood_pressure',
        'heart_rate_bpm': 'heart_rate',
        'cholesterol_mg_dl': 'cholesterol',
        'body_temperature_celsius': 'body_temperature',
        'weight_kg': 'weight'
      };

      const mappedType = biometricTypeMap[biometricType];
      const res = await fetch(`http://localhost:8000/api/biometrics?biometricType=${mappedType}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : { readings: [] };
      setBiometrics(data.readings || []);

      const statsRes = await fetch(`http://localhost:8000/api/biometrics/stats/${mappedType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = statsRes.ok ? await statsRes.json() : {};
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching biometrics:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value) {
      setError('Please enter a value');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let biometricTypeMap = {
        'glucose_mg_dl': 'glucose',
        'blood_pressure': 'blood_pressure',
        'heart_rate_bpm': 'heart_rate',
        'cholesterol_mg_dl': 'cholesterol',
        'body_temperature_celsius': 'body_temperature',
        'weight_kg': 'weight'
      };

      const payload = {
        biometricType: biometricTypeMap[biometricType],
        timestamp: new Date().toISOString(),
        dataSource: 'manual_entry'
      };

      if (biometricType === 'glucose_mg_dl') {
        payload.glucose_mg_dl = parseFloat(value);
      } else if (biometricType === 'blood_pressure') {
        // Parse format: "120/80"
        const bpValues = value.split('/');
        if (bpValues.length !== 2) {
          throw new Error('Please enter blood pressure as systolic/diastolic (e.g., 120/80)');
        }
        payload.systolic = parseFloat(bpValues[0].trim());
        payload.diastolic = parseFloat(bpValues[1].trim());
        if (isNaN(payload.systolic) || isNaN(payload.diastolic)) {
          throw new Error('Invalid blood pressure values');
        }
      } else if (biometricType === 'heart_rate_bpm') {
        payload.heart_rate_bpm = parseFloat(value);
      } else if (biometricType === 'cholesterol_mg_dl') {
        payload.total_cholesterol = parseFloat(value);
      } else if (biometricType === 'body_temperature_celsius') {
        payload.temperature_celsius = parseFloat(value);
      } else if (biometricType === 'weight_kg') {
        payload.weight_kg = parseFloat(value);
      }

      const response = await fetch('http://localhost:8000/api/biometrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record biometric');
      }

      const responseData = await response.json();
      
      // Handle BMI classification for weight entries
      if (responseData.bmiClassification) {
        setBmiClassification(responseData.bmiClassification);
        if (responseData.bmiClassification.error) {
          setError(responseData.bmiClassification.error);
        } else {
          setSuccess(`✅ Biometric recorded! ${responseData.bmiClassification.status}`);
        }
      } else {
        setSuccess('✅ Biometric recorded successfully!');
      }
      
      setValue('');
      setTimeout(() => fetchBiometrics(), 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (type, value) => {
    if (!value) return 'normal';
    
    switch (type) {
      case 'glucose_mg_dl':
        if (value < 70) return 'low';
        if (value > 126) return 'high';
        if (value > 100) return 'warning';
        return 'normal';
      case 'blood_pressure':
        // Parse "120/80" format
        if (typeof value === 'string' && value.includes('/')) {
          const [systolic] = value.split('/').map(v => parseInt(v));
          if (systolic < 90) return 'low';
          if (systolic >= 130) return 'high';
          if (systolic >= 120) return 'warning';
        }
        return 'normal';
      case 'heart_rate_bpm':
        if (value < 60) return 'low';
        if (value > 100) return 'high';
        return 'normal';
      case 'cholesterol_mg_dl':
        if (value >= 240) return 'high';
        if (value >= 200) return 'warning';
        return 'normal';
      case 'body_temperature_celsius':
        if (value < 36.5) return 'low';
        if (value > 38.0) return 'high';
        if (value > 37.5) return 'warning';
        return 'normal';
      case 'weight_kg':
        // For weight, we'd need height for BMI calculation
        // For now, just return normal
        return 'normal';
      default:
        return 'normal';
    }
  };

  const getUnit = (type) => {
    const units = {
      'glucose_mg_dl': 'mg/dL',
      'blood_pressure': 'systolic/diastolic',
      'heart_rate_bpm': 'bpm',
      'cholesterol_mg_dl': 'mg/dL',
      'body_temperature_celsius': '°C',
      'weight_kg': 'kg'
    };
    return units[type] || 'unit';
  };

  const getValue = (reading, type) => {
    const fieldMap = {
      'glucose_mg_dl': 'glucose_mg_dl',
      'blood_pressure': 'blood_pressure',
      'heart_rate_bpm': 'heart_rate_bpm',
      'cholesterol_mg_dl': 'total_cholesterol',
      'body_temperature_celsius': 'temperature_celsius',
      'weight_kg': 'weight_kg'
    };
    
    if (type === 'blood_pressure') {
      return reading.systolic && reading.diastolic ? `${reading.systolic}/${reading.diastolic}` : null;
    }
    return reading[fieldMap[type]];
  };

  const getLabel = (type) => {
    const labels = {
      'glucose_mg_dl': '🩸 Blood Glucose',
      'blood_pressure': '🩺 Blood Pressure',
      'heart_rate_bpm': '❤️ Heart Rate',
      'cholesterol_mg_dl': '🧬 Cholesterol',
      'body_temperature_celsius': '🌡️ Temperature',
      'weight_kg': '⚖️ Weight'
    };
    return labels[type] || type;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">❤️ Biometric Tracker</h1>
        <p className="page-subtitle">Record and monitor your vital signs and health markers</p>
      </div>

      {/* Input Form Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div>
            <span className="card-title">📊 Record Biometric</span>
            <span className="card-subtitle">Add New Health Measurement</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span>✅</span>
                <div>{success}</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Measurement Type</label>
            <select
              className="form-select"
              value={biometricType}
              onChange={(e) => {
                setBiometricType(e.target.value);
                setValue('');
              }}
            >
              <option value="glucose_mg_dl">🩸 Blood Glucose</option>
              <option value="blood_pressure">🩺 Blood Pressure</option>
              <option value="heart_rate_bpm">❤️ Heart Rate</option>
              <option value="cholesterol_mg_dl">🧬 Cholesterol</option>
              <option value="body_temperature_celsius">🌡️ Temperature</option>
              <option value="weight_kg">⚖️ Weight</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Value ({getUnit(biometricType)})</label>
              <input
                type={biometricType === 'blood_pressure' ? 'text' : 'number'}
                step="0.1"
                className="form-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={biometricType === 'blood_pressure' ? 'e.g., 120/80' : `Enter ${getUnit(biometricType)}`}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ minWidth: '140px' }}
            >
              {loading ? '⏳ Recording...' : '📊 Record'}
            </button>
          </div>
        </form>
      </div>

      {/* BMI Classification Display for Weight */}
      {bmiClassification && !bmiClassification.error && biometricType === 'weight_kg' && (
        <div className="card" style={{ marginTop: '1rem', background: 'rgba(0, 212, 255, 0.08)', borderLeft: '3px solid #00d4ff' }}>
          <div className="card-header">
            <div>
              <span className="card-title">📊 Body Mass Index (BMI) Analysis</span>
              <span className="card-subtitle">Personalized Assessment</span>
            </div>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>Your BMI</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#00d4ff' }}>{bmiClassification.bmi}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>Classification</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: bmiClassification.color === 'normal' ? '#00ff88' : bmiClassification.color === 'warning' ? '#ffaa00' : '#ff3366' }}>
                  {bmiClassification.status}
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                {bmiClassification.description}
              </div>
            </div>
            {bmiClassification.note && (
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                ℹ️ {bmiClassification.note}
              </div>
            )}
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              <strong>Age Group:</strong> {bmiClassification.ageGroup === 'adult' ? 'Adult (20+)' : 'Pediatric (2-19)'}
              {bmiClassification.ageGroup === 'pediatric' && ' | Classification based on growth percentiles'}
            </div>
          </div>
        </div>
      )}

      {/* Profile Incomplete Warning for Weight */}
      {bmiClassification && bmiClassification.requiresInput && biometricType === 'weight_kg' && (
        <div className="card" style={{ marginTop: '1rem', background: 'rgba(255, 170, 0, 0.08)', borderLeft: '3px solid #ffaa00' }}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#ffaa00', marginBottom: '0.5rem' }}>
              ⚠️ Profile Information Needed
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1rem' }}>
              To provide accurate BMI classification and personalized health insights, please complete your profile with:
            </div>
            <ul style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginLeft: '1.5rem' }}>
              <li>Height (in cm)</li>
              <li>Age</li>
              <li>Biological Sex</li>
            </ul>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1rem' }}
              onClick={() => window.location.href = '/profile'}
            >
              Complete Profile →
            </button>
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      {stats && (
        <div className="dashboard-grid">
          <div className="card">
            <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
              <div className="stat-label">Average</div>
              <div className="stat-value">
                {biometricType === 'blood_pressure'
                  ? `${Math.round(stats.systolic?.average || 0)}/${Math.round(stats.diastolic?.average || 0)}`
                  : Math.round(stats.average || 0)
                }
              </div>
            </div>
          </div>
          <div className="card">
            <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
              <div className="stat-label">Highest</div>
              <div className="stat-value">
                {biometricType === 'blood_pressure'
                  ? `${Math.round(stats.systolic?.max || 0)}/${Math.round(stats.diastolic?.max || 0)}`
                  : Math.round(stats.max || 0)
                }
              </div>
            </div>
          </div>
          <div className="card">
            <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
              <div className="stat-label">Lowest</div>
              <div className="stat-value">
                {biometricType === 'blood_pressure'
                  ? `${Math.round(stats.systolic?.min || 0)}/${Math.round(stats.diastolic?.min || 0)}`
                  : Math.round(stats.min || 0)
                }
              </div>
            </div>
          </div>
          <div className="card">
            <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
              <div className="stat-label">Readings</div>
              <div className="stat-value">{stats.readingCount || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Readings */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <div>
            <span className="card-title">📋 {getLabel(biometricType)}</span>
            <span className="card-subtitle">Recent Readings</span>
          </div>
        </div>
        {biometrics.length > 0 ? (
          <ul className="list">
            {biometrics.map((reading, index) => {
              const value = getValue(reading, biometricType);
              const status = getHealthStatus(biometricType, value);
              const statusBadgeClass = `badge-${status}`;
              return (
                <li key={reading._id || index} className="list-item">
                  <div className="list-content">
                    <div className="list-title">
                      {value} <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{getUnit(biometricType)}</span>
                    </div>
                    <div className="list-subtitle">
                      {new Date(reading.timestamp).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <span className={`biometric-badge badge-${status}`}>
                    {status.toUpperCase()}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
            <p className="stat-label">No readings recorded yet</p>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
              Start by adding your first measurement above!
            </p>
          </div>
        )}
      </div>

      {/* Health Reference Guide */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <div>
            <span className="card-title">📚 Health Reference</span>
            <span className="card-subtitle">Clinical Ranges</span>
          </div>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginTop: '1rem'
        }}>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(0, 255, 136, 0.08)',
            borderLeft: '3px solid #00ff88',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#00d4ff', marginBottom: '1rem', fontSize: '1rem' }}>🩸 Blood Glucose (Fasting)</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#00ff88' }}>✅ Normal:</span> 70-100 mg/dL</li>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#ffaa00' }}>⚠️ Prediabetic:</span> 101-125 mg/dL</li>
              <li><span style={{ color: '#ff3366' }}>❌ Diabetic:</span> &gt;126 mg/dL</li>
            </ul>
          </div>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(0, 212, 255, 0.08)',
            borderLeft: '3px solid #00d4ff',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#00d4ff', marginBottom: '1rem', fontSize: '1rem' }}>🩺 Blood Pressure</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#00ff88' }}>✅ Normal:</span> &lt;120/80</li>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#ffaa00' }}>⚠️ Elevated:</span> 120-129/&lt;80</li>
              <li><span style={{ color: '#ff3366' }}>❌ High:</span> ≥130/80 mmHg</li>
            </ul>
          </div>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(168, 85, 255, 0.08)',
            borderLeft: '3px solid #a855ff',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#00d4ff', marginBottom: '1rem', fontSize: '1rem' }}>❤️ Heart Rate (Resting)</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#00ff88' }}>✅ Normal:</span> 60-100 bpm</li>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#ffaa00' }}>⚠️ Low:</span> &lt;60 bpm</li>
              <li><span style={{ color: '#ff3366' }}>❌ High:</span> &gt;100 bpm</li>
            </ul>
          </div>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(255, 170, 0, 0.08)',
            borderLeft: '3px solid #ffaa00',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#00d4ff', marginBottom: '1rem', fontSize: '1rem' }}>🧬 Total Cholesterol</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#00ff88' }}>✅ Desirable:</span> &lt;200 mg/dL</li>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#ffaa00' }}>⚠️ Borderline:</span> 200-239 mg/dL</li>
              <li><span style={{ color: '#ff3366' }}>❌ High:</span> ≥240 mg/dL</li>
            </ul>
          </div>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(0, 255, 136, 0.08)',
            borderLeft: '3px solid #00ff88',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#00d4ff', marginBottom: '1rem', fontSize: '1rem' }}>⚖️ Body Mass Index (BMI)</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#ffaa00' }}>⚠️ Underweight:</span> BMI &lt;18.5</li>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#00ff88' }}>✅ Healthy Range:</span> BMI 18.5-24.9</li>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#ffaa00' }}>⚠️ Overweight:</span> BMI 25.0-29.9</li>
              <li><span style={{ color: '#ff3366' }}>❌ Obese:</span> BMI ≥30.0</li>
            </ul>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
              *For adults 20+. Pediatric BMI uses age/sex percentiles.
            </div>
          </div>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(0, 212, 255, 0.08)',
            borderLeft: '3px solid #00d4ff',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#00d4ff', marginBottom: '1rem', fontSize: '1rem' }}>🌡️ Body Temperature</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#00ff88' }}>✅ Normal:</span> 36.5-37.5°C</li>
              <li style={{ marginBottom: '0.5rem' }}><span style={{ color: '#ffaa00' }}>⚠️ Low Fever:</span> 37.6-38.0°C</li>
              <li><span style={{ color: '#ff3366' }}>❌ High Fever:</span> &gt;38.0°C</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BiometricTracker;
