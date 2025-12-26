/**
 * Advanced Recommendation Engine
 * Generates personalized meal recommendations based on biometrics and health conditions
 */

const Meal = require('../models/Meal');
const Biometric = require('../models/Biometric');
const FoodNutrition = require('../models/FoodNutrition');

const RECOMMENDATION_RULES = {
  // Rules triggered by glucose levels
  glucose: {
    high: {
      condition: (value) => value > 160,
      severity: 'high',
      recommendations: [
        {
          type: 'meal_swap',
          name: 'Idli',
          reason: 'Low glycemic index (GI ~46) - absorbs slowly, prevents glucose spikes',
          healthBenefit: 'Maintains steady glucose levels'
        },
        {
          type: 'meal_swap',
          name: 'Appam',
          reason: 'Moderate GI ~56 with fermentation benefits - reduces glucose impact',
          healthBenefit: 'Better glucose control compared to high-GI foods'
        },
        {
          type: 'ingredient_replace',
          description: 'Replace white rice with brown rice or millets (lower GI)',
          reason: 'Brown rice (GI ~68) and millets (GI ~52) prevent glucose spikes',
          healthBenefit: 'Stabilize blood glucose post-meal'
        }
      ]
    },
    normal: {
      condition: (value) => value >= 100 && value <= 160,
      severity: 'medium',
      recommendations: []
    }
  },

  // Rules triggered by hypertension
  hypertension: {
    condition: (systolic, diastolic) => systolic >= 140 || diastolic >= 90,
    severity: 'critical',
    recommendations: [
      {
        type: 'nutrient_balance',
        focus: 'Reduce sodium intake',
        target: '< 2300 mg/day',
        reason: 'High sodium increases blood pressure',
        foodsToAvoid: ['Poori', 'Vada'],
        foodsToPrefer: ['Idli', 'Appam', 'Dosa']
      },
      {
        type: 'meal_suggestion',
        description: 'Prefer steamed/boiled preparations over fried',
        reason: 'Reduces sodium and unhealthy fats',
        healthBenefit: 'Lowers BP and prevents further elevation'
      }
    ]
  },

  // Rules for high cholesterol
  cholesterol: {
    high: {
      condition: (total) => total > 200,
      severity: 'high',
      recommendations: [
        {
          type: 'ingredient_replace',
          description: 'Use plant-based oils instead of ghee/butter',
          reason: 'Reduces LDL cholesterol',
          healthBenefit: 'Improve cholesterol profile'
        },
        {
          type: 'portion_adjustment',
          description: 'Increase fiber intake (vegetables, lentils)',
          reason: 'Soluble fiber binds cholesterol',
          healthBenefit: 'Reduces total and LDL cholesterol'
        }
      ]
    }
  },

  // Health condition-based rules
  healthCondition: {
    diabetes: {
      severity: 'critical',
      recommendations: [
        {
          type: 'meal_suggestion',
          focus: 'Low glycemic index foods',
          examples: ['Idli', 'Appam'],
          reason: 'Prevents rapid glucose spikes',
          priority: 'high'
        }
      ]
    },
    hypertension: {
      severity: 'high',
      recommendations: [
        {
          type: 'nutrient_balance',
          focus: 'Reduce sodium',
          target: '< 2300 mg/day',
          reason: 'Lower blood pressure',
          priority: 'high'
        }
      ]
    },
    obesity: {
      severity: 'medium',
      recommendations: [
        {
          type: 'portion_adjustment',
          focus: 'Caloric deficit',
          target: '500-750 kcal/day deficit',
          reason: 'Weight loss',
          priority: 'medium'
        }
      ]
    }
  }
};

