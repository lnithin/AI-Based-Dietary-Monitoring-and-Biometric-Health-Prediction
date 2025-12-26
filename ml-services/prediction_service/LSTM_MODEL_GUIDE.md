# LSTM Glucose Prediction Model - Implementation Guide

## Overview

This document describes the LSTM (Long Short-Term Memory) model implementation for predicting blood glucose levels based on meal ingredients and biometric data. The model is designed to predict glucose responses 2-4 hours after meal consumption using multimodal data.

## Architecture

### Model Structure

```
Input Layer (24 timesteps × 15 features)
    ↓
LSTM Layer 1 (64 units, ReLU activation)
    ↓ [Dropout 20%]
LSTM Layer 2 (32 units, ReLU activation)
    ↓ [Dropout 20%]
LSTM Layer 3 (16 units, ReLU activation)
    ↓ [Dropout 10%]
Dense Layer 1 (32 units, ReLU activation)
    ↓
Dense Layer 2 (16 units, ReLU activation)
    ↓
Output Layer (1 unit - Glucose Prediction)
```

### Key Features

1. **Sequence-to-Value Architecture**: Accepts 24 timesteps of 15 features each
2. **Multi-layer LSTM**: Captures complex temporal patterns in glucose dynamics
3. **Dropout Regularization**: Prevents overfitting with 20% dropout on LSTM layers
4. **Early Stopping**: Monitors validation loss and stops training if no improvement
5. **Learning Rate Decay**: Reduces learning rate when validation loss plateaus

## Input Features (15 dimensions)

| Feature | Unit | Range | Description |
|---------|------|-------|-------------|
| carbs_g | grams | 0-200 | Carbohydrate content |
| protein_g | grams | 0-50 | Protein content |
| fat_g | grams | 0-100 | Fat content |
| fiber_g | grams | 0-15 | Dietary fiber |
| sugar_g | grams | 0-100 | Sugar content |
| sodium_mg | mg | 0-3000 | Sodium content |
| heart_rate | bpm | 60-180 | Resting/activity heart rate |
| activity_level | 0-1 | 0-1 | Activity level (0=rest, 1=intense) |
| time_since_meal | hours | 0-8 | Hours since last meal |
| meal_interval_h | hours | 2-8 | Typical interval between meals |
| baseline_glucose | mg/dL | 70-150 | User's typical fasting glucose |
| stress_level | 0-1 | 0-1 | Perceived stress level |
| sleep_quality | 0-1 | 0-1 | Quality of sleep (0-1) |
| hydration_level | 0-1 | 0-1 | Hydration status |
| medication_taken | binary | 0/1 | Whether medication taken |

## Output

**Predicted Value**: Blood glucose level (mg/dL)
**Range**: 50-250 mg/dL (clinically relevant range)
**Confidence Intervals**: ±15-20 mg/dL (95% confidence)

## Training

### Data Requirements

- **Minimum Samples**: 500 sequences (each 24 timesteps)
- **Training/Validation Split**: 80/20
- **Sequence Length**: 24 timesteps (typically 24 hours of data)

### Training Hyperparameters

```python
{
    'optimizer': 'Adam',
    'learning_rate': 0.001,
    'loss_function': 'Mean Absolute Error (MAE)',
    'batch_size': 32,
    'epochs': 50,
    'early_stopping': {
        'monitor': 'val_loss',
        'patience': 10
    },
    'lr_reduction': {
        'monitor': 'val_loss',
        'factor': 0.5,
        'patience': 5,
        'min_lr': 0.00001
    }
}
```

### Training Example

```python
from lstm_glucose_model import GlucoseLSTMModel, generate_synthetic_training_data

# Initialize model
model = GlucoseLSTMModel(sequence_length=24, feature_dim=15)

# Generate synthetic training data
X_train, y_train = generate_synthetic_training_data(n_samples=800)
X_val, y_val = generate_synthetic_training_data(n_samples=200)

# Train
history = model.train(
    X_train, y_train,
    X_val, y_val,
    epochs=50,
    batch_size=32
)

# Save
model.save_model('glucose_lstm_model.h5')
```

## Performance Metrics

### Expected Accuracy

| Metric | Target | Description |
|--------|--------|-------------|
| RMSE | < 10 mg/dL | Root Mean Square Error |
| MAE | < 7.5 mg/dL | Mean Absolute Error |
| R² Score | > 0.85 | Explains 85%+ of variance |
| MAPE | < 8% | Mean Absolute Percentage Error |

### Confusion Matrix (Risk Categories)

```
                Predicted
              Low  Normal  High  Critical
Actual Low     ✓     ✗     ✗      ✗
      Normal   ✗     ✓     ✗      ✗
      High     ✗     ✗     ✓      ✗
      Critical ✗     ✗     ✗      ✓
```

## API Usage

### Flask Endpoints

#### 1. Health Check
```
GET /api/glucose-prediction/health
```
Response:
```json
{
  "status": "healthy",
  "model_available": true,
  "tensorflow_available": true,
  "model_trained": true,
  "timestamp": "2024-12-12T10:30:00"
}
```

#### 2. Get Features
```
GET /api/glucose-prediction/features
```
Returns list of required input features and their dimensions.

#### 3. Train Model
```
POST /api/glucose-prediction/train
Content-Type: application/json

{
  "use_synthetic_data": true,
  "epochs": 50,
  "batch_size": 32
}
```

