# REST API Documentation

**Base URL**: `http://localhost:5000` (Development)

**Content-Type**: `application/json`

---

## Authentication Endpoints

### 1. Register User
```
POST /api/auth/register
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profileCompleteness": 0
  }
}
```

**Error** (400 Bad Request):
```json
{
  "error": "User already exists"
}
```

---

### 2. Login
```
POST /api/auth/login
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profileCompleteness": 50
  }
}
```

---

### 3. Verify Token
```
GET /api/auth/verify
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "valid": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

---

## User Profile Endpoints

### 4. Get User Profile
```
GET /api/users/profile
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "age": 35,
  "gender": "male",
  "height_cm": 180,
  "weight_kg": 75,
  "activityLevel": "moderate",
  "healthConditions": ["diabetes"],
  "medications": [
    {
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "twice daily"
    }
  ],
  "dietaryPreferences": ["vegetarian"],
  "allergies": ["peanuts"],
  "nutrientTargets": {
    "calories": 1800,
    "carbs_g": 225,
    "protein_g": 60,
    "fat_g": 60,
    "fiber_g": 30,
    "sodium_mg": 2000,
    "sugar_g": 25
  },
  "profileCompleteness": 85
}
```

---

### 5. Update User Profile
```
PUT /api/users/profile
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "age": 35,
  "gender": "male",
  "height_cm": 180,
  "weight_kg": 75,
  "activityLevel": "active",
  "healthConditions": ["diabetes", "hypertension"],
  "medications": [
    {
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "twice daily"
    }
  ],
  "dietaryPreferences": ["vegetarian"],
  "allergies": ["peanuts", "shellfish"],
  "nutrientTargets": {
    "calories": 1800,
    "carbs_g": 200,
    "protein_g": 70,
    "fat_g": 55,
    "fiber_g": 35,
    "sodium_mg": 1500,
    "sugar_g": 20
  }
}
```

**Response** (200 OK):
```json
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

---

## Meal Logging Endpoints

### 6. Log Meal (Text)
```
POST /api/meals/logText
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "mealType": "lunch",
  "timestamp": "2024-01-15T12:30:00Z",
  "description": "2 chapatis with potato curry and curd"
}
```

**Response** (201 Created):
```json
{
  "message": "Meal logged. Processing...",
  "mealId": "507f1f77bcf86cd799439012",
  "meal": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "mealType": "lunch",
    "timestamp": "2024-01-15T12:30:00Z",
    "logType": "text",
    "rawDescription": "2 chapatis with potato curry and curd",
    "nlpProcessing": {
      "status": "pending"
    }
  }
}
```

---

### 7. Log Meal (Image)
```
POST /api/meals/logImage
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "mealType": "lunch",
  "timestamp": "2024-01-15T12:30:00Z",
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA..."
}
```

**Response** (201 Created): Similar to logText

---

### 8. Log Meal (Nutrition Label)
```
POST /api/meals/logLabel
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "mealType": "snack",
  "timestamp": "2024-01-15T15:00:00Z",
  "labelImageBase64": "data:image/jpeg;base64,..."
}
```

---

### 9. Get User Meals
```
GET /api/meals?startDate=2024-01-01&endDate=2024-01-31&mealType=lunch&limit=50&skip=0
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
- `startDate` (optional): ISO 8601 format
- `endDate` (optional): ISO 8601 format
- `mealType` (optional): breakfast | lunch | dinner | snack
- `limit` (optional, default: 50)
- `skip` (optional, default: 0)

**Response** (200 OK):
```json
{
  "meals": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "mealType": "lunch",
      "timestamp": "2024-01-15T12:30:00Z",
      "logType": "text",
      "ingredients": [
        {
          "name": "Chapati",
          "portion_grams": 110,
          "calories": 300,
          "protein_g": 9,
          "carbs_g": 56,
          "fat_g": 5,
          "fiber_g": 3
        }
      ],
      "totalNutrition": {
        "calories": 450,
        "protein_g": 15,
        "carbs_g": 80,
        "fat_g": 10,
        "fiber_g": 5,
        "sodium_mg": 400,
        "sugar_g": 5
      },
      "nlpProcessing": {
        "status": "completed",
        "confidence": 0.85
      },
      "predictedBiomarkers": {
        "glucose_mg_dl": {
          "value": 160,
          "confidence": 0.72
        }
      },
      "alerts": [
        {
          "severity": "warning",
          "message": "High carb meal - predicted glucose spike",
          "recommendation": "Consider adding more vegetables"
        }
      ]
    }
  ],
  "pagination": {
    "total": 125,
    "limit": 50,
    "skip": 0
  }
}
```

---

### 10. Get Meal Details
```
GET /api/meals/:mealId
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK): Single meal object (see above)

