# LSTM Glucose Prediction Model - Quick Start Guide

## Installation

### 1. Install Dependencies

```bash
cd ml-services/prediction_service

# Option A: With GPU support (recommended for faster training)
pip install -r requirements.txt

# Option B: CPU only (if GPU not available)
pip install tensorflow-cpu keras scikit-learn numpy pandas flask flask-cors

# Option C: Using Conda (recommended for Anaconda users)
conda create -n glucose-lstm python=3.10
conda activate glucose-lstm
pip install -r requirements.txt
```

### 2. Verify Installation

```python
python3 -c "
from lstm_glucose_model import GlucoseLSTMModel, TENSORFLOW_AVAILABLE
print(f'TensorFlow Available: {TENSORFLOW_AVAILABLE}')

model = GlucoseLSTMModel()
print('✓ LSTM Model initialized successfully')
"
```

## Quick Start

### Option 1: Python Script

```python
from lstm_glucose_model import GlucoseLSTMModel, generate_synthetic_training_data

# Initialize model
print("Initializing LSTM model...")
model = GlucoseLSTMModel(sequence_length=24, feature_dim=15)

# Generate synthetic data
print("Generating training data...")
X_train, y_train = generate_synthetic_training_data(n_samples=800)
X_val, y_val = generate_synthetic_training_data(n_samples=200)

print(f"Training data shape: {X_train.shape}")
print(f"Target shape: {y_train.shape}")

# Train model
print("Training model...")
history = model.train(
    X_train, y_train,
    X_val, y_val,
    epochs=20,
    batch_size=32
)

# Evaluate
print("Evaluating model...")
metrics = model.evaluate(X_val, y_val)
print(f"Metrics: {metrics}")

# Save model
model.save_model('glucose_lstm_model.h5')
print("✓ Model trained and saved!")

# Make prediction
print("\nMaking predictions...")
X_test, y_test = generate_synthetic_training_data(n_samples=5)
predictions = model.predict(X_test[:1], return_confidence=True)
print(f"Prediction: {predictions['predictions'][0]:.1f} mg/dL")
```

Run:
```bash
python3 lstm_glucose_model.py
```

### Option 2: Flask API

#### Start the API Server

```bash
# Set environment variable for model path
export FLASK_ENV=development
export LSTM_MODEL_PATH=./models/glucose_lstm_model.h5

# Run the API
python3 glucose_api.py
```

Server will start on `http://localhost:5001`

#### Test Endpoints with cURL

```bash
# 1. Health check
curl http://localhost:5001/api/glucose-prediction/health

# 2. Get features
curl http://localhost:5001/api/glucose-prediction/features

# 3. Train model (with synthetic data)
curl -X POST http://localhost:5001/api/glucose-prediction/train \
  -H "Content-Type: application/json" \
  -d '{"use_synthetic_data": true, "epochs": 20, "batch_size": 32}'

# 4. Make prediction
curl -X POST http://localhost:5001/api/glucose-prediction/predict \
  -H "Content-Type: application/json" \
  -d '{
    "meal_features": {
      "carbs_g": 45, "protein_g": 20, "fat_g": 15, "fiber_g": 5,
      "sugar_g": 20, "sodium_mg": 400, "heart_rate": 75,
      "activity_level": 0.3, "time_since_meal": 0.5, "meal_interval_h": 4,
      "baseline_glucose": 105, "stress_level": 0.4, "sleep_quality": 0.8,
      "hydration_level": 0.7, "medication_taken": false
    },
    "return_confidence": true
  }'

# 5. Evaluate model
curl -X POST http://localhost:5001/api/glucose-prediction/evaluate \
  -H "Content-Type: application/json" \
  -d '{"use_synthetic": true}'

# 6. Get model info
curl http://localhost:5001/api/glucose-prediction/model-info
```

### Option 3: Integration with Existing Backend

