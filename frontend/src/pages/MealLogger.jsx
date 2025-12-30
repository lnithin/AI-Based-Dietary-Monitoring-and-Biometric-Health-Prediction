import React, { useState } from 'react';

function MealLogger({ token, user }) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' or 'image'
  const [mealData, setMealData] = useState({
    mealType: 'breakfast',
    description: '',
    imageUrl: '',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [extractedIngredients, setExtractedIngredients] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedExplainer, setSelectedExplainer] = useState('both'); // 'lime', 'shap', or 'both'

  const handleChange = (e) => {
    setMealData({
      ...mealData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
      setSuccess('');
    }
  };

  const handleImageRecognition = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setRecognizing(true);
    setError('');
    setSuccess('');
    setExtractedIngredients(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result;

          const response = await fetch('http://localhost:8000/api/food-recognition/recognize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image: base64Image })
          });

          if (!response.ok) {
            throw new Error(`Recognition failed (${response.status})`);
          }

          const data = await response.json();
          
          // Set extracted ingredients from CV recognition
          setExtractedIngredients({
            ingredients: [{
              name: data.foodName,
              calories: data.nutrition?.calories_kcal || 0,
              protein_g: data.nutrition?.protein_g || 0,
              carbs_g: data.nutrition?.carbs_g || 0,
              fat_g: data.nutrition?.fat_g || 0,
              fiber_g: data.nutrition?.fiber_g || 0,
              sodium_mg: data.nutrition?.sodium_mg || 0,
              confidence: data.confidence || 0.9
            }],
            totalNutrition: {
              calories: data.nutrition?.calories_kcal || 0,
              protein_g: data.nutrition?.protein_g || 0,
              carbs_g: data.nutrition?.carbs_g || 0,
              fat_g: data.nutrition?.fat_g || 0,
              fiber_g: data.nutrition?.fiber_g || 0,
              sodium_mg: data.nutrition?.sodium_mg || 0
            },
            confidence: data.confidence || 0.9,
            processingTime_ms: 0
          });

          setMealData({
            ...mealData,
            description: data.foodName
          });

          setSuccess(`✅ Recognized: ${data.foodName} (${Math.round(data.confidence * 100)}% confidence)`);
        } catch (err) {
          console.error('Recognition error:', err);
          setError(err.message || 'Failed to recognize food image');
        } finally {
          setRecognizing(false);
        }
      };
      reader.readAsDataURL(selectedImage);
    } catch (err) {
      console.error('Image processing error:', err);
      setError(err.message || 'Failed to process image');
      setRecognizing(false);
    }
  };

  const handleExplain = async (method) => {
    if (!selectedImage) {
      setError('Please upload an image first');
      return;
    }

    setExplainLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const endpoint = method === 'both' 
        ? 'http://localhost:5002/explain/both'
        : `http://localhost:5002/explain/${method}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if response indicates success
      if (data && (data.success || data.method || (data.lime && data.shap))) {
        setExplanation(data);
        setShowExplanation(true);
        setSuccess(`✅ ${method.toUpperCase()} explanation generated!`);
      } else {
        setError('Failed to generate explanation: ' + (data?.error || 'Unexpected response format'));
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setExplainLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!mealData.description.trim()) {
      setError('Please enter a meal description');
      return;
    }

    setExtracting(true);
    setError('');
    setSuccess('');

    try {
      // Use the extract endpoint (doesn't save meal)
      const response = await fetch('http://localhost:8000/api/meals/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: mealData.description,
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to extract (${response.status})`);
      }

      const data = await response.json();

      // If food was matched, show biometric data
      if (data.success && data.foodMatched) {
        setExtractedIngredients({
          ingredients: data.ingredients || [{
            name: data.foodMatched.foodName,
            calories: data.foodMatched.nutrition.calories_kcal || 0,
            protein_g: data.foodMatched.nutrition.protein_g || 0,
            carbs_g: data.foodMatched.nutrition.carbs_g || 0,
            fat_g: data.foodMatched.nutrition.fat_g || 0,
            fiber_g: data.foodMatched.nutrition.fiber_g || 0,
            sodium_mg: data.foodMatched.nutrition.sodium_mg || 0,
            confidence: 0.9
          }],
          totalNutrition: data.totalNutrition || {
            calories: data.foodMatched.nutrition.calories_kcal || 0,
            protein_g: data.foodMatched.nutrition.protein_g || 0,
            carbs_g: data.foodMatched.nutrition.carbs_g || 0,
            fat_g: data.foodMatched.nutrition.fat_g || 0,
            fiber_g: data.foodMatched.nutrition.fiber_g || 0,
            sodium_mg: data.foodMatched.nutrition.sodium_mg || 0
          },
          confidence: data.confidence || 0.9,
          processingTime_ms: data.processingTime_ms || 0
        });
        setSuccess(`✅ Biometric data extracted for ${data.foodMatched.foodName}!`);
      } else {
        // Try NLP service as fallback
        try {
          const nlpResponse = await fetch('http://localhost:5001/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: mealData.description }),
            signal: AbortSignal.timeout(5000)
          });

          if (nlpResponse.ok) {
            const nlpData = await nlpResponse.json();
            setExtractedIngredients(nlpData);
            setSuccess('✅ Ingredients extracted successfully!');
          } else {
            setError('Food not recognized. Try typing one of the 10 supported foods: Biryani, Dosa, Idli, Chapati, Pongal, Poori, Porotta, Vada, Appam, or White Rice');
          }
        } catch (nlpErr) {
          setError('Food not recognized. Please type one of the 10 supported foods: Biryani, Dosa, Idli, Chapati, Pongal, Poori, Porotta, Vada, Appam, or White Rice');
        }
      }
    } catch (err) {
      console.error('Extract ingredients error:', err);
      if (err.message && err.message.includes('fetch')) {
        setError('Failed to connect to server. Please check if the backend is running.');
      } else {
        setError(err.message || 'Failed to extract ingredients. Please try again.');
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!mealData.description.trim()) {
      setError('Please enter a meal description');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8000/api/meals/logText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mealType: mealData.mealType,
          description: mealData.description,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to log meal (${response.status})`);
      }

      // If food was matched, show biometric data
      if (data.foodMatched) {
        setExtractedIngredients({
          ingredients: [{
            name: data.foodMatched.foodName,
            calories: data.foodMatched.nutrition.calories_kcal || 0,
            protein_g: data.foodMatched.nutrition.protein_g || 0,
            carbs_g: data.foodMatched.nutrition.carbs_g || 0,
            fat_g: data.foodMatched.nutrition.fat_g || 0,
            fiber_g: data.foodMatched.nutrition.fiber_g || 0,
            sodium_mg: data.foodMatched.nutrition.sodium_mg || 0,
            confidence: 0.9
          }],
          totalNutrition: {
            calories: data.foodMatched.nutrition.calories_kcal || 0,
            protein_g: data.foodMatched.nutrition.protein_g || 0,
            carbs_g: data.foodMatched.nutrition.carbs_g || 0,
            fat_g: data.foodMatched.nutrition.fat_g || 0,
            fiber_g: data.foodMatched.nutrition.fiber_g || 0,
            sodium_mg: data.foodMatched.nutrition.sodium_mg || 0
          },
          confidence: 0.9,
          processingTime_ms: 0
        });
        setSuccess(`✅ ${data.message || 'Meal logged with biometric data!'}`);
      } else {
        setSuccess('🎉 Meal logged successfully!');
        setExtractedIngredients(null);
      }
      
      setMealData({ mealType: 'breakfast', description: '', imageUrl: '' });
      
      // Refresh meals list after a short delay
      setTimeout(() => {
        if (window.location.reload) {
          // Or call a parent function to refresh meals list
        }
      }, 1000);
    } catch (err) {
      console.error('Meal logging error:', err);
      if (err.message && err.message.includes('fetch')) {
        setError('Failed to connect to server. Please check if the backend is running on port 8000.');
      } else {
        setError(err.message || 'Failed to log meal. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>🍽️ Log Meal</h1>
      <p className="page-subtitle">Add your meal to track nutrition and get personalized recommendations</p>

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '2rem',
            borderBottom: '2px solid rgba(255,255,255,0.1)'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              style={{
                padding: '1rem 2rem',
                background: activeTab === 'text' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'text' ? '3px solid #667eea' : '3px solid transparent',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              📝 Text Description
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              style={{
                padding: '1rem 2rem',
                background: activeTab === 'image' ? 'linear-gradient(135deg, #f093fb, #f5576c)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'image' ? '3px solid #f5576c' : '3px solid transparent',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              📸 Food Image
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="form-group">
              <label className="form-label">Meal Type</label>
              <select
                name="mealType"
                className="form-select"
                value={mealData.mealType}
                onChange={handleChange}
              >
                <option value="breakfast">🌅 Breakfast</option>
                <option value="lunch">☀️ Lunch</option>
                <option value="dinner">🌙 Dinner</option>
                <option value="snack">🍿 Snack</option>
              </select>
            </div>

            {/* Text Tab Content */}
            {activeTab === 'text' && (
              <>
                <div className="form-group">
                  <label className="form-label">Meal Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="E.g., Biryani, Dosa, Idli, Chapati, Pongal, Poori, Porotta, Vada, Appam, or White Rice..."
                    value={mealData.description}
                    onChange={handleChange}
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    💡 Tip: Type any of these foods for automatic biometric data: 
                    <strong> Biryani, Dosa, Idli, Chapati, Pongal, Poori, Porotta, Vada, Appam, White Rice</strong>
                  </small>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginTop: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleExtract}
                    disabled={extracting || loading || !mealData.description.trim()}
                    style={{
                      flex: '1',
                      minWidth: '200px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: (extracting || loading || !mealData.description.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (extracting || loading || !mealData.description.trim()) ? 0.6 : 1
                    }}
                  >
                    {extracting ? '⏳ Extracting...' : '🔍 Extract Biometric Data'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || extracting}
                    style={{
                      flex: '1',
                      minWidth: '200px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: (loading || extracting) ? 'not-allowed' : 'pointer',
                      opacity: (loading || extracting) ? 0.6 : 1
                    }}
                  >
                    {loading ? '⏳ Saving...' : '💾 Log Meal'}
                  </button>
                </div>
              </>
            )}

            {/* Image Tab Content */}
            {activeTab === 'image' && (
              <>
                <div className="form-group">
                  <label className="form-label">Upload Food Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '2px dashed rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                    📸 Upload an image of: Biryani, Dosa, Idli, Chapati, Pongal, Poori, Porotta, Vada, Appam, or White Rice
                  </small>
                </div>

                {imagePreview && (
                  <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <img 
                      src={imagePreview} 
                      alt="Food preview" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '400px', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }} 
                    />
                  </div>
                )}

                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginTop: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleImageRecognition}
                    disabled={recognizing || loading || !selectedImage}
                    style={{
                      flex: '1',
                      minWidth: '200px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: (recognizing || loading || !selectedImage) ? 'not-allowed' : 'pointer',
                      opacity: (recognizing || loading || !selectedImage) ? 0.6 : 1
                    }}
                  >
                    {recognizing ? '⏳ Recognizing...' : '🔍 Recognize Food'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || recognizing || !mealData.description}
                    style={{
                      flex: '1',
                      minWidth: '200px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: (loading || recognizing || !mealData.description) ? 'not-allowed' : 'pointer',
                      opacity: (loading || recognizing || !mealData.description) ? 0.6 : 1
                    }}
                  >
                    {loading ? '⏳ Saving...' : '💾 Log Meal'}
                  </button>
                </div>

                {/* AI Explainability Section */}
                {extractedIngredients && imagePreview && (
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}>
                    <h4 style={{
                      margin: '0 0 1rem 0',
                      fontSize: '1.2rem',
                      color: 'white',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      🔍 AI Explainability - Understand the Prediction
                    </h4>
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleExplain('lime')}
                        disabled={explainLoading}
                        style={{
                          flex: '1',
                          minWidth: '150px',
                          padding: '0.875rem 1.25rem',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: explainLoading ? 'not-allowed' : 'pointer',
                          opacity: explainLoading ? 0.6 : 1,
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        {explainLoading ? '⏳' : '🔬'} LIME Explanation
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExplain('shap')}
                        disabled={explainLoading}
                        style={{
                          flex: '1',
                          minWidth: '150px',
                          padding: '0.875rem 1.25rem',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: explainLoading ? 'not-allowed' : 'pointer',
                          opacity: explainLoading ? 0.6 : 1,
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                        }}
                      >
                        {explainLoading ? '⏳' : '📊'} SHAP Heatmap
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExplain('both')}
                        disabled={explainLoading}
                        style={{
                          flex: '1',
                          minWidth: '150px',
                          padding: '0.875rem 1.25rem',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: explainLoading ? 'not-allowed' : 'pointer',
                          opacity: explainLoading ? 0.6 : 1,
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                        }}
                      >
                        {explainLoading ? '⏳' : '🎯'} Both Methods
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </form>
        </div>

        {extractedIngredients && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <span className="card-title">🥗 Extracted Ingredients</span>
            </div>

            <div className="nutrition-info">
              <div className="nutrition-item">
                <div className="nutrition-value">{extractedIngredients.totalNutrition.calories}</div>
                <div className="nutrition-label">Calories</div>
              </div>
              <div className="nutrition-item">
                <div className="nutrition-value">{extractedIngredients.totalNutrition.protein_g}g</div>
                <div className="nutrition-label">Protein</div>
              </div>
              <div className="nutrition-item">
                <div className="nutrition-value">{extractedIngredients.totalNutrition.carbs_g}g</div>
                <div className="nutrition-label">Carbs</div>
              </div>
              <div className="nutrition-item">
                <div className="nutrition-value">{extractedIngredients.totalNutrition.fat_g}g</div>
                <div className="nutrition-label">Fat</div>
              </div>
              <div className="nutrition-item">
                <div className="nutrition-value">{extractedIngredients.totalNutrition.fiber_g}g</div>
                <div className="nutrition-label">Fiber</div>
              </div>
              <div className="nutrition-item">
                <div className="nutrition-value">{extractedIngredients.totalNutrition.sodium_mg}mg</div>
                <div className="nutrition-label">Sodium</div>
              </div>
            </div>

            <h3 style={{ marginTop: '1.5rem' }}>Ingredients:</h3>
            <ul className="list">
              {extractedIngredients.ingredients.map((ing, idx) => (
                <li key={idx} className="list-item">
                  <div className="list-content">
                    <div className="list-title">{ing.name}</div>
                    <div className="list-subtitle">
                      {ing.calories} cal | P: {ing.protein_g}g | C: {ing.carbs_g}g | F: {ing.fat_g}g
                    </div>
                  </div>
                  <span className="biometric-badge badge-normal">{Math.round(ing.confidence * 100)}%</span>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                <strong>Confidence:</strong> {Math.round(extractedIngredients.confidence * 100)}% | 
                <strong> Processing Time:</strong> {extractedIngredients.processingTime_ms}ms
              </p>
            </div>
          </div>
        )}

        {/* Explanation Results Display - Comprehensive 4-Section Layout */}
        {showExplanation && explanation ? (
          <div style={{ 
            gridColumn: '1 / -1',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            
            {/* Debug indicator - remove after testing */}
            <div style={{
              padding: '0.5rem',
              background: '#10b981',
              color: 'white',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '0.85rem'
            }}>
              ✅ Explanation loaded successfully! Scroll down to see results.
            </div>
            
            {/* SECTION 1: Recognition Summary (No duplication) */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)'
            }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '2rem' }}>🎯</span>
                  Recognition Summary
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginTop: '1rem'
                }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.25rem' }}>
                      Predicted Food
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>
                      {explanation.lime?.top_prediction || explanation.top_prediction}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.25rem' }}>
                      Confidence
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>
                      {((explanation.lime?.confidence || explanation.confidence) * 100).toFixed(1)}%
                    </div>
                  </div>
                  {explanation.consistency?.reliability_score && (
                    <div style={{
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(10px)',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                      <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.25rem' }}>
                        Reliability Score
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>
                        {explanation.consistency.reliability_score}%
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Consistency Warning */}
                {explanation.consistency?.consistency && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: explanation.consistency.agreement_level === 'strong' 
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : 'rgba(251, 191, 36, 0.2)',
                    borderRadius: '8px',
                    border: `2px solid ${explanation.consistency.agreement_level === 'strong' ? '#10b981' : '#fbbf24'}`,
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                  }}>
                    {explanation.consistency.consistency}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: Explainability Selector */}
            {explanation.lime && explanation.shap && (
              <div className="card" style={{ 
                background: 'white',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => setSelectedExplainer('lime')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        background: selectedExplainer === 'lime' 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'white',
                        color: selectedExplainer === 'lime' ? 'white' : '#4b5563',
                        border: selectedExplainer === 'lime' ? 'none' : '2px solid #d1d5db',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: selectedExplainer === 'lime' 
                          ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🧪</span>
                      LIME
                      <span style={{ 
                        fontSize: '0.75rem', 
                        opacity: 0.8,
                        fontWeight: '400'
                      }}>
                        (Local)
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setSelectedExplainer('shap')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        background: selectedExplainer === 'shap'
                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                          : 'white',
                        color: selectedExplainer === 'shap' ? 'white' : '#4b5563',
                        border: selectedExplainer === 'shap' ? 'none' : '2px solid #d1d5db',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: selectedExplainer === 'shap'
                          ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🔥</span>
                      SHAP
                      <span style={{ 
                        fontSize: '0.75rem', 
                        opacity: 0.8,
                        fontWeight: '400'
                      }}>
                        (Model)
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setSelectedExplainer('both')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        background: selectedExplainer === 'both'
                          ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                          : 'white',
                        color: selectedExplainer === 'both' ? 'white' : '#4b5563',
                        border: selectedExplainer === 'both' ? 'none' : '2px solid #d1d5db',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: selectedExplainer === 'both'
                          ? '0 4px 12px rgba(139, 92, 246, 0.3)'
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🎯</span>
                      BOTH
                      <span style={{ 
                        fontSize: '0.75rem', 
                        opacity: 0.8,
                        fontWeight: '400'
                      }}>
                        (Side-by-Side)
                      </span>
                    </button>
                  </div>
                  
                  {/* Method Descriptions */}
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    color: '#374151'
                  }}>
                    {selectedExplainer === 'lime' && (
                      <div>
                        <strong style={{ color: '#10b981' }}>LIME (Local Interpretable Model-agnostic Explanations):</strong>
                        <br />
                        {explanation.lime?.scope || 'Explains this specific image by identifying which visual regions most influenced the prediction.'}
                      </div>
                    )}
                    {selectedExplainer === 'shap' && (
                      <div>
                        <strong style={{ color: '#3b82f6' }}>SHAP (SHapley Additive exPlanations):</strong>
                        <br />
                        {explanation.shap?.scope || 'Shows what the neural network learned by highlighting activation patterns across the entire image.'}
                      </div>
                    )}
                    {selectedExplainer === 'both' && (
                      <div>
                        <strong style={{ color: '#8b5cf6' }}>Side-by-Side Comparison:</strong>
                        <br />
                        Compare local image features (LIME) with learned model behavior (SHAP) to understand both what's in this image and what the model recognizes.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: Visual Explanation Panel */}
            {((explanation.lime && explanation.shap && selectedExplainer === 'both') || 
              (explanation.lime && selectedExplainer === 'lime') || 
              (explanation.shap && selectedExplainer === 'shap') ||
              explanation.visualization) && (
              <div className="card" style={{
                background: 'white',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb'
              }}>
                <div className="card-header" style={{ 
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  color: '#1f2937',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  borderBottom: '2px solid #d1d5db'
                }}>
                  <span style={{ fontSize: '1.3rem', marginRight: '0.5rem' }}>🔍</span>
                  Visual Explanation
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                  {/* Side-by-Side View */}
                  {selectedExplainer === 'both' && explanation.lime && explanation.shap && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                      gap: '1.5rem'
                    }}>
                      {/* LIME Panel */}
                      <div style={{
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '2px solid #10b981'
                      }}>
                        <h4 style={{
                          color: '#065f46',
                          fontSize: '1.1rem',
                          fontWeight: '700',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1.3rem' }}>🧪</span>
                          LIME Analysis
                        </h4>
                        {explanation.lime.visualization && (
                          <img
                            src={`data:image/png;base64,${explanation.lime.visualization}`}
                            alt="LIME Explanation"
                            style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }}
                          />
                        )}
                      </div>
                      
                      {/* SHAP Panel */}
                      <div style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '2px solid #3b82f6'
                      }}>
                        <h4 style={{
                          color: '#1e40af',
                          fontSize: '1.1rem',
                          fontWeight: '700',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1.3rem' }}>🔥</span>
                          SHAP Heatmap
                        </h4>
                        {explanation.shap.visualization && (
                          <img
                            src={`data:image/png;base64,${explanation.shap.visualization}`}
                            alt="SHAP Explanation"
                            style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Single View */}
                  {selectedExplainer === 'lime' && explanation.lime?.visualization && (
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={`data:image/png;base64,${explanation.lime.visualization}`}
                        alt="LIME Explanation"
                        style={{ 
                          maxWidth: '100%', 
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                        }}
                      />
                    </div>
                  )}
                  
                  {selectedExplainer === 'shap' && explanation.shap?.visualization && (
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={`data:image/png;base64,${explanation.shap.visualization}`}
                        alt="SHAP Explanation"
                        style={{ 
                          maxWidth: '100%', 
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Single method fallback */}
                  {explanation.visualization && !explanation.lime && !explanation.shap && (
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={`data:image/png;base64,${explanation.visualization}`}
                        alt="Explanation Visualization"
                        style={{ 
                          maxWidth: '100%', 
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 4: Textual Interpretation Panel */}
            <div className="card" style={{
              background: 'white',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb'
            }}>
              <div className="card-header" style={{ 
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                color: '#78350f',
                fontWeight: '700',
                fontSize: '1.1rem',
                borderBottom: '2px solid #fbbf24'
              }}>
                <span style={{ fontSize: '1.3rem', marginRight: '0.5rem' }}>📝</span>
                Textual Interpretation
              </div>
              
              <div style={{ padding: '1.5rem' }}>
                {/* LIME Interpretation */}
                {(selectedExplainer === 'lime' || selectedExplainer === 'both') && explanation.lime?.explanation && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    border: '2px solid #10b981'
                  }}>
                    <h5 style={{
                      color: '#065f46',
                      fontSize: '1rem',
                      fontWeight: '700',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>🧪</span>
                      LIME Interpretation
                    </h5>
                    <p style={{
                      color: '#064e3b',
                      lineHeight: '1.8',
                      fontSize: '1rem',
                      margin: 0
                    }}>
                      {explanation.lime.explanation}
                    </p>
                  </div>
                )}
                
                {/* SHAP Interpretation */}
                {(selectedExplainer === 'shap' || selectedExplainer === 'both') && explanation.shap?.explanation && (
                  <div style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    border: '2px solid #3b82f6'
                  }}>
                    <h5 style={{
                      color: '#1e40af',
                      fontSize: '1rem',
                      fontWeight: '700',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>🔥</span>
                      SHAP Interpretation
                    </h5>
                    <p style={{
                      color: '#1e3a8a',
                      lineHeight: '1.8',
                      fontSize: '1rem',
                      margin: 0
                    }}>
                      {explanation.shap.explanation}
                    </p>
                    
                    {/* Region Importance Grid */}
                    {explanation.shap.region_importance && (
                      <div style={{ marginTop: '1rem' }}>
                        <h6 style={{
                          color: '#1e40af',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          marginBottom: '0.75rem'
                        }}>
                          📍 Region Importance Analysis:
                        </h6>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.5rem',
                          fontSize: '0.85rem'
                        }}>
                          {Object.entries(explanation.shap.region_importance)
                            .sort(([, a], [, b]) => b - a)
                            .map(([region, score], idx) => (
                              <div
                                key={region}
                                style={{
                                  background: idx === 0 
                                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                    : 'white',
                                  color: idx === 0 ? 'white' : '#374151',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  border: idx === 0 ? 'none' : '1px solid #d1d5db',
                                  textAlign: 'center',
                                  fontWeight: idx === 0 ? '700' : '500'
                                }}
                              >
                                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>
                                  {region.replace(/_/g, ' ').toUpperCase()}
                                </div>
                                <div style={{ fontSize: '1.1rem' }}>
                                  {(score * 100).toFixed(1)}%
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Single method explanation */}
                {explanation.explanation && !explanation.lime && !explanation.shap && (
                  <div style={{
                    background: '#f9fafb',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p style={{
                      color: '#1f2937',
                      lineHeight: '1.8',
                      fontSize: '1rem',
                      margin: 0
                    }}>
                      {explanation.explanation}
                    </p>
                  </div>
                )}
                
                {/* Model Metadata */}
                {explanation.model_metadata && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    marginTop: '1rem',
                    border: '2px solid #f59e0b'
                  }}>
                    <h5 style={{
                      color: '#78350f',
                      fontSize: '1rem',
                      fontWeight: '700',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                      Model Information
                    </h5>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      color: '#92400e',
                      fontSize: '0.9rem'
                    }}>
                      <div>
                        <strong>Model:</strong> {explanation.model_metadata.model_type}
                      </div>
                      <div>
                        <strong>Dataset:</strong> {explanation.model_metadata.training_dataset}
                      </div>
                      <div>
                        <strong>Classes:</strong> {explanation.model_metadata.num_classes}
                      </div>
                    </div>
                    {explanation.model_metadata.note && (
                      <p style={{
                        marginTop: '0.75rem',
                        fontSize: '0.85rem',
                        color: '#92400e',
                        lineHeight: '1.6',
                        fontStyle: 'italic'
                      }}>
                        {explanation.model_metadata.note}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : showExplanation ? (
          <div style={{ 
            gridColumn: '1 / -1',
            padding: '2rem',
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3>⚠️ Waiting for explanation data...</h3>
            <p>showExplanation is true but no explanation data received</p>
          </div>
        ) : null}

        {/* Single-method display when only one method returned */}
        {showExplanation && explanation && !explanation.lime && !explanation.shap && (
          <div className="card" style={{ 
            gridColumn: '1 / -1',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            border: '2px solid #8b5cf6',
            boxShadow: '0 8px 20px rgba(139, 92, 246, 0.2)'
          }}>
            <div className="card-header" style={{ background: '#8b5cf6', color: 'white' }}>
              <span className="card-title">🧠 AI Explainability Results</span>
            </div>

            {/* Combined response fallback display */}
            <div style={{ padding: '1.5rem' }}>
              <h4 style={{ 
                color: '#6366f1', 
                marginBottom: '0.75rem',
                fontSize: '1.1rem'
              }}>
                Method: LIME + SHAP
              </h4>

              {explanation.summary?.interpretation && (
                <p style={{ 
                  color: '#4b5563', 
                  lineHeight: '1.6',
                  marginBottom: '1rem',
                  fontSize: '0.95rem'
                }}>
                  {explanation.summary.interpretation}
                </p>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginTop: '1rem'
              }}>
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ 
                    color: '#10b981', 
                    marginBottom: '0.75rem',
                    textAlign: 'center'
                  }}>
                    🔬 LIME Analysis
                  </h4>
                  {explanation.lime.explanation && (
                    <p style={{ color: '#4b5563', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                      {explanation.lime.explanation}
                    </p>
                  )}
                  {explanation.lime.visualization && (
                    <img
                      src={`data:image/png;base64,${explanation.lime.visualization}`}
                      alt="LIME Explanation"
                      style={{ width: '100%', borderRadius: '6px' }}
                    />
                  )}
                </div>

                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ 
                    color: '#3b82f6', 
                    marginBottom: '0.75rem',
                    textAlign: 'center'
                  }}>
                    📊 SHAP Heatmap
                  </h4>
                  {explanation.shap.explanation && (
                    <p style={{ color: '#4b5563', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                      {explanation.shap.explanation}
                    </p>
                  )}
                  {explanation.shap.region_importance && (
                    <div style={{
                      background: '#f0f9ff',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      marginBottom: '0.75rem',
                      fontSize: '0.85rem'
                    }}>
                      <strong style={{ color: '#0369a1' }}>Most Important:</strong> {explanation.shap.most_important_region?.replace(/_/g, ' ') || 'N/A'}
                    </div>
                  )}
                  {explanation.shap.visualization && (
                    <img
                      src={`data:image/png;base64,${explanation.shap.visualization}`}
                      alt="SHAP Explanation"
                      style={{ width: '100%', borderRadius: '6px' }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Single-method response from CV service: { method, visualization, ... } */}
            {explanation.method && (
              <div style={{ padding: '1.5rem' }}>
                <h4 style={{ 
                  color: '#6366f1', 
                  marginBottom: '0.75rem',
                  fontSize: '1.1rem'
                }}>
                  Method: {explanation.method.toUpperCase()}
                </h4>
                <p style={{ 
                  color: '#4b5563', 
                  lineHeight: '1.6',
                  marginBottom: '1rem',
                  fontSize: '0.95rem'
                }}>
                  {explanation.explanation}
                </p>

                <div style={{
                  backgroundColor: '#f3f4f6',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Prediction:</strong> {explanation.top_prediction}
                  </p>
                  <p style={{ margin: '0.25rem 0' }}>
                    <strong>Confidence:</strong> {(explanation.confidence * 100).toFixed(1)}%
                  </p>
                  {explanation.most_important_region && (
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Key Region:</strong> {explanation.most_important_region.replace('_', ' ')}
                    </p>
                  )}
                </div>

                {/* Display region importance for SHAP */}
                {explanation.region_importance && (
                  <div style={{
                    backgroundColor: '#eef2ff',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <h5 style={{ color: '#4f46e5', marginBottom: '0.5rem' }}>📍 Region Importance Analysis</h5>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '0.5rem',
                      fontSize: '0.85rem'
                    }}>
                      {Object.entries(explanation.region_importance).map(([region, score]) => (
                        <div key={region} style={{
                          padding: '0.5rem',
                          background: region === explanation.most_important_region ? '#dbeafe' : 'white',
                          borderRadius: '4px',
                          border: region === explanation.most_important_region ? '2px solid #3b82f6' : '1px solid #e5e7eb'
                        }}>
                          <strong>{region.replace(/_/g, ' ')}:</strong> {(score * 100).toFixed(1)}%
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {explanation.visualization && (
                  <div style={{ 
                    marginTop: '1rem', 
                    textAlign: 'center',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '8px'
                  }}>
                    <h4 style={{ marginBottom: '1rem', color: '#6366f1' }}>
                      Visualization:
                    </h4>
                    <img
                      src={`data:image/png;base64,${explanation.visualization}`}
                      alt="Explanation Visualization"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}
                    />
                  </div>
                )}

              </div>
            )}

            {/* Backward compatibility: if an older API returns explanation.visualizations */}
            {!explanation.method && !(explanation.lime && explanation.shap) && explanation.visualizations && (
              <div style={{ padding: '1.5rem' }}>
                <h4 style={{ color: '#6366f1', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                  Method: LIME + SHAP
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem',
                  marginTop: '1rem'
                }}>
                  {explanation.visualizations.lime && (
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <h4 style={{ color: '#10b981', marginBottom: '0.75rem', textAlign: 'center' }}>🔬 LIME Analysis</h4>
                      <img src={`data:image/png;base64,${explanation.visualizations.lime}`} alt="LIME Explanation" style={{ width: '100%', borderRadius: '6px' }} />
                    </div>
                  )}
                  {explanation.visualizations.shap && (
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <h4 style={{ color: '#3b82f6', marginBottom: '0.75rem', textAlign: 'center' }}>📊 SHAP Heatmap</h4>
                      <img src={`data:image/png;base64,${explanation.visualizations.shap}`} alt="SHAP Explanation" style={{ width: '100%', borderRadius: '6px' }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MealLogger;
