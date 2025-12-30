import React, { useState } from 'react';

// Minimal test component to verify state management works
const StateTest = () => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const testFetch = async () => {
    setLoading(true);
    try {
      // Simulate backend response
      const mockData = {
        success: true,
        method: "SHAP (Gradient-based)",
        top_prediction: "Vada",
        confidence: 0.9999,
        visualization: "iVBORw0KGgoAAAA...", // fake base64
        explanation: "Test explanation"
      };

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Setting state with:', mockData);
      setExplanation(mockData);
      setShowExplanation(true);
      console.log('State set!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>State Management Test</h2>
      <button onClick={testFetch} disabled={loading}>
        {loading ? 'Testing...' : 'Test State Update'}
      </button>
      
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0' }}>
        <p><strong>showExplanation:</strong> {String(showExplanation)}</p>
        <p><strong>explanation exists:</strong> {String(!!explanation)}</p>
        <p><strong>explanation?.method:</strong> {explanation?.method || 'null'}</p>
      </div>

      {showExplanation && explanation && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#e3f2fd',
          border: '2px solid #2196F3',
          borderRadius: '8px'
        }}>
          <h3>✅ Explanation Appears Here!</h3>
          <p><strong>Method:</strong> {explanation.method}</p>
          <p><strong>Prediction:</strong> {explanation.top_prediction}</p>
          <p><strong>Explanation:</strong> {explanation.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default StateTest;
