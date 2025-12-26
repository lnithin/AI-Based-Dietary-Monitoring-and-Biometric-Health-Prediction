# Food Recognition CV Service

Deep learning-based food recognition service using MobileNetV2 for accurate identification of South Indian dishes.

## Features

- **Transfer Learning**: Uses pre-trained MobileNetV2 model for robust feature extraction
- **Image Augmentation**: Training with data augmentation for better generalization
- **Heuristic Enhancement**: Combines deep learning with image analysis for improved accuracy
- **10 Food Classes**: Supports recognition of Appam, Biryani, Chapati, Dosa, Idli, Pongal, Poori, Porotta, Vada, and White Rice

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Train the Model (Optional)

If you want to train from scratch:

```bash
python train_model.py
```

This will:
- Load images from the `data/` directory
- Train using MobileNetV2 transfer learning
- Save the model to `models/food_recognition_model.h5`

### 3. Start the Service

**Windows:**
```bash
start_service.bat
```

**Linux/Mac:**
```bash
python app.py
```

The service will run on `http://localhost:5002`

## API Endpoints

### POST /recognize

Upload an image for food recognition.

**Request:**
```bash
curl -X POST -F "image=@food.jpg" http://localhost:5002/recognize
```

**Response:**
```json
{
  "success": true,
  "food_name": "Dosa",
  "confidence": 0.89,
  "all_predictions": [
    {"food_name": "Dosa", "confidence": 0.89},
    {"food_name": "Chapati", "confidence": 0.06},
    {"food_name": "Poori", "confidence": 0.03}
  ],
  "model_type": "MobileNetV2"
}
```

### GET /health

Check service health.

**Response:**
```json
{
  "status": "healthy",
  "service": "Food Recognition CV Service",
  "model_loaded": true,
  "supported_foods": ["Appam", "Biryani", ...]
}
```

### GET /train-status

Get model training status.

## Model Architecture

- **Base**: MobileNetV2 (pre-trained on ImageNet)
- **Custom Layers**:
  - GlobalAveragePooling2D
  - Dense(256) + ReLU + Dropout(0.5)
  - Dense(128) + ReLU + Dropout(0.3)
  - Dense(10) + Softmax

## Accuracy Enhancement Strategies

1. **Transfer Learning**: Leverages MobileNetV2 trained on millions of images
2. **Data Augmentation**: Rotation, zoom, shift, and flip during training
3. **Heuristic Analysis**: Uses image aspect ratio and color to adjust predictions
4. **Ensemble Approach**: Combines CNN predictions with image characteristics

## Integration with Backend

The backend automatically tries to use this service:

```javascript
const cvResponse = await axios.post(
  'http://localhost:5002/recognize',
  formData,
  { headers: formData.getHeaders() }
);
```

If the CV service is unavailable, it falls back to filename matching.
