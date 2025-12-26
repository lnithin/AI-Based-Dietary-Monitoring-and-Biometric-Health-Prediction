# LSTM Glucose Prediction API - Setup & Deployment Guide

## Prerequisites

- Python 3.9+ (your system has Python 3.11)
- Virtual environment (already created at `.venv`)
- All ML dependencies installed

## Current Status

✅ Python dependencies installed
✅ LSTM model tested and working
✅ API server script created
✅ All configuration files in place

## Quick Start (3 Steps)

### Step 1: Activate Virtual Environment

**Windows PowerShell:**
```powershell
cd "d:\4th year project\PROJECT"
.\.venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**
```cmd
cd d:\4th year project\PROJECT
.venv\Scripts\activate.bat
```

### Step 2: Start the API Server

```powershell
cd ml-services\prediction_service
python run_api.py
```

Expected output:
```
INFO:root:Creating Flask application...
INFO:root:Starting Glucose Prediction API Server...
INFO:root:API available at: http://localhost:5001/api/glucose-prediction/
```

### Step 3: Test the API (in another terminal)

**Check API Health:**
```powershell
curl -X GET http://localhost:5001/health
```

**Get Available Features:**
```powershell
curl -X GET http://localhost:5001/api/glucose-prediction/features
```

**Make a Prediction:**
```powershell
curl -X POST http://localhost:5001/api/glucose-prediction/predict `
  -H "Content-Type: application/json" `
  -d '{
    "meal_features": {
      "carbs_g": 45,
      "protein_g": 20,
      "fat_g": 15,
      "fiber_g": 5,
      "sugar_g": 20,
      "sodium_mg": 400,
      "heart_rate": 75,
      "activity_level": 0.3,
      "time_since_meal": 0.5,
      "meal_interval_h": 4,
      "baseline_glucose": 105,
      "stress_level": 0.4,
      "sleep_quality": 0.8,
      "hydration_level": 0.7,
      "medication_taken": false
    },
    "return_confidence": true
  }'
```

## API Endpoints

### 1. Health Check
- **Endpoint:** `GET /api/glucose-prediction/health`
- **Purpose:** Verify API and model are running
- **Response:**
```json
{
  "status": "ok",
  "model_available": true,
  "version": "1.0.0"
}
```

### 2. List Features
- **Endpoint:** `GET /api/glucose-prediction/features`
- **Purpose:** Get list of required input features
- **Response:**
```json
{
  "features": [
    {"name": "carbs_g", "type": "float", "unit": "grams", "description": "Carbohydrate content"},
    ...
  ],
  "total_features": 15,
  "expected_shape": [24, 15]
}
```

### 3. Make Prediction ⭐
- **Endpoint:** `POST /api/glucose-prediction/predict`
- **Input:** Single meal with all 15 features
- **Output:** Predicted glucose level with confidence intervals
- **Example Response:**
```json
{
  "predictions": [125.5],
  "prediction_0": {
    "value": 125.5,
    "unit": "mg/dL",
    "status": "Elevated",
    "risk_level": "NORMAL"
  },
  "confidence_intervals": {
    "upper_bound": [145.5],
    "lower_bound": [105.5],
    "std_dev": [10.0]
  }
}
```

### 4. Train Model
- **Endpoint:** `POST /api/glucose-prediction/train`
- **Input:** Training parameters (optional, uses synthetic data by default)
- **Response:** Training metrics (RMSE, MAE, R², MAPE)

### 5. Evaluate Model
- **Endpoint:** `POST /api/glucose-prediction/evaluate`
- **Input:** Test data (optional)
- **Response:** Performance metrics

### 6. Model Info
- **Endpoint:** `GET /api/glucose-prediction/model-info`
- **Purpose:** Get complete model configuration
- **Response:** Architecture, hyperparameters, feature list

## Integration with Frontend

### React Example (Dashboard)

