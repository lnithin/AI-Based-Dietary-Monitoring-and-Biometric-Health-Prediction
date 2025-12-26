const Meal = require('../models/Meal');
const Biometric = require('../models/Biometric');

/**
 * Correlation Engine - Analyzes relationships between meals and biometric changes
 * Implements Pearson correlation, lag analysis, and statistical significance testing
 */

class CorrelationEngine {
  /**
   * Calculate Pearson correlation coefficient
   * @param {Array<number>} x - First data series
   * @param {Array<number>} y - Second data series
   * @returns {Object} Pearson r, p-value, significance
   */
  static calculatePearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length < 3) {
      return { r: 0, pValue: 1, significant: false, message: 'Insufficient data points' };
    }

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    const sumXY = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const sumX2 = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);
    const sumY2 = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);

    const r = sumXY / Math.sqrt(sumX2 * sumY2);
    const tStatistic = r * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);
    
    // Approximate p-value using t-distribution
    const pValue = this._calculateTTestPValue(tStatistic, n - 2);
    const significant = pValue < 0.05;

    return { r, pValue, significant, dataPoints: n };
  }

  /**
   * Approximate p-value from t-statistic (two-tailed)
   */
  static _calculateTTestPValue(t, df) {
    const absT = Math.abs(t);
    const cdf = (1 - this._incompleteBeta(df / (df + t * t), df / 2, 0.5)) / 2;
    return 2 * cdf;
  }

  /**
   * Incomplete beta function approximation
   */
  static _incompleteBeta(x, a, b) {
    if (x === 0 || x === 1) return x;
    const bt = Math.exp(
      this._logGamma(a + b) - this._logGamma(a) - this._logGamma(b) +
      a * Math.log(x) + b * Math.log(1 - x)
    );
    return x < (a + 1) / (a + b + 2)
      ? bt * this._betaContinuedFraction(x, a, b) / a
      : 1 - bt * this._betaContinuedFraction(1 - x, b, a) / b;
  }

  static _betaContinuedFraction(x, a, b) {
    const maxIterations = 100;
    let front = 1 / (1 - ((a + 1) * (b - 1) * x) / ((a + 2) * (1 - x)) + 0.0001);
    let fraction = front;
    for (let i = 2; i < maxIterations; i++) {
      const d = ((i * (b - i)) * x) / ((a + 2 * i - 1) * (a + 2 * i));
      fraction = 1 + d / fraction;
      front *= fraction;
    }
    return front;
  }

  static _logGamma(z) {
    const g = 7;
    const coef = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    if (z < 0.5) {
      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - this._logGamma(1 - z);
    }
    z -= 1;
    let x = coef[0];
    for (let i = 1; i < g + 2; i++) {
      x += coef[i] / (z + i);
    }
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  /**
   * Analyze correlation between meal macros and biometric changes
   * @param {string} userId - User ID
   * @param {number} daysBack - Number of days to analyze
   * @returns {Object} Comprehensive correlation analysis
   */
  static async analyzeMealBiometricCorrelations(userId, daysBack = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch meals with nutrition data
      const meals = await Meal.find({
        userId,
        createdAt: { $gte: startDate }
      }).sort({ createdAt: 1 });

      // Fetch biometrics
      const biometrics = await Biometric.find({
        userId,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: 1 });

      if (meals.length < 3 || biometrics.length < 3) {
        return {
          success: false,
          message: 'Insufficient data (need 3+ meals and 3+ biometric readings)',
          daysAnalyzed: daysBack
        };
      }

      const correlations = {
        success: true,
        daysAnalyzed: daysBack,
        mealsAnalyzed: meals.length,
        biometricsAnalyzed: biometrics.length,
        correlations: [],
        insights: [],
        recommendations: []
      };

      // Extract time series data
      const mealDates = meals.map(m => m.createdAt.getTime());
      const biometricDates = biometrics.map(b => b.timestamp.getTime());

      // Correlate carbs vs glucose
      if (this._shouldAnalyzeMetric(meals, 'carbs') && this._shouldAnalyzeMetric(biometrics, 'glucose')) {
        const carbsSeries = meals.map(m => m.totalNutrition?.carbs_g || 0);
        const glucoseSeries = this._interpolateBiometrics(biometrics, 'glucose', mealDates);
        
        const correlation = this.calculatePearsonCorrelation(carbsSeries, glucoseSeries);
        correlations.correlations.push({
          meal: 'Carbohydrates',
          biometric: 'Blood Glucose',
          pearsonR: parseFloat(correlation.r.toFixed(3)),
          pValue: parseFloat(correlation.pValue.toFixed(4)),
          significant: correlation.significant,
          interpretation: this._interpretCorrelation(correlation.r, 'carbs', 'glucose'),
          dataPoints: correlation.dataPoints
        });

        if (correlation.significant && correlation.r > 0.6) {
          correlations.insights.push({
            type: 'high_carb_glucose_correlation',
            message: `Strong positive correlation (r=${correlation.r.toFixed(2)}) between carb intake and glucose spike. Each gram of carbs increases glucose by ~${this._estimateSlope(carbsSeries, glucoseSeries).toFixed(1)} mg/dL`,
            severity: 'warning'
          });
        }
      }

      // Correlate sodium vs blood pressure
      if (this._shouldAnalyzeMetric(meals, 'sodium') && this._shouldAnalyzeMetric(biometrics, 'blood_pressure')) {
        const sodiumSeries = meals.map(m => m.totalNutrition?.sodium_mg || 0);
        const bpSeries = this._interpolateBiometrics(biometrics, 'blood_pressure_systolic', mealDates);
        
        const correlation = this.calculatePearsonCorrelation(sodiumSeries, bpSeries);
        correlations.correlations.push({
          meal: 'Sodium',
          biometric: 'Systolic Blood Pressure',
          pearsonR: parseFloat(correlation.r.toFixed(3)),
          pValue: parseFloat(correlation.pValue.toFixed(4)),
          significant: correlation.significant,
          interpretation: this._interpretCorrelation(correlation.r, 'sodium', 'blood_pressure'),
          dataPoints: correlation.dataPoints
        });

        if (correlation.significant && correlation.r > 0.5) {
          correlations.recommendations.push({
            type: 'sodium_reduction',
            action: 'Reduce sodium intake',
            reason: `Detected significant correlation (r=${correlation.r.toFixed(2)}) between sodium consumption and elevated blood pressure`,
            targetReduction: 'Aim for <2300 mg sodium daily'
          });
        }
      }

      // Correlate protein vs glucose (should be negative/protective)
      if (this._shouldAnalyzeMetric(meals, 'protein') && this._shouldAnalyzeMetric(biometrics, 'glucose')) {
        const proteinSeries = meals.map(m => m.totalNutrition?.protein_g || 0);
        const glucoseSeries = this._interpolateBiometrics(biometrics, 'glucose', mealDates);
        
        const correlation = this.calculatePearsonCorrelation(proteinSeries, glucoseSeries);
        correlations.correlations.push({
          meal: 'Protein',
          biometric: 'Blood Glucose',
          pearsonR: parseFloat(correlation.r.toFixed(3)),
          pValue: parseFloat(correlation.pValue.toFixed(4)),
          significant: correlation.significant,
          interpretation: this._interpretCorrelation(correlation.r, 'protein', 'glucose'),
          dataPoints: correlation.dataPoints
        });

        if (correlation.significant && correlation.r < -0.4) {
          correlations.insights.push({
            type: 'protein_protective',
            message: `Protein appears protective (r=${correlation.r.toFixed(2)}) - higher protein intake correlates with lower glucose spikes`,
            severity: 'positive'
          });
        }
      }

      // Add risk summary
      correlations.riskSummary = this._generateRiskSummary(correlations.insights);

      return correlations;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        daysAnalyzed: daysBack
      };
    }
  }

  /**
   * Interpolate biometric values to align with meal timestamps
   */
  static _interpolateBiometrics(biometrics, metric, mealDates) {
    return mealDates.map(mealDate => {
      // Find closest biometric reading before meal
      const before = biometrics
        .filter(b => b.timestamp.getTime() <= mealDate)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      // Find closest biometric reading after meal (within 2 hours)
      const after = biometrics.find(
        b => b.timestamp.getTime() > mealDate && b.timestamp.getTime() - mealDate < 7200000
      );

      if (metric === 'glucose') {
        return (after?.glucoseLevel || before?.glucoseLevel || 100);
      } else if (metric === 'blood_pressure_systolic') {
        return (after?.bloodPressureSystolic || before?.bloodPressureSystolic || 120);
      }
      return 0;
    });
  }

  /**
   * Check if metric has sufficient variation for analysis
   */
  static _shouldAnalyzeMetric(data, metric) {
    const values = data.map(item => {
      if (metric === 'carbs') return item.totalNutrition?.carbs_g;
      if (metric === 'protein') return item.totalNutrition?.protein_g;
      if (metric === 'sodium') return item.totalNutrition?.sodium_mg;
      if (metric === 'glucose') return item.glucoseLevel;
      if (metric === 'blood_pressure') return item.bloodPressureSystolic;
      return 0;
    }).filter(v => v !== undefined && v !== null);

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return variance > 0; // Has variation
  }

  /**
   * Interpret correlation strength and direction
   */
  static _interpretCorrelation(r, mealType, biometricType) {
    const absR = Math.abs(r);
    let strength = 'negligible';
    if (absR > 0.8) strength = 'very strong';
    else if (absR > 0.6) strength = 'strong';
    else if (absR > 0.4) strength = 'moderate';
    else if (absR > 0.2) strength = 'weak';

    const direction = r > 0 ? 'positive' : 'negative';
    const directionText = r > 0 ? 'increases' : 'decreases';

    return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation: ${mealType} ${directionText} ${biometricType}`;
  }

  /**
   * Estimate slope of linear regression
   */
  static _estimateSlope(x, y) {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Generate human-readable risk summary
   */
  static _generateRiskSummary(insights) {
    const summary = {
      riskLevel: 'low',
      keyFindings: [],
      actionItems: []
    };

    const warningCount = insights.filter(i => i.severity === 'warning').length;
    const positiveCount = insights.filter(i => i.severity === 'positive').length;

    if (warningCount > 1) {
      summary.riskLevel = 'high';
    } else if (warningCount > 0) {
      summary.riskLevel = 'medium';
    }

    summary.keyFindings = insights.map(i => i.message);

    if (summary.riskLevel === 'high') {
      summary.actionItems.push('Schedule consultation with healthcare provider');
      summary.actionItems.push('Monitor trends more frequently');
    }

    if (positiveCount > 0) {
      summary.actionItems.push('Continue current dietary patterns - showing positive trends');
    }

    return summary;
  }
}

module.exports = CorrelationEngine;
