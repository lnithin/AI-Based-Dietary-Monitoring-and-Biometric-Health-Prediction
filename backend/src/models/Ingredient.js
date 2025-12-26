const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    aliases: [String],  // "broccoli", "brocoli", "brokkoli"
    category: {
      type: String,
      enum: ['vegetable', 'fruit', 'grain', 'protein', 'dairy', 'fat_oil', 'spice', 'beverage', 'processed'],
      required: true
    },

    // Portion Sizes
    standardPortion: {
      grams: Number,
      unit: String,
      description: String  // e.g., "1 medium apple"
    },
    alternatePortions: [{
      grams: Number,
      unit: String,
      description: String
    }],

    // Macronutrients (per 100g)
    macroNutrients: {
      calories: Number,
      protein_g: Number,
      carbs_g: Number,
      fat_g: Number,
      saturatedFat_g: Number,
      transFat_g: Number,
      fiber_g: Number,
      sugar_g: Number,
      addedSugar_g: Number,
      sodium_mg: Number,
      cholesterol_mg: Number
    },

    // Micronutrients (per 100g)
    microNutrients: {
      calcium_mg: Number,
      iron_mg: Number,
      magnesium_mg: Number,
      phosphorus_mg: Number,
      potassium_mg: Number,
      zinc_mg: Number,
      copper_mg: Number,
      manganese_mg: Number,
      vitaminA_iu: Number,
      vitaminC_mg: Number,
      vitaminD_iu: Number,
      vitaminE_mg: Number,
      vitaminK_mcg: Number,
      folate_mcg: Number,
      vitaminB12_mcg: Number
    },

    // Health Metrics
    healthMetrics: {
      glycemicIndex: {
        type: Number,
        min: 0,
        max: 100
      },
      glycemicLoad: Number,  // Per 100g serving
      insulinIndex: Number,
      allergens: [String],  // e.g., ['gluten', 'nuts', 'dairy']
      vegetarian: Boolean,
      vegan: Boolean,
      keto_friendly: Boolean,
      lowSodium: Boolean,
      lowSugar: Boolean
    },

    // Data Source
    dataSource: {
      type: String,
      enum: ['usda_fdc', 'local_db', 'ml_predicted', 'user_submitted'],
      default: 'usda_fdc'
    },
    usda_fdc_id: String,
    reliability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.9  // Data quality score
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },

    // Search Optimization
    keywords: [String],  // For NLP matching
    commonCookingMethods: [String],  // ['grilled', 'steamed', 'fried']
    commonBrands: [String],

    // Popularity & Usage
    searchFrequency: {
      type: Number,
      default: 0
    },
    usageCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for efficient queries
ingredientSchema.index({ name: 1 });
ingredientSchema.index({ category: 1 });
ingredientSchema.index({ keywords: 1 });
ingredientSchema.index({ aliases: 1 });

module.exports = mongoose.model('Ingredient', ingredientSchema);
