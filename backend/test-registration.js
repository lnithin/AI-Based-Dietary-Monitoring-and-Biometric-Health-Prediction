const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

async function testRegistration() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dietary-monitoring';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test user creation
    console.log('🧪 Testing user creation...\n');
    
    const testUser = {
      email: 'testuser@example.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      age: 25,
      gender: 'male',
      height_cm: 175,
      weight_kg: 70
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    testUser.password = await bcrypt.hash(testUser.password, salt);

    const user = new User(testUser);
    
    console.log('User object before save:', {
      email: user.email,
      age: user.age,
      height_cm: user.height_cm,
      weight_kg: user.weight_kg,
      biometricDataComplete: user.biometricDataComplete,
      biometricDataEstimated: user.biometricDataEstimated
    });

    await user.save();
    
    console.log('\n✅ User created successfully!');
    console.log('User ID:', user._id);
    console.log('Email:', user.email);
    console.log('BMI:', user.currentBMI);
    console.log('BMI Category:', user.bmiCategory);
    console.log('Biometric Complete:', user.biometricDataComplete);
    console.log('Biometric Estimated:', user.biometricDataEstimated);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.errors) {
      console.error('\nValidation Errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
    process.exit(0);
  }
}

testRegistration();
