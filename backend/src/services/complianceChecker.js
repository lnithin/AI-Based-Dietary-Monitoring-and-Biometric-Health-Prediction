/**
 * Dietary Compliance Checker - WHO and AHA Guidelines
 * Paper Reference: Section III.5 - "ensures that all suggestions made in keeping with global dietary guidelines"
 * 
 * This service validates meal plans and recommendations against:
 * - World Health Organization (WHO) dietary guidelines
 * - American Heart Association (AHA) dietary guidelines
 */

class ComplianceChecker {
  constructor() {
    // WHO Daily Recommended Limits (for adults)
    this.WHO_GUIDELINES = {
      totalFat: { max: 30, unit: '% of total energy' }, // <30% of total calories
      saturatedFat: { max: 10, unit: '% of total energy' }, // <10% of total calories
      transFat: { max: 1, unit: '% of total energy' }, // <1% of total calories
      freeSugars: { max: 10, unit: '% of total energy' }, // <10% ideally <5%
      sodium: { max: 2000, unit: 'mg' }, // <2g/day (2000mg)
      fiber: { min: 25, unit: 'g' }, // ≥25g/day
      fruits_vegetables: { min: 400, unit: 'g' } // ≥400g/day (5 portions)
    };

    // AHA Heart-Healthy Guidelines
    this.AHA_GUIDELINES = {
      saturatedFat: { max: 6, unit: '% of total energy' }, // <6% for heart health
      sodium: { max: 1500, unit: 'mg' }, // Ideal limit 1500mg
      cholesterol: { max: 300, unit: 'mg' },
      addedSugars: { max_men: 36, max_women: 25, unit: 'g' }, // 9 tsp men, 6 tsp women
      omega3: { min: 250, unit: 'mg' } // EPA+DHA daily
    };

    // Diabetic-specific guidelines (ADA - American Diabetes Association)
    this.DIABETES_GUIDELINES = {
      carbs: { range: [130, 230], unit: 'g' }, // 45-60g per meal
      fiber: { min: 30, unit: 'g' },
      glycemicLoad: { max: 100, unit: 'per day' },
      saturatedFat: { max: 7, unit: '% of total energy' }
    };
  }

  /**
   * Check meal compliance with health guidelines
   * Returns compliance report with violations and recommendations
   */
  checkMealCompliance(meal, userProfile) {
    const violations = [];
    const warnings = [];
    const compliant = [];

    const totalCalories = meal.totalNutrition?.calories || 0;

    // Check WHO Guidelines
    this.checkWHOCompliance(meal, totalCalories, violations, warnings, compliant);

    // Check AHA Guidelines (if user has cardiovascular concerns)
    if (this.hasCardiovascularRisk(userProfile)) {
      this.checkAHACompliance(meal, totalCalories, userProfile, violations, warnings, compliant);
    }

    // Check Diabetes Guidelines (if user has diabetes)
    if (userProfile.healthConditions?.includes('diabetes')) {
      this.checkDiabetesCompliance(meal, violations, warnings, compliant);
    }

    // Generate compliance score (0-100)
    const complianceScore = this.calculateComplianceScore(violations, warnings, compliant);

    return {
      overallScore: complianceScore,
      status: complianceScore >= 80 ? 'compliant' : complianceScore >= 60 ? 'acceptable' : 'non_compliant',
      violations, // Critical issues
      warnings, // Borderline issues
      compliant, // What's good
      recommendations: this.generateRecommendations(violations, warnings)
    };
  }

