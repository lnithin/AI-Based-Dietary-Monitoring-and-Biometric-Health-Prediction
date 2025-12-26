#!/usr/bin/env node
/**
 * Seed Food Nutrition Database
 * Loads all South Indian dishes with nutrition data
 */

const mongoose = require('mongoose');
require('dotenv').config();

const FoodNutrition = require('./src/models/FoodNutrition');

const nutritionData = [
  {
    foodName: "Appam",
    servingSize: { amount: 1, unit: "piece", approxGram: 60 },
    nutrition: { calories_kcal: 117, protein_g: 2.0, carbs_g: 22.0, fat_g: 2.5, fiber_g: 1.0, sodium_mg: null },
    category: "bread",
    cuisineType: "South Indian",
    isVegetarian: true
  },
  {
    foodName: "Biryani (veg / mixed rice-based)",
    servingSize: { amount: 1, unit: "cup", approxGram: 250 },
    nutrition: { calories_kcal: 480, protein_g: 8.0, carbs_g: 55.0, fat_g: 15.0, fiber_g: 4.0, sodium_mg: null },
    category: "rice",
    cuisineType: "South Indian",
    isVegetarian: false
  },
  {
    foodName: "Chapati (whole wheat)",
    servingSize: { amount: 1, unit: "piece", approxGram: 40 },
    nutrition: { calories_kcal: 120, protein_g: 3.1, carbs_g: 18.0, fat_g: 3.7, fiber_g: 3.9, sodium_mg: null },
    category: "bread",
    cuisineType: "South Indian",
    isVegetarian: true
  },
  {
    foodName: "Dosa (plain)",
    servingSize: { amount: 1, unit: "piece", approxGram: 100 },
    nutrition: { calories_kcal: 168, protein_g: 3.9, carbs_g: 29.0, fat_g: 3.7, fiber_g: 1.0, sodium_mg: null },
    category: "bread",
    cuisineType: "South Indian",
    isVegetarian: true
  },
  {
    foodName: "Idli",
    servingSize: { amount: 1, unit: "piece", approxGram: 40 },
    nutrition: { calories_kcal: 58, protein_g: 1.6, carbs_g: 12.0, fat_g: 0.4, fiber_g: 0.5, sodium_mg: null },
    category: "bread",
    cuisineType: "South Indian",
    isVegetarian: true
  },
  {
    foodName: "Pongal (rice and dal porridge)",
    servingSize: { amount: 1, unit: "cup", approxGram: 200 },
    nutrition: { calories_kcal: 210, protein_g: 5.0, carbs_g: 38.0, fat_g: 4.0, fiber_g: 2.0, sodium_mg: null },
    category: "rice",
    cuisineType: "South Indian",
    isVegetarian: true
  },
  {
    foodName: "Poori (fried wheat bread)",
    servingSize: { amount: 1, unit: "piece", approxGram: 35 },
    nutrition: { calories_kcal: 150, protein_g: 2.5, carbs_g: 20.0, fat_g: 6.0, fiber_g: 1.5, sodium_mg: null },
    category: "bread",
    cuisineType: "South Indian",
    isVegetarian: true
  },
  {
    foodName: "Porotta (layered flatbread – Kerala style)",
    servingSize: { amount: 1, unit: "piece", approxGram: 80 },
    nutrition: { calories_kcal: 220, protein_g: 4.0, carbs_g: 30.0, fat_g: 7.0, fiber_g: 2.0, sodium_mg: null },
    category: "bread",
    cuisineType: "South Indian",
    isVegetarian: true
  },
  {
    foodName: "Vada (medu vada, fried lentil donut)",
    servingSize: { amount: 1, unit: "piece", approxGram: 45 },
    nutrition: { calories_kcal: 103, protein_g: 3.0, carbs_g: 12.0, fat_g: 5.0, fiber_g: 1.0, sodium_mg: null },
    category: "snack",
    cuisineType: "South Indian",
    isVegetarian: true
  },
  {
    foodName: "White Rice (cooked)",
    servingSize: { amount: 1, unit: "cup", approxGram: 158 },
    nutrition: { calories_kcal: 205, protein_g: 4.3, carbs_g: 45.0, fat_g: 0.4, fiber_g: 0.4, sodium_mg: 368 },
    category: "rice",
    cuisineType: "South Indian",
    isVegetarian: true
  }
];

async function seedFoodNutrition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dietary-monitoring', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✓ MongoDB Connected\n');

    // Clear existing data
    await FoodNutrition.deleteMany({});
    console.log('✓ Cleared existing food nutrition data\n');

    // Insert new data
    const inserted = await FoodNutrition.insertMany(nutritionData);
    console.log(`✓ Inserted ${inserted.length} food nutrition records\n`);

    // Display summary
    console.log('═══════════════════════════════════════════════');
    console.log('  FOOD NUTRITION DATABASE SEEDED');
    console.log('═══════════════════════════════════════════════\n');

    for (const food of inserted) {
      console.log(`✓ ${food.foodName}`);
      console.log(`  Calories: ${food.nutrition.calories_kcal} kcal`);
      console.log(`  Serving: ${food.servingSize.amount} ${food.servingSize.unit} (${food.servingSize.approxGram}g)\n`);
    }

    console.log(`\n✅ Database seeded with ${inserted.length} foods!\n`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedFoodNutrition();
