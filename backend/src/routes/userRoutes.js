const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const { calculateProfileCompleteness } = require('../utils/userUtils');

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      age,
      gender,
      height_cm,
      weight_kg,
      activityLevel,
      healthConditions,
      medications,
      dietType,
      dietaryPattern,
      dietaryRestrictions,
      dietaryPreferences,
      allergies,
      culturalRestrictions,
      nutrientTargets,
      notificationPreferences
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Track if biometric data changed
    let biometricDataChanged = false;
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (age) {
      user.age = age;
      biometricDataChanged = true;
    }
    if (gender) user.gender = gender;
    if (height_cm) {
      user.height_cm = height_cm;
      biometricDataChanged = true;
    }
    if (weight_kg) {
      user.weight_kg = weight_kg;
      biometricDataChanged = true;
    }
    if (activityLevel) user.activityLevel = activityLevel;
    if (healthConditions) user.healthConditions = healthConditions;
    if (medications) user.medications = medications;
    
    // New dietary fields
    if (dietType !== undefined) user.dietType = dietType;
    if (dietaryPattern) user.dietaryPattern = dietaryPattern;
    if (dietaryRestrictions) user.dietaryRestrictions = dietaryRestrictions;
    
    // Legacy field support
    if (dietaryPreferences) user.dietaryPreferences = dietaryPreferences;
    
    if (allergies !== undefined) user.allergies = allergies;
    if (culturalRestrictions) user.culturalRestrictions = culturalRestrictions;
    if (nutrientTargets) user.nutrientTargets = nutrientTargets;
    if (notificationPreferences) user.notificationPreferences = notificationPreferences;

    // Recalculate BMI if biometric data changed and all required fields present
    if (biometricDataChanged && user.height_cm && user.weight_kg && user.age) {
      const BMICalculator = require('../utils/bmiCalculator');
      const bmiResult = BMICalculator.getWeightClassification(
        parseFloat(user.weight_kg),
        parseFloat(user.height_cm),
        parseInt(user.age),
        user.gender || 'other'
      );
      
      if (!bmiResult.error) {
        user.currentBMI = bmiResult.bmi;
        user.bmiCategory = bmiResult.category;
        user.bmiStatus = bmiResult.status;
        user.biometricDataComplete = true;
        user.biometricDataEstimated = false;  // No longer estimated
        user.lastBiometricUpdate = new Date();
        user.onboardingCompleted = true;
      }
    }

    // Calculate profile completeness
    user.profileCompleteness = calculateProfileCompleteness(user);

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      notificationPreferences: user.notificationPreferences,
      nutrientTargets: user.nutrientTargets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user settings
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { notificationPreferences, nutrientTargets } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (notificationPreferences) user.notificationPreferences = notificationPreferences;
    if (nutrientTargets) user.nutrientTargets = nutrientTargets;

    await user.save();

    res.json({
      message: 'Settings updated successfully',
      settings: {
        notificationPreferences: user.notificationPreferences,
        nutrientTargets: user.nutrientTargets
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user account details and persistence information
router.get('/account/details', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      accountInfo: {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        profileCompleteness: user.profileCompleteness
      },
      personalInfo: {
        age: user.age,
        gender: user.gender,
        height_cm: user.height_cm,
        weight_kg: user.weight_kg,
        activityLevel: user.activityLevel
      },
      healthProfile: {
        healthConditions: user.healthConditions,
        medications: user.medications,
        allergies: user.allergies,
        dietType: user.dietType,
        dietaryPattern: user.dietaryPattern,
        dietaryRestrictions: user.dietaryRestrictions,
        dietaryPreferences: user.dietaryPreferences,
        healthRiskProfile: user.healthRiskProfile
      },
      biometricBaselines: user.biometricBaselines,
      complianceMetrics: user.complianceMetrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update last login timestamp
router.post('/login-update', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { lastLogin: new Date() },
      { new: true }
    );

    res.json({
      message: 'Login timestamp updated',
      lastLogin: user.lastLogin
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user health summary
router.get('/health-summary', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      demographics: {
        age: user.age,
        gender: user.gender,
        weight_kg: user.weight_kg,
        height_cm: user.height_cm
      },
      healthConditions: user.healthConditions,
      allergies: user.allergies,
      medications: user.medications,
      dietaryPreferences: user.dietaryPreferences,
      healthRiskProfile: user.healthRiskProfile,
      biometricBaselines: user.biometricBaselines,
      nutrientTargets: user.nutrientTargets,
      complianceMetrics: user.complianceMetrics,
      memberSince: user.createdAt,
      lastLogin: user.lastLogin,
      profileCompleteness: `${user.profileCompleteness || 0}%`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
