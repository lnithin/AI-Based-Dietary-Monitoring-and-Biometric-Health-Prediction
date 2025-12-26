const mongoose = require('mongoose');

const explainabilityLogSchema = new mongoose.Schema({
  predictionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prediction',
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  mealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meal'
  },
  
  // Feature contributions (SHAP, LIME, etc.)
  featureContributions: {
    // Macronutrients
    carbohydrates_g: Number,
    protein_g: Number,
    fat_g: Number,
    fiber_g: Number,
    sugar_g: Number,
    sodium_mg: Number,
    
    // Micronutrients
    calcium_mg: Number,
    iron_mg: Number,
    magnesium_mg: Number,
    potassium_mg: Number,
    
    // Biometric context
    baselineGlucose: Number,
    heartRate: Number,
    activityLevel: Number,
    stressLevel: Number,
    sleepQuality: Number,
    
    // Time-based
    hoursAfterMeal: Number,
    timeOfDay: Number
  },
  
  // Explanation method used
  method: {
    type: String,
    enum: ['SHAP', 'LIME', 'Attention', 'Feature Importance', 'Rule-based'],
    default: 'SHAP',
    required: true
  },
  
  // Top contributing features (sorted by impact)
  topContributors: [{
    featureName: String,
    contribution: Number,
    percentageImpact: Number
  }],
  
  // Prediction output details
  prediction: {
    baselineGlucose: Number,
    predictedGlucose: Number,
    delta: Number,
    riskLevel: String,
    confidence: Number
  },
  
  // Model version used for this prediction
  modelVersion: {
    type: String,
    ref: 'ModelMetadata'
  },
  
  // Human-readable explanation
  explanation: {
    summary: String, // e.g., "High carbohydrates predicted 45 mg/dL increase"
    keyFactors: [String], // List of main contributing factors
    recommendations: [String], // Suggested actions based on explanation
    confidenceLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low']
    }
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Composite index for user + time queries
explainabilityLogSchema.index({ userId: 1, timestamp: -1 });
explainabilityLogSchema.index({ predictionId: 1 });

module.exports = mongoose.model('ExplainabilityLog', explainabilityLogSchema);
