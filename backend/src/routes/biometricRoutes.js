const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Biometric = require('../models/Biometric');
const Alert = require('../models/Alert');
const Meal = require('../models/Meal');
const User = require('../models/User');
const BiometricValidator = require('../utils/biometricValidator');
const BMICalculator = require('../utils/bmiCalculator');
const AlertGenerator = require('../services/alertGenerator');

// Enhanced validation middleware using BiometricValidator
const validateBiometricInput = (req, res, next) => {
  try {
    const { biometricType, dataSource = 'manual_entry' } = req.body;

    // Apply strict validation only for manual entries
    if (dataSource !== 'manual_entry') return next();

    if (!biometricType) {
      return res.status(400).json({ error: 'biometricType is required', code: 'MISSING_TYPE' });
    }

    const validation = BiometricValidator.validateBiometric(biometricType, req.body, dataSource);
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.error,
        code: 'VALIDATION_FAILED',
        biometricType
      });
    }

    // Attach validation result to request for later use
    req.biometricValidation = validation;
    next();
  } catch (e) {
    return res.status(400).json({ error: 'Invalid biometric input', code: 'INVALID_INPUT' });
  }
};

// Log biometric data
router.post('/', authMiddleware, validateBiometricInput, async (req, res) => {
  try {
    const {
      biometricType,
      timestamp,
      glucose_mg_dl,
      systolic,
      diastolic,
      heart_rate_bpm,
      temperature_celsius,
      weight_kg,
      total_cholesterol,
      ldl_cholesterol,
      hdl_cholesterol,
      triglycerides,
      dataSource = 'manual_entry',
      deviceId,
      deviceName,
      notes
    } = req.body;

    // Set appropriate risk indicators based on biometric type
    let riskIndicators = {};
    if (req.biometricValidation?.riskLevel) {
      if (biometricType === 'glucose') {
        riskIndicators.glucoseRisk = req.biometricValidation.riskLevel;
      } else if (biometricType === 'blood_pressure') {
        riskIndicators.bpRisk = req.biometricValidation.riskLevel;
      } else if (biometricType === 'cholesterol') {
        riskIndicators.cholesterolRisk = req.biometricValidation.riskLevel;
      }
    }

    // Calculate BMI for weight entries
    let bmiData = {};
    if (biometricType === 'weight' && weight_kg) {
      try {
        const user = await User.findById(req.userId);
        if (user && user.height_cm && user.age) {
          const bmiClassification = BMICalculator.getWeightClassification(
            weight_kg,
            user.height_cm,
            user.age,
            user.gender || 'other'
          );
          if (!bmiClassification.error) {
            bmiData = {
              bmi: bmiClassification.bmi,
              bmiCategory: bmiClassification.category,
              bmiStatus: bmiClassification.status,
              bmiAgeGroup: bmiClassification.ageGroup
            };
          }
        }
      } catch (err) {
        console.error('BMI calculation error:', err);
      }
    }

    const biometric = new Biometric({
      userId: req.userId,
      biometricType,
      timestamp: timestamp || new Date(),
      glucose_mg_dl,
      systolic,
      diastolic,
      heart_rate_bpm,
      temperature_celsius,
      weight_kg,
      total_cholesterol,
      ldl_cholesterol,
      hdl_cholesterol,
      triglycerides,
      ...bmiData,
      dataSource,
      deviceId,
      deviceName,
      notes,
      confidence: dataSource === 'manual_entry' ? 0.95 : 0.98,
      riskIndicators: riskIndicators
    });

    await biometric.save();

    // For weight entries, construct BMI classification response from saved data
    let bmiClassification = null;
    if (biometricType === 'weight' && biometric.bmi) {
      try {
        const user = await User.findById(req.userId);
        const fullClassification = BMICalculator.getWeightClassification(
          weight_kg,
          user.height_cm,
          user.age,
          user.gender || 'other'
        );
        bmiClassification = fullClassification;
      } catch (err) {
        console.error('BMI classification error:', err);
      }
    } else if (biometricType === 'weight' && !biometric.bmi) {
      // Profile incomplete
      bmiClassification = {
        error: 'Height, age, and gender required for BMI calculation',
        requiresInput: true
      };
    }

    // Generate intelligent alerts using AlertGenerator
    const generatedAlerts = await AlertGenerator.generateAlertsForBiometric(req.userId, biometric);
    
    // Also check daily caloric intake
    const caloricAlert = await AlertGenerator.generateDailyCaloricAlert(req.userId);
    if (caloricAlert) {
      await Alert.create({
        userId: req.userId,
        ...caloricAlert
      });
    }

    const response = {
      message: 'Biometric data recorded successfully',
      biometric,
      alertsGenerated: generatedAlerts.length,
      alerts: generatedAlerts.slice(0, 3) // Return top 3 alerts to user
    };

    // Add BMI classification if available
    if (bmiClassification) {
      response.bmiClassification = bmiClassification;
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get biometric readings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      biometricType,
      startDate,
      endDate,
      limit = 100,
      skip = 0
    } = req.query;

    const filter = { userId: req.userId };

    if (biometricType) filter.biometricType = biometricType;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const readings = await Biometric.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Biometric.countDocuments(filter);

    res.json({
      readings,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get biometric statistics
router.get('/stats/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const readings = await Biometric.find({
      userId: req.userId,
      biometricType: type,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });

    if (readings.length === 0) {
      return res.json({
        message: 'No data available',
        stats: null
      });
    }

    // Get field name based on type
    let fieldName;
    switch (type) {
      case 'glucose':
        fieldName = 'glucose_mg_dl';
        break;
      case 'blood_pressure':
        fieldName = ['systolic', 'diastolic'];
        break;
      case 'heart_rate':
        fieldName = 'heart_rate_bpm';
        break;
      case 'cholesterol':
        fieldName = 'total_cholesterol';
        break;
      case 'body_temperature':
        fieldName = 'temperature_celsius';
        break;
      case 'weight':
        fieldName = 'weight_kg';
        break;
      default:
        fieldName = null;
    }

    let stats = {};

    if (Array.isArray(fieldName)) {
      // For blood pressure, handle both systolic and diastolic
      const systolicValues = readings.map(r => r.systolic).filter(v => v);
      const diastolicValues = readings.map(r => r.diastolic).filter(v => v);

      stats.systolic = {
        average: (systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length).toFixed(1),
        min: Math.min(...systolicValues),
        max: Math.max(...systolicValues),
        latest: readings[readings.length - 1].systolic
      };

      stats.diastolic = {
        average: (diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length).toFixed(1),
        min: Math.min(...diastolicValues),
        max: Math.max(...diastolicValues),
        latest: readings[readings.length - 1].diastolic
      };
    } else {
      const values = readings.map(r => r[fieldName]).filter(v => v);

      stats = {
        average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
        min: Math.min(...values),
        max: Math.max(...values),
        latest: readings[readings.length - 1][fieldName],
        trend: values[values.length - 1] - values[0] // Positive = increasing
      };
    }

    stats.readingCount = readings.length;
    stats.dateRange = {
      start: readings[0].timestamp,
      end: readings[readings.length - 1].timestamp
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest reading by type
router.get('/latest/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;

    const reading = await Biometric.findOne({
      userId: req.userId,
      biometricType: type
    }).sort({ timestamp: -1 });

    if (!reading) {
      return res.status(404).json({ error: 'No readings found' });
    }

    res.json(reading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get complete biometric history for review (all types)
router.get('/history/complete', authMiddleware, async (req, res) => {
  try {
    const { days = 30, limit = 500 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const readings = await Biometric.find({
      userId: req.userId,
      timestamp: { $gte: startDate }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    // Group by type
    const grouped = {};
    readings.forEach(reading => {
      if (!grouped[reading.biometricType]) {
        grouped[reading.biometricType] = [];
      }
      grouped[reading.biometricType].push(reading);
    });

    // Calculate summaries for each type
    const summaries = {};
    for (const [type, typeReadings] of Object.entries(grouped)) {
      let values = [];
      
      switch (type) {
        case 'glucose':
          values = typeReadings.map(r => r.glucose_mg_dl).filter(v => v);
          break;
        case 'heart_rate':
          values = typeReadings.map(r => r.heart_rate_bpm).filter(v => v);
          break;
        case 'weight':
          values = typeReadings.map(r => r.weight_kg).filter(v => v);
          break;
      }

      if (values.length > 0) {
        summaries[type] = {
          count: values.length,
          average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
          min: Math.min(...values),
          max: Math.max(...values),
          latest: values[0],
          unit: type === 'glucose' ? 'mg/dL' : type === 'heart_rate' ? 'bpm' : 'kg'
        };
      }
    }

    res.json({
      period: {
        startDate,
        endDate: new Date(),
        days: parseInt(days)
      },
      totalReadings: readings.length,
      summaries,
      detailedHistory: grouped
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete biometric reading
router.delete('/:readingId', authMiddleware, async (req, res) => {
  try {
    const reading = await Biometric.findOneAndDelete({
      _id: req.params.readingId,
      userId: req.userId
    });

    if (!reading) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    res.json({ message: 'Biometric reading deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