  /**
   * Check WHO dietary guidelines compliance
   */
  checkWHOCompliance(meal, totalCalories, violations, warnings, compliant) {
    const nutrition = meal.totalNutrition || {};

    // Sodium check
    const sodium = nutrition.sodium_mg || 0;
    if (sodium > this.WHO_GUIDELINES.sodium.max) {
      violations.push({
        guideline: 'WHO',
        parameter: 'Sodium',
        value: sodium,
        limit: this.WHO_GUIDELINES.sodium.max,
        unit: 'mg',
        severity: 'high',
        message: `Sodium (${sodium}mg) exceeds WHO limit of ${this.WHO_GUIDELINES.sodium.max}mg`
      });
    } else if (sodium > this.WHO_GUIDELINES.sodium.max * 0.8) {
      warnings.push({
        guideline: 'WHO',
        parameter: 'Sodium',
        value: sodium,
        limit: this.WHO_GUIDELINES.sodium.max,
        message: `Sodium approaching WHO limit (${((sodium/this.WHO_GUIDELINES.sodium.max)*100).toFixed(0)}%)`
      });
    } else {
      compliant.push({ parameter: 'Sodium', status: 'within_limits' });
    }

    // Sugar check (assuming 2000 calorie diet, 10% = 50g sugar)
    const sugar = nutrition.sugar_g || 0;
    const sugarCalories = sugar * 4; // 4 calories per gram
    const sugarPercent = (sugarCalories / totalCalories) * 100;
    
    if (sugarPercent > 10) {
      violations.push({
        guideline: 'WHO',
        parameter: 'Free Sugars',
        value: sugarPercent.toFixed(1),
        limit: 10,
        unit: '% of energy',
        severity: 'medium',
        message: `Sugar (${sugarPercent.toFixed(1)}%) exceeds WHO recommendation of <10% total energy`
      });
    } else {
      compliant.push({ parameter: 'Sugar', status: 'within_limits' });
    }

    // Fiber check
    const fiber = nutrition.fiber_g || 0;
    const fiberDaily = (fiber / totalCalories) * 2000; // Extrapolate to daily intake
    if (fiberDaily < this.WHO_GUIDELINES.fiber.min) {
      warnings.push({
        guideline: 'WHO',
        parameter: 'Fiber',
        value: fiberDaily.toFixed(1),
        limit: this.WHO_GUIDELINES.fiber.min,
        message: `Insufficient fiber. Current: ${fiberDaily.toFixed(1)}g, Recommended: ${this.WHO_GUIDELINES.fiber.min}g/day`
      });
    } else {
      compliant.push({ parameter: 'Fiber', status: 'adequate' });
    }
  }

  /**
   * Check AHA heart-healthy guidelines
   */
  checkAHACompliance(meal, totalCalories, userProfile, violations, warnings, compliant) {
    const nutrition = meal.totalNutrition || {};

    // Stricter sodium limit for heart health
    const sodium = nutrition.sodium_mg || 0;
    if (sodium > this.AHA_GUIDELINES.sodium.max) {
      violations.push({
        guideline: 'AHA',
        parameter: 'Sodium (Heart Health)',
        value: sodium,
        limit: this.AHA_GUIDELINES.sodium.max,
        unit: 'mg',
        severity: 'critical',
        message: `Sodium exceeds AHA heart-healthy limit. Current: ${sodium}mg, Limit: ${this.AHA_GUIDELINES.sodium.max}mg`
      });
    }

    // Saturated fat check (stricter for cardiovascular health)
    const satFat = nutrition.saturated_fat_g || 0;
    const satFatCalories = satFat * 9; // 9 calories per gram
    const satFatPercent = (satFatCalories / totalCalories) * 100;
    
    if (satFatPercent > this.AHA_GUIDELINES.saturatedFat.max) {
      violations.push({
        guideline: 'AHA',
        parameter: 'Saturated Fat',
        value: satFatPercent.toFixed(1),
        limit: this.AHA_GUIDELINES.saturatedFat.max,
        unit: '% of energy',
        severity: 'high',
        message: `Saturated fat (${satFatPercent.toFixed(1)}%) exceeds AHA recommendation of <${this.AHA_GUIDELINES.saturatedFat.max}%`
      });
    }

    // Cholesterol check
    const cholesterol = nutrition.cholesterol_mg || 0;
    if (cholesterol > this.AHA_GUIDELINES.cholesterol.max) {
      violations.push({
        guideline: 'AHA',
        parameter: 'Cholesterol',
        value: cholesterol,
        limit: this.AHA_GUIDELINES.cholesterol.max,
        unit: 'mg',
        severity: 'medium',
        message: `Cholesterol (${cholesterol}mg) exceeds recommended limit`
      });
    }

    // Added sugar check (gender-specific)
    const addedSugars = nutrition.sugar_g || 0;
    const sugarLimit = userProfile.gender === 'male' ? 
      this.AHA_GUIDELINES.addedSugars.max_men : 
      this.AHA_GUIDELINES.addedSugars.max_women;
    
    if (addedSugars > sugarLimit) {
      warnings.push({
        guideline: 'AHA',
        parameter: 'Added Sugars',
        value: addedSugars,
        limit: sugarLimit,
        message: `Added sugars (${addedSugars}g) exceed AHA daily limit for ${userProfile.gender}s`
      });
    }
  }

