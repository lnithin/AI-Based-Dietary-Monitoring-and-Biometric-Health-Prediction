/**
 * Ingredient Extraction Service using NLP (Named Entity Recognition)
 * As described in the research paper - Section III.2
 * 
 * This service extracts individual ingredients from text descriptions
 * and maps them to nutritional values from standardized databases
 */

const FoodNutrition = require('../models/FoodNutrition');

class IngredientExtractor {
  constructor() {
    // Common food keywords and patterns
    this.foodKeywords = [
      'rice', 'wheat', 'bread', 'roti', 'chapati', 'dosa', 'idli',
      'chicken', 'mutton', 'fish', 'egg', 'paneer', 'tofu',
      'milk', 'curd', 'yogurt', 'cheese', 'butter', 'ghee',
      'potato', 'tomato', 'onion', 'carrot', 'beans', 'peas',
      'apple', 'banana', 'orange', 'mango', 'grapes',
      'sugar', 'salt', 'oil', 'spices', 'masala'
    ];

    // Nutrition risk indicators
    this.riskKeywords = {
      highSodium: ['salt', 'sodium', 'soy sauce', 'pickle', 'papad'],
      highSugar: ['sugar', 'jaggery', 'honey', 'syrup', 'candy', 'sweet'],
      highFat: ['oil', 'butter', 'ghee', 'cream', 'fried', 'deep-fried'],
      refined: ['white bread', 'maida', 'refined flour', 'white rice']
    };
  }

  /**
   * Extract ingredients from text using Named Entity Recognition (NER)
   * Paper Reference: Section III.2 - "Ingredient Extraction and Nutritional Mapping"
   */
  async extractFromText(description) {
    const words = description.toLowerCase().split(/[\s,;.]+/);
    const detectedIngredients = [];
    const confidenceScores = [];

    // Simple NER - detect food keywords
    for (const word of words) {
      for (const keyword of this.foodKeywords) {
        if (word.includes(keyword) || keyword.includes(word)) {
          // Search in database
          const nutritionData = await this.findNutritionData(keyword);
          
          if (nutritionData) {
            detectedIngredients.push({
              name: keyword,
              detected_from: 'text',
              confidence: this.calculateConfidence(word, keyword),
              nutrition: nutritionData
            });
          }
        }
      }
    }

    return {
      ingredients: detectedIngredients,
      rawText: description,
      extractionMethod: 'NLP-NER',
      timestamp: new Date()
    };
  }

  /**
   * Analyze health risks based on ingredient composition
   * Paper Reference: Section III.5 - "Recommendation Engine and Real-Time Alerts"
   */
  analyzeHealthRisks(ingredients, userProfile) {
    const risks = [];

    // Check for high sodium (hypertension risk)
    const totalSodium = ingredients.reduce((sum, ing) => 
      sum + (ing.nutrition?.sodium_mg || 0), 0
    );
    if (totalSodium > 2300 && userProfile.healthConditions?.includes('hypertension')) {
      risks.push({
        type: 'HIGH_SODIUM',
        severity: 'high',
        value: totalSodium,
        threshold: 2300,
        message: 'High sodium detected. May increase blood pressure.',
        recommendation: 'Reduce salt intake or choose low-sodium alternatives.'
      });
    }

    // Check for high sugar (diabetes risk)
    const totalSugar = ingredients.reduce((sum, ing) => 
      sum + (ing.nutrition?.sugar_g || 0), 0
    );
    if (totalSugar > 50 && userProfile.healthConditions?.includes('diabetes')) {
      risks.push({
        type: 'HIGH_SUGAR',
        severity: 'critical',
        value: totalSugar,
        threshold: 50,
        message: 'High sugar content. May spike blood glucose levels.',
        recommendation: 'Choose sugar-free or low-GI alternatives.'
      });
    }

    // Check for saturated fat (cholesterol risk)
    const totalSatFat = ingredients.reduce((sum, ing) => 
      sum + (ing.nutrition?.saturated_fat_g || 0), 0
    );
    if (totalSatFat > 20 && userProfile.healthConditions?.includes('high_cholesterol')) {
      risks.push({
        type: 'HIGH_SATURATED_FAT',
        severity: 'high',
        value: totalSatFat,
        threshold: 20,
        message: 'High saturated fat. May increase cholesterol levels.',
        recommendation: 'Choose lean proteins and healthy fats.'
      });
    }

    return risks;
  }

  /**
   * Find nutrition data from database
   */
  async findNutritionData(ingredientName) {
    try {
      const food = await FoodNutrition.findOne({
        $or: [
          { food_name: new RegExp(ingredientName, 'i') },
          { category: new RegExp(ingredientName, 'i') }
        ]
      }).limit(1);

      if (food) {
        return {
          calories: food.calories_per_100g,
          protein_g: food.protein_g,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
          saturated_fat_g: food.saturated_fat_g,
          fiber_g: food.fiber_g,
          sugar_g: food.sugar_g,
          sodium_mg: food.sodium_mg,
          source: 'database',
          food_id: food._id
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding nutrition data:', error);
      return null;
    }
  }

  /**
   * Calculate confidence score for ingredient detection
   */
  calculateConfidence(detected, actual) {
    if (detected === actual) return 1.0;
    if (detected.includes(actual)) return 0.9;
    if (actual.includes(detected)) return 0.85;
    return 0.7;
  }

  /**
   * Generate SHAP-like feature importance for explainability
   * Paper Reference: Section III.6 - "Explainability and User Feedback"
   */
  generateFeatureImportance(ingredients, prediction) {
    return ingredients.map(ing => ({
      ingredient: ing.name,
      impact_on_glucose: this.calculateImpact(ing.nutrition?.sugar_g, ing.nutrition?.carbs_g),
      impact_on_bp: this.calculateImpact(ing.nutrition?.sodium_mg, null),
      impact_on_cholesterol: this.calculateImpact(ing.nutrition?.saturated_fat_g, ing.nutrition?.cholesterol_mg),
      contribution_percentage: Math.random() * 100 // Placeholder - would use actual SHAP values
    }));
  }

  calculateImpact(primary, secondary) {
    const p = primary || 0;
    const s = secondary || 0;
    return Math.min((p * 0.7 + s * 0.3) / 100, 1.0);
  }
}

module.exports = new IngredientExtractor();
