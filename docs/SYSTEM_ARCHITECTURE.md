# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/React Native)             │
│  - User Registration & Login                                 │
│  - Meal Logging (Text, Image, Label)                        │
│  - Biometric Dashboard                                       │
│  - Predictions & Alerts                                      │
│  - Recommendations                                           │
│  - Explainability Visualizations                             │
└────────────────┬────────────────────────────────────────────┘
                 │ REST API (HTTP/JSON)
                 │
┌────────────────▼────────────────────────────────────────────┐
│          Backend (Node.js + Express + MongoDB)               │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Core API Routes:                                      │   │
│  │ • /auth - Authentication (JWT)                        │   │
│  │ • /meals - Meal logging & retrieval                   │   │
│  │ • /biometrics - Vital signs & sensor data             │   │
│  │ • /predictions - ML predictions                        │   │
│  │ • /recommendations - Personalized suggestions         │   │
│  │ • /alerts - Health warnings                           │   │
│  │ • /users - User profile management                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                     │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │      Database Layer (MongoDB)                        │   │
│  │  • User (profiles, health conditions)                │   │
│  │  • Meal (food logs, ingredients, nutrition)          │   │
│  │  • Biometric (glucose, BP, HR, cholesterol)          │   │
│  │  • Prediction (model outputs)                        │   │
│  │  • Recommendation (diet suggestions)                 │   │
│  │  • Alert (health warnings)                           │   │
│  └──────────────────────────────────────────────────────┘   │
└────┬───────────────────┬──────────────┬────────────┬────────┘
     │ HTTP              │ HTTP         │ HTTP       │ HTTP
     │ Microservices     │ Microservices│ Microservices│ Microservices
     │
┌────▼──────────┐ ┌─────▼──────────┐ ┌──────▼──────────┐ ┌─────▼──────────┐
│  NLP Service  │ │ Prediction     │ │ Recommendation │ │  XAI Service   │
│  (Port 5001)  │ │ Service        │ │ Service        │ │  (Port 5005)   │
│               │ │ (Port 5003)    │ │ (Port 5004)    │ │                │
│ • Extract     │ │                │ │                │ │ • SHAP/LIME    │
│   ingredients │ │ • LSTM model   │ │ • Collab       │ │   explanations │
│   (NER)       │ │ • XGBoost      │ │   filtering    │ │ • Feature      │
│ • Map to      │ │ • Glucose/BP/  │ │ • RL policy    │ │   importance   │
│   nutrition   │ │   cholesterol  │ │ • Ingredient   │ │ • Trust-       │
│ • Handle OCR  │ │   predictions  │ │   swaps        │ │   building     │
└───────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼────────────────────┐   ┌──────────▼──────────────────┐
│  External Data Sources     │   │  ML Training & Evaluation   │
│                            │   │                            │
│ • USDA FoodData Central    │   │ • CGMacros Dataset         │
│   (nutrition database)     │   │   (PhysioNet)              │
│ • Wearable devices:        │   │                            │
│   - Glucometer (CGM)       │   │ • Training pipeline        │
│   - BP monitor             │   │ • Model versioning         │
│   - Smartwatch (HR, steps) │   │ • Performance metrics      │
│   - Fitbit, Apple Watch    │   │   (RMSE, MAE, R²)          │
│                            │   │                            │
└────────────────────────────┘   └────────────────────────────┘
```

## Data Flow

### 1. Meal Logging Flow
```
User Input (Text/Image/Label)
        ↓
    Backend API
        ↓
    NLP Service → Ingredient Extraction
        ↓
    USDA Database → Nutrition Mapping
        ↓
    MongoDB (Meal Document)
        ↓
    Alert Check (Compliance Module)
        ↓
    Prediction Service → Glucose/BP Spike Forecast
        ↓
    Alert/Recommendation Generation
        ↓
    Frontend Display + XAI Explanations
```

### 2. Biometric Logging Flow
```
Wearable Device / Manual Entry
        ↓
    Backend API (/biometrics)
        ↓
    MongoDB (Biometric Document)
        ↓
    Anomaly Detection
        ↓
    Alert Generation (if needed)
        ↓
    Link to Recent Meals
        ↓
    Prediction Verification & Model Feedback
        ↓
    Frontend Display (Dashboard, Trends)
