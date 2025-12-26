/**
 * Biometric Data Validator
 * Enforces clinical standards for health metrics
 */

const CLINICAL_RANGES = {
  glucose: {
    manual_entry: { min: 70, max: 140, unit: 'mg/dL' },
    cgm_device: { min: 50, max: 500, unit: 'mg/dL' },
    lab_test: { min: 40, max: 600, unit: 'mg/dL' },
    alerts: {
      critical_high: 180,
      critical_low: 50,
      warning_high: 160,
      warning_low: 70
    }
  },
  heart_rate: {
    manual_entry: { min: 60, max: 120, unit: 'bpm' },
    smartwatch: { min: 40, max: 200, unit: 'bpm' },
    fitbit: { min: 40, max: 200, unit: 'bpm' },
    alerts: {
      critical_high: 140,
      critical_low: 50,
      warning_high: 120,
      warning_low: 60
    }
  },
  blood_pressure: {
    manual_entry: {
      systolic: { min: 90, max: 139, unit: 'mmHg' },
      diastolic: { min: 60, max: 89, unit: 'mmHg' }
    },
    bp_monitor: {
      systolic: { min: 70, max: 180, unit: 'mmHg' },
      diastolic: { min: 40, max: 120, unit: 'mmHg' }
    },
    alerts: {
      critical_systolic: 180,
      critical_diastolic: 120,
      warning_systolic: 160,
      warning_diastolic: 100
    }
  },
  cholesterol: {
    total: { min: 50, max: 400, unit: 'mg/dL' },
    ldl: { min: 0, max: 300, unit: 'mg/dL' },
    hdl: { min: 0, max: 200, unit: 'mg/dL' },
    triglycerides: { min: 0, max: 500, unit: 'mg/dL' }
  },
  temperature: {
    min: 35.5,
    max: 40.5,
    unit: '°C'
  },
  weight: {
    min: 30,
    max: 300,
    unit: 'kg'
  }
};

const RISK_LEVELS = {
  glucose: {
    normal: { max: 140 },
    prediabetic: { min: 140, max: 200 },
    diabetic: { min: 200 }
  },
  bloodPressure: {
    optimal: { systolic: 120, diastolic: 80 },
    elevated: { systolic: 120, diastolic: 80, systolicMax: 129, diastolicMax: 79 },
    stage1: { systolic: 130, diastolic: 80, systolicMax: 139, diastolicMax: 89 },
    stage2: { systolic: 140, diastolic: 90 }
  }
};

class BiometricValidator {
  /**
   * Validate glucose reading
   */
  static validateGlucose(value, dataSource = 'manual_entry') {
    const range = CLINICAL_RANGES.glucose[dataSource];
    if (!range) {
      throw new Error(`Unknown data source: ${dataSource}`);
    }

    if (value === null || value === undefined) {
      throw new Error('Glucose value is required');
    }

    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Glucose must be a valid number');
    }

    if (value < range.min || value > range.max) {
      throw new Error(
        `Glucose must be between ${range.min} and ${range.max} ${range.unit} for ${dataSource}`
      );
    }

