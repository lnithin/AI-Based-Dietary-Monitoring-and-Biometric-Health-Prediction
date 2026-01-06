import React, { useState, useEffect } from 'react';

function Alerts({ token, user }) {
  const [alerts, setAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  const viewAlertDetails = async (alertId) => {
    setLoadingDetails(true);
    setShowModal(true);
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
      setShowModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAlert(null);
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
            <div 
              key={alert._id} 
              className="card" 
              style={{ marginBottom: '1rem', cursor: 'pointer' }}
              onClick={() => viewAlertDetails(alert._id)}
            >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(alert._id);
                  }}
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

      {/* Alert Details Modal */}
      {showModal && (
        <div 
          className="modal-overlay" 
          onClick={closeModal}
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
            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <p>Loading alert details...</p>
              </div>
            ) : selectedAlert ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🔔 Alert Details</h2>
                  <button 
                    onClick={closeModal}
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
                  {!selectedAlert.isRead && (
                    <button
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(selectedAlert._id);
                        closeModal();
                      }}
                    >
                      ✓ Mark as Read
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={closeModal}
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

export default Alerts;
