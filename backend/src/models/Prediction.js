const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    mealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal'
    },

    // Prediction metadata
    predictionType: {
      type: String,
      enum: ['glucose', 'blood_pressure', 'cholesterol', 'multivariate'],
      required: true
    },
    modelUsed: {
      type: String,
      enum: ['lstm', 'xgboost', 'hybrid'],
      required: true
    },
    timeHorizon_minutes: {
      type: Number,
      default: 120 // Default: predict for next 2 hours
    },

    // Input features
    inputFeatures: {
      mealNutrients: {
        calories: Number,
        carbs_g: Number,
        protein_g: Number,
        fat_g: Number,
        sugar_g: Number,
        fiber_g: Number,
        sodium_mg: Number
      },
      userBaseline: {
        fasting_glucose: Number,
        resting_bp_systolic: Number,
        resting_bp_diastolic: Number
      },
      recentTrends: {
        avg_glucose_7d: Number,
        avg_bp_systolic_7d: Number,
        avg_bp_diastolic_7d: Number
      },
      timestamp: Date
    },

    // Predictions
    predictions: [{
      biomarkerType: String,
      timeStep_minutes: Number,
      predictedValue: Number,
      confidence: Number,
      lowerBound: Number, // 95% confidence interval
      upperBound: Number
    }],

    // Model performance on this prediction
    modelMetrics: {
      rmse: Number,
      mae: Number,
      r2_score: Number
    },

    // Explainability (SHAP/LIME)
    explainability: {
      method: {
        type: String,
        enum: ['shap', 'lime', 'attention', 'hybrid'],
        default: 'shap'
      },
      featureContributions: [{
        featureName: String,
        value: Number,
        shapValue: Number,
        direction: {
          type: String,
          enum: ['positive', 'negative']
        },
        importance: Number,
        confidence: Number
      }],
      baselineValue: Number,
      localExplanation: String
    },

    // Confidence intervals
    confidenceIntervals: {
      lower_90: Number,
      lower_95: Number,
      upper_90: Number,
      upper_95: Number
    },

    // Model metadata
    modelMetadata: {
      trainingDataSize: Number,
      lastRetrained: Date,
      trainingAccuracy: Number,
      validationRmse: Number
    },

    // Alerts generated
    alerts: [{
      severity: {
        type: String,
        enum: ['info', 'warning', 'critical']
      },
      message: String,
      threshold: Number,
      predictedValue: Number
    }],

    // Verification (if actual biometric was later recorded)
    verification: {
      actualValue: Number,
      recordedAt: Date,
      predictionError: Number,
      wasAccurate: Boolean
    },

    // Processing info
    processedAt: Date,
    processingTime_ms: Number
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
predictionSchema.index({ userId: 1, createdAt: -1 });
predictionSchema.index({ mealId: 1 });

module.exports = mongoose.model('Prediction', predictionSchema);
