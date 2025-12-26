/**
 * BMI Calculator and Weight Classification
 * Implements CDC/WHO standards for both adults and children
 */

class BMICalculator {
  /**
   * Calculate BMI from weight and height
   * @param {number} weight_kg - Weight in kilograms
   * @param {number} height_cm - Height in centimeters
   * @returns {number} BMI value
   */
  static calculateBMI(weight_kg, height_cm) {
    if (!weight_kg || !height_cm || weight_kg <= 0 || height_cm <= 0) {
      throw new Error('Valid weight and height required for BMI calculation');
    }
    
    const height_m = height_cm / 100;
    return parseFloat((weight_kg / (height_m * height_m)).toFixed(1));
  }

  /**
   * Validate weight input based on height (safety buffer)
   * @param {number} weight_kg - Weight to validate
   * @param {number} height_cm - User's height
   * @returns {object} Validation result
   */
  static validateWeightInput(weight_kg, height_cm) {
    // Calculate reasonable weight range based on height
    // Using BMI 10 (extremely underweight) to BMI 60 (extremely obese) as absolute bounds
    const height_m = height_cm / 100;
    const minWeight = 10 * height_m * height_m; // BMI 10
    const maxWeight = 60 * height_m * height_m; // BMI 60

    if (weight_kg < minWeight || weight_kg > maxWeight) {
      return {
        isValid: false,
        message: `Please verify your input. For height ${height_cm}cm, expected weight range is ${Math.round(minWeight)}kg - ${Math.round(maxWeight)}kg`,
        suggestedRange: {
          min: Math.round(minWeight),
          max: Math.round(maxWeight)
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Classify weight for adults (Age 20+) using BMI
   * @param {number} bmi - Calculated BMI
   * @returns {object} Classification result
   */
  static classifyAdultWeight(bmi) {
    let category, status, color, description;

    if (bmi < 18.5) {
      category = 'underweight';
      status = 'Below Healthy Range';
      color = 'warning';
      description = 'Consider consulting a healthcare provider about healthy weight gain strategies';
    } else if (bmi >= 18.5 && bmi < 25) {
      category = 'healthy';
      status = 'Within Healthy Range';
      color = 'normal';
      description = 'Maintain your current lifestyle and healthy habits';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'overweight';
      status = 'Above Healthy Range';
      color = 'warning';
      description = 'Consider lifestyle modifications for gradual weight management';
    } else {
      category = 'obese';
      status = 'Significantly Above Healthy Range';
      color = 'high';
      description = 'Consult with healthcare provider for personalized weight management plan';
    }

    return {
      category,
      status,
      color,
      description,
      bmi,
      ageGroup: 'adult'
    };
  }

  /**
   * Classify weight for children/teens (Age 2-19) using BMI percentiles
   * Note: This is a simplified approximation. Real implementation would use CDC growth charts.
   * @param {number} bmi - Calculated BMI
   * @param {number} age - Age in years
   * @param {string} sex - 'male' or 'female'
   * @returns {object} Classification result
   */
  static classifyChildWeight(bmi, age, sex) {
    // Simplified percentile approximation
    // Real implementation would use CDC BMI-for-age percentile charts
    // These are rough estimates and should be replaced with actual percentile data
    
    let percentileCategory, status, color, description;

    // Approximate thresholds (these vary by age and sex in reality)
    const underweightThreshold = age < 10 ? 14 : 16;
    const overweightThreshold = age < 10 ? 18 : 21;
    const obeseThreshold = age < 10 ? 20 : 25;

    if (bmi < underweightThreshold) {
      percentileCategory = 'below_5th';
      status = 'Below Representative Range';
      color = 'warning';
      description = 'Consider pediatric consultation for growth assessment';
    } else if (bmi >= underweightThreshold && bmi < overweightThreshold) {
      percentileCategory = '5th_to_85th';
      status = 'Within Healthy Range for Age';
      color = 'normal';
      description = 'Maintain healthy growth patterns with balanced nutrition';
    } else if (bmi >= overweightThreshold && bmi < obeseThreshold) {
      percentileCategory = '85th_to_95th';
      status = 'Above Representative Range';
      color = 'warning';
      description = 'Consider pediatric consultation for growth guidance';
    } else {
      percentileCategory = 'above_95th';
      status = 'Significantly Above Representative Range';
      color = 'high';
      description = 'Pediatric consultation recommended for personalized care plan';
    }

    return {
      category: percentileCategory,
      status,
      color,
      description,
      bmi,
      ageGroup: 'pediatric',
      note: 'Classification based on age and sex-specific growth percentiles'
    };
  }

  /**
   * Get comprehensive weight classification
   * @param {number} weight_kg - Weight in kg
   * @param {number} height_cm - Height in cm
   * @param {number} age - Age in years
   * @param {string} sex - 'male', 'female', or 'other'
   * @returns {object} Complete classification with BMI and status
   */
  static getWeightClassification(weight_kg, height_cm, age, sex) {
    // Validate inputs
    if (!weight_kg || !height_cm) {
      return {
        error: 'Weight and height required for classification',
        requiresInput: true
      };
    }

    if (!age) {
      return {
        error: 'Age required for accurate classification',
        requiresInput: true
      };
    }

    // Validate weight is in reasonable range
    const validation = this.validateWeightInput(weight_kg, height_cm);
    if (!validation.isValid) {
      return {
        error: validation.message,
        suggestedRange: validation.suggestedRange,
        requiresValidation: true
      };
    }

    // Calculate BMI
    const bmi = this.calculateBMI(weight_kg, height_cm);

    // Classify based on age
    let classification;
    if (age >= 20) {
      classification = this.classifyAdultWeight(bmi);
    } else if (age >= 2 && age < 20) {
      classification = this.classifyChildWeight(bmi, age, sex);
    } else {
      return {
        error: 'Classification not available for age < 2 years',
        bmi,
        note: 'Infant growth requires specialized pediatric assessment'
      };
    }

    return {
      ...classification,
      weight_kg,
      height_cm,
      age,
      sex
    };
  }

  /**
   * Get healthy weight range for given height and age
   * @param {number} height_cm - Height in centimeters
   * @param {number} age - Age in years
   * @returns {object} Healthy weight range
   */
  static getHealthyWeightRange(height_cm, age) {
    if (!height_cm) {
      throw new Error('Height required to calculate healthy weight range');
    }

    const height_m = height_cm / 100;

    if (age >= 20) {
      // Adult healthy BMI range: 18.5 - 24.9
      const minWeight = 18.5 * height_m * height_m;
      const maxWeight = 24.9 * height_m * height_m;
      
      return {
        min: Math.round(minWeight * 10) / 10,
        max: Math.round(maxWeight * 10) / 10,
        unit: 'kg',
        note: 'Based on healthy BMI range (18.5 - 24.9) for adults'
      };
    } else {
      // For children, this varies significantly by age
      // Simplified approximation
      const baseBMI = age < 10 ? 15 : 18;
      const maxBMI = age < 10 ? 18 : 22;
      const minWeight = baseBMI * height_m * height_m;
      const maxWeight = maxBMI * height_m * height_m;
      
      return {
        min: Math.round(minWeight * 10) / 10,
        max: Math.round(maxWeight * 10) / 10,
        unit: 'kg',
        note: 'Approximate range - consult growth charts for precise percentiles'
      };
    }
  }
}

module.exports = BMICalculator;
