import React, { useState, useEffect } from 'react';

function Recommendations({ token, user }) {
  const [recommendations, setRecommendations] = useState([]);
  const [mealType, setMealType] = useState('lunch');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, [token, mealType]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      // Use the main backend API with meal type parameter
      const res = await fetch(
        `http://localhost:8000/api/recommendations/suggestions?meal_type=${mealType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch recommendations: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Handle both suggestions and recommendations from the enhanced engine
      const combinedSuggestions = [
        ...(data.recommendations || []).map(rec => ({
          ...rec,
          type: 'recommendation',
          name: rec.title || rec.name,
          description: rec.description || rec.reason
        })),
        ...(data.suggestions || []).slice(0, 3).map(sugg => ({
          ...sugg,
          type: 'suggestion',
          priority: 'medium'
        }))
      ];

      setRecommendations(combinedSuggestions);
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setError(err.message || 'Failed to load recommendations. Please check your biometric data.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (rec) => {
    console.log('🔵 Accept clicked! Recommendation:', rec);
    try {
      // If recommendation has _id, use the accept endpoint
      if (rec._id) {
        console.log('Using accept endpoint with ID:', rec._id);
        const response = await fetch(
          `http://localhost:8000/api/recommendations/${rec._id}/accept`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userFeedback: 'liked' })
          }
        );

        if (response.ok) {
          alert('✅ Thank you for your feedback!');
          fetchRecommendations();
        }
      } else {
        // For suggestions without _id, use feedback endpoint
        const response = await fetch(
          'http://localhost:8000/api/recommendations/feedback',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              foodName: rec.name || rec.title,
              mealType: mealType,
              action: 'accepted',
              feedback: 'User liked the suggestion'
            })
          }
        );

        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);

        if (response.ok) {
          alert('✅ Thank you for your feedback!');
          fetchRecommendations();
        } else {
          alert(`❌ Error: ${responseData.message || responseData.error || 'Failed to submit feedback'}`);
        }
      }
    } catch (err) {
      console.error('Error accepting recommendation:', err);
      alert('❌ Failed to submit feedback. Please try again.');
    }
  };

  const handleReject = async (rec) => {
    console.log('🔴 Reject clicked! Recommendation:', rec);
    try {
      // If recommendation has _id, use the reject endpoint
      if (rec._id) {
        console.log('Using reject endpoint with ID:', rec._id);
        const response = await fetch(
          `http://localhost:8000/api/recommendations/${rec._id}/reject`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userFeedback: 'disliked' })
          }
        );

        if (response.ok) {
          alert('✅ Feedback recorded!');
          fetchRecommendations();
        }
      } else {
        // For suggestions without _id, use feedback endpoint
        console.log('🔴 Using feedback endpoint for rejection. Food name:', rec.name || rec.title, 'Meal type:', mealType);
        const response = await fetch(
          'http://localhost:8000/api/recommendations/feedback',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              foodName: rec.name || rec.title,
              mealType: mealType,
              action: 'rejected',
              feedback: 'User skipped the suggestion'
            })
          }
        );

        console.log('Reject response status:', response.status);
        const responseData = await response.json();
        console.log('Reject response data:', responseData);

        if (response.ok) {
          alert('✅ Feedback recorded!');
          fetchRecommendations();
        } else {
          alert(`❌ Error: ${responseData.message || responseData.error || 'Failed to submit feedback'}`);
        }
      }
    } catch (err) {
      console.error('Error rejecting recommendation:', err);
      alert('❌ Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div>
      <h1>🎯 Personalized Recommendations</h1>
      <p className="page-subtitle">Get AI-powered meal suggestions based on your health profile</p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Select Meal Type</label>
          <select
            className="form-select"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            <option value="breakfast">🌅 Breakfast</option>
            <option value="lunch">☀️ Lunch</option>
            <option value="dinner">🌙 Dinner</option>
            <option value="snack">🍿 Snack</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading personalized recommendations...</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
          {recommendations.map((rec, idx) => (
            <div key={idx} className="card" style={{
              borderLeft: rec.type === 'recommendation' ? '4px solid #e74c3c' : '4px solid #3498db',
              paddingLeft: '1.2rem',
              position: 'relative',
              zIndex: 5
            }}>
              <div className="card-header" style={{ position: 'relative', zIndex: 15 }}>
                <div>
                  <div className="card-title" style={{ textShadow: '0 2px 8px rgba(0, 212, 255, 0.4)' }}>
                    {rec.type === 'recommendation' ? '⚡' : '🍽️'} {rec.name || rec.title || 'Meal Recommendation'}
                  </div>
                  <div className="card-subtitle" style={{ color: 'rgba(0, 212, 255, 0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{rec.description || rec.reason}</div>
                </div>
                <span className={`biometric-badge ${
                  rec.priority === 'critical' ? 'badge-danger' : 
                  rec.priority === 'high' ? 'badge-warning' : 
                  'badge-normal'
                }`}>
                  {(rec.priority || 'medium').toUpperCase()}
                </span>
              </div>

              {/* Health Alert Information */}
              {rec.type === 'recommendation' && rec.additionalContext && (
                <div style={{
                  padding: '1.2rem',
                  background: 'rgba(254, 245, 231, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px',
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                  color: '#856404',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  position: 'relative',
                  zIndex: 10
                }}>
                  <strong style={{ color: '#856404', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>📊 Measured Value:</strong> {rec.additionalContext.measuredValue} {rec.additionalContext.unit}
                  <br />
                  <strong style={{ color: '#856404', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>⚠️ Threshold:</strong> {rec.additionalContext.thresholdValue} {rec.additionalContext.unit}
                </div>
              )}

              {/* Suggested Actions for Health Alerts */}
              {rec.type === 'recommendation' && rec.suggestedAction && (
                <div style={{
                  padding: '1.2rem',
                  background: 'rgba(213, 244, 230, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px',
                  marginTop: '1rem',
                  color: '#155724',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(40, 167, 69, 0.3)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  position: 'relative',
                  zIndex: 10
                }}>
                  <strong style={{ color: '#155724', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>💡 Suggested Action:</strong> <span style={{ color: '#155724', opacity: 0.95 }}>{rec.suggestedAction}</span>
                </div>
              )}

              {/* Meal Nutritional Info */}
              {rec.type === 'suggestion' && rec.nutrition && (
                <div className="nutrition-info">
                  <div className="nutrition-item">
                    <div className="nutrition-value">{rec.nutrition.calories_kcal || rec.calories || 'N/A'}</div>
                    <div className="nutrition-label">Calories</div>
                  </div>
                  <div className="nutrition-item">
                    <div className="nutrition-value">{rec.nutrition.protein_g || rec.protein_g || 'N/A'}g</div>
                    <div className="nutrition-label">Protein</div>
                  </div>
                  <div className="nutrition-item">
                    <div className="nutrition-value">{rec.nutrition.carbs_g || rec.carbs_g || 'N/A'}g</div>
                    <div className="nutrition-label">Carbs</div>
                  </div>
                  <div className="nutrition-item">
                    <div className="nutrition-value">{rec.nutrition.fat_g || rec.fat_g || 'N/A'}g</div>
                    <div className="nutrition-label">Fat</div>
                  </div>
                </div>
              )}

              {/* Why This Recommendation */}
              {rec.suggestions && rec.suggestions.length > 0 && (
                <div style={{ 
                  padding: '1.2rem', 
                  background: 'rgba(248, 249, 250, 0.95)', 
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px', 
                  marginTop: '1rem',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  position: 'relative',
                  zIndex: 10
                }}>
                  <p style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontWeight: 'bold', 
                    fontSize: '0.95rem',
                    color: '#2c3e50',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    💭 Why this recommendation?
                  </p>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '1.5rem', 
                    fontSize: '0.88rem',
                    color: '#495057',
                    lineHeight: '1.6'
                  }}>
                    {rec.suggestions.slice(0, 2).map((sugg, i) => (
                      <li key={i} style={{ marginBottom: '0.5rem', color: '#495057', opacity: 0.95 }}>{sugg.reason || sugg.description}</li>
                    ))}
                  </ul>
                </div>
              )}

              {rec.type === 'suggestion' && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => handleAccept(rec)}
                  >
                    👍 Accept
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleReject(rec)}
                  >
                    👎 Skip
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.95)', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>😊 No specific recommendations at this time</p>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Keep logging your meals and biometrics for personalized recommendations!
          </p>
          <button className="btn btn-primary" onClick={fetchRecommendations}>
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Recommendation Categories */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">💡 How Recommendations Work</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            padding: '1.2rem',
            borderRadius: '8px',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            position: 'relative',
            zIndex: 10
          }}>
            <h4 style={{ color: 'rgba(255, 255, 255, 0.95)', textShadow: '0 2px 4px rgba(0,0,0,0.3)', marginBottom: '0.8rem' }}>🔍 Based on Your Profile</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.6', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              Recommendations consider your health conditions, dietary preferences, and nutrient targets.
            </p>
          </div>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            padding: '1.2rem',
            borderRadius: '8px',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            position: 'relative',
            zIndex: 10
          }}>
            <h4 style={{ color: 'rgba(255, 255, 255, 0.95)', textShadow: '0 2px 4px rgba(0,0,0,0.3)', marginBottom: '0.8rem' }}>📊 Data-Driven</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.6', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              AI analyzes your meal history and biometric trends to suggest meals that work for you.
            </p>
          </div>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            padding: '1.2rem',
            borderRadius: '8px',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            position: 'relative',
            zIndex: 10
          }}>
            <h4 style={{ color: 'rgba(255, 255, 255, 0.95)', textShadow: '0 2px 4px rgba(0,0,0,0.3)', marginBottom: '0.8rem' }}>🎯 Personalized</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.6', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              Your feedback helps the system learn and improve recommendations over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Recommendations;