---

### 11. Update Meal
```
PUT /api/meals/:mealId
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "ingredients": [
    {
      "name": "Chicken",
      "portion_grams": 150,
      "calories": 220,
      "protein_g": 40,
      "carbs_g": 0,
      "fat_g": 5,
      "fiber_g": 0,
      "sodium_mg": 100
    }
  ],
  "userRating": 4,
  "notes": "Tasted good, felt satisfied"
}
```

---

### 12. Delete Meal
```
DELETE /api/meals/:mealId
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Biometric Endpoints

### 13. Log Biometric Data
```
POST /api/biometrics
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "biometricType": "glucose",
  "timestamp": "2024-01-15T14:30:00Z",
  "glucose_mg_dl": 145,
  "dataSource": "manual_entry",
  "notes": "Post-lunch reading"
}
```

**Alternative: Blood Pressure**:
```json
{
  "biometricType": "blood_pressure",
  "timestamp": "2024-01-15T09:00:00Z",
  "systolic": 135,
  "diastolic": 85,
  "dataSource": "bp_monitor",
  "deviceName": "Omron BP Monitor"
}
```

**Response** (201 Created):
```json
{
  "message": "Biometric data recorded",
  "biometric": {
    "_id": "507f1f77bcf86cd799439013",
    "userId": "507f1f77bcf86cd799439011",
    "biometricType": "glucose",
    "timestamp": "2024-01-15T14:30:00Z",
    "glucose_mg_dl": 145,
    "dataSource": "manual_entry",
    "confidence": 0.95
  }
}
```

---

### 14. Get Biometric Readings
```
GET /api/biometrics?biometricType=glucose&startDate=2024-01-01&endDate=2024-01-31&limit=100&skip=0
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
- `biometricType` (optional): glucose | blood_pressure | heart_rate | cholesterol | body_temperature | weight
- `startDate` (optional)
- `endDate` (optional)
- `limit` (optional, default: 100)
- `skip` (optional, default: 0)

**Response** (200 OK):
```json
{
  "readings": [...],
  "pagination": {
    "total": 45,
    "limit": 100,
    "skip": 0
  }
}
```

---

### 15. Get Biometric Statistics
```
GET /api/biometrics/stats/glucose?days=7
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
- `days` (optional, default: 7)

**Response** (200 OK):
```json
{
  "average": 135.5,
  "min": 95,
  "max": 180,
  "latest": 145,
  "trend": 8,
  "readingCount": 15,
  "dateRange": {
    "start": "2024-01-08T00:00:00Z",
    "end": "2024-01-15T23:59:59Z"
  }
}
```

**For Blood Pressure**:
```json
{
  "systolic": {
    "average": 130,
    "min": 120,
    "max": 145,
    "latest": 135
  },
  "diastolic": {
    "average": 82,
    "min": 75,
    "max": 92,
    "latest": 85
  },
  "readingCount": 10,
  "dateRange": {...}
}
```

---

### 16. Get Latest Reading
```
GET /api/biometrics/latest/glucose
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK): Latest biometric object

---

## Prediction Endpoints

### 17. Generate Prediction
```
POST /api/predictions/generate
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "mealId": "507f1f77bcf86cd799439012",
  "predictionType": "glucose",
  "timeHorizon_minutes": 120,
  "modelUsed": "hybrid"
}
```

**Response** (201 Created):
```json
{
  "message": "Prediction generated",
  "prediction": {
    "_id": "507f1f77bcf86cd799439014",
    "userId": "507f1f77bcf86cd799439011",
    "mealId": "507f1f77bcf86cd799439012",
    "predictionType": "glucose",
    "timeHorizon_minutes": 120,
    "modelUsed": "hybrid",
    "predictions": [
      {
        "biomarkerType": "glucose",
        "timeStep_minutes": 30,
        "predictedValue": 155.0,
        "confidence": 0.72,
        "lowerBound": 140.0,
        "upperBound": 170.0
      },
      {
        "biomarkerType": "glucose",
        "timeStep_minutes": 60,
        "predictedValue": 165.0,
        "confidence": 0.68,
        "lowerBound": 145.0,
        "upperBound": 185.0
      },
      {
        "biomarkerType": "glucose",
        "timeStep_minutes": 120,
        "predictedValue": 145.0,
        "confidence": 0.65,
        "lowerBound": 120.0,
        "upperBound": 170.0
      }
    ],
    "alerts": [
      {
        "severity": "warning",
        "message": "Predicted glucose spike to 165 mg/dL at 1 hour",
        "threshold": 180,
        "predictedValue": 165
      }
    ],
    "modelMetrics": {
      "rmse": 18.5,
      "mae": 15.2,
      "r2_score": 0.72
    }
  }
}
```

---

