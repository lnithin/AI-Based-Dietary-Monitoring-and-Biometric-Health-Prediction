const mongoose = require('mongoose');

const biometricSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    biometricType: {
      type: String,
      enum: ['glucose', 'blood_pressure', 'heart_rate', 'cholesterol', 'body_temperature', 'weight'],
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },

    // For glucose readings
    glucose_mg_dl: Number,

    // For blood pressure readings
    systolic: Number,
    diastolic: Number,

    // For heart rate
    heart_rate_bpm: Number,

    // For cholesterol
    total_cholesterol: Number,
    ldl_cholesterol: Number,
    hdl_cholesterol: Number,
    triglycerides: Number,

    // For body temperature
    temperature_celsius: Number,

    // For weight
    weight_kg: Number,

    // BMI data (calculated for weight entries)
    bmi: Number,
    bmiCategory: {
      type: String,
      enum: ['underweight', 'healthy', 'overweight', 'obese', 'below_5th', '5th_to_85th', '85th_to_95th', 'above_95th']
    },
    bmiStatus: String, // Human-readable status
    bmiAgeGroup: {
      type: String,
      enum: ['adult', 'pediatric']
    },

    // Data source
    dataSource: {
      type: String,
      enum: ['cgm_device', 'bp_monitor', 'smartwatch', 'fitbit', 'manual_entry', 'lab_test'],
      default: 'manual_entry'
    },
    deviceId: String, // For wearable integration
    deviceName: String,

    // Linked meals (multiple correlations)
    linkedMeals: [{
      mealId: mongoose.Schema.Types.ObjectId,
      timeAfterMeal_minutes: Number,
      correlationStrength: Number,
      estimatedImpactValue: Number
    }],

    // Risk indicators
    riskIndicators: {
      glucoseRisk: {
        type: String,
        enum: ['normal', 'prediabetic', 'diabetic'],
        default: 'normal'
      },
      bpRisk: {
        type: String,
        enum: ['optimal', 'elevated', 'stage1', 'stage2'],
        default: 'optimal'
      },
      cholesterolRisk: {
        type: String,
        enum: ['desirable', 'borderline', 'high'],
        default: 'desirable'
      },
      overallRiskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    },

    // Data quality
    isOutlier: Boolean,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    dataQuality: {
      signalNoise: Number,
      calibrationStatus: String,
      deviceBattery: Number,
      syncStatus: {
        type: String,
        enum: ['synced', 'pending', 'failed'],
        default: 'synced'
      }
    },

    // Notes
    notes: String,

    // Processed flag
    isProcessed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
biometricSchema.index({ userId: 1, timestamp: -1 });
biometricSchema.index({ biometricType: 1 });
biometricSchema.index({ userId: 1, biometricType: 1, timestamp: -1 });

module.exports = mongoose.model('Biometric', biometricSchema);
