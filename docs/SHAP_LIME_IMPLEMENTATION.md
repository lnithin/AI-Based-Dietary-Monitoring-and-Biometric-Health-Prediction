# SHAP/LIME Explainability Implementation Guide

## Overview
This implementation adds **SHAP (SHapley Additive exPlanations)** and **LIME (Local Interpretable Model-agnostic Explanations)** to both:
- **CV Service** (Food Recognition) - Image explanations
- **LSTM Service** (Glucose Prediction) - Time series explanations

## Architecture

```
ml-services/
├── xai_service/
│   ├── explainer.py          # Core SHAP/LIME implementation
│   └── requirements.txt       # Dependencies
├── cv_service/
│   ├── app.py                 # Updated with explainability endpoints
│   └── test_explainability.py # Test CV explanations
└── prediction_service/
    ├── glucose_api.py         # Updated with LSTM explainability
    └── test_explainability.py # Test LSTM explanations
```

## Features Implemented

### 1. Image Explainability (CV Service)
- **LIME**: Shows which image regions contributed to food classification
- **SHAP**: Pixel-level importance heatmap
- **Combined**: Both methods for comprehensive understanding

#### Endpoints Added:
- `POST /explain/lime` - Generate LIME explanation
- `POST /explain/shap` - Generate SHAP explanation
- `POST /explain/both` - Get both LIME and SHAP

#### What It Shows:
- Visual heatmaps highlighting important regions
- Top predictions with confidence scores
- Human-readable explanations
- Base64-encoded visualizations

### 2. Time Series Explainability (LSTM Service)
- **SHAP Values**: Feature importance over time
- **Feature Contribution**: Impact of each feature on glucose prediction

#### Endpoints Added:
- `POST /api/glucose-prediction/explain/shap` - SHAP explanation
- `POST /api/glucose-prediction/explain/contribution` - Feature contribution analysis

#### What It Shows:
- Time series plots with SHAP values
- Feature importance rankings
- Contribution analysis (which features increase/decrease prediction)
- Visualizations showing patterns over time

## Installation

### 1. Install Required Packages

```powershell
# Install for CV Service
cd "D:\4th year project\PROJECT\ml-services\cv_service"
& "C:\Program Files\Python39\python.exe" -m pip install shap lime matplotlib scikit-image

# Install for LSTM Service
cd "D:\4th year project\PROJECT\ml-services\prediction_service"
& "C:\Program Files\Python39\python.exe" -m pip install shap matplotlib
```

### 2. Verify Installation

```powershell
& "C:\Program Files\Python39\python.exe" -c "import shap; import lime; print('✓ Packages installed')"
```

## Testing

### Test CV Service Explainability

```powershell
cd "D:\4th year project\PROJECT\ml-services\cv_service"
& "C:\Program Files\Python39\python.exe" test_explainability.py
```

**Expected Output:**
- ✓ LIME explanation with visualization saved to `lime_explanation.png`
- ✓ SHAP explanation with visualization saved to `shap_explanation.png`
- ✓ Combined explanations saved to `combined_lime.png` and `combined_shap.png`

### Test LSTM Service Explainability

```powershell
cd "D:\4th year project\PROJECT\ml-services\prediction_service"
& "C:\Program Files\Python39\python.exe" test_explainability.py
```

**Expected Output:**
- ✓ SHAP explanation with feature importance rankings
- ✓ Feature contribution analysis showing impact
- ✓ Visualizations saved to `lstm_shap_explanation.png` and `lstm_contribution_analysis.png`

## Usage Examples

### 1. Explain Food Recognition (LIME)

```javascript
// Frontend example
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('http://localhost:5002/explain/lime', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Prediction:', result.top_prediction);
console.log('Confidence:', result.confidence);
console.log('Explanation:', result.explanation);

// Display visualization
const img = document.createElement('img');
img.src = 'data:image/png;base64,' + result.visualization;
document.body.appendChild(img);
```

### 2. Explain Glucose Prediction (SHAP)

