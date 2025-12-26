#!/usr/bin/env node

/**
 * Seed FoodNutrition from the /data folder.
 *
 * Reads folder names in PROJECT/data (e.g., Appam, Dosa, White Rice)
 * and upserts them into the FoodNutrition collection.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const FoodNutrition = require('./src/models/FoodNutrition');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

const DEFAULTS_BY_FOLDER = {
  'Appam': {
    servingSize: { amount: 1, unit: 'piece', approxGram: 60 },
    nutrition: { calories_kcal: 117, protein_g: 2.0, carbs_g: 22.0, fat_g: 2.5, fiber_g: 1.0, sodium_mg: null },
    category: 'bread',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
  'Biryani': {
    servingSize: { amount: 1, unit: 'cup', approxGram: 250 },
    nutrition: { calories_kcal: 480, protein_g: 8.0, carbs_g: 55.0, fat_g: 15.0, fiber_g: 4.0, sodium_mg: null },
    category: 'rice',
    cuisineType: 'South Indian',
    isVegetarian: false,
  },
  'Chapati': {
    servingSize: { amount: 1, unit: 'piece', approxGram: 40 },
    nutrition: { calories_kcal: 120, protein_g: 3.1, carbs_g: 18.0, fat_g: 3.7, fiber_g: 3.9, sodium_mg: null },
    category: 'bread',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
  'Dosa': {
    servingSize: { amount: 1, unit: 'piece', approxGram: 100 },
    nutrition: { calories_kcal: 168, protein_g: 3.9, carbs_g: 29.0, fat_g: 3.7, fiber_g: 1.0, sodium_mg: null },
    category: 'bread',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
  'Idli': {
    servingSize: { amount: 1, unit: 'piece', approxGram: 40 },
    nutrition: { calories_kcal: 58, protein_g: 1.6, carbs_g: 12.0, fat_g: 0.4, fiber_g: 0.5, sodium_mg: null },
    category: 'bread',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
  'Pongal': {
    servingSize: { amount: 1, unit: 'cup', approxGram: 200 },
    nutrition: { calories_kcal: 210, protein_g: 5.0, carbs_g: 38.0, fat_g: 4.0, fiber_g: 2.0, sodium_mg: null },
    category: 'rice',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
  'Poori': {
    servingSize: { amount: 1, unit: 'piece', approxGram: 35 },
    nutrition: { calories_kcal: 150, protein_g: 2.5, carbs_g: 20.0, fat_g: 6.0, fiber_g: 1.5, sodium_mg: null },
    category: 'bread',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
  'Porotta': {
    servingSize: { amount: 1, unit: 'piece', approxGram: 80 },
    nutrition: { calories_kcal: 220, protein_g: 4.0, carbs_g: 30.0, fat_g: 7.0, fiber_g: 2.0, sodium_mg: null },
    category: 'bread',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
  'Vada': {
    servingSize: { amount: 1, unit: 'piece', approxGram: 45 },
    nutrition: { calories_kcal: 103, protein_g: 3.0, carbs_g: 12.0, fat_g: 5.0, fiber_g: 1.0, sodium_mg: null },
    category: 'snack',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
  'White Rice': {
    servingSize: { amount: 1, unit: 'cup', approxGram: 158 },
    nutrition: { calories_kcal: 205, protein_g: 4.3, carbs_g: 45.0, fat_g: 0.4, fiber_g: 0.4, sodium_mg: 368 },
    category: 'rice',
    cuisineType: 'South Indian',
    isVegetarian: true,
  },
};

function listFirstImageFile(foodFolderPath) {
  const exts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const entries = fs.readdirSync(foodFolderPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (exts.has(ext)) return entry.name;
  }
  return null;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ data folder not found at: ${DATA_DIR}`);
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is missing. Check backend/.env');
    process.exit(1);
  }

  console.log(`🔗 Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const foodFolders = fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  console.log(`📁 Found ${foodFolders.length} food folders in data/`);

  let upsertedCount = 0;

  for (const folderName of foodFolders) {
    const folderPath = path.join(DATA_DIR, folderName);
    const firstImage = listFirstImageFile(folderPath);

    const defaults = DEFAULTS_BY_FOLDER[folderName] || {};

    const doc = {
      foodName: folderName,
      servingSize: defaults.servingSize,
      nutrition: defaults.nutrition,
      category: defaults.category,
      cuisineType: defaults.cuisineType || 'South Indian',
      allergens: defaults.allergens,
      isVegetarian: defaults.isVegetarian,
      imagePath: firstImage ? path.posix.join('data', folderName, firstImage) : undefined,
      imageFilename: firstImage || undefined,
      updatedAt: new Date(),
    };

    await FoodNutrition.updateOne(
      { foodName: folderName },
      {
        $set: doc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    upsertedCount += 1;
    console.log(`✓ Upserted: ${folderName}${firstImage ? ` (image: ${firstImage})` : ''}`);
  }

  console.log(`\n✅ Done. Upserted ${upsertedCount} foods into FoodNutrition.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