### 18. Get Predictions
```
GET /api/predictions?predictionType=glucose&startDate=2024-01-01&limit=50&skip=0
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

---

### 19. Verify Prediction
```
PUT /api/predictions/:predictionId/verify
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "actualValue": 150,
  "recordedAt": "2024-01-15T14:30:00Z"
}
```

**Response** (200 OK): Updated prediction with verification data

---

## Recommendation Endpoints

### 20. Get Recommendations
```
GET /api/recommendations?status=pending&priority=high&limit=20&skip=0
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
- `status` (optional): pending | presented | accepted | rejected | expired
- `priority` (optional): low | medium | high | critical
- `limit`, `skip`: pagination

**Response** (200 OK):
```json
{
  "recommendations": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "userId": "507f1f77bcf86cd799439011",
      "recommendationType": "meal_swap",
      "priority": "high",
      "triggeredBy": "meal_logged",
      "title": "Swap Lunch for Lower Carb Option",
      "description": "Your lunch has high carbs + sugar. This could spike glucose.",
      "reason": "Preventing glucose spike > 180 mg/dL",
      "recommendation": {
        "currentMeal": "Rice with curry",
        "suggestedMeal": "Grilled chicken salad"
      },
      "confidence": 0.85,
      "expectedImpact": {
        "biomarkerType": "glucose",
        "expectedChange": -35,
        "expectedChangeUnit": "mg/dL"
      },
      "explainedBy": {
        "method": "shap",
        "featureImportance": [
          {
            "feature": "Rice (carbs)",
            "importance": 0.6,
            "direction": "positive"
          },
          {
            "feature": "Fiber",
            "importance": 0.3,
            "direction": "negative"
          }
        ]
      },
      "status": "pending",
      "expiresAt": "2024-01-15T18:00:00Z"
    }
  ],
  "pagination": {
    "total": 8,
    "limit": 20,
    "skip": 0
  }
}
```

---

### 21. Get Today's Recommendations
```
GET /api/recommendations/today
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

---

### 22. Get Meal Suggestions
```
GET /api/recommendations/suggestions?meal_type=lunch
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
- `meal_type`: breakfast | lunch | dinner | snack

**Response** (200 OK):
```json
{
  "suggestions": [
    {
      "name": "Grilled chicken salad",
      "calories": 380,
      "carbs_g": 20,
      "protein_g": 40,
      "fat_g": 12,
      "fiber_g": 6,
      "sugar_g": 4,
      "sodium_mg": 420,
      "health_score": 9.0,
      "recommendation_score": 9.2
    },
    {
      "name": "Brown rice bowl with veggies",
      "calories": 450,
      "carbs_g": 60,
      "protein_g": 14,
      "fat_g": 10,
      "fiber_g": 7,
      "sugar_g": 6,
      "sodium_mg": 380,
      "health_score": 8.3,
      "recommendation_score": 8.0
    }
  ]
}
```

---

### 23. Accept Recommendation
```
PUT /api/recommendations/:recId/accept
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "helpful": true,
  "reason": "Will try this meal tomorrow"
}
```

---

### 24. Reject Recommendation
```
PUT /api/recommendations/:recId/reject
```

**Similar to accept endpoint**

---

## Alert Endpoints

### 25. Get Alerts
```
GET /api/alerts?isRead=false&severity=warning&limit=50&skip=0
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
- `isRead` (optional): true | false
- `severity` (optional): info | warning | critical
- `limit`, `skip`: pagination

**Response** (200 OK):
```json
{
  "alerts": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "userId": "507f1f77bcf86cd799439011",
      "alertType": "glucose_spike",
      "severity": "warning",
      "triggeredBy": "prediction",
      "title": "High Glucose Predicted",
      "message": "Predicted glucose spike to 180 mg/dL after lunch",
      "additionalContext": {
        "measuredValue": 175,
        "thresholdValue": 180,
        "unit": "mg/dL"
      },
      "suggestedAction": "Consider lighter lunch with more vegetables",
      "isRead": false,
      "status": "pending"
    }
  ],
  "unreadCount": 5,
  "pagination": {
    "total": 42,
    "limit": 50,
    "skip": 0
  }
}
```

---

### 26. Get Critical Alerts
```
GET /api/alerts/critical
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

---

### 27. Mark Alert as Read
```
PUT /api/alerts/:alertId/read
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

---

### 28. Acknowledge Alert
```
PUT /api/alerts/:alertId/acknowledge
```

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "userResponse": "I will reduce carbs at next meal"
}
```

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "error": "Description of error",
  "status": 400,
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Common HTTP Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Rate Limiting (Recommended for Production)

- 100 requests per minute per user
- 1000 requests per hour per user
- Headers returned with remaining quota

---

**Last Updated**: December 2024
