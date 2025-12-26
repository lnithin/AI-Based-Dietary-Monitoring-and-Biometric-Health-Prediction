const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  portion_grams: {
    type: Number,
    default: 100
  },
  portion_unit: {
    type: String,
    enum: ['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'serving'],
    default: 'g'
  },
  // Macronutrients
  calories: Number,
  protein_g: Number,
  carbs_g: Number,
  fat_g: Number,
  saturated_fat_g: Number,
  trans_fat_g: Number,
  fiber_g: Number,
  sugar_g: Number,
  added_sugar_g: Number,
  sodium_mg: Number,
  cholesterol_mg: Number,
  // Micronutrients
  calcium_mg: Number,
  iron_mg: Number,
  magnesium_mg: Number,
  potassium_mg: Number,
  zinc_mg: Number,
  copper_mg: Number,
  vitamin_a_iu: Number,
  vitamin_c_mg: Number,
  vitamin_d_iu: Number,
  vitamin_e_mg: Number,
  folate_mcg: Number,
  vitamin_b12_mcg: Number,
  // Health metrics
  glycemic_index: Number,
  glycemic_load: Number,
  // NLP and data quality
  confidence_score: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  ingredient_id: mongoose.Schema.Types.ObjectId,
  usda_id: String, // Reference to USDA FoodData Central
  allergens: [String]
});

const mealSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    logType: {
      type: String,
      enum: ['text', 'image', 'label', 'manual'],
      required: true
    },

    // For text logs
    rawDescription: String,

    // For image logs
    imageUrl: String,
    imagePath: String,
    cvPredictions: [{
      dishName: String,
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }],

    // Ingredients & Nutrition (Macro & Micro)
    ingredients: [ingredientSchema],
    totalNutrition: {
      calories: Number,
      protein_g: Number,
      carbs_g: Number,
      fat_g: Number,
      saturated_fat_g: Number,
      fiber_g: Number,
      sugar_g: Number,
      sodium_mg: Number,
      cholesterol_mg: Number,
      calcium_mg: Number,
      iron_mg: Number,
      magnesium_mg: Number,
      potassium_mg: Number,
      zinc_mg: Number,
      vitamin_a_iu: Number,
      vitamin_c_mg: Number,
      vitamin_d_iu: Number,
      folate_mcg: Number,
      vitamin_b12_mcg: Number
    },
    // Health metrics
    healthMetrics: {
      glycemicIndex: Number,
      glycemicLoad: Number,
      allergens: [String]
    },

    // NLP Processing
    nlpProcessing: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      confidence: Number,
      extractedEntities: [String],
      processingTime_ms: Number
    },

    // User ratings & notes
    userRating: {
      type: Number,
      min: 1,
      max: 5
    },
    notes: String,

    // Prediction results
    predictedBiomarkers: {
      glucose_mg_dl: {
        value: Number,
        confidence: Number
      },
      bp_systolic: {
        value: Number,
        confidence: Number
      },
      bp_diastolic: {
        value: Number,
        confidence: Number
      }
    },

    // Alerts triggered
    alerts: [{
      type: String,
      severity: {
        type: String,
        enum: ['info', 'warning', 'critical']
      },
      message: String,
      recommendation: String
    }],

    // Status
    isProcessed: {
      type: Boolean,
      default: false
    },
    processingTime_ms: Number
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
mealSchema.index({ userId: 1, timestamp: -1 });
mealSchema.index({ mealType: 1 });

module.exports = mongoose.model('Meal', mealSchema);
