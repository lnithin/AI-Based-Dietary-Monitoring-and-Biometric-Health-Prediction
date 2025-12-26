/**
 * Alert Generation Engine
 * Monitors biometrics and generates intelligent alerts for health anomalies
 */

const Alert = require('../models/Alert');

const ALERT_THRESHOLDS = {
  glucose: {
    critical_high: 180,
    warning_high: 160,
    critical_low: 50,
    warning_low: 70
  },
  heart_rate: {
    critical_high: 140,
    warning_high: 120,
    critical_low: 50,
    warning_low: 60
  },
  blood_pressure: {
    systolic: {
      critical: 180,
      warning: 160
    },
    diastolic: {
      critical: 120,
      warning: 100
    }
  },
  cholesterol: {
    total: {
      critical: 240,
      warning: 200
    },
    ldl: {
      critical: 160,
      warning: 130
    }
  },
  daily_caloric_intake: {
    info: 2500,
    warning: 3000
  }
};

class AlertGenerator {
  /**
   * Generate alerts for biometric reading
   */
  static async generateAlertsForBiometric(userId, biometric) {
    const alerts = [];

    try {
      switch (biometric.biometricType) {
        case 'glucose':
          alerts.push(...this.generateGlucoseAlerts(biometric));
          break;
        case 'heart_rate':
          alerts.push(...this.generateHeartRateAlerts(biometric));
          break;
        case 'blood_pressure':
          alerts.push(...this.generateBloodPressureAlerts(biometric));
          break;
        case 'cholesterol':
          alerts.push(...this.generateCholesterolAlerts(biometric));
          break;
      }

      // Save all generated alerts
      if (alerts.length > 0) {
        const alertDocs = alerts.map((alert) => ({
          ...alert,
          userId,
          linkedBiometricId: biometric._id,
          timestamp: new Date()
        }));
        await Alert.insertMany(alertDocs);
      }

      return alerts;
    } catch (error) {
      console.error('Error generating alerts:', error);
      return [];
    }
  }

  /**
   * Generate glucose-related alerts
   */
  static generateGlucoseAlerts(biometric) {
    const alerts = [];
    const value = biometric.glucose_mg_dl;
    const thresholds = ALERT_THRESHOLDS.glucose;

    if (value >= thresholds.critical_high) {
      alerts.push({
        alertType: 'glucose_spike',
        severity: 'critical',
        title: 'Critical High Glucose Alert',
        message: `Glucose level ${value} mg/dL is critically high (> ${thresholds.critical_high})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: value,
          thresholdValue: thresholds.critical_high,
          unit: 'mg/dL',
          riskAssessment: 'Immediate risk of hyperglycemic crisis'
        },
        suggestedAction:
          'Monitor closely. Ensure hydration. Contact healthcare provider if persistent or worsening.'
      });
    } else if (value >= thresholds.warning_high) {
      alerts.push({
        alertType: 'glucose_high',
        severity: 'warning',
        title: 'High Glucose Reading',
        message: `Glucose level ${value} mg/dL is elevated (> ${thresholds.warning_high})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: value,
          thresholdValue: thresholds.warning_high,
          unit: 'mg/dL',
          riskAssessment: 'High risk of glucose excursion'
        },
        suggestedAction:
          'Consider a light physical activity. Review your recent meals for high-carb/sugar content.'
      });
    }

