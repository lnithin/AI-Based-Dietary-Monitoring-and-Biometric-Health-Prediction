/**
 * Delete All Users Script
 * WARNING: This will permanently delete all user accounts and their associated data
 * Use only in development environment
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Biometric = require('./src/models/Biometric');
const Meal = require('./src/models/Meal');
const Alert = require('./src/models/Alert');
const Prediction = require('./src/models/Prediction');
const Recommendation = require('./src/models/Recommendation');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dietary-monitoring';

async function deleteAllUsers() {
  try {
    console.log('⚠️  WARNING: This will delete ALL users and their data!');
    console.log('🔄 Starting cleanup...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Delete all users
    const usersDeleted = await User.deleteMany({});
    console.log(`🗑️  Deleted ${usersDeleted.deletedCount} users`);
    
    // Delete all biometric records
    const biometricsDeleted = await Biometric.deleteMany({});
    console.log(`🗑️  Deleted ${biometricsDeleted.deletedCount} biometric records`);
    
    // Delete all meals
    const mealsDeleted = await Meal.deleteMany({});
    console.log(`🗑️  Deleted ${mealsDeleted.deletedCount} meal records`);
    
    // Delete all alerts
    const alertsDeleted = await Alert.deleteMany({});
    console.log(`🗑️  Deleted ${alertsDeleted.deletedCount} alerts`);
    
    // Delete all predictions
    const predictionsDeleted = await Prediction.deleteMany({});
    console.log(`🗑️  Deleted ${predictionsDeleted.deletedCount} predictions`);
    
    // Delete all recommendations
    const recommendationsDeleted = await Recommendation.deleteMany({});
    console.log(`🗑️  Deleted ${recommendationsDeleted.deletedCount} recommendations`);
    
    console.log('\n✅ All users and associated data deleted successfully!');
    console.log('💡 You can now create fresh user accounts with the new BMI system.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║          ⚠️  DELETE ALL USERS - WARNING  ⚠️           ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

deleteAllUsers();