```

### 3. Prediction & Recommendation Flow
```
Meal + User Baseline + Recent Biometrics
        ↓
    Prediction Service (LSTM + XGBoost)
        ↓
    Generate Predictions (30min, 1h, 2h)
        ↓
    XAI Service → Feature Importance
        ↓
    Alert Generation (if prediction > thresholds)
        ↓
    Recommendation Engine (Collaborative + RL)
        ↓
    Compliance Check (Health Guidelines)
        ↓
    Frontend Visualization + Explanations
```

## Module Descriptions

### 1. User & Health Profile Management
**Purpose**: Manage user authentication and health context

**Key Functions**:
- JWT-based registration/login
- Profile creation with demographics
- Health condition documentation
- Dietary preferences storage
- Medication tracking
- Personalized nutrient targets calculation

**Related Endpoints**:
- POST /api/auth/register
- POST /api/auth/login
- GET/PUT /api/users/profile
- GET/PUT /api/users/settings

---

### 2. Data Acquisition Module
**Purpose**: Collect dietary and biometric data from multiple sources

**Sub-modules**:

#### 2a. Dietary Data Collection
- **Text Logging**: User types meal description
- **Image Logging**: User uploads meal photo
- **Label Scanning**: User scans nutrition label (OCR)

**Related Endpoints**:
- POST /api/meals/logText
- POST /api/meals/logImage
- POST /api/meals/logLabel

#### 2b. Biometric Data Collection
- **Manual Entry**: User enters glucose, BP, weight, etc.
- **Wearable Integration**: Sync from devices (CGM, smartwatch, BP monitor)
- **Device Types**: Supported devices tracked in Biometric.dataSource

**Related Endpoints**:
- POST /api/biometrics
- GET /api/biometrics
- GET /api/biometrics/stats/:type

---

### 3. Ingredient Extraction & Nutritional Mapping
**Purpose**: Understand what users eat at ingredient level

**Pipeline**:
1. **NLP Service** (Port 5001):
   - Named Entity Recognition (NER) for ingredient detection
   - Portion extraction from text
   - Relation extraction (ingredient ↔ portion)

2. **Nutrition Mapping**:
   - Query USDA FoodData Central API
   - Store: calories, macro/micronutrients
   - Link to meal document

**Output**: Ingredient list with detailed nutrition

---

### 4. Biometric Correlation & Predictive Modeling
**Purpose**: Learn how meals affect health markers

**Models**:

#### 4a. LSTM (Long Short-Term Memory)
- **Input**: Time sequences (meals + biometrics)
- **Output**: Future glucose/BP/cholesterol
- **Use Case**: Forecast health markers after eating

#### 4b. XGBoost
- **Input**: Aggregated daily features
- **Output**: Risk/probability of adverse event
- **Use Case**: "What-if" meal impact simulation

**Related Endpoints**:
- POST /api/predictions/generate
- GET /api/predictions
- PUT /api/predictions/:id/verify

---

### 5. Multi-Modal Data Fusion
**Purpose**: Combine text + image + biometric features for robust predictions

**Fusion Approach**:
- Text encoder: Extracts nutrient features
- Vision encoder: Extracts food type/portion from images
- Biometric encoder: Time-series biomarker patterns
- Joint layer: Combines all modalities

**Benefit**: 12-18% improvement in prediction accuracy

---

### 6. Recommendation Engine & Real-Time Alerts
**Purpose**: Suggest personalized diet changes and warn of health risks

#### 6a. Recommendation Engine (Hybrid)
- **Collaborative Filtering**:
  - Find users with similar profiles
  - Learn which meals improved their health markers
  - Suggest proven meals for current user

- **Reinforcement Learning**:
  - State: current health status, diet, preferences
  - Action: recommend meal/ingredient swap
  - Reward: biomarker improvement + user satisfaction

**Related Endpoints**:
- GET /api/recommendations/today
- GET /api/recommendations/suggestions?meal_type=lunch
- PUT /api/recommendations/:id/accept
- PUT /api/recommendations/:id/reject

#### 6b. Real-Time Alerts
- Rule-based: "Predicted glucose spike > 180 mg/dL"
- ML-based: Anomaly detection on biometrics
- Compliance-based: Violates health guidelines

**Related Endpoints**:
- GET /api/alerts
- GET /api/alerts/critical
- PUT /api/alerts/:id/acknowledge

---

### 7. Explainable AI (XAI) Module
**Purpose**: Build trust by explaining why predictions/recommendations are made

**Methods**:
- **SHAP Values**: Feature contribution to prediction
- **LIME**: Local interpretable approximations
- **Feature Importance**: Which nutrients matter most

**Output**:
```json
{
  "prediction": 155,
  "baseline": 120,
  "change": 35,
  "contributions": [
    {"feature": "Carbs (50g)", "impact": +25, "importance": 0.71},
    {"feature": "Sugar (15g)", "impact": +18, "importance": 0.51},
    {"feature": "Fiber (5g)", "impact": -8, "importance": 0.23}
  ],
  "explanation": "High carbs + sugar will spike glucose..."
}
```

**Related Endpoints**:
- POST /api/explanations/prediction/:id
- GET /api/explanations/prediction/:id

---

### 8. Compliance & Safety Module
**Purpose**: Ensure recommendations follow medical guidelines

**Rule Sets**:
- **AHA Guidelines**: Sodium, saturated fat limits
- **WHO Guidelines**: Sugar intake recommendations
- **Condition-Specific**: 
  - Diabetic: High GI food restrictions
  - Hypertensive: Sodium limits (<2300mg/day)
  - High Cholesterol: Saturated fat <10% of calories

**Workflow**:
1. Generate recommendation
2. Check against user's health conditions
3. Verify nutrient targets compliance
4. Adjust or block if unsafe
5. Return recommendation

---

### 9. Admin & Analytics Module
**Purpose**: Monitor system and research

**Features**:
- User statistics (registrations, engagement)
- Model performance dashboards
- A/B testing results
- Health outcome tracking
- System health monitoring

---

## Authentication & Security

### JWT Flow
```
1. User POST /auth/register
   └─ Password hashed with bcrypt
   └─ User stored in MongoDB
   