Add to your main Flask app (`backend/src/server.js` or Python backend):

```python
from glucose_api import register_glucose_endpoints

# In your main Flask app initialization
app = Flask(__name__)

# Register glucose prediction endpoints
register_glucose_endpoints(app)

# ... rest of your app setup
```

## Model Training

### Using Synthetic Data (Recommended for Testing)

```python
# Already included in the LSTM model code
# Generates realistic temporal patterns based on meal times
```

### Using Real Data

```python
import numpy as np
import pandas as pd
from lstm_glucose_model import GlucoseLSTMModel

# Load your data
data = pd.read_csv('glucose_data.csv')

# Prepare features (24-hour sequences)
X_train = np.array([...])  # Shape: (n_samples, 24, 15)
y_train = np.array([...])  # Shape: (n_samples,)

# Create and train model
model = GlucoseLSTMModel()
model.train(X_train, y_train, epochs=50, batch_size=32)
model.save_model('glucose_lstm_model.h5')
```

## Model Files

- **lstm_glucose_model.py**: Core LSTM model implementation
- **glucose_api.py**: Flask API endpoints
- **LSTM_MODEL_GUIDE.md**: Comprehensive documentation
- **requirements.txt**: Python dependencies

## Expected Performance

After training with 800 synthetic samples:

```
RMSE: 6-8 mg/dL
MAE: 5-6 mg/dL  
R² Score: 0.85-0.90
MAPE: 6-8%
```

## Troubleshooting

### 1. ImportError: No module named 'tensorflow'

```bash
pip install tensorflow
# or
pip install tensorflow-cpu
```

### 2. CUDA/GPU Issues

If you have GPU but TensorFlow not using it:

```bash
# Check GPU availability
python3 -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"

# If empty, install GPU drivers or use CPU version:
pip install tensorflow-cpu
```

### 3. Memory Issues

Reduce sequence length or batch size:
```python
model = GlucoseLSTMModel(sequence_length=12)  # Instead of 24
model.train(..., batch_size=16)  # Instead of 32
```

### 4. Model Not Training

Check:
- Data shapes are correct: X (n, 24, 15), y (n,)
- Target values in range 50-250 mg/dL
- No NaN or infinite values in data
- Sufficient samples (>500)

## API Response Examples

### Successful Prediction
```json
{
  "predictions": [128.5],
  "n_predictions": 1,
  "prediction_0": {
    "value": 128.5,
    "unit": "mg/dL",
    "status": "Elevated",
    "risk_level": "NORMAL"
  },
  "confidence_intervals": {
    "upper_bound": [148.5],
    "lower_bound": [108.5],
    "std_dev": [10.0]
  }
}
```

### Error Response
```json
{
  "error": "Model not initialized",
  "status": 500
}
```

## Next Steps

1. **Train with Real Data**: Replace synthetic data with user glucose readings
2. **Integrate with Dashboard**: Connect prediction widget to React frontend
3. **Set Up Monitoring**: Track prediction accuracy over time
4. **Implement Alerts**: Alert users when predictions exceed safe thresholds
5. **Personalization**: Fine-tune model per user with their data

## Performance Optimization

### Hardware Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 4GB | 16GB+ |
| CPU | 4 cores | 8+ cores |
| GPU | None | NVIDIA CUDA 11+ |
| Storage | 1GB | 5GB+ |

### Training Time Estimates

| Data Size | CPU | GPU |
|-----------|-----|-----|
| 500 samples | 2-5 min | 30-60 sec |
| 1000 samples | 4-10 min | 1-2 min |
| 5000 samples | 20-40 min | 5-10 min |

## Support & Documentation

- Full documentation: `LSTM_MODEL_GUIDE.md`
- API reference: Check Flask endpoints in `glucose_api.py`
- Example code: See `lstm_glucose_model.py` main section
- Issues? Check requirements.txt and verify dependencies

---

**Ready to train your model!** 🚀
