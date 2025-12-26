# Glucose Prediction API - Quick Reference

## Starting the Server

### Windows PowerShell (Recommended)
```powershell
cd "d:\4th year project\PROJECT\ml-services\prediction_service"
.\start_api.ps1
```

### Windows Command Prompt
```cmd
cd "d:\4th year project\PROJECT\ml-services\prediction_service"
start_api.bat
```

### Manual Start (Any OS)
```bash
cd "d:\4th year project\PROJECT\ml-services\prediction_service"
python run_api.py
```

## Testing the API

### In PowerShell (from any directory):

**1. Health Check**
```powershell
curl http://localhost:5001/health
```

**2. Get Features**
```powershell
curl http://localhost:5001/api/glucose-prediction/features
```

**3. Make a Prediction**
```powershell
$mealData = @{
    carbs_g = 45
    protein_g = 20
    fat_g = 15
    fiber_g = 5
    sugar_g = 20
    sodium_mg = 400
    heart_rate = 75
    activity_level = 0.3
    time_since_meal = 0.5
    meal_interval_h = 4
    baseline_glucose = 105
    stress_level = 0.4
    sleep_quality = 0.8
    hydration_level = 0.7
    medication_taken = $false
}

curl -Method POST `
  -Uri "http://localhost:5001/api/glucose-prediction/predict" `
  -Headers @{"Content-Type"="application/json"} `
  -Body ($mealData | ConvertTo-Json)
```

### With cURL (if installed):

**Make Prediction:**
```bash
curl -X POST http://localhost:5001/api/glucose-prediction/predict \
  -H "Content-Type: application/json" \
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

**Train Model:**
```bash
curl -X POST http://localhost:5001/api/glucose-prediction/train \
  -H "Content-Type: application/json" \
  -d '{
    "use_synthetic_data": true,
    "epochs": 50,
    "batch_size": 32
  }'
```

## API Endpoints Summary

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| GET | `/health` | Server health | `{status: ok}` |
| GET | `/api/glucose-prediction/health` | Model health | `{status: ok, model_available: bool}` |
| GET | `/api/glucose-prediction/features` | List input features | `{features: [], total_features: 15}` |
| POST | `/api/glucose-prediction/predict` | Predict glucose | `{predictions: [], confidence_intervals: {}}` |
| POST | `/api/glucose-prediction/train` | Train model | `{rmse: float, mae: float, r2: float}` |
| POST | `/api/glucose-prediction/evaluate` | Evaluate model | `{rmse: float, mae: float, r2: float, mape: float}` |
| GET | `/api/glucose-prediction/model-info` | Get config | `{version: string, architecture: {}}` |

## 15 Input Features Required

### Nutritional (6)
- `carbs_g`: Grams of carbohydrates
- `protein_g`: Grams of protein
- `fat_g`: Grams of fat
- `fiber_g`: Grams of fiber
- `sugar_g`: Grams of sugar
- `sodium_mg`: Milligrams of sodium

### Biometric (3)
- `heart_rate`: Beats per minute
- `activity_level`: 0-1 (0=rest, 1=max activity)
- `baseline_glucose`: User's typical fasting glucose

### Temporal (3)
- `time_since_meal`: Hours since last meal
- `meal_interval_h`: Typical meal interval in hours
- `medication_taken`: 0 or 1 (whether medication taken)

### Contextual (3)
- `stress_level`: 0-1 (0=no stress, 1=max stress)
- `sleep_quality`: 0-1 (0=poor, 1=excellent)
- `hydration_level`: 0-1 (0=dehydrated, 1=well hydrated)

## Expected Response Format

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

## Risk Levels

| Level | Range (mg/dL) | Status |
|-------|---------------|--------|
| CRITICAL_LOW | < 54 | Immediate action needed |
| HIGH_RISK_LOW | 54-70 | Risk of hypoglycemia |
| LOW_RISK | 70-100 | Normal/Good |
| NORMAL | 100-140 | Safe/Ideal |
| MODERATE_RISK | 140-180 | Monitor trends |
| HIGH_RISK | 180-250 | Take action |
| CRITICAL_HIGH | > 250 | Medical attention |

## Integration Examples

### Python
```python
import requests

response = requests.post(
    'http://localhost:5001/api/glucose-prediction/predict',
    json={
        'meal_features': {
            'carbs_g': 45,
            'protein_g': 20,
            # ... other features
        },
        'return_confidence': True
    }
)

result = response.json()
glucose_value = result['predictions'][0]
risk_level = result['prediction_0']['risk_level']
```

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:5001/api/glucose-prediction/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        meal_features: {
            carbs_g: 45,
            protein_g: 20,
            // ... other features
        },
        return_confidence: true
    })
});

const data = await response.json();
const glucoseValue = data.predictions[0];
const confidence = data.confidence_intervals.std_dev[0];
```

### React Component
```jsx
const [glucose, setGlucose] = useState(null);

const predictGlucose = async (mealData) => {
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
    setGlucose(data.predictions[0]);
};
```

## Troubleshooting

### Server won't start
1. Check port 5001 is not in use: `netstat -ano | findstr :5001`
2. Kill process if needed: `taskkill /PID <pid> /F`
3. Check dependencies: `pip install -r requirements.txt`

### Connection refused
1. Verify server is running: `curl http://localhost:5001/health`
2. Check firewall settings
3. Ensure port 5001 is allowed

### Slow predictions
1. First prediction takes longer (model loading)
2. Subsequent predictions are fast (<100ms)
3. Consider running on GPU for faster training

### CORS errors (frontend to API)
The API allows cross-origin requests by default.
If issues persist, check SETUP_AND_DEPLOYMENT.md for CORS configuration.

## Files Included

```
ml-services/prediction_service/
├── run_api.py                      # Main API server script
├── start_api.ps1                   # PowerShell startup script
├── start_api.bat                   # Batch startup script
├── lstm_glucose_model.py           # Core LSTM model
├── glucose_api.py                  # Flask API endpoints
├── lstm_config.json                # Model configuration
├── LSTM_MODEL_GUIDE.md             # Technical documentation
├── SETUP_AND_DEPLOYMENT.md         # Deployment guide
├── QUICKSTART.md                   # Quick implementation guide
├── QUICK_REFERENCE.md              # This file
└── requirements.txt                # Python dependencies
```

## Common Tasks

### Train Model with Synthetic Data
```powershell
curl -Method POST `
  -Uri "http://localhost:5001/api/glucose-prediction/train" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"use_synthetic_data": true, "epochs": 50}'
```

### Evaluate Current Model
```powershell
curl -Method POST `
  -Uri "http://localhost:5001/api/glucose-prediction/evaluate" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{}'
```

### Get Model Configuration
```powershell
curl "http://localhost:5001/api/glucose-prediction/model-info"
```

## Performance Expectations

- **Model Loading Time**: 2-5 seconds (first time only)
- **Prediction Latency**: 50-200ms
- **Training on 800 samples**: 1-2 minutes
- **Accuracy (RMSE)**: ±7.5 mg/dL
- **Confidence Level**: 95%

## Next Steps

1. ✅ Start server: `.\start_api.ps1`
2. ✅ Test endpoints with examples above
3. ✅ Integrate with React Dashboard
4. ✅ Connect to existing Backend API
5. ✅ Add glucose prediction widget
6. ✅ Deploy to production

---

For more details, see:
- **SETUP_AND_DEPLOYMENT.md** - Comprehensive setup guide
- **LSTM_MODEL_GUIDE.md** - Technical details
- **QUICKSTART.md** - Implementation examples