class RecommendationEngine {
  /**
   * Generate comprehensive recommendations for a user
   */
  static async generateRecommendations(userId, mealType = 'lunch') {
    try {
      const [biometrics, recentMeals, user] = await Promise.all([
        Biometric.find({ userId }).sort({ timestamp: -1 }).limit(10),
        Meal.find({ userId }).sort({ timestamp: -1 }).limit(30),
        require('../models/User').findById(userId)
      ]);

      const recommendations = [];

      // 1. Analyze glucose trends
      const glucoseBiometrics = biometrics.filter((b) => b.biometricType === 'glucose');
      if (glucoseBiometrics.length > 0) {
        const latestGlucose = glucoseBiometrics[0].glucose_mg_dl;
        recommendations.push(...this.getGlucoseRecommendations(latestGlucose, mealType));
      }

      // 2. Analyze blood pressure
      const bpBiometrics = biometrics.filter((b) => b.biometricType === 'blood_pressure');
      if (bpBiometrics.length > 0) {
        const latestBP = bpBiometrics[0];
        recommendations.push(
          ...this.getBloodPressureRecommendations(latestBP.systolic, latestBP.diastolic, mealType)
        );
      }

      // 3. Apply health condition rules
      if (user?.healthConditions?.length > 0) {
        for (const condition of user.healthConditions) {
          recommendations.push(...this.getHealthConditionRecommendations(condition, mealType));
        }
      }

      // 4. Get meal suggestions from database
      const mealSuggestions = await this.getMealSuggestions(mealType, recommendations);

      // Deduplicate and prioritize
      const uniqueRecs = this.deduplicateRecommendations(recommendations);
      const prioritized = this.prioritizeRecommendations(uniqueRecs);

      return {
        recommendations: prioritized,
        suggestions: mealSuggestions,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return {
        recommendations: [],
        suggestions: [],
        error: error.message
      };
    }
  }

  /**
   * Get glucose-based recommendations
   */
  static getGlucoseRecommendations(glucoseValue, mealType) {
    const recommendations = [];
    const rules = RECOMMENDATION_RULES.glucose;

    if (rules.high.condition(glucoseValue)) {
      recommendations.push({
        type: 'nutrition_alert',
        priority: 'high',
        title: 'High Glucose Level Detected',
        description: `Your glucose is ${glucoseValue} mg/dL. Focus on low-glycemic meals.`,
        suggestions: rules.high.recommendations
      });
    }

    return recommendations;
  }

  /**
   * Get blood pressure-based recommendations
   */
  static getBloodPressureRecommendations(systolic, diastolic, mealType) {
    const recommendations = [];
    const rules = RECOMMENDATION_RULES.hypertension;

    if (rules.condition(systolic, diastolic)) {
      recommendations.push({
        type: 'bp_management',
        priority: 'critical',
        title: 'High Blood Pressure - Dietary Adjustments Needed',
        description: `Your BP is ${systolic}/${diastolic} mmHg. Reduce sodium and prefer lighter preparations.`,
        suggestions: rules.recommendations
      });
    }

    return recommendations;
  }

  /**
   * Get health condition-based recommendations
   */
  static getHealthConditionRecommendations(condition, mealType) {
    const recommendations = [];
    const conditionRules = RECOMMENDATION_RULES.healthCondition[condition?.toLowerCase()];

    if (conditionRules) {
      recommendations.push({
        type: 'health_condition',
        condition,
        priority: conditionRules.severity === 'critical' ? 'high' : 'medium',
        title: `Recommendations for ${condition}`,
        description: `Personalized suggestions based on your ${condition} diagnosis`,
        suggestions: conditionRules.recommendations
      });
    }

    return recommendations;
  }

  /**
   * Get actual meal suggestions from database
   */
  static async getMealSuggestions(mealType, recommendations) {
    try {
      const foods = await FoodNutrition.find().limit(10);
      const isHighGlucose = recommendations.some((r) => r.type === 'nutrition_alert');
      const isHighBP = recommendations.some((r) => r.type === 'bp_management');

      let suggestions = foods.map((food) => ({
        name: food.foodName,
        calories: food.nutrition?.calories_kcal || 0,
        protein_g: food.nutrition?.protein_g || 0,
        carbs_g: food.nutrition?.carbs_g || 0,
        fat_g: food.nutrition?.fat_g || 0,
        nutrition: food.nutrition,
        description: this.getDescription(food.foodName),
        suitable: this.isSuitable(food.foodName, isHighGlucose, isHighBP)
      }));

      // Prioritize suitable foods
      suggestions.sort((a, b) => {
        if (a.suitable !== b.suitable) return b.suitable ? 1 : -1;
        return b.suitable - a.suitable;
      });

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Error getting meal suggestions:', error);
      return [];
    }
  }

  /**
   * Determine if a food is suitable based on conditions
   */
  static isSuitable(foodName, isHighGlucose, isHighBP) {
    const lowGIFoods = ['Idli', 'Appam'];
    const lowSodiumFoods = ['Idli', 'Appam', 'Dosa'];
    const avoidHighGlucose = ['Puri', 'Vada'];
    const avoidHighBP = ['Poori', 'Vada'];

    let suitable = 1.0;

    if (isHighGlucose) {
      if (lowGIFoods.some((f) => foodName.toLowerCase().includes(f.toLowerCase()))) suitable += 0.2;
      if (avoidHighGlucose.some((f) => foodName.toLowerCase().includes(f.toLowerCase())))
        suitable -= 0.3;
    }

    if (isHighBP) {
      if (lowSodiumFoods.some((f) => foodName.toLowerCase().includes(f.toLowerCase()))) suitable += 0.2;
      if (avoidHighBP.some((f) => foodName.toLowerCase().includes(f.toLowerCase()))) suitable -= 0.3;
    }

    return Math.max(0, suitable);
  }

  /**
   * Get descriptive text for food
   */
  static getDescription(foodName) {
    const descriptions = {
      Idli: 'Steamed rice cake - high in carbs, low glycemic index',
      Appam: 'Fermented rice cake - moderate carbs, great for glucose control',
      Dosa: 'Crispy rice pancake - moderate calories, good protein from lentils',
      Chapati: 'Wheat flatbread - whole grain, good fiber content',
      Vada: 'Deep-fried lentil snack - high calories, avoid if BP/glucose elevated',
      Poori: 'Deep-fried wheat bread - high calories and sodium, limit for hypertension',
      Biryani: 'Rice-based dish - calorie-dense, moderate GI',
      'White Rice': 'High glycemic index - spike glucose quickly',
      Porotta: 'Layered flatbread - high fat, calorie-dense'
    };

    return descriptions[foodName] || 'South Indian food item';
  }

  /**
   * Remove duplicate recommendations
   */
  static deduplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter((rec) => {
      const key = `${rec.type}-${rec.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Prioritize recommendations by severity
   */
  static prioritizeRecommendations(recommendations) {
    const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
    return recommendations.sort(
      (a, b) => (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0)
    );
  }
}

module.exports = RecommendationEngine;
