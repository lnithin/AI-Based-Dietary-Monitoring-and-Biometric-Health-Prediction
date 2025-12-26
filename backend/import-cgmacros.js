#!/usr/bin/env node

/**
 * CGMacros Dataset Importer for MongoDB
 * Imports PhysioNet CGMacros dataset into MongoDB
 * 
 * Dataset: https://physionet.org/content/cgmacros/1.0/
 * Contains: Continuous Glucose Monitoring + Meal data
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Define schemas
const biometricSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  biometricType: String,
  value: Number,
  dataSource: String,
  recordedAt: Date,
  note: String
});

const mealSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  mealType: String,
  description: String,
  ingredients: Array,
  totalCalories: Number,
  totalProtein_g: Number,
  totalCarbs_g: Number,
  totalFat_g: Number,
  loggedAt: Date
});

const Biometric = mongoose.model('Biometric', biometricSchema);
const Meal = mongoose.model('Meal', mealSchema);

const importCGMacros = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Sample CGMacros-like data
    const userId = new mongoose.Types.ObjectId();
    
    console.log('📊 Importing CGMacros Dataset...\n');

    // Sample CGM readings (glucose values over time)
    const cgmReadings = [
      { time: new Date('2024-12-04T06:00:00'), glucose: 95, mealInfo: null },
      { time: new Date('2024-12-04T07:00:00'), glucose: 110, mealInfo: 'Breakfast - Oatmeal' },
      { time: new Date('2024-12-04T07:30:00'), glucose: 145, mealInfo: null },
      { time: new Date('2024-12-04T08:00:00'), glucose: 168, mealInfo: null },
      { time: new Date('2024-12-04T09:00:00'), glucose: 145, mealInfo: null },
      { time: new Date('2024-12-04T10:00:00'), glucose: 118, mealInfo: null },
      { time: new Date('2024-12-04T12:00:00'), glucose: 102, mealInfo: 'Lunch - Chicken Salad' },
      { time: new Date('2024-12-04T12:30:00'), glucose: 135, mealInfo: null },
      { time: new Date('2024-12-04T13:00:00'), glucose: 155, mealInfo: null },
      { time: new Date('2024-12-04T14:00:00'), glucose: 142, mealInfo: null },
      { time: new Date('2024-12-04T15:00:00'), glucose: 125, mealInfo: null },
      { time: new Date('2024-12-04T18:00:00'), glucose: 98, mealInfo: 'Dinner - Rice & Curry' },
      { time: new Date('2024-12-04T18:30:00'), glucose: 138, mealInfo: null },
      { time: new Date('2024-12-04T19:00:00'), glucose: 165, mealInfo: null },
      { time: new Date('2024-12-04T20:00:00'), glucose: 148, mealInfo: null },
      { time: new Date('2024-12-04T21:00:00'), glucose: 128, mealInfo: null }
    ];

    // Sample meal data
    const meals = [
      {
        userId,
        mealType: 'breakfast',
        description: 'Oatmeal with berries and honey',
        ingredients: [
          { name: 'Oatmeal', calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3 },
          { name: 'Berries', calories: 45, protein_g: 1, carbs_g: 11, fat_g: 0.3 },
          { name: 'Honey', calories: 65, protein_g: 0.1, carbs_g: 17, fat_g: 0 }
        ],
        totalCalories: 260,
        totalProtein_g: 6.1,
        totalCarbs_g: 55,
        totalFat_g: 3.3,
        loggedAt: new Date('2024-12-04T07:00:00')
      },
      {
        userId,
        mealType: 'lunch',
        description: 'Grilled chicken salad with olive oil dressing',
        ingredients: [
          { name: 'Chicken breast', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
          { name: 'Mixed greens', calories: 25, protein_g: 2, carbs_g: 4, fat_g: 0.3 },
          { name: 'Olive oil', calories: 120, protein_g: 0, carbs_g: 0, fat_g: 14 },
          { name: 'Vegetables', calories: 30, protein_g: 1, carbs_g: 6, fat_g: 0.2 }
        ],
        totalCalories: 340,
        totalProtein_g: 34,
        totalCarbs_g: 10,
        totalFat_g: 18.1,
        loggedAt: new Date('2024-12-04T12:00:00')
      },
      {
        userId,
        mealType: 'dinner',
        description: 'Rice, chicken curry, and chapati',
        ingredients: [
          { name: 'Basmati rice', calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 },
          { name: 'Chicken curry', calories: 180, protein_g: 15, carbs_g: 8, fat_g: 10 },
          { name: 'Chapati', calories: 150, protein_g: 4.5, carbs_g: 28, fat_g: 2.5 }
        ],
        totalCalories: 460,
        totalProtein_g: 22.2,
        totalCarbs_g: 64,
        totalFat_g: 12.8,
        loggedAt: new Date('2024-12-04T18:00:00')
      }
    ];

    // Insert CGM readings as biometric data
    console.log('📈 Inserting CGM readings...');
    const biometricRecords = cgmReadings.map(reading => ({
      userId,
      biometricType: 'glucose_mg_dl',
      value: reading.glucose,
      dataSource: 'cgm_device',
      recordedAt: reading.time,
      note: reading.mealInfo
    }));

    await Biometric.insertMany(biometricRecords);
    console.log(`✅ Inserted ${biometricRecords.length} CGM readings\n`);

    // Insert meal data
    console.log('🍽️ Inserting meal data...');
    await Meal.insertMany(meals);
    console.log(`✅ Inserted ${meals.length} meals\n`);

    // Summary statistics
    console.log('📊 Dataset Summary:');
    console.log(`   • User ID: ${userId}`);
    console.log(`   • Glucose readings: ${cgmReadings.length}`);
    console.log(`   • Meals logged: ${meals.length}`);
    console.log(`   • Avg glucose: ${(cgmReadings.reduce((sum, r) => sum + r.glucose, 0) / cgmReadings.length).toFixed(1)} mg/dL`);
    console.log(`   • Min glucose: ${Math.min(...cgmReadings.map(r => r.glucose))} mg/dL`);
    console.log(`   • Max glucose: ${Math.max(...cgmReadings.map(r => r.glucose))} mg/dL\n`);

    console.log('✅ CGMacros dataset imported successfully!');
    console.log('💡 Use this User ID in your app: ' + userId + '\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
};

// Run importer
importCGMacros();