#### 4. Make Prediction
```
POST /api/glucose-prediction/predict
Content-Type: application/json

{
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
}
```

Response:
```json
{
  "predictions": [125.5],
  "n_predictions": 1,
  "model_info": {
    "type": "LSTM",
    "sequence_length": 24,
    "trained": true
  },
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

#### 5. Evaluate Model
```
POST /api/glucose-prediction/evaluate
Content-Type: application/json

{
  "use_synthetic": true
}
```

#### 6. Get Model Info
```
GET /api/glucose-prediction/model-info
```

## Clinical Interpretation

### Glucose Levels

| Range | Status | Action |
|-------|--------|--------|
| < 70 mg/dL | Hypoglycemic | ALERT: Consume fast-acting carbs |
| 70-100 mg/dL | Normal (Fasting) | ✓ Healthy |
| 100-140 mg/dL | Elevated | Monitor, adjust diet |
| 140-200 mg/dL | High | Warning: Adjust meal composition |
| > 200 mg/dL | Critical | ALERT: Consult healthcare provider |

### Risk Levels

- **CRITICAL_LOW** (< 54 mg/dL): Immediate intervention needed
- **HIGH_RISK_LOW** (54-70 mg/dL): Risk of symptomatic hypoglycemia
- **LOW_RISK** (70-100 mg/dL): Normal fasting range
- **NORMAL** (100-140 mg/dL): Post-meal safe range
- **MODERATE_RISK** (140-180 mg/dL): Monitor for trends
- **HIGH_RISK** (180-250 mg/dL): Intervention recommended
- **CRITICAL_HIGH** (> 250 mg/dL): Medical attention required

## Implementation in Dashboard

### Integration with Frontend

1. **Meal Logging**: Capture meal features via form
2. **Glucose Prediction**: Send to `/predict` endpoint
3. **Real-time Display**: Show prediction + confidence interval
4. **Risk Alert**: Highlight high-risk predictions
5. **Trend Analysis**: Track prediction accuracy over time

### Example React Component

```jsx
import { useState } from 'react';

export function GlucosePredictionWidget() {
  const [mealFeatures, setMealFeatures] = useState({
    carbs_g: 45,
    protein_g: 20,
    fat_g: 15,
    fiber_g: 5,
    sugar_g: 20,
    sodium_mg: 400,
    heart_rate: 75,
    activity_level: 0.3,
    time_since_meal: 0.5,
    meal_interval_h: 4,
    baseline_glucose: 105,
    stress_level: 0.4,
    sleep_quality: 0.8,
    hydration_level: 0.7,
    medication_taken: false
  });
  
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/glucose-prediction/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_features: mealFeatures, return_confidence: true })
      });
      const data = await response.json();
      setPrediction(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Glucose Prediction</h2>
      {prediction && (
        <div className={`prediction-result ${prediction.prediction_0.risk_level}`}>
          <div className="stat-value">{prediction.predictions[0].toFixed(1)}</div>
          <div className="stat-label">mg/dL</div>
          <div className="risk-level">{prediction.prediction_0.risk_level}</div>
          {prediction.confidence_intervals && (
            <div className="confidence">
              Range: {prediction.confidence_intervals.lower_bound[0].toFixed(1)} - {prediction.confidence_intervals.upper_bound[0].toFixed(1)}
            </div>
          )}
        </div>
      )}
      <button onClick={handlePredict} disabled={loading}>
        {loading ? 'Predicting...' : 'Predict Glucose'}
      </button>
    </div>
  );
}
```

## Troubleshooting

### Issue: TensorFlow Not Available

**Solution**: Install TensorFlow
```bash
pip install tensorflow
# For CPU only:
pip install tensorflow-cpu
# For GPU support:
pip install tensorflow[and-cuda]
```

### Issue: Out of Memory

**Solution**: Reduce batch size or sequence length
```python
model = GlucoseLSTMModel(sequence_length=12)  # Reduce from 24
```

### Issue: Poor Prediction Accuracy

**Solution**: 
1. Ensure sufficient training data (> 800 samples)
2. Check feature normalization
3. Verify target variable range (50-250 mg/dL)
4. Increase training epochs

## Future Enhancements

1. **Multi-task Learning**: Predict glucose + BP + cholesterol simultaneously
2. **Attention Mechanism**: Identify which features most influence predictions
3. **Ensemble Methods**: Combine LSTM with XGBoost for improved accuracy
4. **Transfer Learning**: Use pre-trained models from similar datasets
5. **Personalization**: Fine-tune model per user with minimal data
6. **Real-time Adaptation**: Continuously learn from user feedback

## References

- Hochreiter & Schmidhuber (1997): LSTM Neural Networks
- Graves (2013): Generating Sequences With Recurrent Neural Networks
- TensorFlow Documentation: https://www.tensorflow.org
- Keras Documentation: https://keras.io

## License & Citation

This implementation is part of the AI-Based Dietary Monitoring and Biometric Health Prediction system.

Citation:
```bibtex
@paper{dietary_health_2024,
  title={AI-Based Dietary Monitoring and Biometric Health Prediction},
  authors={Bandi, N. K. and Bell, B.},
  institution={Karunya Institute of Technology and Sciences},
  year={2024}
}
```
