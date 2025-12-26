const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const CorrelationEngine = require('../utils/correlationEngine');
const Meal = require('../models/Meal');
const Biometric = require('../models/Biometric');

/**
 * Analytics Routes - Advanced analysis and insights
 */

// Get meal-biometric correlations
router.get('/correlations', authMiddleware, async (req, res) => {
  try {
    const { daysBack = 7 } = req.query;

    const analysis = await CorrelationEngine.analyzeMealBiometricCorrelations(
      req.userId,
      parseInt(daysBack)
    );

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get macro distribution trends
router.get('/macros/trends', authMiddleware, async (req, res) => {
  try {
    const { daysBack = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    // Aggregate meals by day
    const dailyMacros = await Meal.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId(req.userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          totalCalories: { $sum: '$totalNutrition.calories' },
          totalProtein: { $sum: '$totalNutrition.protein_g' },
          totalCarbs: { $sum: '$totalNutrition.carbs_g' },
          totalFat: { $sum: '$totalNutrition.fat_g' },
          mealCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate averages and trends
    const avgCalories = dailyMacros.reduce((sum, d) => sum + d.totalCalories, 0) / dailyMacros.length;
    const avgProtein = dailyMacros.reduce((sum, d) => sum + d.totalProtein, 0) / dailyMacros.length;
    const avgCarbs = dailyMacros.reduce((sum, d) => sum + d.totalCarbs, 0) / dailyMacros.length;
    const avgFat = dailyMacros.reduce((sum, d) => sum + d.totalFat, 0) / dailyMacros.length;

    // Calculate macronutrient percentages
    const totalMacrosCalories = (avgProtein * 4) + (avgCarbs * 4) + (avgFat * 9);
    const proteinPercent = ((avgProtein * 4) / totalMacrosCalories) * 100;
    const carbPercent = ((avgCarbs * 4) / totalMacrosCalories) * 100;
    const fatPercent = ((avgFat * 9) / totalMacrosCalories) * 100;

    // WHO recommendations
    const whoRecommendations = {
      protein: { min: 50, max: null, unit: 'g' }, // 0.8g per kg assumed 62kg
      carbs: { min: 225, max: null, unit: 'g' }, // 45-65% of 2000 cal
      fat: { min: null, max: 65, unit: 'g' } // 20-35% of 2000 cal
    };

    const compliance = {
      protein: avgProtein >= whoRecommendations.protein.min ? 'met' : 'low',
      carbs: avgCarbs >= whoRecommendations.carbs.min ? 'met' : 'low',
      fat: avgFat <= whoRecommendations.fat.max ? 'met' : 'excess'
    };

    res.json({
      success: true,
      period: { daysBack: parseInt(daysBack), startDate, endDate: new Date() },
      dailyTrends: dailyMacros,
      averages: {
        calories: Math.round(avgCalories),
        protein_g: Math.round(avgProtein * 10) / 10,
        carbs_g: Math.round(avgCarbs * 10) / 10,
        fat_g: Math.round(avgFat * 10) / 10
      },
      macroDistribution: {
        protein_percent: Math.round(proteinPercent),
        carbs_percent: Math.round(carbPercent),
        fat_percent: Math.round(fatPercent)
      },
      compliance,
      recommendations: this._generateMacroRecommendations(avgProtein, avgCarbs, avgFat)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get biometric trends
router.get('/biometrics/trends', authMiddleware, async (req, res) => {
  try {
    const { daysBack = 30, metric = 'glucose' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const biometrics = await Biometric.find({
      userId: req.userId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });

    if (!biometrics.length) {
      return res.json({
        success: false,
        message: 'No biometric data available',
        period: { daysBack: parseInt(daysBack) }
      });
    }

    // Extract metric values
    let values = [];
    let metricLabel = metric;

    if (metric === 'glucose') {
      values = biometrics.map(b => ({
        date: b.timestamp,
        value: b.glucoseLevel,
        riskLevel: b.riskIndicators?.glucose_risk || 'normal'
      }));
      metricLabel = 'Blood Glucose (mg/dL)';
    } else if (metric === 'blood_pressure') {
      values = biometrics.map(b => ({
        date: b.timestamp,
        value: b.bloodPressureSystolic,
        diastolic: b.bloodPressureDiastolic,
        riskLevel: b.riskIndicators?.bp_risk || 'normal'
      }));
      metricLabel = 'Blood Pressure (Systolic/Diastolic)';
    } else if (metric === 'cholesterol') {
      values = biometrics.map(b => ({
        date: b.timestamp,
        value: b.cholesterolLevel,
        riskLevel: b.riskIndicators?.cholesterol_risk || 'normal'
      }));
      metricLabel = 'Cholesterol (mg/dL)';
    }

    // Calculate statistics
    const numberValues = values.map(v => v.value);
    const min = Math.min(...numberValues);
    const max = Math.max(...numberValues);
    const avg = numberValues.reduce((a, b) => a + b) / numberValues.length;
    const stdDev = Math.sqrt(
      numberValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / numberValues.length
    );

    // Clinical reference ranges
    const referenceRanges = {
      glucose: { normal: [70, 100], prediabetic: [100, 126], diabetic: [126, null] },
      blood_pressure: { normal: [120, 80], elevated: [120, 139, 89], high: [140, 90] },
      cholesterol: { desirable: [200, null], borderline: [200, 239], high: [240, null] }
    };

    res.json({
      success: true,
      metric,
      metricLabel,
      period: { daysBack: parseInt(daysBack), startDate, endDate: new Date() },
      data: values,
      statistics: {
        count: numberValues.length,
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        average: Math.round(avg * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        median: this._calculateMedian(numberValues)
      },
      riskDistribution: this._calculateRiskDistribution(values),
      referenceRange: referenceRanges[metric],
      insights: this._generateBiometricInsights(avg, metric)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Calculate median
router.calculateMedian = function(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

function _calculateRiskDistribution(values) {
  const distribution = {
    normal: 0,
    elevated: 0,
    critical: 0
  };

  values.forEach(v => {
    const risk = v.riskLevel;
    if (risk === 'normal') distribution.normal++;
    else if (risk === 'elevated' || risk === 'borderline') distribution.elevated++;
    else if (risk === 'critical' || risk === 'high') distribution.critical++;
  });

  return {
    normal: Math.round((distribution.normal / values.length) * 100),
    elevated: Math.round((distribution.elevated / values.length) * 100),
    critical: Math.round((distribution.critical / values.length) * 100)
  };
}

function _calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function _generateMacroRecommendations(protein, carbs, fat) {
  const recommendations = [];

  if (protein < 50) {
    recommendations.push({
      type: 'protein_low',
      message: 'Protein intake is below WHO recommendations (50g+)',
      action: 'Add more lean proteins: chicken, fish, eggs, legumes'
    });
  }

  if (carbs > 350) {
    recommendations.push({
      type: 'carbs_high',
      message: 'Carbohydrate intake is elevated',
      action: 'Focus on complex carbs with fiber; reduce simple sugars'
    });
  }

  if (fat > 70) {
    recommendations.push({
      type: 'fat_high',
      message: 'Fat intake is above recommendations',
      action: 'Reduce saturated fats; increase unsaturated fats (nuts, avocado, olive oil)'
    });
  }

  return recommendations;
}

function _generateBiometricInsights(average, metric) {
  const insights = [];

  if (metric === 'glucose') {
    if (average < 100) {
      insights.push('✓ Glucose levels are in normal fasting range');
    } else if (average < 126) {
      insights.push('⚠ Glucose levels suggest prediabetic range - consider lifestyle changes');
    } else {
      insights.push('🔴 Glucose levels suggest diabetic range - consult healthcare provider');
    }
  } else if (metric === 'blood_pressure') {
    if (average < 120) {
      insights.push('✓ Blood pressure is in normal range');
    } else if (average < 140) {
      insights.push('⚠ Blood pressure is elevated - reduce sodium and increase exercise');
    } else {
      insights.push('🔴 High blood pressure detected - consult healthcare provider');
    }
  } else if (metric === 'cholesterol') {
    if (average < 200) {
      insights.push('✓ Cholesterol level is desirable');
    } else if (average < 240) {
      insights.push('⚠ Cholesterol is borderline high - improve diet and exercise');
    } else {
      insights.push('🔴 Cholesterol is high - consult healthcare provider');
    }
  }

  return insights;
}

module.exports = router;
