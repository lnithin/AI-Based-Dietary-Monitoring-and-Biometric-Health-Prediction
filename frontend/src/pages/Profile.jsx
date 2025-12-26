
import React, { useState } from 'react';

function Profile({ token, user, onUpdate }) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    age: user?.age || '',
    gender: user?.gender || '',
    height_cm: user?.height_cm || '',
    weight_kg: user?.weight_kg || '',
    healthConditions: user?.healthConditions || [],
    dietaryPreferences: user?.dietaryPreferences || [],
    allergies: user?.allergies || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const healthOptions = [
    { value: 'diabetes', label: 'Diabetes', emoji: '🩺' },
    { value: 'hypertension', label: 'Hypertension', emoji: '❤️' },
    { value: 'high_cholesterol', label: 'High Cholesterol', emoji: '📋' },
    { value: 'obesity', label: 'Obesity', emoji: '⚖️' },
  ];
  const dietaryOptions = ['veg', 'vegan', 'keto', 'gluten_free'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to update profile (${response.status})`);
      }

      onUpdate(data.user);
      setSuccess('✅ Profile updated successfully!');
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Profile update error:', err);
      if (err.message && err.message.includes('fetch')) {
        setError('Failed to connect to server. Please check if the backend is running on port 8000.');
      } else {
        setError(err.message || 'Failed to update profile. Please try again.');
      }
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-glass-bg">
      <div className="glass-card profile-card premium-shadow">
        <form onSubmit={handleSubmit} className="profile-form">
          
          {/* BMI Status Card */}
          {user && (user.currentBMI || user.biometricDataEstimated) && (
            <div className="profile-section" style={{ 
              background: user.biometricDataEstimated 
                ? 'linear-gradient(135deg, rgba(255,170,0,0.1), rgba(255,140,0,0.05))' 
                : 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,212,255,0.05))',
              border: user.biometricDataEstimated ? '2px solid rgba(255,170,0,0.3)' : '2px solid rgba(0,255,136,0.3)',
              borderRadius: '15px',
              padding: '20px',
              marginBottom: '25px'
            }}>
              <div className="profile-section-header">
                <span className="profile-section-icon">📊</span>
                <span className="profile-section-title">Body Mass Index (BMI)</span>
                {user.biometricDataEstimated && (
                  <span style={{
                    marginLeft: 'auto',
                    padding: '4px 12px',
                    background: 'rgba(255,170,0,0.2)',
                    border: '1px solid rgba(255,170,0,0.5)',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#ffaa00',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    📝 Estimated
                  </span>
                )}
                {user.biometricDataComplete && !user.biometricDataEstimated && (
                  <span style={{
                    marginLeft: 'auto',
                    padding: '4px 12px',
                    background: 'rgba(0,255,136,0.2)',
                    border: '1px solid rgba(0,255,136,0.5)',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#00ff88',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    ✓ Confirmed
                  </span>
                )}
              </div>
              
              {user.currentBMI ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', fontWeight: '700', color: '#fff', marginBottom: '5px' }}>
                      {user.currentBMI.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#999' }}>BMI Value</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: user.bmiCategory === 'healthy' ? '#00ff88' : 
                             user.bmiCategory === 'underweight' ? '#00d4ff' :
                             user.bmiCategory === 'overweight' ? '#ffaa00' : '#ff3366',
                      marginBottom: '5px',
                      textTransform: 'capitalize'
                    }}>
                      {user.bmiCategory?.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '13px', color: '#999' }}>{user.bmiStatus || 'Status'}</div>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: '#ffaa00',
                  fontSize: '14px'
                }}>
                  ⚠️ BMI will be calculated when you enter your height, weight, and age below
                </div>
              )}
              
              {user.biometricDataEstimated && (
                <div style={{
                  marginTop: '15px',
                  padding: '12px 15px',
                  background: 'rgba(255,170,0,0.15)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: '#ffcc66',
                  lineHeight: '1.5'
                }}>
                  💡 <strong>Update Required:</strong> Please update your height, weight, and age below for accurate BMI calculation and personalized health recommendations.
                </div>
              )}
              
              {user.lastBiometricUpdate && (
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '12px', 
                  color: '#666',
                  textAlign: 'center'
                }}>
                  Last updated: {new Date(user.lastBiometricUpdate).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          <div className="profile-section">
            <div className="profile-section-header">
              <span className="profile-section-icon">👤</span>
              <span className="profile-section-title">Personal Information</span>
              <span className="profile-section-underline" />
            </div>
            <div className="profile-row">
              <div className="profile-group">
                <label className="profile-label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  className="profile-input glass-input"
                  value={formData.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                />
              </div>
              <div className="profile-group">
                <label className="profile-label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  className="profile-input glass-input"
                  value={formData.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="profile-row">
              <div className="profile-group">
                <label className="profile-label">Age</label>
                <input
                  type="number"
                  name="age"
                  className="profile-input glass-input"
                  value={formData.age}
                  onChange={handleChange}
                  min="0"
                  max="120"
                />
              </div>
              <div className="profile-group">
                <label className="profile-label">Gender</label>
                <div className="profile-select-wrapper">
                  <select
                    name="gender"
                    className="profile-select glass-input"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <span className="profile-select-icon">👥</span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-header">
              <span className="profile-section-icon">📏</span>
              <span className="profile-section-title">Physical Measurements</span>
              <span className="profile-section-underline" />
            </div>
            <div className="profile-row">
              <div className="profile-group">
                <label className="profile-label">Height (cm)</label>
                <input
                  type="number"
                  name="height_cm"
                  className="profile-input glass-input"
                  value={formData.height_cm}
                  onChange={handleChange}
                  min="0"
                  max="300"
                />
              </div>
              <div className="profile-group">
                <label className="profile-label">Weight (kg)</label>
                <input
                  type="number"
                  name="weight_kg"
                  className="profile-input glass-input"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  min="0"
                  max="500"
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-header">
              <span className="profile-section-icon">❤️</span>
              <span className="profile-section-title">Health Conditions</span>
              <span className="profile-section-underline" />
            </div>
            <div className="profile-pill-grid">
              {healthOptions.map(option => (
                <label
                  key={option.value}
                  className={`profile-pill ${formData.healthConditions.includes(option.value) ? 'active' : ''}`}
                  tabIndex={0}
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={formData.healthConditions.includes(option.value)}
                    onChange={e => handleCheckboxChange(e, 'healthConditions')}
                    style={{ display: 'none' }}
                  />
                  <span className="profile-pill-icon">{option.emoji}</span>
                  <span className="profile-pill-label">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-header">
              <span className="profile-section-icon">🍎</span>
              <span className="profile-section-title">Dietary Preferences</span>
              <span className="profile-section-underline" />
            </div>
            <div className="profile-pill-grid">
              {dietaryOptions.map(option => (
                <label
                  key={option}
                  className={`profile-pill ${formData.dietaryPreferences.includes(option) ? 'active' : ''}`}
                  tabIndex={0}
                >
                  <input
                    type="checkbox"
                    value={option}
                    checked={formData.dietaryPreferences.includes(option)}
                    onChange={e => handleCheckboxChange(e, 'dietaryPreferences')}
                    style={{ display: 'none' }}
                  />
                  <span className="profile-pill-label">{option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-header">
              <span className="profile-section-icon">⚠️</span>
              <span className="profile-section-title">Allergies</span>
              <span className="profile-section-underline" />
            </div>
            <div className="profile-row">
              <div className="profile-group" style={{ width: '100%' }}>
                <label className="profile-label">Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  className="profile-input glass-input"
                  placeholder="List any food allergies separated by commas"
                  value={formData.allergies}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {error && <div className="alert-modern alert-modern-danger">{error}</div>}
          {success && <div className="alert-modern alert-modern-success">{success}</div>}

          <button
            type="submit"
            className="btn-gradient btn-gradient-primary profile-save-btn"
            disabled={loading}
          >
            {loading ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
