import React, { useState, useEffect } from 'react';

function Dashboard({ token, user }) {
  const [stats, setStats] = useState({
    mealsLogged: 0,
    biometricsLogged: 0,
    averageGlucose: '--',
    averageBP: '--',
  });
  const [recentMeals, setRecentMeals] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [loadingAlertDetails, setLoadingAlertDetails] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats from dedicated endpoint
      const dashboardRes = await fetch('http://localhost:8000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        
        if (dashboardData.success) {
          setRecentMeals(dashboardData.meals?.recent || []);
          setRecentAlerts(dashboardData.alerts?.recent || []);
          setStats({
            mealsLogged: dashboardData.meals?.total || 0,
            averageGlucose: dashboardData.biometrics?.glucose?.average || '--',
            averageBP: dashboardData.biometrics?.bloodPressure?.latest || '--',
            biometricsLogged: dashboardData.biometrics?.total || 0,
          });
        } else {
          await fetchIndividualData();
        }
      } else {
        await fetchIndividualData();
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      await fetchIndividualData();
    } finally {
      setLoading(false);
    }
  };

  const fetchIndividualData = async () => {
    try {
      const mealsRes = await fetch('http://localhost:8000/api/meals?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const mealsData = mealsRes.ok ? await mealsRes.json() : { meals: [] };
      
      const bioRes = await fetch('http://localhost:8000/api/biometrics/stats/glucose?days=30', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bioData = bioRes.ok ? await bioRes.json() : {};
      
      const bpRes = await fetch('http://localhost:8000/api/biometrics/stats/blood_pressure?days=30', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bpData = bpRes.ok ? await bpRes.json() : {};
      
      const alertsRes = await fetch('http://localhost:8000/api/alerts?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const alertsData = alertsRes.ok ? await alertsRes.json() : { alerts: [] };

      setRecentMeals(mealsData.meals || []);
      setRecentAlerts(alertsData.alerts || []);
      
      const avgGlucose = bioData.average ? Math.round(parseFloat(bioData.average)) : '--';
      const avgBP = bpData.systolic && bpData.diastolic 
        ? `${Math.round(bpData.systolic.average)}/${Math.round(bpData.diastolic.average)}`
        : (bpData.systolic?.latest ? `${bpData.systolic.latest}/${bpData.diastolic?.latest || '--'}` : '--');
      
      setStats({
        mealsLogged: mealsData.pagination?.total || 0,
        averageGlucose: avgGlucose,
        averageBP: avgBP,
        biometricsLogged: (bioData.readingCount || 0) + (bpData.readingCount || 0),
      });
    } catch (error) {
      console.error('Error fetching individual data:', error);
    }
  };

  const getAlertSeverityClass = (severity) => {
    switch (severity) {
      case 'critical': return 'alert-danger';
      case 'warning': return 'alert-warning';
      default: return 'alert-info';
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'critical': return 'badge-danger';
      case 'warning': return 'badge-warning';
      case 'info': return 'badge-normal';
      default: return 'badge-normal';
    }
  };

  const viewAlertDetails = async (alertId) => {
    setLoadingAlertDetails(true);
    setShowAlertModal(true);
    try {
      const response = await fetch(`http://localhost:8000/api/alerts/${alertId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Alert not found');
      }

      const alertData = await response.json();
      setSelectedAlert(alertData);
    } catch (err) {
      console.error('Error fetching alert details:', err);
      alert(`❌ Error: ${err.message}`);
      setShowAlertModal(false);
    } finally {
      setLoadingAlertDetails(false);
    }
  };

  const closeAlertModal = () => {
    setShowAlertModal(false);
    setSelectedAlert(null);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, {user?.firstName || 'User'}! Here's your health overview.
        </p>
      </div>
      
      {/* BMI Setup Prompt for Users with Incomplete Data */}
      {user && user.biometricDataEstimated && (
        <div className="alert alert-warning" style={{ 
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(255,170,0,0.15), rgba(255,140,0,0.05))',
          border: '2px solid rgba(255,170,0,0.4)',
          borderRadius: '15px'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.8rem' }}>📊</span>
            <div style={{ flex: 1 }}>
              <div className="alert-title" style={{ color: '#ffaa00', fontWeight: '600' }}>
                Complete Your Health Profile for Accurate Insights
              </div>
              <div className="alert-message" style={{ marginTop: '8px', lineHeight: '1.6' }}>
                Your BMI and health metrics are currently estimated using default values. 
                Update your <strong>height, weight, and age</strong> in your profile to receive:
                <ul style={{ marginTop: '10px', marginBottom: '10px', paddingLeft: '20px' }}>
                  <li>✓ Accurate BMI calculation and weight classification</li>
                  <li>✓ Personalized health recommendations</li>
                  <li>✓ Precise risk assessments</li>
                  <li>✓ Better dietary guidance</li>
                </ul>
              </div>
              <a 
                href="#profile" 
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = 'profile';
                }}
                style={{
                  display: 'inline-block',
                  marginTop: '12px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #ffaa00, #ff8800)',
                  color: '#fff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255,170,0,0.3)'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                📝 Complete Profile Now →
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* BMI Success Message for Completed Profiles */}
      {user && user.biometricDataComplete && !user.biometricDataEstimated && user.currentBMI && (
        <div className="alert alert-info" style={{ 
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,212,255,0.05))',
          border: '2px solid rgba(0,255,136,0.3)',
          borderRadius: '15px'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>✓</span>
            <div>
              <strong style={{ color: '#00ff88' }}>Your BMI: {user.currentBMI.toFixed(1)}</strong>
              <span style={{ marginLeft: '15px', color: '#aaa' }}>
                {user.bmiStatus} • {user.bmiCategory?.replace('_', ' ').charAt(0).toUpperCase() + user.bmiCategory?.slice(1)}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {stats.mealsLogged === 0 && stats.biometricsLogged === 0 && !loading && !user?.biometricDataEstimated && (
        <div className="alert alert-info" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>👋</span>
            <div>
              <div className="alert-title">Welcome to Your Health Dashboard!</div>
              <div className="alert-message">
                Start tracking your health by logging meals, biometric data, and using our AI food recognition feature.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">🍽️ Meals</span>
              <span className="card-subtitle">Total Logged</span>
            </div>
          </div>
          <div className="stat-value">{stats.mealsLogged}</div>
          <div className="stat-label">meals tracked in your health journey</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">📊 BMI Score</span>
              <span className="card-subtitle">Body Mass Index</span>
            </div>
          </div>
          <div className="stat-value" style={{
            color: !user?.currentBMI ? '#666' :
                   user.bmiCategory === 'healthy' ? '#00ff88' :
                   user.bmiCategory === 'underweight' ? '#00d4ff' :
                   user.bmiCategory === 'overweight' ? '#ffaa00' : '#ff3366'
          }}>
            {user?.currentBMI ? user.currentBMI.toFixed(1) : '--'}
          </div>
          <div className="stat-label">
            {user?.currentBMI ? (
              <>
                {user.bmiCategory?.replace('_', ' ').charAt(0).toUpperCase() + user.bmiCategory?.slice(1)} • 
                {user.biometricDataEstimated ? ' 📝 Estimated' : ' ✓ Confirmed'}
              </>
            ) : 'Complete profile to see BMI'}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">📊 Glucose</span>
              <span className="card-subtitle">Average Level</span>
            </div>
          </div>
          <div className="stat-value">{stats.averageGlucose}</div>
          <div className="stat-label">
            {stats.averageGlucose !== '--' ? 'mg/dL • Monitoring active' : 'No data yet'}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">🩺 Blood Pressure</span>
              <span className="card-subtitle">Average Reading</span>
            </div>
          </div>
          <div className="stat-value">{stats.averageBP}</div>
          <div className="stat-label">
            {stats.averageBP !== '--' ? 'mmHg • Systolic/Diastolic' : 'No data yet'}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">📈 Biometrics</span>
              <span className="card-subtitle">Data Points</span>
            </div>
          </div>
          <div className="stat-value">{stats.biometricsLogged}</div>
          <div className="stat-label">readings recorded and analyzed</div>
        </div>
      </div>

      {/* Activity Section */}
      <div className="dashboard-grid dashboard-grid-extended" style={{ marginTop: '2rem' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">🍽️ Recent Meals</span>
              <span className="card-subtitle">Last 5 Entries</span>
            </div>
          </div>
          {recentMeals.length > 0 ? (
            <ul className="list">
              {recentMeals.slice(0, 5).map((meal, index) => (
                <li key={meal._id || index} className="list-item">
                  <div className="list-content">
                    <div className="list-title">
                      {meal.mealType ? meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1) : 'Meal'}
                      {meal.description && ` • ${meal.description.substring(0, 25)}${meal.description.length > 25 ? '...' : ''}`}
                    </div>
                    <div className="list-subtitle">
                      {new Date(meal.timestamp || meal.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  <div className="list-value" style={{ fontSize: '1rem', color: '#00d4ff' }}>
                    {meal.calories || meal.totalNutrition?.calories || meal.totalNutrition?.calories_kcal || 0}
                    <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>cal</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
              <p className="stat-label">No meals logged yet</p>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                Start by logging your meals to get personalized recommendations!
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">🔔 Recent Alerts</span>
              <span className="card-subtitle">Health Notifications</span>
            </div>
          </div>
          {recentAlerts.length > 0 ? (
            <ul className="list">
              {recentAlerts.slice(0, 5).map((alert, index) => (
                <li 
                  key={alert._id || index} 
                  className={`list-item ${getAlertSeverityClass(alert.severity)}`} 
                  style={{ 
                    borderLeft: '3px solid currentColor',
                    paddingLeft: '1.25rem',
                    borderBottom: 'none',
                    marginBottom: '0.75rem',
                    background: 'transparent',
                    paddingRight: '0',
                    cursor: 'pointer'
                  }}
                  onClick={() => viewAlertDetails(alert._id)}
                >
                  <div className="list-content">
                    <div className="list-title" style={{ marginBottom: '0.25rem' }}>
                      {alert.alertType ? alert.alertType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Alert'}
                    </div>
                    <div className="list-subtitle">
                      {alert.message || alert.title || 'Health notification'}
                    </div>
                  </div>
                  <span className="badge-modern" style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                    {(alert.severity || 'info').toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🎉</p>
              <p className="stat-label">All systems nominal!</p>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                No health alerts. Keep up the great work!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Health Tips */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <div>
            <span className="card-title">💡 Health Tips</span>
            <span className="card-subtitle">Wellness Recommendations</span>
          </div>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginTop: '1rem'
        }}>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(0, 255, 136, 0.08)',
            borderLeft: '3px solid #00ff88',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#00ff88', marginBottom: '0.5rem' }}>🥗 Balanced Nutrition</h4>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
              Include protein, fiber, and healthy fats in each meal for better glucose control.
            </p>
          </div>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(0, 212, 255, 0.08)',
            borderLeft: '3px solid #00d4ff',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#00d4ff', marginBottom: '0.5rem' }}>💧 Hydration</h4>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
              Drink 8-10 glasses of water daily to maintain optimal hydration and metabolic function.
            </p>
          </div>
          <div style={{ 
            padding: '1.5rem',
            background: 'rgba(168, 85, 255, 0.08)',
            borderLeft: '3px solid #a855ff',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#a855ff', marginBottom: '0.5rem' }}>🏃 Regular Activity</h4>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
              Aim for 30 minutes of moderate activity daily to improve cardiovascular health.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Details Modal */}
      {showAlertModal && (
        <div 
          className="modal-overlay" 
          onClick={closeAlertModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            {loadingAlertDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <p>Loading alert details...</p>
              </div>
            ) : selectedAlert ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🔔 Alert Details</h2>
                  <button 
                    onClick={closeAlertModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      padding: '0',
                      color: '#666'
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span className={`biometric-badge ${getSeverityBadgeClass(selectedAlert.severity)}`}>
                    {selectedAlert.severity.toUpperCase()}
                  </span>
                </div>

                <div className="card" style={{ marginBottom: '1rem', backgroundColor: '#f8f9fa' }}>
                  <h3 style={{ marginTop: 0 }}>{selectedAlert.title || selectedAlert.alertType}</h3>
                  <p><strong>Type:</strong> {selectedAlert.alertType}</p>
                  <p><strong>Message:</strong> {selectedAlert.message}</p>
                  {selectedAlert.reason && (
                    <p><strong>Reason:</strong> {selectedAlert.reason}</p>
                  )}
                  {selectedAlert.detailedAnalysis && (
                    <p><strong>Analysis:</strong> {selectedAlert.detailedAnalysis}</p>
                  )}
                  <p><strong>Triggered By:</strong> {selectedAlert.triggeredBy}</p>
                  <p><strong>Created:</strong> {new Date(selectedAlert.createdAt).toLocaleString()}</p>
                  {selectedAlert.isRead && (
                    <p><strong>Read At:</strong> {new Date(selectedAlert.readAt).toLocaleString()}</p>
                  )}
                </div>

                {selectedAlert.additionalContext && (
                  <div className="card" style={{ marginBottom: '1rem', backgroundColor: '#e7f3ff' }}>
                    <h4 style={{ marginTop: 0 }}>📊 Additional Context</h4>
                    <p><strong>Measured Value:</strong> {selectedAlert.additionalContext.measuredValue} {selectedAlert.additionalContext.unit}</p>
                    <p><strong>Threshold:</strong> {selectedAlert.additionalContext.thresholdValue} {selectedAlert.additionalContext.unit}</p>
                    {selectedAlert.additionalContext.riskAssessment && (
                      <p><strong>Risk Assessment:</strong> {selectedAlert.additionalContext.riskAssessment}</p>
                    )}
                  </div>
                )}

                {selectedAlert.suggestedAction && (
                  <div className="card" style={{ marginBottom: '1rem', backgroundColor: '#d4edda', color: '#155724' }}>
                    <h4 style={{ marginTop: 0 }}>💡 Suggested Action</h4>
                    {typeof selectedAlert.suggestedAction === 'string' ? (
                      <p>{selectedAlert.suggestedAction}</p>
                    ) : (
                      <>
                        {selectedAlert.suggestedAction.action && <p><strong>Action:</strong> {selectedAlert.suggestedAction.action}</p>}
                        {selectedAlert.suggestedAction.parameter && <p><strong>Parameter:</strong> {selectedAlert.suggestedAction.parameter}</p>}
                        {selectedAlert.suggestedAction.currentValue !== undefined && (
                          <p><strong>Current Value:</strong> {selectedAlert.suggestedAction.currentValue}</p>
                        )}
                        {selectedAlert.suggestedAction.recommendedValue !== undefined && (
                          <p><strong>Recommended Value:</strong> {selectedAlert.suggestedAction.recommendedValue}</p>
                        )}
                        {selectedAlert.suggestedAction.expectedOutcome && (
                          <p><strong>Expected Outcome:</strong> {selectedAlert.suggestedAction.expectedOutcome}</p>
                        )}
                        {selectedAlert.suggestedAction.timeframe && (
                          <p><strong>Timeframe:</strong> {selectedAlert.suggestedAction.timeframe}</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {selectedAlert.alternativeSuggestions && selectedAlert.alternativeSuggestions.length > 0 && (
                  <div className="card" style={{ marginBottom: '1rem', backgroundColor: '#fff3cd', color: '#856404' }}>
                    <h4 style={{ marginTop: 0 }}>🔄 Alternative Suggestions</h4>
                    {selectedAlert.alternativeSuggestions.map((alt, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem' }}>
                        <p><strong>{alt.action}:</strong> {alt.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={closeAlertModal}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
