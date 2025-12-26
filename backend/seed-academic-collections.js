#!/usr/bin/env node

/**
 * Seed Academic Collections
 * Populates model_metadata, explainability_logs, and sessions collections
 * for research/paper generation
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ModelMetadata = require('./src/models/ModelMetadata');
const ExplainabilityLog = require('./src/models/ExplainabilityLog');
const Session = require('./src/models/Session');
const User = require('./src/models/User');
const Prediction = require('./src/models/Prediction');

async function seedAcademicCollections() {
  try {
    console.log('🔗 Connecting to MongoDB...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Get or create demo user
    let demoUser = await User.findOne({ email: 'demo@example.com' });
    if (!demoUser) {
      console.log('⚠️  Demo user not found. Please run setup-db.js first.');
      process.exit(1);
    }
    const userId = demoUser._id;

    // Seed Model Metadata
    console.log('🤖 Seeding Model Metadata...\n');

    const models = [
      {
        modelName: 'Glucose LSTM',
        version: 'v3.2',
        modelType: 'LSTM',
        trainedOn: 'Synthetic + Clinical Rules + PhysioNet CGMacros',
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
          precision: 0.90,
          recall: 0.88,
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
        paperReference: 'IEEE Transactions on Biomedical Engineering',
        referencedIn: ['glucose_prediction', 'meal_analysis'],
        status: 'active',
        isProduction: true,
        createdBy: 'Dietary Monitoring System',
        notes: 'Production model with SHAP explainability for glucose prediction'
      },
      {
        modelName: 'Biometric Correlation Engine',
        version: 'v2.1',
        modelType: 'XGBoost',
        trainedOn: 'User-generated biometric data + clinical guidelines',
        featureCount: 8,
        inputFeatures: [
          'glucose_mg_dl', 'heartRate', 'bloodPressure_systolic',
          'bloodPressure_diastolic', 'activityLevel', 'stressLevel',
          'sleepQuality', 'hydrationLevel'
        ],
        outputTarget: 'health_risk_score',
        performanceMetrics: {
          rmse: 0.15,
          mae: 0.09,
          r2Score: 0.91,
          accuracy: 0.94,
          testDataSize: 300
        },
        trainingDetails: {
          epochs: 50,
          batchSize: 16,
          learningRate: 0.01,
          optimizer: 'Gradient Boosting',
          lossFunction: 'Binary Crossentropy',
          trainingDuration_minutes: 20
        },
        explainabilityMethod: 'LIME',
        status: 'active',
        isProduction: true,
        createdBy: 'Dietary Monitoring System',
        notes: 'Identifies biometric correlation patterns for alert generation'
      }
    ];

    for (const modelData of models) {
      const exists = await ModelMetadata.findOne({ version: modelData.version });
      if (!exists) {
        await ModelMetadata.create(modelData);
        console.log(`   ✓ Created model: ${modelData.modelName} (${modelData.version})`);
      } else {
        console.log(`   ℹ️  Model already exists: ${modelData.modelName} (${modelData.version})`);
      }
    }

    // Seed sample predictions and explainability logs
    console.log('\n📊 Seeding Predictions & Explainability Logs...\n');

    const Meal = require('./src/models/Meal');
    const predictions = [];

    // Create sample predictions
    for (let i = 0; i < 5; i++) {
      const prediction = new Prediction({
        userId,
        mealId: undefined,
        predictionType: 'glucose',
        modelUsed: 'lstm',
        baselineGlucose: 95 + Math.random() * 20,
        predictedGlucose: 120 + Math.random() * 80,
        delta: 25 + Math.random() * 60,
        riskLevel: ['Normal', 'Elevated', 'High'][Math.floor(Math.random() * 3)],
        confidence: 0.8 + Math.random() * 0.2,
        modelVersion: 'v3.2',
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      });
      
      await prediction.save();
      predictions.push(prediction);
      console.log(`   ✓ Created prediction ${i + 1}/5`);
    }

    // Create explainability logs for each prediction
    console.log('\n📝 Seeding Explainability Logs...\n');

    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const predTimestamp = pred.timestamp || new Date();
      
      const explainLog = new ExplainabilityLog({
        predictionId: pred._id,
        userId,
        method: 'SHAP',
        featureContributions: {
          carbohydrates_g: 45.2 + Math.random() * 20,
          fiber_g: -8.3 - Math.random() * 5,
          sugar_g: 12.1 + Math.random() * 10,
          baselineGlucose: 5.5 + Math.random() * 5,
          activityLevel: -10.2 - Math.random() * 8,
          stressLevel: 3.1 + Math.random() * 4,
          sleepQuality: -4.5 - Math.random() * 3,
          hoursAfterMeal: 2.1 + Math.random() * 3
        },
        topContributors: [
          { featureName: 'carbohydrates_g', contribution: 45.2, percentageImpact: 52 },
          { featureName: 'fiber_g', contribution: -8.3, percentageImpact: -9.5 },
          { featureName: 'activityLevel', contribution: -10.2, percentageImpact: -11.7 }
        ],
        prediction: {
          baselineGlucose: pred.baselineGlucose || 95,
          predictedGlucose: pred.predictedGlucose || 150,
          delta: pred.delta || 55,
          riskLevel: pred.riskLevel || 'Elevated',
          confidence: pred.confidence || 0.85
        },
        modelVersion: pred.modelVersion || 'v3.2',
        explanation: {
          summary: `High carbohydrate meal predicted ${Math.round(pred.delta || 55)} mg/dL increase in glucose`,
          keyFactors: [
            'Carbohydrate content (primary driver)',
            'Dietary fiber intake (attenuating factor)',
            'Recent physical activity level',
            'Baseline glucose level'
          ],
          recommendations: [
            'Consider pairing meal with protein/fat to slow carb absorption',
            'Light activity recommended 30 mins after meal',
            'Monitor glucose levels at 1-hour post-meal mark'
          ],
          confidenceLevel: 'High'
        },
        timestamp: new Date(predTimestamp.getTime() + 5 * 60 * 1000)
      });

      await explainLog.save();
      console.log(`   ✓ Created explainability log ${i + 1}/5`);
    }

    // Seed sample sessions
    console.log('\n👥 Seeding Sample Sessions...\n');

    for (let i = 0; i < 3; i++) {
      const loginTime = new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000);
      const logoutTime = new Date(loginTime.getTime() + 45 * 60 * 1000); // 45 minutes session

      const session = new Session({
        userId,
        loginTime,
        logoutTime,
        isActive: false,
        duration_minutes: 45,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.100',
        deviceType: 'desktop',
        activitiesPerformed: [
          { activity: 'view_dashboard', timestamp: new Date(loginTime.getTime() + 1000), status: 'success' },
          { activity: 'log_meal', timestamp: new Date(loginTime.getTime() + 5 * 60 * 1000), status: 'success' },
          { activity: 'view_recommendations', timestamp: new Date(loginTime.getTime() + 15 * 60 * 1000), status: 'success' },
          { activity: 'update_biometrics', timestamp: new Date(loginTime.getTime() + 30 * 60 * 1000), status: 'success' }
        ],
        mealsLogged: 2,
        biometricsRecorded: 3,
        recommendationsViewed: 1,
        errorCount: 0,
        lastActivity: new Date(loginTime.getTime() + 40 * 60 * 1000)
      });

      await session.save();
      console.log(`   ✓ Created session ${i + 1}/3`);
    }

    console.log('\n✅ Academic collections seeded successfully!\n');
    console.log('📊 Summary:');
    console.log('   • Model Metadata: 2 records');
    console.log('   • Predictions: 5 records');
    console.log('   • Explainability Logs: 5 records');
    console.log('   • Sessions: 3 records');
    console.log('\n🎓 Collections are ready for research/paper generation!\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedAcademicCollections();
