const User = require('../models/User');

const calculateProfileCompleteness = (user) => {
  const requiredFields = [
    'firstName',
    'lastName',
    'age',
    'gender',
    'height_cm',
    'weight_kg',
    'healthConditions'
  ];

  const filledFields = requiredFields.filter(field => {
    const value = user[field];
    return value !== undefined && value !== null && value !== '';
  });

  return Math.round((filledFields.length / requiredFields.length) * 100);
};

const getNutrientTargets = (user) => {
  // If user has custom targets, return those
  if (user.nutrientTargets) {
    return user.nutrientTargets;
  }

  // Otherwise, return defaults based on health conditions
  const constants = require('../config/constants');

  if (user.healthConditions && user.healthConditions.includes('diabetes')) {
    return constants.NUTRIENT_TARGETS.DIABETIC;
  }

  if (user.healthConditions && user.healthConditions.includes('hypertension')) {
    return constants.NUTRIENT_TARGETS.HYPERTENSION;
  }

  return constants.NUTRIENT_TARGETS.DEFAULT;
};

const checkNutrientCompliance = (mealNutrition, targets) => {
  const violations = [];

  if (mealNutrition.sodium_mg > targets.sodium_mg) {
    violations.push({
      nutrient: 'sodium',
      current: mealNutrition.sodium_mg,
      limit: targets.sodium_mg,
      percentage: Math.round((mealNutrition.sodium_mg / targets.sodium_mg) * 100)
    });
  }

  if (mealNutrition.sugar_g > targets.sugar_g * 0.5) {
    // Alert if meal has more than 50% of daily sugar
    violations.push({
      nutrient: 'sugar',
      current: mealNutrition.sugar_g,
      daily_limit: targets.sugar_g,
      percentage: Math.round((mealNutrition.sugar_g / targets.sugar_g) * 100)
    });
  }

  return violations;
};

module.exports = {
  calculateProfileCompleteness,
  getNutrientTargets,
  checkNutrientCompliance
};
