const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Alert Classification
    alertType: {
      type: String,
      enum: [
        'glucose_spike',
        'glucose_low',
        'bp_elevated',
        'bp_critical',
        'cholesterol_high',
        'sodium_excess',
        'sugar_excess',
        'nutrient_deficiency',
        'allergen_detected',
        'medication_interaction',
        'compliance_warning',
        'prediction_anomaly',
        'hydration_alert',
        'fiber_low',
        'protein_low',
        'calorie_excess'
      ],
      required: true
    },

    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'emergency'],
      default: 'warning'
    },

    // Trigger Information
    triggeredBy: {
      type: String,
      enum: ['biometric_reading', 'meal_logged', 'prediction', 'pattern_detection', 'threshold_breach'],
      required: true
    },

    // Linked Records
    linkedMealId: mongoose.Schema.Types.ObjectId,
    linkedBiometricId: mongoose.Schema.Types.ObjectId,
    linkedPredictionId: mongoose.Schema.Types.ObjectId,

    // Alert Content
    title: String,
    message: String,
    reason: String,  // Detailed explanation
    detailedAnalysis: String,

    // Recommendation
    suggestedAction: {
      action: String,  // 'reduce_carbs', 'increase_fiber', 'reduce_sodium'
      parameter: String,  // What to adjust (e.g., 'carbs', 'sodium')
      currentValue: Number,
      recommendedValue: Number,
      expectedOutcome: String,
      timeframe: String  // e.g., 'next_week', 'immediate'
    },

    // Alternative recommendations
    alternativeSuggestions: [{
      action: String,
      explanation: String
    }],

    // Compliance & Follow-up
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    isAcknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: Date,
    userResponse: {
      action: {
        type: String,
        enum: ['follow', 'ignore', 'snooze', 'escalate']
      },
      timestamp: Date,
      reason: String,
      feedback: String
    },

    // Temporal
    timestamp: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,  // When alert becomes irrelevant
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },

    // Notification status
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationChannel: {
      type: String,
      enum: ['email', 'sms', 'push', 'in_app'],
      default: 'in_app'
    },
    notificationSentAt: Date,

    // Related health context
    healthContext: {
      userHealthConditions: [String],  // e.g., ['diabetes', 'hypertension']
      relevantMedications: [String],
      recentTrends: String,  // e.g., 'glucose_trending_up_7_days'
      riskScore: Number  // 0-100
    }
  },
  {
    timestamps: true
  }
);

// Create indexes
alertSchema.index({ userId: 1, timestamp: -1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ alertType: 1 });
alertSchema.index({ isRead: 1 });
alertSchema.index({ userId: 1, isRead: 1 });

// TTL index for auto-expiry
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Alert', alertSchema);
