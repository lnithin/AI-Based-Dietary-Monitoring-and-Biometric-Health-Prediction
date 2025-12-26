const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Recommendation metadata
    recommendationType: {
      type: String,
      enum: ['meal_swap', 'portion_adjustment', 'ingredient_replace', 'meal_suggestion', 'nutrient_balance'],
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },

    // Trigger
    triggeredBy: {
      type: String,
      enum: ['meal_logged', 'biometric_anomaly', 'trend_analysis', 'user_request', 'schedule'],
      required: true
    },
    linkedMealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal'
    },
    linkedBiometricId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Biometric'
    },

    // Recommendation content
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    reason: String, // Explain why this recommendation is made
    expectedImpact: {
      biomarkerType: String, // glucose, bp, cholesterol
      expectedChange: Number, // e.g., -15 mg/dL for glucose
      expectedChangeUnit: String
    },

    // Specific recommendation (varies by type)
    recommendation: {
      // For meal_swap
      currentMeal: String,
      suggestedMeal: String,

      // For portion_adjustment
      nutrientType: String, // carbs, sodium, fat, etc.
      currentAmount: Number,
      suggestedAmount: Number,

      // For ingredient_replace
      ingredientToReplace: String,
      suggestedReplacement: String,
      reason_for_replacement: String,

      // For meal_suggestion
      suggestedMealType: String,
      suggestedDish: String,
      estimatedNutrients: {
        calories: Number,
        carbs_g: Number,
        protein_g: Number
      },

      // For nutrient_balance
      nutrientTargets: {
        nutrientName: String,
        current: Number,
        target: Number,
        unit: String
      }
    },

    // Confidence & reasoning
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    reasoningChain: [String], // Steps taken to generate this recommendation

    // Generative AI explanation
    explainedBy: {
      method: {
        type: String,
        enum: ['shap', 'lime', 'attention', 'rule_based'],
        default: 'rule_based'
      },
      featureImportance: [
        {
          feature: String,
          importance: Number,
          direction: String // positive or negative
        }
      ]
    },

    // User interaction
    userFeedback: {
      accepted: Boolean,
      helpful: Boolean,
      reason: String
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'presented', 'accepted', 'rejected', 'expired'],
      default: 'pending'
    },
    expiresAt: Date,

    // Collaborative filtering data
    similarUsers: {
      count: Number,
      successRate: Number // % of similar users who improved metrics
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
recommendationSchema.index({ userId: 1, status: 1, createdAt: -1 });
recommendationSchema.index({ priority: 1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
