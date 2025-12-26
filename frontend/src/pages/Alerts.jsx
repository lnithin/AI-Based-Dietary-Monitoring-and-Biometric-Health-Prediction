import React, { useState, useEffect } from 'react';

function Alerts({ token, user }) {
  const [alerts, setAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, [token, filterSeverity]);

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');

    try {
      const query = filterSeverity !== 'all' ? `?severity=${filterSeverity}` : '';
      const res = await fetch(`http://localhost:8000/api/alerts${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId) => {
    console.log('🔔 Mark as read clicked! Alert ID:', alertId);
    try {
      const response = await fetch(`http://localhost:8000/api/alerts/${alertId}/read`, {
        method: 'PATCH', // Changed from PUT to PATCH
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        alert('✅ Alert marked as read!');
        fetchAlerts();
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`❌ Error: ${errorData.error || 'Failed to mark as read'}`);
      }
    } catch (err) {
      console.error('Error marking alert as read:', err);
      alert('❌ Failed to mark alert as read. Please try again.');
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

  return (
    <div>
      <h1>🔔 Health Alerts</h1>
      <p className="page-subtitle">Monitor your health warnings and guidelines</p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Filter by Severity</label>
          <select
            className="form-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">📋 All Alerts</option>
            <option value="info">ℹ️ Info</option>
            <option value="warning">⚠️ Warning</option>
            <option value="critical">🚨 Critical</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading alerts...</p>
        </div>
      ) : alerts.length > 0 ? (
        <ul className="list" style={{ listStyle: 'none' }}>
          {alerts.map((alert) => (
            <div key={alert._id} className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">{alert.alertType}</div>
                  <div className="card-subtitle">{alert.message}</div>
                </div>
                <span className={`biometric-badge ${getSeverityBadgeClass(alert.severity)}`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>

              {alert.additionalContext && (
                <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', marginTop: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>Measured Value:</strong> {alert.additionalContext.measuredValue} {alert.additionalContext.unit}
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                    <strong>Threshold:</strong> {alert.additionalContext.thresholdValue} {alert.additionalContext.unit}
                  </p>
                </div>
              )}

              {alert.suggestedAction && (
                <div style={{ padding: '1rem', backgroundColor: '#d4edda', borderRadius: '4px', marginTop: '1rem', color: '#155724' }}>
                  <strong>💡 Suggested Action:</strong> {alert.suggestedAction}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => markAsRead(alert._id)}
                >
                  ✓ Mark as Read
                </button>
                <span className="stat-label">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </ul>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>  
          <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>✅ No alerts!</p>
          <p style={{ color: '#666' }}>You're doing great! Keep up with your health goals.</p>
        </div>
      )}
    </div>
  );
}

export default Alerts;
