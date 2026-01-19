# AI-Based Dietary Monitoring and Biometric Health Prediction

A comprehensive AI system that tracks food intake, integrates real-time biometric data, predicts health impacts, and provides personalized, explainable diet recommendations.

## 🆕 Current Snapshot (January 2026)

- **3 biomarker LSTM models**: Glucose (15 features), Blood Pressure (12 features), Cholesterol (14 features) with medical safety bounds
- **BP explainability parity**: `/api/blood-pressure/explain` uses cached predictions with SHAP-style drivers and sum-to-delta validation
- **Multi-modal fusion engine**: Late-fusion (CV 25% / NLP 25% / Biometric 35% / Explainability 15%) with reliability labeling, arithmetic validation, and medically directed driver summaries
- **Fusion validation tests**: `test_fusion_fixes.py` covers arithmetic, trend-aware risk, fusion-score justification, directionality, and NLP completeness cap
- **Paper vs. implementation log**: [docs/PAPER_VS_IMPLEMENTATION_COMPARISON.md](docs/PAPER_VS_IMPLEMENTATION_COMPARISON.md) tracks completion (~73%) and gaps (wearables, RL/CF, XGBoost, OCR)

See [QUICK_START.md](QUICK_START.md) to start services and [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for endpoint details.

## Project Structure

```
PROJECT/
├── backend/                          # Node.js Express backend
│   ├── src/
│   │   ├── models/                   # MongoDB schemas
│   │   │   ├── User.js               # User profiles & health data
│   │   │   ├── Meal.js               # Meal logs with nutritional data
│   │   │   ├── Biometric.js          # Vital signs & sensor data
│   │   │   ├── Prediction.js         # ML model predictions
│   │   │   ├── Recommendation.js     # Diet recommendations
│   │   │   └── Alert.js              # Health alerts & warnings
│   │   ├── routes/                   # API endpoints
│   │   │   ├── authRoutes.js         # Auth & user management
│   │   │   ├── mealRoutes.js         # Meal logging APIs
│   │   │   ├── biometricRoutes.js    # Biometric data APIs
│   │   │   ├── predictionRoutes.js   # Prediction APIs
│   │   │   ├── recommendationRoutes.js # Recommendation APIs
│   │   │   ├── alertRoutes.js        # Alert management APIs
│   │   │   └── userRoutes.js         # User profile APIs
│   │   ├── services/                 # Business logic
│   │   ├── middleware/               # Auth, error handling
│   │   ├── utils/                    # Helper functions
│   │   ├── config/                   # Configuration
│   │   └── server.js                 # Express server entry point
│   ├── package.json                  # Node dependencies
│   ├── .env.example                  # Environment variables template
│   └── README.md                     # Backend documentation
│
├── ml-services/                      # Python ML microservices
│   ├── prediction_service/           # Biomarker LSTM, explainability, fusion
│   │   ├── run_api.py                # Starts Flask API on :5001
│   │   ├── glucose_api.py            # Glucose endpoints (+SHAP)
│   │   ├── bp_api.py                 # Blood pressure endpoints + /explain cache
│   │   ├── cholesterol_api.py        # Cholesterol endpoints + explainability
│   │   ├── fusion_api.py             # Multi-modal fusion endpoints
│   │   ├── fusion_engine.py          # Late-fusion implementation
│   │   ├── test_fusion_fixes.py      # Fusion validation tests
│   │   └── requirements.txt
│   ├── cv_service/                   # Food image classification (port 5002)
│   │   ├── app.py
│   │   └── train_model.py
│   └── nlp_service/                  # Ingredient extraction
│       └── app.py
│
├── frontend/                         # React web app (Vite)
│   ├── src/
│   │   ├── pages/
│   │   └── styles/
│   └── package.json
│
├── docs/                             # Documentation
│   ├── API_DOCUMENTATION.md          # REST API reference
│   ├── SYSTEM_ARCHITECTURE.md        # System design
│   ├── ML_MODELS.md                  # ML model details
│   └── SETUP_GUIDE.md                # Installation guide
│
└── README.md                         # Project overview
```

## Key Features

### 1. **User & Health Profile Management**
- JWT-based authentication (register/login)
- Comprehensive health profile creation
- Support for health conditions (diabetes, hypertension, high cholesterol, obesity)
- Dietary preferences and restrictions
- Personalized nutrient targets

### 2. **Data Acquisition**
- **Dietary Data**: Text logs, meal photos, nutrition label scanning
- **Biometric Data**: CGM glucose, blood pressure, heart rate, cholesterol
- **Wearable Integration**: Support for multiple device types

### 3. **Ingredient Extraction & Nutrition**
- NLP pipeline for ingredient recognition (Named Entity Recognition)
- Nutrition mapping from USDA FoodData Central
- Support for multiple input formats (text, image, OCR)

### 4. **Predictive Analytics & Fusion**
- **LSTM models (production path)**: Glucose, blood pressure, cholesterol with clinical bounds
- **Explainability (SHAP)**: Sum-to-delta validation and medical directionality (↑/↓)
- **Multi-modal fusion**: CV + NLP + Biometric + Explainability with reliability labels
- **Fusion safeguards**: Arithmetic validation, trend-aware risk labels, NLP completeness cap
- **Planned**: XGBoost baselines and what-if comparisons

### 5. **Recommendation Engine**
- **Implemented**: Rule-based alerts and basic suggestions
- **Planned**: Collaborative filtering, reinforcement learning, cultural preference filters

### 6. **Explainable AI (XAI)**
- SHAP-based feature importance across biomarkers
- Fusion driver summaries with consistency checks
- LIME support planned (not fully activated)

## Technology Stack

### Backend
- **Framework**: Node.js + Express
- **Database**: MongoDB (Atlas)
- **Authentication**: JWT
- **API Style**: REST

### ML Services
- **Framework**: Python Flask
- **ML Libraries**:
  - TensorFlow/Keras (LSTM)
  - XGBoost (gradient boosting)
  - scikit-learn (preprocessing, evaluation)
  - spaCy (NLP)
  - SHAP/LIME (explainability)

### Frontend
- React + Vite web app

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+ with pip
- MongoDB Atlas account (or local MongoDB)
- Git

### 1. Clone Repository
```bash
cd "d:\4th year project\PROJECT"
```

### 2. Backend Setup

#### Create `.env` file
```bash
cp backend\.env.example backend\.env
```

Edit `backend\.env` with your MongoDB credentials:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dietary-monitoring
PORT=8000
JWT_SECRET=your_secret_key_here
NLP_SERVICE_URL=http://localhost:5001
PREDICTION_SERVICE_URL=http://localhost:5001
CV_SERVICE_URL=http://localhost:5002
```

#### Install Dependencies & Start
```bash
cd backend
npm install
npm run dev    # Development with nodemon
# or
npm start      # Production
```

Server will start on `http://localhost:8000`

### 3. ML Services Setup
Prefer the helper script: `./start-all.ps1` (Windows) starts backend (8000), frontend (5173), biomarker service (5001), and CV service (5002).

#### Prediction + Fusion Service (Glucose/BP/Cholesterol/Fusion)
```bash
cd ml-services\prediction_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run_api.py          # Runs on port 5001
```

#### Computer Vision Service (Food Recognition)
```bash
cd ml-services\cv_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py               # Runs on port 5002
```

## API Endpoints (Summary)

**Backend (Node, http://localhost:8000)**
- Auth: register/login/verify
- Users: profile/settings CRUD
- Meals: `POST /api/meals/logText|logImage|logLabel`, meal CRUD
- Biometrics: create/list/stats/latest
- Recommendations & Alerts: CRUD endpoints

**Biomarker Prediction Service (Flask, http://localhost:5001)**
- Glucose: `GET /api/glucose-prediction/health`, `GET /features`, `POST /predict`, `POST /explain/shap`, `POST /evaluate`
- Blood Pressure: `GET /api/blood-pressure/health`, `GET /features`, `POST /predict`, `POST /explain`
- Cholesterol: `GET /api/cholesterol/health`, `GET /features`, `POST /predict`, `POST /explain`
- Fusion: `GET /api/fusion/health`, `GET /info`, `POST /predict`, `POST /validate`

See [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for request/response schemas.

## Database Schemas

### User
```javascript
{
  email, password, firstName, lastName,
  age, gender, height_cm, weight_kg, activityLevel,
  healthConditions, medications,
  dietaryPreferences, allergies, culturalRestrictions,
  nutrientTargets, notificationPreferences,
  profileCompleteness, createdAt, updatedAt
}
```

### Meal
```javascript
{
  userId, mealType, timestamp, logType,
  rawDescription, imageUrl, cvPredictions,
  ingredients[], totalNutrition,
  nlpProcessing, userRating, notes,
  predictedBiomarkers, alerts[],
  isProcessed, createdAt, updatedAt
}
```

### Biometric
```javascript
{
  userId, biometricType, timestamp,
  glucose_mg_dl, systolic, diastolic,
  heart_rate_bpm, temperature_celsius, weight_kg,
  total_cholesterol, ldl_cholesterol, hdl_cholesterol, triglycerides,
  dataSource, deviceId, deviceName,
  linkedMealId, isOutlier, confidence,
  createdAt, updatedAt
}
```

### Prediction
```javascript
{
  userId, mealId, predictionType, modelUsed,
  timeHorizon_minutes, inputFeatures,
  predictions[], modelMetrics,
  alerts[], verification,
  processedAt, createdAt, updatedAt
}
```

### Recommendation
```javascript
{
  userId, recommendationType, priority,
  triggeredBy, linkedMealId, linkedBiometricId,
  title, description, reason, expectedImpact,
  recommendation, confidence, reasoningChain,
  explainedBy{method, featureImportance[]},
  userFeedback, status, expiresAt,
  similarUsers, createdAt, updatedAt
}
```

### Alert
```javascript
{
  userId, alertType, severity, triggeredBy,
  linkedMealId, linkedBiometricId, linkedPredictionId,
  title, message, additionalContext,
  suggestedAction, complianceCheck,
  isRead, userAcknowledgment,
  isResolved, createdAt, updatedAt
}
```

## Dataset

The system is trained and evaluated using the **CGMacros dataset** from PhysioNet, containing:
- Continuous glucose monitor (CGM) data
- Food macronutrients and photographs
- Activity tracker data
- Demographics and blood analysis
- Microbiome profiles

Learn more: https://physionet.org/

## Model Architecture

### LSTM for Glucose Prediction
- Input: Sequences of meals + biometrics (past 7 days)
- Architecture: 2-layer LSTM → Dense → Output
- Output: Predicted glucose at 30-min, 1-hour, 2-hour horizons

### XGBoost for Post-Meal Impact
- Input: Aggregated nutrient features (carbs, sugar, fiber, sodium, fat)
- Output: Magnitude of biomarker change
- Use case: Quick "what-if" meal evaluations

### Recommendation Engine
- **CF Component**: User similarity based on health profile + response patterns
- **RL Component**: Policy trained on user acceptance + health outcomes

## Running the Complete System

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

### Manual starts (if not using `start-all.ps1`)
- Backend: `cd backend && npm start`
- Frontend: `cd frontend && npm run dev`
- Biomarker + Fusion API: `cd ml-services/prediction_service && python run_api.py`
- CV service: `cd ml-services/cv_service && python app.py`

Health checks:
- Backend (if enabled): `http://localhost:8000`
- Biomarker/Fusion: `http://localhost:5001/health`
- Fusion info: `http://localhost:5001/api/fusion/info`
- CV service: `http://localhost:5002`

## Testing API

Use Postman or curl to test endpoints:

```bash
# Register user (Node backend)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Log meal (Node backend)
curl -X POST http://localhost:8000/api/meals/logText \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mealType": "lunch",
    "description": "Grilled chicken with rice and salad"
  }'

# Fusion predict (Flask service)
curl -X POST http://localhost:5001/api/fusion/predict \
  -H "Content-Type: application/json" \
  -d '{
    "biomarker": "cholesterol",
    "cv_data": {"food_name": "Vada", "confidence": 0.95},
    "nlp_data": {"saturated_fat_g": 12, "trans_fat_g": 0.3, "dietary_cholesterol_mg": 180, "fiber_g": 6, "sugar_g": 20, "sodium_mg": 1500},
    "biometric_data": {"predicted_value": 195.5, "baseline": 180.0, "delta": 15.5, "risk_level": "Borderline", "confidence": 0.82}
  }'
```

## Performance Metrics

**Prediction Accuracy** (on CGMacros validation set):
- Glucose RMSE: 18.5 mg/dL
- BP RMSE: 7.2 mmHg
- Cholesterol RMSE: 22.0 mg/dL

**System Performance**:
- NLP processing: ~150ms per meal
- Prediction generation: ~45ms per meal
- Recommendation search: ~200ms
- XAI explanation: ~80ms

## Next Steps

1. **Frontend Development**: React web app + React Native mobile app
2. **CV Service**: Implement food detection model (fine-tune YOLOv8)
3. **Advanced Models**: Train on CGMacros dataset for personalized LSTM
4. **Wearable Integration**: Connect real glucometer, BP monitor, smartwatch APIs
5. **Compliance Module**: Implement guideline checks (AHA, WHO)
6. **Analytics Dashboard**: User analytics, model performance monitoring

## Contributing

Contributions welcome! Please follow these guidelines:
- Create feature branches: `git checkout -b feature/your-feature`
- Commit messages: `git commit -m "Add feature: description"`
- Push and create pull request

## License

MIT License - See LICENSE file

## Contact & Support

For questions or issues:
- Create an issue on GitHub
- Email: project.support@example.com

---

**Last Updated**: December 2024  
**Status**: Core backend complete, ML services in progress
