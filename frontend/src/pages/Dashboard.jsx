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
                <li key={alert._id || index} className={`list-item ${getAlertSeverityClass(alert.severity)}`} 
                    style={{ 
                      borderLeft: '3px solid currentColor',
                      paddingLeft: '1.25rem',
                      borderBottom: 'none',
                      marginBottom: '0.75rem',
                      background: 'transparent',
                      paddingRight: '0'
                    }}>
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
    </div>
  );
}

export default Dashboard;
