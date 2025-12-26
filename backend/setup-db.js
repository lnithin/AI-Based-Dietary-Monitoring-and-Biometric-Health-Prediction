#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates collections and initializes the database with a demo user
 */

const mongoose = require('mongoose');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Get database connection
    const db = mongoose.connection.db;

    // Drop existing collections to start fresh
    console.log('🧹 Cleaning up old collections...');
    try {
      await db.collection('users').drop();
      console.log('   ✓ Dropped users collection');
    } catch (e) {}
    
    try {
      await db.collection('meals').drop();
      console.log('   ✓ Dropped meals collection');
    } catch (e) {}
    
    try {
      await db.collection('biometrics').drop();
      console.log('   ✓ Dropped biometrics collection');
    } catch (e) {}
    
    try {
      await db.collection('alerts').drop();
      console.log('   ✓ Dropped alerts collection');
    } catch (e) {}

    try {
      await db.collection('predictions').drop();
      console.log('   ✓ Dropped predictions collection');
    } catch (e) {}

    try {
      await db.collection('model_metadatas').drop();
      console.log('   ✓ Dropped model_metadatas collection');
    } catch (e) {}

    try {
      await db.collection('explainabilitylogs').drop();
      console.log('   ✓ Dropped explainabilitylogs collection');
    } catch (e) {}

    try {
      await db.collection('sessions').drop();
      console.log('   ✓ Dropped sessions collection');
    } catch (e) {}

    // Create collections
    console.log('\n📚 Creating collections...');
    
    await db.createCollection('users');
    console.log('   ✓ Created users collection');
    
    await db.createCollection('meals');
    console.log('   ✓ Created meals collection');
    
    await db.createCollection('biometrics');
    console.log('   ✓ Created biometrics collection');
    
    await db.createCollection('alerts');
    console.log('   ✓ Created alerts collection');

    await db.createCollection('predictions');
    console.log('   ✓ Created predictions collection');

    await db.createCollection('model_metadatas');
    console.log('   ✓ Created model_metadatas collection');

    await db.createCollection('explainabilitylogs');
    console.log('   ✓ Created explainabilitylogs collection');

    await db.createCollection('sessions');
    console.log('   ✓ Created sessions collection');

    // Create indexes
    console.log('\n🔍 Creating indexes...');
    
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('   ✓ Created email index on users');
    
    await db.collection('meals').createIndex({ userId: 1, loggedAt: -1 });
    console.log('   ✓ Created userId index on meals');
    
    await db.collection('biometrics').createIndex({ userId: 1, recordedAt: -1 });
    console.log('   ✓ Created userId index on biometrics');
    
    await db.collection('alerts').createIndex({ userId: 1, createdAt: -1 });
    console.log('   ✓ Created userId index on alerts');

    await db.collection('predictions').createIndex({ userId: 1, timestamp: -1 });
    console.log('   ✓ Created userId index on predictions');

    await db.collection('model_metadatas').createIndex({ version: 1 }, { unique: true });
    console.log('   ✓ Created version index on model_metadatas');

    await db.collection('explainabilitylogs').createIndex({ userId: 1, timestamp: -1 });
    console.log('   ✓ Created userId index on explainabilitylogs');

    await db.collection('sessions').createIndex({ userId: 1, loginTime: -1 });
    console.log('   ✓ Created userId index on sessions');

    // Insert demo user
    console.log('\n👤 Creating demo user...');
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('demo123', salt);

    const demoUser = {
      email: 'demo@example.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      age: 28,
      gender: 'male',
      height_cm: 175,
      weight_kg: 75,
      healthConditions: ['diabetes'],
      dietaryPreferences: ['vegetarian'],
      allergies: 'peanuts',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const result = await db.collection('users').insertOne(demoUser);
    console.log(`   ✓ Created demo user with ID: ${result.insertedId}`);

    // Seed model metadata
    console.log('\n🤖 Seeding model metadata...');
    const ModelMetadata = require('./src/models/ModelMetadata');
    const lstmModel = await ModelMetadata.create({
      modelName: 'Glucose LSTM',
      version: 'v3.2',
      modelType: 'LSTM',
      trainedOn: 'Synthetic + Clinical Rules',
      featureCount: 15,
      inputFeatures: [
        'carbohydrates_g', 'protein_g', 'fat_g', 'fiber_g', 'sugar_g',
        'baselineGlucose', 'heartRate', 'activityLevel', 'stressLevel',
        'sleepQuality', 'hoursAfterMeal', 'timeOfDay', 'userAge', 'userGender', 'bmiCategory'
      ],
      outputTarget: 'glucose_mg_dl',
      performanceMetrics: {
        rmse: 12.5,
        mae: 8.3,
        r2Score: 0.87,
        accuracy: 0.92,
        testDataSize: 500
      },
      trainingDetails: {
        epochs: 100,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'Adam',
        lossFunction: 'MSE',
        trainingDuration_minutes: 45
      },
      explainabilityMethod: 'SHAP',
      status: 'active',
      isProduction: true,
      createdBy: 'Dietary Monitoring System',
      notes: 'Production model for glucose prediction with explainability support'
    });
    console.log(`   ✓ Created LSTM model metadata: ${lstmModel.version}`);

    console.log('\n✅ Database setup completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   • Database: dietary-monitoring');
    console.log('   • Collections: 8 (users, meals, biometrics, alerts, predictions, model_metadatas, explainabilitylogs, sessions)');
    console.log('   • Demo user: demo@example.com / demo123');
    console.log('   • Model metadata: LSTM v3.2 (production)');
    console.log('\n🚀 You can now start the server!\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

setupDatabase();