    return {
      isValid: true,
      value,
      riskLevel: this.getGlucoseRiskLevel(value),
      alerts: this.getGlucoseAlerts(value)
    };
  }

  /**
   * Validate heart rate
   */
  static validateHeartRate(value, dataSource = 'manual_entry') {
    const range = CLINICAL_RANGES.heart_rate[dataSource];
    if (!range) {
      throw new Error(`Unknown data source: ${dataSource}`);
    }

    if (value === null || value === undefined) {
      throw new Error('Heart rate value is required');
    }

    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Heart rate must be a valid number');
    }

    if (value < range.min || value > range.max) {
      throw new Error(
        `Heart rate must be between ${range.min} and ${range.max} ${range.unit} for ${dataSource}`
      );
    }

    return {
      isValid: true,
      value,
      alerts: this.getHeartRateAlerts(value)
    };
  }

  /**
   * Validate cholesterol
   */
  static validateCholesterol(totalCholesterol) {
    if (totalCholesterol === null || totalCholesterol === undefined) {
      throw new Error('Cholesterol value is required');
    }

    if (typeof totalCholesterol !== 'number' || isNaN(totalCholesterol)) {
      throw new Error('Cholesterol must be a valid number');
    }

    const range = CLINICAL_RANGES.cholesterol.total;
    if (totalCholesterol < range.min || totalCholesterol > range.max) {
      throw new Error(
        `Cholesterol must be between ${range.min} and ${range.max} ${range.unit}`
      );
    }

    return {
      isValid: true,
      value: totalCholesterol
    };
  }

  /**
   * Validate body temperature
   */
  static validateTemperature(temperature) {
    if (temperature === null || temperature === undefined) {
      throw new Error('Temperature value is required');
    }

    if (typeof temperature !== 'number' || isNaN(temperature)) {
      throw new Error('Temperature must be a valid number');
    }

    const range = CLINICAL_RANGES.temperature;
    if (temperature < range.min || temperature > range.max) {
      throw new Error(
        `Temperature must be between ${range.min} and ${range.max} ${range.unit}`
      );
    }

    return {
      isValid: true,
      value: temperature
    };
  }

  /**
   * Validate weight
   */
  static validateWeight(weight) {
    if (weight === null || weight === undefined) {
      throw new Error('Weight value is required');
    }

    if (typeof weight !== 'number' || isNaN(weight)) {
      throw new Error('Weight must be a valid number');
    }

    const range = CLINICAL_RANGES.weight;
    if (weight < range.min || weight > range.max) {
      throw new Error(
        `Weight must be between ${range.min} and ${range.max} ${range.unit}`
      );
    }

    return {
      isValid: true,
      value: weight
    };
  }

  /**
   * Validate blood pressure
   */
  static validateBloodPressure(systolic, diastolic, dataSource = 'manual_entry') {
    const range = CLINICAL_RANGES.blood_pressure[dataSource];
    if (!range) {
      throw new Error(`Unknown data source: ${dataSource}`);
    }

    // Allow partial entries (either systolic or diastolic only)
    if (systolic === null && diastolic === null) {
      throw new Error('At least one blood pressure value is required');
    }

    // Validate systolic if provided
    if (systolic !== null && systolic !== undefined) {
      if (typeof systolic !== 'number' || isNaN(systolic)) {
        throw new Error('Systolic value must be a valid number');
      }
      if (systolic < range.systolic.min || systolic > range.systolic.max) {
        throw new Error(
          `Systolic must be between ${range.systolic.min} and ${range.systolic.max} ${range.systolic.unit}`
        );
      }
    }

    // Validate diastolic if provided
    if (diastolic !== null && diastolic !== undefined) {
      if (typeof diastolic !== 'number' || isNaN(diastolic)) {
        throw new Error('Diastolic value must be a valid number');
      }
      if (diastolic < range.diastolic.min || diastolic > range.diastolic.max) {
        throw new Error(
          `Diastolic must be between ${range.diastolic.min} and ${range.diastolic.max} ${range.diastolic.unit}`
        );
      }
    }

    return {
      isValid: true,
      systolic,
      diastolic,
      riskLevel: this.getBloodPressureRiskLevel(systolic, diastolic),
      alerts: this.getBloodPressureAlerts(systolic, diastolic)
    };
  }

  /**
   * Get risk level for glucose
   */
  static getGlucoseRiskLevel(value) {
    if (value <= RISK_LEVELS.glucose.normal.max) return 'normal';
    if (value <= RISK_LEVELS.glucose.prediabetic.max) return 'prediabetic';
    return 'diabetic';
  }

  /**
   * Get risk level for blood pressure
   */
  static getBloodPressureRiskLevel(systolic, diastolic) {
    if (systolic < 120 && diastolic < 80) return 'optimal';
    if (systolic <= 129 && diastolic < 80) return 'elevated';
    if (systolic <= 139 || diastolic <= 89) return 'stage1';
    return 'stage2';
  }

  /**
   * Get glucose-related alerts
   */
  static getGlucoseAlerts(value) {
    const alerts = [];
    const thresholds = CLINICAL_RANGES.glucose.alerts;

    if (value >= thresholds.critical_high) {
      alerts.push({
        type: 'glucose_spike',
        severity: 'critical',
        message: `Critical high glucose: ${value} mg/dL (threshold: > ${thresholds.critical_high})`,
        threshold: thresholds.critical_high,
        measuredValue: value
      });
    } else if (value >= thresholds.warning_high) {
      alerts.push({
        type: 'glucose_high',
        severity: 'warning',
        message: `High glucose: ${value} mg/dL (threshold: > ${thresholds.warning_high})`,
        threshold: thresholds.warning_high,
        measuredValue: value
      });
    }

    if (value <= thresholds.critical_low) {
      alerts.push({
        type: 'glucose_low',
        severity: 'critical',
        message: `Critical low glucose: ${value} mg/dL (threshold: < ${thresholds.critical_low})`,
        threshold: thresholds.critical_low,
        measuredValue: value
      });
    } else if (value <= thresholds.warning_low) {
      alerts.push({
        type: 'glucose_low',
        severity: 'warning',
        message: `Low glucose: ${value} mg/dL (threshold: < ${thresholds.warning_low})`,
        threshold: thresholds.warning_low,
        measuredValue: value
      });
    }

    return alerts;
  }

  /**
   * Get heart rate alerts
   */
  static getHeartRateAlerts(value) {
    const alerts = [];
    const thresholds = CLINICAL_RANGES.heart_rate.alerts;

    if (value >= thresholds.critical_high || value <= thresholds.critical_low) {
      alerts.push({
        type: 'heart_rate_anomaly',
        severity: 'critical',
        message: `Abnormal heart rate: ${value} bpm (critical range)`,
        threshold: `${thresholds.critical_low}-${thresholds.critical_high}`,
        measuredValue: value
      });
    } else if (value >= thresholds.warning_high || value <= thresholds.warning_low) {
      alerts.push({
        type: 'heart_rate_anomaly',
        severity: 'warning',
        message: `Unusual heart rate: ${value} bpm (warning range)`,
        threshold: `${thresholds.warning_low}-${thresholds.warning_high}`,
        measuredValue: value
      });
    }

    return alerts;
  }

  /**
   * Get blood pressure alerts
   */
  static getBloodPressureAlerts(systolic, diastolic) {
    const alerts = [];
    const thresholds = CLINICAL_RANGES.blood_pressure.alerts;

    if (systolic >= thresholds.critical_systolic || diastolic >= thresholds.critical_diastolic) {
      alerts.push({
        type: 'bp_critical',
        severity: 'critical',
        message: `Critical blood pressure: ${systolic}/${diastolic} mmHg`,
        threshold: `${thresholds.critical_systolic}/${thresholds.critical_diastolic}`,
        measuredValue: `${systolic}/${diastolic}`
      });
    } else if (systolic >= thresholds.warning_systolic || diastolic >= thresholds.warning_diastolic) {
      alerts.push({
        type: 'bp_elevated',
        severity: 'warning',
        message: `Elevated blood pressure: ${systolic}/${diastolic} mmHg`,
        threshold: `${thresholds.warning_systolic}/${thresholds.warning_diastolic}`,
        measuredValue: `${systolic}/${diastolic}`
      });
    }

    return alerts;
  }

  /**
   * Comprehensive validation for all biometric types
   */
  static validateBiometric(biometricType, data, dataSource = 'manual_entry') {
    try {
      let result;

      switch (biometricType) {
        case 'glucose':
          result = this.validateGlucose(data.glucose_mg_dl, dataSource);
          break;
        case 'heart_rate':
          result = this.validateHeartRate(data.heart_rate_bpm, dataSource);
          break;
        case 'blood_pressure':
          result = this.validateBloodPressure(data.systolic, data.diastolic, dataSource);
          break;
        case 'cholesterol':
          result = this.validateCholesterol(data.total_cholesterol);
          break;
        case 'body_temperature':
          result = this.validateTemperature(data.temperature_celsius);
          break;
        case 'weight':
          result = this.validateWeight(data.weight_kg);
          break;
        default:
          throw new Error(`Unknown biometric type: ${biometricType}`);
      }

      return {
        isValid: true,
        ...result
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = BiometricValidator;
