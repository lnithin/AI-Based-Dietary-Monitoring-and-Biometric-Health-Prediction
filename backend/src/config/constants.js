// Health Conditions
const HEALTH_CONDITIONS = {
  DIABETES: 'diabetes',
  HYPERTENSION: 'hypertension',
  HIGH_CHOLESTEROL: 'high_cholesterol',
  OBESITY: 'obesity',
  NONE: 'none'
};

// Dietary Preferences
const DIETARY_PREFERENCES = {
  VEG: 'vegetarian',
  NON_VEG: 'non-vegetarian',
  VEGAN: 'vegan',
  KETO: 'keto',
  GLUTEN_FREE: 'gluten_free'
};

// Biometric Types
const BIOMETRIC_TYPES = {
  GLUCOSE: 'glucose',
  BLOOD_PRESSURE: 'blood_pressure',
  HEART_RATE: 'heart_rate',
  CHOLESTEROL: 'cholesterol',
  BODY_TEMP: 'body_temperature'
};

// Meal Types
const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack'
};

// Nutrient Targets (daily recommendations)
const NUTRIENT_TARGETS = {
  DEFAULT: {
    calories: 2000,
    carbs_g: 300,
    protein_g: 50,
    fat_g: 65,
    fiber_g: 25,
    sodium_mg: 2300,
    sugar_g: 50
  },
  DIABETIC: {
    calories: 1800,
    carbs_g: 225,
    protein_g: 60,
    fat_g: 60,
    fiber_g: 30,
    sodium_mg: 2000,
    sugar_g: 25
  },
  HYPERTENSION: {
    calories: 2000,
    carbs_g: 300,
    protein_g: 50,
    fat_g: 55,
    fiber_g: 28,
    sodium_mg: 1500,
    sugar_g: 50
  }
};

// Alert Thresholds
const ALERT_THRESHOLDS = {
  GLUCOSE_SPIKE: 180,
  GLUCOSE_LOW: 70,
  BP_SYSTOLIC: 140,
  BP_DIASTOLIC: 90,
  SODIUM_WARNING: 2000,
  SUGAR_WARNING: 30
};

module.exports = {
  HEALTH_CONDITIONS,
  DIETARY_PREFERENCES,
  BIOMETRIC_TYPES,
  MEAL_TYPES,
  NUTRIENT_TARGETS,
  ALERT_THRESHOLDS
};