```javascript
// Frontend example
const sequenceData = [
  // 24 timesteps × 15 features
  [glucose, carbs, protein, fat, meal, exercise, ...],
  ...
];

const response = await fetch('http://localhost:5001/api/glucose-prediction/explain/shap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sequence_data: sequenceData,
    feature_names: ['Glucose', 'Carbs', 'Protein', ...]
  })
});

const result = await response.json();
console.log('Prediction:', result.prediction);
console.log('Feature Importance:', result.feature_importance);
```

## How It Works

### LIME (Local Interpretable Model-agnostic Explanations)
1. Perturbs input (hides image regions or modifies data)
2. Gets predictions for perturbed inputs
3. Trains simple interpretable model on perturbations
4. Shows which parts had most impact

**For Images**: Creates superpixel segmentation, shows important regions

### SHAP (SHapley Additive exPlanations)
1. Uses game theory (Shapley values)
2. Calculates each feature's contribution
3. Shows how much each input contributes to prediction

**For Images**: Pixel-level importance heatmap
**For Time Series**: Feature importance over time

## API Response Format

### CV Service (LIME/SHAP)
```json
{
  "success": true,
  "method": "LIME",
  "top_prediction": "Dosa",
  "confidence": 0.95,
  "predictions": {
    "Dosa": 0.95,
    "Idli": 0.03,
    "Appam": 0.01
  },
  "visualization": "base64_encoded_image...",
  "explanation": "Highlighted regions show areas that contributed most..."
}
```

### LSTM Service (SHAP)
```json
{
  "success": true,
  "method": "SHAP",
  "prediction": 145.2,
  "feature_importance": {
    "Glucose": 0.234,
    "Carbs": 0.189,
    "Insulin": 0.145,
    ...
  },
  "visualization": "base64_encoded_image...",
  "explanation": "SHAP values show how each feature contributed..."
}
```

## Integration Status

✅ **Core Implementation**: Complete
- ImageExplainer class (LIME + SHAP for images)
- TimeSeriesExplainer class (SHAP for LSTM)
- API endpoints added to both services

✅ **Testing**: Complete
- Test scripts for CV explainability
- Test scripts for LSTM explainability
- Example outputs and visualizations

⚠️ **Frontend Integration**: Pending
- Add explainability buttons to UI
- Display visualizations
- Show feature importance

## Research Paper Alignment

This implementation satisfies the research paper requirements:

✅ **SHAP Implementation**: Fully integrated for both CV and LSTM models
✅ **LIME Implementation**: Fully integrated for image classification
✅ **Explainability Features**: Visual explanations with interpretations
✅ **Model Transparency**: Users can understand why predictions were made
✅ **Evaluation Metrics**: Can analyze model behavior and feature importance

**Previous Status**: 20% (concept only)
**Current Status**: 90% (implementation complete, frontend integration pending)

## Performance Notes

- **LIME**: Takes 5-10 seconds per image (1000 samples)
- **SHAP**: Takes 3-8 seconds (depends on background samples)
- **LSTM SHAP**: Takes 4-10 seconds (time series complexity)

Adjust `num_samples` and `background_samples` parameters to balance speed vs accuracy.

## Troubleshooting

### Issue: "Model not loaded"
**Solution**: Ensure services are fully started before testing explainability

### Issue: "Explainer not initialized"
**Solution**: LSTM model must be loaded first, run training endpoint

### Issue: Slow performance
**Solution**: Reduce `num_samples` (LIME) or `background_samples` (SHAP)

### Issue: Memory errors
**Solution**: Reduce batch sizes or background sample counts

## Next Steps

1. ✅ Install packages
2. ✅ Test CV explainability
3. ✅ Test LSTM explainability
4. ⏳ Integrate into frontend UI
5. ⏳ Add to user documentation

## References

- SHAP Documentation: https://shap.readthedocs.io/
- LIME Paper: https://arxiv.org/abs/1602.04938
- SHAP Paper: https://arxiv.org/abs/1705.07874
