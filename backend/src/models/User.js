const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Authentication
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },

    // Demographics
    age: {
      type: Number,
      min: 10,
      max: 120,
      default: 20  // Default for backward compatibility
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    height_cm: Number,
    weight_kg: Number,
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      default: 'moderate'
    },

    // BMI and Biometric Tracking
    currentBMI: Number,
    bmiCategory: {
      type: String,
      enum: ['underweight', 'healthy', 'overweight', 'obese', 'not_calculated']
    },
    bmiStatus: String,  // "Within Healthy Range", "Above Healthy Range", etc.
    
    // Biometric Data Completeness (for backward compatibility)
    biometricDataComplete: {
      type: Boolean,
      default: false
    },
    biometricDataEstimated: {
      type: Boolean,
      default: false  // True if using default values
    },
    lastBiometricUpdate: Date,  // Track when user last updated height/weight/age
    onboardingCompleted: {
      type: Boolean,
      default: false
    },

    // Health Profile
    healthConditions: [{
      type: String,
      enum: ['diabetes', 'hypertension', 'high_cholesterol', 'obesity', 'none']
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String
    }],

    // Dietary Preferences
    dietaryPreferences: [{
      type: String,
      enum: ['veg', 'non_veg', 'vegan', 'keto', 'gluten_free', 'vegetarian', 'non-vegetarian']
    }],
    allergies: [String],
    culturalRestrictions: [String],

    // Nutrient Targets (personalized)
    nutrientTargets: {
      calories: { type: Number, default: 2000 },
      carbs_g: { type: Number, default: 300 },
      protein_g: { type: Number, default: 50 },
      fat_g: { type: Number, default: 65 },
      fiber_g: { type: Number, default: 25 },
      sodium_mg: { type: Number, default: 2300 },
      sugar_g: { type: Number, default: 50 }
    },

    // Preferences
    notificationPreferences: {
      emailAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: true }
    },

    // Health Risk Profile
    healthRiskProfile: {
      diabetesRisk: {
        type: Number,
        min: 0,
        max: 1
      },
      hypertensionRisk: {
        type: Number,
        min: 0,
        max: 1
      },
      cholesterolRisk: {
        type: Number,
        min: 0,
        max: 1
      },
      overallHealthScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
      },
      riskFactors: [String],
      lastRiskAssessment: Date
    },

    // Personalization Profile (for ML)
    personalizationProfile: {
      foodPreferences: [{
        ingredient: String,
        likeScore: {
          type: Number,
          min: -1,
          max: 1
        }
      }],
      recommendationWeights: {
        health: { type: Number, default: 0.5 },
        taste: { type: Number, default: 0.5 },
        budget: { type: Number, default: 0.2 },
        convenience: { type: Number, default: 0.3 }
      },
      collaborativeFilteringVector: [Number]
    },

    // Biometric Baselines
    biometricBaselines: {
      fasting_glucose_baseline: Number,
      resting_bp_systolic_baseline: Number,
      resting_bp_diastolic_baseline: Number,
      fasting_cholesterol_baseline: Number,
      lastBaselineUpdate: Date
    },

    // Compliance Metrics
    complianceMetrics: {
      complianceScore: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5
      },
      recommendationsFollowed: {
        type: Number,
        default: 0
      },
      recommendationsIgnored: {
        type: Number,
        default: 0
      },
      averageFollowThroughRate: Number
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: Date,
    profileCompleteness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get user profile without sensitive data
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
