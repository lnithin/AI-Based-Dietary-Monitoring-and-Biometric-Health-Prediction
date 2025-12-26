// Quick diagnostic script to check food recognition setup
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Import models
const FoodNutrition = require('./src/models/FoodNutrition');

async function runDiagnostics() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  FOOD RECOGNITION DIAGNOSTIC TOOL            ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  try {
    // 1. Check MongoDB connection
    console.log('1️⃣  Checking MongoDB connection...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dietary-monitoring';
    await mongoose.connect(mongoUri);
    console.log('   ✅ MongoDB connected\n');

    // 2. Check FoodNutrition collection
    console.log('2️⃣  Checking FoodNutrition database...');
    const foodCount = await FoodNutrition.countDocuments();
    console.log(`   📊 Food items in database: ${foodCount}`);
    
    if (foodCount === 0) {
      console.log('   ❌ NO FOOD ITEMS FOUND!');
      console.log('   💡 Solution: Run seed script');
      console.log('      node backend/seed-food-nutrition.js\n');
    } else {
      console.log('   ✅ Database has food items\n');
      
      // Show available foods
      const foods = await FoodNutrition.find({}).select('foodName').limit(20);
      console.log('   📋 Available foods:');
      foods.forEach((food, idx) => {
        console.log(`      ${idx + 1}. ${food.foodName}`);
      });
      console.log();
    }

    // 3. Check data folder
    console.log('3️⃣  Checking data folder...');
    const dataDir = path.join(__dirname, '../data');
    
    if (!fs.existsSync(dataDir)) {
      console.log('   ❌ Data folder not found!');
      console.log(`   Expected: ${dataDir}\n`);
    } else {
      const folders = fs.readdirSync(dataDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      console.log(`   📁 Food folders found: ${folders.length}`);
      console.log('   📋 Food types:');
      folders.forEach((folder, idx) => {
        const folderPath = path.join(dataDir, folder);
        const files = fs.readdirSync(folderPath).length;
        console.log(`      ${idx + 1}. ${folder} (${files} images)`);
      });
      console.log();
    }

    // 4. Check image matcher utility
    console.log('4️⃣  Checking image matcher...');
    try {
      const imageMatcher = require('./src/utils/imageMatcher');
      console.log('   ✅ Image matcher loaded');
      
      // Test filename matching
      const testFiles = ['dosa.jpg', 'idli-1.jpg', 'food-123.jpg', 'biryani_test.png'];
      console.log('   🧪 Testing filename matching:');
      
      testFiles.forEach(filename => {
        const result = imageMatcher.matchByFilename(filename);
        if (result) {
          console.log(`      ✅ "${filename}" → ${result.foodName} (${(result.confidence * 100).toFixed(0)}%)`);
        } else {
          console.log(`      ⚠️  "${filename}" → No match`);
        }
      });
      console.log();
    } catch (error) {
      console.log(`   ❌ Error loading image matcher: ${error.message}\n`);
    }

    // 5. Check Sharp dependency
    console.log('5️⃣  Checking Sharp (image processing)...');
    try {
      const sharp = require('sharp');
      console.log('   ✅ Sharp is installed\n');
    } catch (error) {
      console.log('   ❌ Sharp not found!');
      console.log('   💡 Install: npm install sharp\n');
    }

    // 6. Summary
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  SUMMARY                                      ║');
    console.log('╚═══════════════════════════════════════════════╝\n');
    
    const issues = [];
    if (foodCount === 0) issues.push('No food items in database');
    if (!fs.existsSync(dataDir)) issues.push('Data folder missing');
    
    if (issues.length === 0) {
      console.log('   ✅ All checks passed!');
      console.log('   📸 Food recognition should work properly\n');
    } else {
      console.log('   ⚠️  Issues found:');
      issues.forEach(issue => console.log(`      • ${issue}`));
      console.log();
    }

    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  RECOMMENDED ACTIONS                          ║');
    console.log('╚═══════════════════════════════════════════════╝\n');
    
    if (foodCount === 0) {
      console.log('   1. Seed the database:');
      console.log('      cd backend');
      console.log('      node seed-food-nutrition.js\n');
    }
    
    console.log('   2. Test food recognition:');
    console.log('      • Upload image via frontend');
    console.log('      • Check backend console for detailed logs\n');
    
    console.log('   3. For best accuracy, start CV service:');
    console.log('      cd ml-services/cv_service');
    console.log('      python app.py\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

runDiagnostics();
