/**
 * Migration Script for Existing Users
 * Adds BMI fields and backward compatibility flags to existing user accounts
 * Run this once after deploying the new BMI system
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const BMICalculator = require('./src/utils/bmiCalculator');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dietary-monitoring';

async function migrateExistingUsers() {
  try {
    console.log('🔄 Starting migration for existing users...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all users without biometric completeness flags
    const users = await User.find({
      biometricDataComplete: { $exists: false }
    });
    
    console.log(`📊 Found ${users.length} users to migrate\n`);
    
    let migratedCount = 0;
    let calculatedBMICount = 0;
    let estimatedCount = 0;
    
    for (const user of users) {
      try {
        // Check if user has complete biometric data
        const hasCompleteData = user.height_cm && user.weight_kg && user.age;
        
        if (hasCompleteData) {
          // Calculate BMI for users with complete data
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
            user.biometricDataEstimated = false;
            user.lastBiometricUpdate = new Date();
            user.onboardingCompleted = true;
            
            console.log(`✓ ${user.email}: Calculated BMI = ${bmiResult.bmi.toFixed(1)} (${bmiResult.category})`);
            calculatedBMICount++;
          }
        } else {
          // Set default values for users with incomplete data
          if (!user.age) {
            user.age = 20; // Default age for backward compatibility
          }
          
          user.biometricDataComplete = false;
          user.biometricDataEstimated = true;
          user.onboardingCompleted = false;
          
          console.log(`⚠ ${user.email}: Marked as estimated (missing: ${!user.height_cm ? 'height ' : ''}${!user.weight_kg ? 'weight ' : ''})`);
          estimatedCount++;
        }
        
        await user.save();
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   Total users migrated: ${migratedCount}`);
    console.log(`   BMI calculated: ${calculatedBMICount}`);
    console.log(`   Marked as estimated: ${estimatedCount}`);
    console.log('\n✅ Migration completed successfully!');
    
    // Verify migration
    const verifyComplete = await User.countDocuments({ biometricDataComplete: true });
    const verifyEstimated = await User.countDocuments({ biometricDataEstimated: true });
    
    console.log('\n🔍 Verification:');
    console.log(`   Users with complete data: ${verifyComplete}`);
    console.log(`   Users with estimated data: ${verifyEstimated}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║     BMI System Migration for Existing Users          ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

migrateExistingUsers();
