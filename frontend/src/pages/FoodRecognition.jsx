import React, { useState, useRef } from 'react';
import "./Auth.css";

const FoodRecognition = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedExplainer, setSelectedExplainer] = useState('both'); // 'lime', 'shap', or 'both'
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      setError('Please select an image');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/food-recognition/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Food recognition failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async (method) => {
    if (!image) return;

    setExplainLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const endpoint = method === 'both' 
        ? 'http://localhost:5002/explain/both'
        : `http://localhost:5002/explain/${method}`;

      console.log(`Sending request to: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Full response received:', data);

      // Check if response indicates success
      if (data && (data.success || data.method || (data.lime && data.shap))) {
        console.log('Success detected, setting state...');
        setExplanation(data);
        setShowExplanation(true);
        console.log('State set successfully');
      } else {
        console.error('Unexpected response format:', data);
        setError('Failed to generate explanation: ' + (data?.error || 'Unexpected response format'));
      }
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error: ' + err.message);
    } finally {
      setExplainLoading(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setExplanation(null);
    setShowExplanation(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🍽️ Food Image Recognition</h2>
        <p style={styles.subtitle}>Upload an image of South Indian food to get nutrition details</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Image Upload Area */}
          <div 
            style={styles.uploadArea}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" style={styles.previewImage} />
            ) : (
              <div style={styles.uploadPlaceholder}>
                <div style={styles.uploadIcon}>📸</div>
                <p>Click to upload image</p>
                <p style={styles.uploadHint}>or drag and drop</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={styles.hiddenInput}
          />

          {/* Buttons */}
          <div style={styles.buttonGroup}>
            <button
              type="submit"
              disabled={!image || loading}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                opacity: !image || loading ? 0.5 : 1,
                cursor: !image || loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Analyzing...' : 'Recognize Food'}
            </button>
            {image && (
              <button
                type="button"
                onClick={handleClear}
                style={{...styles.button, ...styles.secondaryButton}}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={styles.resultBox}>
            <h3 style={styles.resultTitle}>✅ Food Recognized</h3>
            
            <div style={styles.foodInfo}>
              <p style={styles.foodName}>{result.recognized}</p>
              <p style={styles.confidence}>Confidence: {(result.confidence * 100).toFixed(0)}%</p>
              <p style={styles.category}>Category: {result.category}</p>
              <p style={styles.veg}>
                {result.isVegetarian ? '🌱 Vegetarian' : '🍗 Non-Vegetarian'}
              </p>
            </div>

            <div style={styles.servingInfo}>
              <h4>Serving Size</h4>
              <p>{result.servingSize.amount} {result.servingSize.unit} ({result.servingSize.approxGram}g)</p>
            </div>

            <div style={styles.nutritionGrid}>
              <h4 style={{gridColumn: '1 / -1'}}>Nutrition per Serving</h4>
              
              <div style={styles.nutritionItem}>
                <div style={styles.nutritionValue}>{result.nutrition.calories_kcal}</div>
                <div style={styles.nutritionLabel}>kcal</div>
              </div>

              <div style={styles.nutritionItem}>
                <div style={styles.nutritionValue}>{result.nutrition.protein_g}g</div>
                <div style={styles.nutritionLabel}>Protein</div>
              </div>

              <div style={styles.nutritionItem}>
                <div style={styles.nutritionValue}>{result.nutrition.carbs_g}g</div>
                <div style={styles.nutritionLabel}>Carbs</div>
              </div>

              <div style={styles.nutritionItem}>
                <div style={styles.nutritionValue}>{result.nutrition.fat_g}g</div>
                <div style={styles.nutritionLabel}>Fat</div>
              </div>

              <div style={styles.nutritionItem}>
                <div style={styles.nutritionValue}>{result.nutrition.fiber_g}g</div>
                <div style={styles.nutritionLabel}>Fiber</div>
              </div>

              {result.nutrition.sodium_mg && (
                <div style={styles.nutritionItem}>
                  <div style={styles.nutritionValue}>{result.nutrition.sodium_mg}</div>
                  <div style={styles.nutritionLabel}>Na (mg)</div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleClear}
              style={{...styles.button, ...styles.primaryButton, width: '100%', marginTop: '20px'}}
            >
              Recognize Another Food
            </button>

            {/* Explainability Buttons */}
            <div style={styles.explainSection}>
              <h4 style={styles.explainTitle}>🔍 Explain This Prediction (AI Explainability)</h4>
              <div style={styles.explainButtons}>
                <button
                  onClick={() => handleExplain('lime')}
                  disabled={explainLoading}
                  style={{...styles.button, ...styles.explainButton, backgroundColor: '#10b981'}}
                >
                  {explainLoading ? '⏳' : '🔬'} LIME Explanation
                </button>
                <button
                  onClick={() => handleExplain('shap')}
                  disabled={explainLoading}
                  style={{...styles.button, ...styles.explainButton, backgroundColor: '#3b82f6'}}
                >
                  {explainLoading ? '⏳' : '📊'} SHAP Heatmap
                </button>
                <button
                  onClick={() => handleExplain('both')}
                  disabled={explainLoading}
                  style={{...styles.button, ...styles.explainButton, backgroundColor: '#8b5cf6'}}
                >
                  {explainLoading ? '⏳' : '🎯'} Both Methods
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Explanation Results */}
        {showExplanation && explanation && (
          <div style={styles.explanationBox}>
            <h3 style={styles.resultTitle}>🧠 AI Explainability Results</h3>
            
            {explanation.method && (
              <div style={styles.explanationSection}>
                <h4 style={styles.methodTitle}>Method: {explanation.method}</h4>
                <p style={styles.explanationText}>{explanation.explanation}</p>
                
                <div style={styles.predictionDetails}>
                  <p><strong>Prediction:</strong> {explanation.top_prediction}</p>
                  <p><strong>Confidence:</strong> {(explanation.confidence * 100).toFixed(1)}%</p>
                  {explanation.most_important_region && (
                    <p><strong>Key Region:</strong> {explanation.most_important_region.replace('_', ' ')}</p>
                  )}
                </div>

                {explanation.region_importance && (
                  <div style={{...styles.predictionDetails, marginTop: '10px'}}>
                    <h5 style={{margin: '0 0 10px 0', color: '#4f46e5'}}>📍 Region Importance</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px' }}>
                      {Object.entries(explanation.region_importance).map(([region, score]) => (
                        <div key={region} style={{
                          padding: '6px',
                          background: region === explanation.most_important_region ? '#dbeafe' : '#f9fafb',
                          borderRadius: '4px',
                          border: region === explanation.most_important_region ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <strong>{region.replace(/_/g, ' ')}:</strong> {(score * 100).toFixed(1)}%
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {explanation.visualization && (
                  <div style={styles.visualizationContainer}>
                    <img 
                      src={`data:image/png;base64,${explanation.visualization}`} 
                      alt="Explanation Visualization"
                      style={styles.visualizationImage}
                    />
                  </div>
                )}
              </div>
            )}

            {explanation.lime && explanation.shap && (
              <div>
                <h4 style={styles.methodTitle}>Combined Analysis</h4>
                <p style={styles.explanationText}>{explanation.summary?.interpretation}</p>
                
                <div style={styles.comparisonGrid}>
                  <div style={styles.comparisonItem}>
                    <h5>LIME Explanation</h5>
                    <p>{explanation.lime.explanation}</p>
                    {explanation.lime.visualization && (
                      <img 
                        src={`data:image/png;base64,${explanation.lime.visualization}`} 
                        alt="LIME Visualization"
                        style={styles.visualizationImage}
                      />
                    )}
                  </div>
                  
                  <div style={styles.comparisonItem}>
                    <h5>SHAP Heatmap</h5>
                    <p>{explanation.shap.explanation}</p>
                    {explanation.shap.most_important_region && (
                      <div style={{background: '#f0f9ff', padding: '8px', borderRadius: '4px', marginBottom: '10px', fontSize: '13px'}}>
                        <strong>Most Important:</strong> {explanation.shap.most_important_region.replace(/_/g, ' ')}
                      </div>
                    )}
                    {explanation.shap.visualization && (
                      <img 
                        src={`data:image/png;base64,${explanation.shap.visualization}`} 
                        alt="SHAP Visualization"
                        style={styles.visualizationImage}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowExplanation(false)}
              style={{...styles.button, ...styles.secondaryButton, width: '100%', marginTop: '20px'}}
            >
              Close Explanation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333'
  },
  subtitle: {
    color: '#666',
    marginBottom: '30px',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  uploadArea: {
    border: '2px dashed #4CAF50',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#f9f9f9',
    transition: 'all 0.3s ease'
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '8px',
    objectFit: 'contain'
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    color: '#666'
  },
  uploadIcon: {
    fontSize: '48px'
  },
  uploadHint: {
    fontSize: '12px',
    color: '#999',
    margin: '0'
  },
  hiddenInput: {
    display: 'none'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px'
  },
  button: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flex: 1
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    color: 'white'
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd'
  },
  errorBox: {
    backgroundColor: '#ffebee',
    border: '1px solid #ef5350',
    borderRadius: '6px',
    padding: '15px',
    marginTop: '20px'
  },
  errorText: {
    color: '#c62828',
    margin: 0
  },
  resultBox: {
    backgroundColor: '#e8f5e9',
    border: '1px solid #4CAF50',
    borderRadius: '6px',
    padding: '20px',
    marginTop: '20px'
  },
  resultTitle: {
    color: '#2e7d32',
    marginTop: 0,
    marginBottom: '15px'
  },
  foodInfo: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  foodName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0'
  },
  confidence: {
    fontSize: '12px',
    color: '#666',
    margin: '4px 0'
  },
  category: {
    fontSize: '12px',
    color: '#666',
    margin: '4px 0'
  },
  veg: {
    fontSize: '12px',
    color: '#2e7d32',
    margin: '4px 0',
    fontWeight: 'bold'
  },
  servingInfo: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  nutritionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '6px'
  },
  nutritionItem: {
    textAlign: 'center'
  },
  nutritionValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: '5px'
  },
  nutritionLabel: {
    fontSize: '12px',
    color: '#666'
  },
  explainSection: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '2px dashed #6366f1'
  },
  explainTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    color: '#4338ca',
    textAlign: 'center'
  },
  explainButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  explainButton: {
    flex: '1',
    minWidth: '140px',
    color: 'white',
    fontWeight: '600',
    transition: 'transform 0.2s, opacity 0.2s'
  },
  explanationBox: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginTop: '20px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '2px solid #8b5cf6'
  },
  explanationSection: {
    marginBottom: '25px'
  },
  methodTitle: {
    color: '#6366f1',
    margin: '0 0 10px 0',
    fontSize: '16px'
  },
  explanationText: {
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '15px'
  },
  predictionDetails: {
    backgroundColor: '#f3f4f6',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  visualizationContainer: {
    marginTop: '15px',
    textAlign: 'center'
  },
  visualizationImage: {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  comparisonItem: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  }
};

export default FoodRecognition;