    if (value <= thresholds.critical_low) {
      alerts.push({
        alertType: 'glucose_low',
        severity: 'critical',
        title: 'Critical Low Glucose Alert',
        message: `Glucose level ${value} mg/dL is critically low (< ${thresholds.critical_low})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: value,
          thresholdValue: thresholds.critical_low,
          unit: 'mg/dL',
          riskAssessment: 'Immediate risk of hypoglycemia'
        },
        suggestedAction:
          'Consume fast-acting carbs (15g). Recheck in 15 minutes. Contact emergency if symptoms persist.'
      });
    } else if (value <= thresholds.warning_low) {
      alerts.push({
        alertType: 'glucose_low',
        severity: 'warning',
        title: 'Low Glucose Reading',
        message: `Glucose level ${value} mg/dL is low (< ${thresholds.warning_low})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: value,
          thresholdValue: thresholds.warning_low,
          unit: 'mg/dL',
          riskAssessment: 'Risk of hypoglycemic symptoms'
        },
        suggestedAction:
          'Have a light snack or fruit. Monitor symptoms like dizziness or trembling.'
      });
    }

    return alerts;
  }

  /**
   * Generate heart rate alerts
   */
  static generateHeartRateAlerts(biometric) {
    const alerts = [];
    const value = biometric.heart_rate_bpm;
    const thresholds = ALERT_THRESHOLDS.heart_rate;

    if (value >= thresholds.critical_high) {
      alerts.push({
        alertType: 'heart_rate_critical',
        severity: 'critical',
        title: 'Critically High Heart Rate',
        message: `Heart rate ${value} bpm is dangerously high (> ${thresholds.critical_high})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: value,
          thresholdValue: thresholds.critical_high,
          unit: 'bpm',
          riskAssessment: 'Possible cardiac stress or emergency'
        },
        suggestedAction: 'Stop activity immediately. Sit down. Contact emergency services if symptoms occur.'
      });
    } else if (value >= thresholds.warning_high) {
      alerts.push({
        alertType: 'heart_rate_elevated',
        severity: 'warning',
        title: 'Elevated Heart Rate',
        message: `Heart rate ${value} bpm is elevated (> ${thresholds.warning_high})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: value,
          thresholdValue: thresholds.warning_high,
          unit: 'bpm',
          riskAssessment: 'Elevated cardiovascular stress'
        },
        suggestedAction: 'Rest for a few minutes. Check if due to recent exercise or stress.'
      });
    }

    if (value <= thresholds.critical_low) {
      alerts.push({
        alertType: 'heart_rate_low',
        severity: 'critical',
        title: 'Critically Low Heart Rate',
        message: `Heart rate ${value} bpm is dangerously low (< ${thresholds.critical_low})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: value,
          thresholdValue: thresholds.critical_low,
          unit: 'bpm',
          riskAssessment: 'Possible arrhythmia or medical emergency'
        },
        suggestedAction: 'Lie down immediately. Seek medical attention. Call emergency if dizziness occurs.'
      });
    } else if (value <= thresholds.warning_low) {
      alerts.push({
        alertType: 'heart_rate_low',
        severity: 'warning',
        title: 'Low Heart Rate',
        message: `Heart rate ${value} bpm is below normal (< ${thresholds.warning_low})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: value,
          thresholdValue: thresholds.warning_low,
          unit: 'bpm',
          riskAssessment: 'Below recommended resting heart rate'
        },
        suggestedAction: 'Monitor for any dizziness. Consult doctor if persistent.'
      });
    }

    return alerts;
  }

  /**
   * Generate blood pressure alerts
   */
  static generateBloodPressureAlerts(biometric) {
    const alerts = [];
    const systolic = biometric.systolic;
    const diastolic = biometric.diastolic;
    const systolicThresh = ALERT_THRESHOLDS.blood_pressure.systolic;
    const diastolicThresh = ALERT_THRESHOLDS.blood_pressure.diastolic;

    if (systolic >= systolicThresh.critical || diastolic >= diastolicThresh.critical) {
      alerts.push({
        alertType: 'bp_critical',
        severity: 'critical',
        title: 'Critical Blood Pressure Alert',
        message: `BP ${systolic}/${diastolic} mmHg is critically high (> ${systolicThresh.critical}/${diastolicThresh.critical})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: `${systolic}/${diastolic}`,
          thresholdValue: `${systolicThresh.critical}/${diastolicThresh.critical}`,
          unit: 'mmHg',
          riskAssessment: 'Hypertensive crisis - risk of stroke or MI'
        },
        suggestedAction: 'Seek emergency medical care immediately. Avoid strenuous activity.'
      });
    } else if (systolic >= systolicThresh.warning || diastolic >= diastolicThresh.warning) {
      alerts.push({
        alertType: 'bp_elevated',
        severity: 'warning',
        title: 'Elevated Blood Pressure',
        message: `BP ${systolic}/${diastolic} mmHg is elevated (> ${systolicThresh.warning}/${diastolicThresh.warning})`,
        triggeredBy: 'threshold_breach',
        additionalContext: {
          measuredValue: `${systolic}/${diastolic}`,
          thresholdValue: `${systolicThresh.warning}/${diastolicThresh.warning}`,
          unit: 'mmHg',
          riskAssessment: 'Stage 2 hypertension'
        },
        suggestedAction:
          'Reduce sodium intake. Practice relaxation techniques. Take medication if prescribed. Follow up with doctor.'
      });
    }

    return alerts;
  }

  /**
   * Generate cholesterol alerts
   */
  static generateCholesterolAlerts(biometric) {
    const alerts = [];

    if (biometric.total_cholesterol) {
      const thresholds = ALERT_THRESHOLDS.cholesterol.total;
      if (biometric.total_cholesterol >= thresholds.critical) {
        alerts.push({
          alertType: 'cholesterol_critical',
          severity: 'critical',
          title: 'Critical Cholesterol Level',
          message: `Total cholesterol ${biometric.total_cholesterol} mg/dL is critically high (> ${thresholds.critical})`,
          triggeredBy: 'threshold_breach',
          additionalContext: {
            measuredValue: biometric.total_cholesterol,
            thresholdValue: thresholds.critical,
            unit: 'mg/dL'
          },
          suggestedAction: 'Consult your doctor. May need medication. Adopt heart-healthy diet.'
        });
      } else if (biometric.total_cholesterol >= thresholds.warning) {
        alerts.push({
          alertType: 'cholesterol_high',
          severity: 'warning',
          title: 'High Cholesterol',
          message: `Total cholesterol ${biometric.total_cholesterol} mg/dL is elevated (> ${thresholds.warning})`,
          triggeredBy: 'threshold_breach',
          additionalContext: {
            measuredValue: biometric.total_cholesterol,
            thresholdValue: thresholds.warning,
            unit: 'mg/dL'
          },
          suggestedAction: 'Reduce saturated fat and cholesterol intake. Increase fiber. Exercise regularly.'
        });
      }
    }

    return alerts;
  }

  /**
   * Generate daily caloric intake alerts
   */
  static async generateDailyCaloricAlert(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const Meal = require('../models/Meal');
      const meals = await Meal.find({
        userId,
        timestamp: { $gte: today }
      });

      const totalCalories = meals.reduce(
        (sum, meal) => sum + (meal.totalNutrition?.calories ?? meal.totalNutrition?.calories_kcal ?? 0),
        0
      );
      const threshold = ALERT_THRESHOLDS.daily_caloric_intake;

      if (totalCalories > threshold.warning) {
        return {
          alertType: 'calorie_excess',
          severity: 'warning',
          title: 'High Caloric Intake Today',
          message: `Total caloric intake today is ${totalCalories} kcal (> ${threshold.warning})`,
          triggeredBy: 'meal_logged',
          additionalContext: {
            measuredValue: totalCalories,
            thresholdValue: threshold.warning,
            unit: 'kcal'
          },
          suggestedAction: 'Light dinner recommended. Increase physical activity.'
        };
      } else if (totalCalories > threshold.info) {
        return {
          alertType: 'calorie_info',
          severity: 'info',
          title: 'Caloric Intake Notification',
          message: `Total caloric intake today is ${totalCalories} kcal (> ${threshold.info})`,
          triggeredBy: 'meal_logged',
          userId,
          additionalContext: {
            measuredValue: totalCalories,
            thresholdValue: threshold.info,
            unit: 'kcal'
          },
          suggestedAction: 'Monitor remaining meals for the day.'
        };
      }

      return null;
    } catch (error) {
      console.error('Error generating caloric alert:', error);
      return null;
    }
  }

  /**
   * Check and auto-generate alerts for out-of-range values
   */
  static async checkAndGenerateAlerts(userId, biometrics) {
    const alerts = [];

    for (const biometric of biometrics) {
      const biometricAlerts = await this.generateAlertsForBiometric(userId, biometric);
      alerts.push(...biometricAlerts);
    }

    return alerts;
  }
}

module.exports = AlertGenerator;
