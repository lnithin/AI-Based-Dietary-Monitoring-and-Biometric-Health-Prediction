const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../utils/jwtUtils');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Check if MongoDB is connected
const isMongoConnected = () => global.IS_DEMO_MODE !== true && mongoose.connection.readyState === 1;

// Helper function for demo mode
async function findUserByEmail(email) {
  if (isMongoConnected()) {
    return await User.findOne({ email });
  }
  // Demo mode
  return global.demoDatabase.users.find(u => u.email === email);
}

async function createUser(userData) {
  if (isMongoConnected()) {
    const user = new User(userData);
    return await user.save();
  }
  // Demo mode - hash password and store
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);
  const demoUser = {
    _id: Date.now().toString(),
    ...userData,
    password: hashedPassword,
    createdAt: new Date()
  };
  global.demoDatabase.users.push(demoUser);
  return demoUser;
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, age, gender, height_cm, weight_kg } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, firstName, and lastName are required' });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Calculate BMI if height and weight provided
    let bmiData = {};
    let biometricComplete = false;
    let biometricEstimated = false;
    
    if (height_cm && weight_kg && age) {
      const BMICalculator = require('../utils/bmiCalculator');
      const bmiResult = BMICalculator.getWeightClassification(
        parseFloat(weight_kg),
        parseFloat(height_cm),
        parseInt(age),
        gender || 'other'
      );
      
      if (!bmiResult.error) {
        bmiData = {
          currentBMI: bmiResult.bmi,
          bmiCategory: bmiResult.category,
          bmiStatus: bmiResult.status,
          biometricDataComplete: true,
          lastBiometricUpdate: new Date()
        };
        biometricComplete = true;
      }
    } else {
      // Existing user compatibility - mark as estimated
      biometricEstimated = true;
    }

    // Create new user
    const user = await createUser({
      email,
      password,
      firstName,
      lastName,
      age: age || 20,  // Default for backward compatibility
      gender: gender || null,
      height_cm: height_cm || null,
      weight_kg: weight_kg || null,
      biometricDataEstimated: biometricEstimated,
      onboardingCompleted: biometricComplete,
      ...bmiData
    });

    const token = generateToken(user._id);
    const userResponse = user.toJSON ? user.toJSON() : {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age,
      gender: user.gender,
      height_cm: user.height_cm,
      weight_kg: user.weight_kg,
      currentBMI: user.currentBMI,
      bmiCategory: user.bmiCategory,
      biometricDataComplete: user.biometricDataComplete,
      biometricDataEstimated: user.biometricDataEstimated,
      onboardingCompleted: user.onboardingCompleted
    };

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse,
      requiresBiometricSetup: !biometricComplete
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    let isPasswordValid;
    if (user.comparePassword) {
      // Mongoose model method
      isPasswordValid = await user.comparePassword(password);
    } else {
      // Demo mode - compare with bcrypt
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login timestamp
    if (isMongoConnected()) {
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    }

    const token = generateToken(user._id);
    const userResponse = user.toJSON ? user.toJSON() : {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age,
      gender: user.gender
    };

    res.json({
      message: 'Login successful',
      token,
      user: userResponse,
      loginTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { verifyToken } = require('../utils/jwtUtils');
    const decoded = verifyToken(token);
    
    let user;
    if (isMongoConnected()) {
      user = await User.findById(decoded.userId);
    } else {
      // Demo mode
      user = global.demoDatabase.users.find(u => u._id === decoded.userId);
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userResponse = user.toJSON ? user.toJSON() : {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age,
      gender: user.gender
    };

    res.json({
      valid: true,
      user: userResponse
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