2. User POST /auth/login
   └─ Email + password verified
   └─ JWT token generated: {userId, expiresIn: "7d"}
   
3. User sends requests with Authorization header:
   "Authorization: Bearer <JWT_TOKEN>"
   
4. Middleware validates JWT
   └─ Extracts userId
   └─ Attaches to request object
   └─ Proceeds to route handler
```

### Security Best Practices
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT signed with environment variable (JWT_SECRET)
- HTTPS recommended for production
- CORS enabled for frontend domain
- Rate limiting (recommended for production)
- Input validation on all endpoints

---

## Deployment Architecture

### Development (Local)
```
Node Backend (5000) + MongoDB Local
  ↓
Flask Services (5001-5005) - Local Python
```

### Production
```
Node Backend (Cloud: AWS/Heroku)
  ↓
MongoDB Atlas
  ↓
ML Services (Flask on AWS Lambda / Google Cloud)
  ↓
Frontend (Vercel / Netlify)
  ↓
CDN (CloudFlare)
```

---

## Performance Considerations

### Scalability
- MongoDB sharding by userId for large datasets
- Caching predictions (Redis) - 1 hour TTL
- Batch prediction jobs for many users
- Async background tasks (Celery) for heavy computations

### Optimization
- Index meals by userId + timestamp
- Index biometrics by userId + type + timestamp
- Pagination on list endpoints (default: 50 items)
- Compression of responses (gzip)

### Monitoring
- Application Performance Monitoring (APM): New Relic / DataDog
- Error tracking: Sentry
- Logging: ELK Stack or CloudWatch
- Uptime monitoring: StatusPage

---

## Dataset Integration

**CGMacros Dataset (PhysioNet)**:
- Training LSTM: ~100+ CGM sequences
- Training XGBoost: ~1000 meal-biomarker pairs
- Evaluation: Held-out test set (20% of data)
- Metrics: RMSE, MAE, R² score

**Preprocessing**:
1. Align meals with CGM readings (±2 hour window)
2. Extract features from ingredients
3. Normalize time-series data
4. Handle missing values
5. Split train/validation/test

---

## Error Handling & Logging

All services include:
- Structured JSON logging
- Error codes for API responses
- Graceful degradation (e.g., if ML service unavailable)
- Retry logic for external API calls
- Validation of input data

---

**Last Updated**: December 2024