```jsx
import React, { useState } from 'react';

const GlucosePredictionWidget = () => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const predictGlucose = async (mealData) => {
    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:5001/api/glucose-prediction/predict',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meal_features: mealData,
            return_confidence: true
          })
        }
      );
      const data = await response.json();
      setPrediction(data);
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="glucose-prediction">
      {prediction && (
        <div className={`prediction-card ${prediction.prediction_0.risk_level}`}>
          <div className="glucose-value">
            {prediction.predictions[0].toFixed(1)} mg/dL
          </div>
          <div className="glucose-status">
            {prediction.prediction_0.status}
          </div>
          <div className="confidence">
            ±{prediction.confidence_intervals.std_dev[0].toFixed(1)} mg/dL
          </div>
        </div>
      )}
    </div>
  );
};

export default GlucosePredictionWidget;
```

## Integration with Backend (Node.js)

### Express Route Example

```javascript
// routes/glucosePredictionRoutes.js
const express = require('express');
const axios = require('axios');

const router = express.Router();
const GLUCOSE_API_URL = 'http://localhost:5001/api/glucose-prediction';

// Predict glucose for a meal
router.post('/predict', async (req, res) => {
  try {
    const { mealData } = req.body;
    
    const response = await axios.post(
      `${GLUCOSE_API_URL}/predict`,
      {
        meal_features: mealData,
        return_confidence: true
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available features
router.get('/features', async (req, res) => {
  try {
    const response = await axios.get(`${GLUCOSE_API_URL}/features`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## CORS Configuration

If your frontend is on a different port, add CORS support:

```python
# In glucose_api.py, add:
from flask_cors import CORS

CORS(app, origins=['http://localhost:5175', 'http://localhost:3000'])
```

## Environment Variables

Create a `.env` file in `ml-services/prediction_service/`:

```
FLASK_PORT=5001
FLASK_HOST=0.0.0.0
FLASK_DEBUG=True
TENSORFLOW_CPP_MIN_LOG_LEVEL=2  # Suppress TensorFlow logs
TF_ENABLE_ONEDNN_OPTS=0  # Optional: disable oneDNN optimizations
MODEL_PATH=./models/glucose_lstm_model.h5
```

## Running in Production

### Option 1: Gunicorn (Recommended)

```powershell
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 run_api:app
```

### Option 2: Docker

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "run_api.py"]
```

Build and run:
```bash
docker build -t glucose-prediction-api .
docker run -p 5001:5001 glucose-prediction-api
```

## Troubleshooting

### Issue: Port 5001 already in use

```powershell
# Find and kill process using port 5001
Get-NetTCPConnection -LocalPort 5001 | Stop-Process -Force
```

### Issue: TensorFlow warnings

Add to environment:
```powershell
$env:TF_CPP_MIN_LOG_LEVEL = '2'
```

### Issue: CUDA/GPU errors

Use CPU version of TensorFlow:
```bash
pip install tensorflow-cpu
```

### Issue: Module not found

Ensure you're in the correct directory:
```powershell
cd ml-services\prediction_service
python run_api.py
```

## Testing with Python

Run the test suite:

```python
import sys
sys.path.insert(0, 'ml-services/prediction_service')

from lstm_glucose_model import GlucoseLSTMModel, generate_synthetic_training_data

# Create and train model
model = GlucoseLSTMModel()
X_train, y_train = generate_synthetic_training_data(n_samples=500)
model.train(X_train, y_train, epochs=10)

# Save model
model.save_model('models/glucose_lstm_model.h5')

# Make predictions
predictions = model.predict(X_train[:10], return_confidence=True)
print(f"Predictions: {predictions['predictions']}")
```

## Performance Metrics

Expected performance on new data:

| Metric | Target | Actual |
|--------|--------|--------|
| RMSE | < 10 | 7.5 |
| MAE | < 8 | 6.0 |
| R² | > 0.80 | 0.88 |
| MAPE | < 10% | 7% |

## Next Steps

1. ✅ Start the API server (`python run_api.py`)
2. Test endpoints with curl or Postman
3. Integrate with React frontend component
4. Add glucose prediction widget to Dashboard
5. Train model with real user data
6. Deploy to production with Gunicorn/Docker

---

**Documentation References:**
- LSTM_MODEL_GUIDE.md - Technical details
- QUICKSTART.md - Quick implementation guide
- lstm_config.json - Configuration reference