  /**
   * Check diabetes-specific guidelines
   */
  checkDiabetesCompliance(meal, violations, warnings, compliant) {
    const nutrition = meal.totalNutrition || {};

    // Carbohydrate check
    const carbs = nutrition.carbs_g || 0;
    if (carbs < this.DIABETES_GUIDELINES.carbs.range[0]) {
      warnings.push({
        guideline: 'ADA',
        parameter: 'Carbohydrates',
        value: carbs,
        message: 'Carbohydrate intake too low. May cause hypoglycemia.'
      });
    } else if (carbs > this.DIABETES_GUIDELINES.carbs.range[1]) {
      violations.push({
        guideline: 'ADA',
        parameter: 'Carbohydrates',
        value: carbs,
        limit: this.DIABETES_GUIDELINES.carbs.range[1],
        severity: 'high',
        message: `High carbohydrate meal (${carbs}g). May spike blood glucose.`
      });
    } else {
      compliant.push({ parameter: 'Carbohydrates', status: 'diabetes_friendly' });
    }

    // Glycemic load check
    const glycemicLoad = nutrition.glycemic_load || this.estimateGlycemicLoad(carbs);
    if (glycemicLoad > 20) { // >20 is high GL per meal
      warnings.push({
        guideline: 'ADA',
        parameter: 'Glycemic Load',
        value: glycemicLoad,
        message: 'High glycemic load. May cause rapid blood sugar rise.'
      });
    }

    // Fiber check (extra important for diabetes)
    const fiber = nutrition.fiber_g || 0;
    if (fiber < 10) { // Should be ~10g per meal
      warnings.push({
        guideline: 'ADA',
        parameter: 'Fiber',
        value: fiber,
        message: 'Low fiber. Add more whole grains, vegetables, legumes.'
      });
    }
  }

  /**
   * Check if user has cardiovascular risk factors
   */
  hasCardiovascularRisk(userProfile) {
    const cardioConditions = ['hypertension', 'high_cholesterol', 'heart_disease', 'obesity'];
    return userProfile.healthConditions?.some(cond => cardioConditions.includes(cond));
  }

  /**
   * Calculate overall compliance score (0-100)
   */
  calculateComplianceScore(violations, warnings, compliant) {
    const violationPenalty = violations.reduce((sum, v) => {
      return sum + (v.severity === 'critical' ? 15 : v.severity === 'high' ? 10 : 5);
    }, 0);

    const warningPenalty = warnings.length * 3;
    const compliantBonus = compliant.length * 5;

    const baseScore = 100;
    const finalScore = Math.max(0, Math.min(100, baseScore - violationPenalty - warningPenalty + compliantBonus));

    return Math.round(finalScore);
  }

  /**
   * Generate actionable recommendations based on violations
   */
  generateRecommendations(violations, warnings) {
    const recommendations = [];

    // Group by parameter
    const allIssues = [...violations, ...warnings];
    const parameterMap = {};

    allIssues.forEach(issue => {
      if (!parameterMap[issue.parameter]) {
        parameterMap[issue.parameter] = [];
      }
      parameterMap[issue.parameter].push(issue);
    });

    // Generate specific recommendations
    if (parameterMap['Sodium'] || parameterMap['Sodium (Heart Health)']) {
      recommendations.push({
        category: 'Sodium Reduction',
        actions: [
          'Use herbs and spices instead of salt',
          'Choose fresh foods over processed/packaged items',
          'Rinse canned foods before use',
          'Avoid pickles, papad, soy sauce'
        ]
      });
    }

    if (parameterMap['Free Sugars'] || parameterMap['Added Sugars']) {
      recommendations.push({
        category: 'Sugar Reduction',
        actions: [
          'Replace sugary drinks with water or unsweetened beverages',
          'Choose fresh fruits over sweets',
          'Avoid sweetened breakfast cereals',
          'Gradually reduce sugar in tea/coffee'
        ]
      });
    }

    if (parameterMap['Saturated Fat'] || parameterMap['Cholesterol']) {
      recommendations.push({
        category: 'Heart-Healthy Fats',
        actions: [
          'Choose lean cuts of meat',
          'Use olive oil or canola oil instead of butter/ghee',
          'Include fatty fish (salmon, mackerel) twice a week',
          'Limit fried foods and baked goods'
        ]
      });
    }

    if (parameterMap['Fiber']) {
      recommendations.push({
        category: 'Increase Fiber',
        actions: [
          'Choose whole grain bread/rice instead of refined',
          'Add vegetables to every meal',
          'Include legumes (dal, beans) regularly',
          'Eat fruits with skin when possible'
        ]
      });
    }

    if (parameterMap['Carbohydrates']) {
      recommendations.push({
        category: 'Blood Sugar Management',
        actions: [
          'Pair carbs with protein or healthy fats',
          'Choose low-GI foods (brown rice, oats, legumes)',
          'Eat smaller, more frequent meals',
          'Monitor portion sizes of rice, bread, potatoes'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Estimate glycemic load from carbohydrates
   */
  estimateGlycemicLoad(carbs_g, glycemicIndex = 60) {
    // GL = (GI × carbs) / 100
    return (glycemicIndex * carbs_g) / 100;
  }
}

module.exports = new ComplianceChecker();
