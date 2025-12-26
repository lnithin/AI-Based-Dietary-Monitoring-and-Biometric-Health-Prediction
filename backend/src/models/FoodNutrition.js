const mongoose = require('mongoose');

const foodNutritionSchema = new mongoose.Schema({
  foodName: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  servingSize: {
    amount: Number,
    unit: String,
    approxGram: Number
  },
  nutrition: {
    calories_kcal: Number,
    protein_g: Number,
    carbs_g: Number,
    fat_g: Number,
    fiber_g: Number,
    sodium_mg: Number
  },
  category: String,
  imagePath: String,
  imageFilename: String,
  cuisineType: {
    type: String,
    default: "South Indian"
  },
  allergens: [String],
  isVegetarian: Boolean,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FoodNutrition', foodNutritionSchema);
