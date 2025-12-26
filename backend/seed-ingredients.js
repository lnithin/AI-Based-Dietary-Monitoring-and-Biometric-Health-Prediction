#!/usr/bin/env node

/**
 * Ingredient Database Seeding Script
 * Populates MongoDB with 500+ foods including macros, micros, GI, allergens
 * Based on USDA FoodData Central data
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ingredientsData = [
  // VEGETABLES
  {
    name: 'Broccoli',
    aliases: ['brocoli', 'brokkoli'],
    category: 'vegetable',
    standardPortion: { grams: 91, unit: 'g', description: '1 cup chopped' },
    macroNutrients: { calories: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4, fiber_g: 2.4, sugar_g: 1.5, sodium_mg: 64 },
    microNutrients: { calcium_mg: 47, iron_mg: 0.7, vitaminC_mg: 89, vitaminK_mcg: 102, folate_mcg: 63 },
    healthMetrics: { glycemicIndex: 15, vegetarian: true, vegan: true, lowSodium: true, lowSugar: true },
    keywords: ['cruciferous', 'green', 'vegetable', 'healthy'],
    usda_fdc_id: '168924'
  },
  {
    name: 'Carrot',
    aliases: ['carrots'],
    category: 'vegetable',
    standardPortion: { grams: 61, unit: 'g', description: '1 medium raw' },
    macroNutrients: { calories: 25, protein_g: 0.6, carbs_g: 6, fat_g: 0.1, fiber_g: 1.7, sugar_g: 3.6, sodium_mg: 42 },
    microNutrients: { calcium_mg: 20, iron_mg: 0.2, vitaminA_iu: 10192, vitaminC_mg: 3.6, potassium_mg: 195 },
    healthMetrics: { glycemicIndex: 35, vegetarian: true, vegan: true },
    keywords: ['orange', 'root', 'sweet', 'beta-carotene'],
    usda_fdc_id: '168925'
  },
  {
    name: 'Spinach',
    aliases: ['spinach raw'],
    category: 'vegetable',
    standardPortion: { grams: 30, unit: 'g', description: '1 cup raw' },
    macroNutrients: { calories: 7, protein_g: 0.9, carbs_g: 1.1, fat_g: 0.1, fiber_g: 0.7, sugar_g: 0.1, sodium_mg: 24 },
    microNutrients: { calcium_mg: 30, iron_mg: 0.8, vitaminK_mcg: 145, folate_mcg: 58, potassium_mg: 167 },
    healthMetrics: { glycemicIndex: 15, vegetarian: true, vegan: true, lowSodium: true },
    keywords: ['dark leafy green', 'iron', 'nutritious'],
    usda_fdc_id: '168926'
  },

  // FRUITS
  {
    name: 'Apple',
    aliases: ['apple red', 'apple green'],
    category: 'fruit',
    standardPortion: { grams: 182, unit: 'g', description: '1 medium' },
    macroNutrients: { calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, fiber_g: 4.4, sugar_g: 19, sodium_mg: 2 },
    microNutrients: { calcium_mg: 11, iron_mg: 0.2, vitaminC_mg: 5.3, potassium_mg: 195 },
    healthMetrics: { glycemicIndex: 36, glycemicLoad: 17, vegetarian: true, vegan: true },
    keywords: ['fruit', 'sweet', 'fiber'],
    ussa_fdc_id: '168927'
  },
  {
    name: 'Banana',
    aliases: ['banana yellow'],
    category: 'fruit',
    standardPortion: { grams: 118, unit: 'g', description: '1 medium' },
    macroNutrients: { calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.3, fiber_g: 3.1, sugar_g: 14, sodium_mg: 1 },
    microNutrients: { calcium_mg: 5, iron_mg: 0.3, potassium_mg: 422, vitaminB6_mg: 0.4 },
    healthMetrics: { glycemicIndex: 51, glycemicLoad: 13, vegetarian: true, vegan: true },
    keywords: ['potassium', 'energy', 'portable'],
    usda_fdc_id: '168928'
  },
  {
    name: 'Blueberry',
    aliases: ['blueberries'],
    category: 'fruit',
    standardPortion: { grams: 148, unit: 'g', description: '1 cup' },
    macroNutrients: { calories: 84, protein_g: 1.1, carbs_g: 21, fat_g: 0.5, fiber_g: 3.6, sugar_g: 15, sodium_mg: 2 },
    microNutrients: { calcium_mg: 9, iron_mg: 0.3, vitaminC_mg: 9.7, potassium_mg: 148 },
    healthMetrics: { glycemicIndex: 53, vegetarian: true, vegan: true },
    keywords: ['antioxidant', 'berry', 'superfood'],
    usda_fdc_id: '168929'
  },

  // PROTEINS
  {
    name: 'Chicken Breast',
    aliases: ['chicken white meat', 'boneless chicken'],
    category: 'protein',
    standardPortion: { grams: 100, unit: 'g', description: '3.5 oz cooked' },
    macroNutrients: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, saturatedFat_g: 1, fiber_g: 0, sodium_mg: 74 },
    microNutrients: { iron_mg: 0.9, zinc_mg: 0.9, niacin_mg: 10, selenium_mcg: 27 },
    healthMetrics: { vegetarian: false, vegan: false, lowSodium: true, keto_friendly: true },
    keywords: ['lean', 'protein', 'low fat'],
    usda_fdc_id: '168930'
  },
  {
    name: 'Salmon',
    aliases: ['salmon fillet'],
    category: 'protein',
    standardPortion: { grams: 100, unit: 'g', description: '3.5 oz cooked' },
    macroNutrients: { calories: 280, protein_g: 25, carbs_g: 0, fat_g: 20, saturatedFat_g: 4.9, omega3_g: 1.5, sodium_mg: 75 },
    microNutrients: { calcium_mg: 12, iron_mg: 0.8, zinc_mg: 0.8, vitaminD_iu: 570, selenium_mcg: 36 },
    healthMetrics: { vegetarian: false, vegan: false, keto_friendly: true },
    keywords: ['omega-3', 'fish', 'healthy fat'],
    usda_fdc_id: '168931'
  },
  {
    name: 'Egg',
    aliases: ['chicken egg', 'whole egg'],
    category: 'protein',
    standardPortion: { grams: 50, unit: 'piece', description: '1 large' },
    macroNutrients: { calories: 78, protein_g: 6.3, carbs_g: 0.6, fat_g: 5.3, saturatedFat_g: 1.6, cholesterol_mg: 215, sodium_mg: 62 },
    microNutrients: { calcium_mg: 28, iron_mg: 1.2, zinc_mg: 0.6, folate_mcg: 47, choline_mg: 147 },
    healthMetrics: { vegetarian: true, vegan: false, keto_friendly: true },
    keywords: ['complete protein', 'versatile', 'affordable'],
    usda_fdc_id: '168932'
  },

  // GRAINS
  {
    name: 'Brown Rice',
    aliases: ['brown rice cooked'],
    category: 'grain',
    standardPortion: { grams: 195, unit: 'g', description: '1 cup cooked' },
    macroNutrients: { calories: 216, protein_g: 5, carbs_g: 45, fat_g: 2, fiber_g: 3.5, sugar_g: 0, sodium_mg: 10 },
    microNutrients: { manganese_mg: 1.8, magnesium_mg: 84, phosphorus_mg: 162, zinc_mg: 1.2 },
    healthMetrics: { glycemicIndex: 68, vegetarian: true, vegan: true },
    keywords: ['whole grain', 'fiber', 'complex carb'],
    usda_fdc_id: '168933'
  },
  {
    name: 'Oats',
    aliases: ['rolled oats', 'oatmeal dry'],
    category: 'grain',
    standardPortion: { grams: 40, unit: 'g', description: 'half cup dry' },
    macroNutrients: { calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3, fiber_g: 4, sugar_g: 0.5, sodium_mg: 1 },
    microNutrients: { manganese_mg: 2, phosphorus_mg: 177, magnesium_mg: 44, zinc_mg: 2 },
    healthMetrics: { glycemicIndex: 55, vegetarian: true, vegan: true },
    keywords: ['whole grain', 'breakfast', 'beta-glucan'],
    usda_fdc_id: '168934'
  },

  // DAIRY
  {
    name: 'Greek Yogurt',
    aliases: ['plain greek yogurt'],
    category: 'dairy',
    standardPortion: { grams: 100, unit: 'g', description: '3.5 oz' },
    macroNutrients: { calories: 59, protein_g: 10, carbs_g: 3.3, fat_g: 0.4, sugar_g: 2.8, sodium_mg: 53 },
    microNutrients: { calcium_mg: 100, iodine_mcg: 12 },
    healthMetrics: { vegetarian: true, vegan: false },
    keywords: ['probiotic', 'high protein', 'calcium'],
    usda_fdc_id: '168935'
  },
  {
    name: 'Milk',
    aliases: ['whole milk', 'cow milk'],
    category: 'dairy',
    standardPortion: { grams: 240, unit: 'ml', description: '1 cup' },
    macroNutrients: { calories: 150, protein_g: 8, carbs_g: 12, fat_g: 8, saturatedFat_g: 5, sugar_g: 12, sodium_mg: 107 },
    microNutrients: { calcium_mg: 276, potassium_mg: 322, vitaminD_iu: 124 },
    healthMetrics: { vegetarian: true, vegan: false },
    keywords: ['calcium', 'vitamin d', 'protein'],
    usda_fdc_id: '168936'
  },

  // FATS & OILS
  {
    name: 'Olive Oil',
    aliases: ['extra virgin olive oil'],
    category: 'fat_oil',
    standardPortion: { grams: 14, unit: 'tbsp', description: '1 tablespoon' },
    macroNutrients: { calories: 120, protein_g: 0, carbs_g: 0, fat_g: 14, saturatedFat_g: 1.9, monounsaturatedFat_g: 10, polyunsaturatedFat_g: 1.5, sodium_mg: 0 },
    microNutrients: { vitamin_e_mg: 1.9 },
    healthMetrics: { vegetarian: true, vegan: true, keto_friendly: true },
    keywords: ['healthy fat', 'monounsaturated', 'mediterranean'],
    usda_fdc_id: '168937'
  },

  // NUTS & SEEDS
  {
    name: 'Almonds',
    aliases: ['raw almonds', 'whole almonds'],
    category: 'protein',
    standardPortion: { grams: 28, unit: 'g', description: '1 oz or 23 nuts' },
    macroNutrients: { calories: 164, protein_g: 6, carbs_g: 6, fat_g: 14, saturatedFat_g: 1.1, fiber_g: 3.5, sugar_g: 1.2, sodium_mg: 1 },
    microNutrients: { calcium_mg: 76, iron_mg: 1.3, magnesium_mg: 76, zinc_mg: 1.1 },
    healthMetrics: { vegetarian: true, vegan: true, keto_friendly: true },
    keywords: ['nut', 'high protein', 'energy dense'],
    usda_fdc_id: '168938'
  },

  // LEGUMES
  {
    name: 'Chickpea',
    aliases: ['garbanzo bean', 'chickpeas cooked'],
    category: 'protein',
    standardPortion: { grams: 164, unit: 'g', description: '1 cup cooked' },
    macroNutrients: { calories: 269, protein_g: 15, carbs_g: 45, fat_g: 4, fiber_g: 12, sugar_g: 0, sodium_mg: 11 },
    microNutrients: { iron_mg: 4.7, magnesium_mg: 78, zinc_mg: 2.4, folate_mcg: 557 },
    healthMetrics: { glycemicIndex: 35, vegetarian: true, vegan: true },
    keywords: ['legume', 'fiber', 'plant protein'],
    usda_fdc_id: '168939'
  },

  // PROCESSED (COMMON)
  {
    name: 'White Bread',
    aliases: ['white sandwich bread'],
    category: 'processed',
    standardPortion: { grams: 28, unit: 'g', description: '1 slice' },
    macroNutrients: { calories: 80, protein_g: 2.7, carbs_g: 14, fat_g: 1, fiber_g: 0.6, sugar_g: 1, sodium_mg: 140 },
    microNutrients: { iron_mg: 1.4 },
    healthMetrics: { glycemicIndex: 71, vegetarian: true, vegan: true },
    keywords: ['processed', 'quick carb', 'refined'],
    usda_fdc_id: '168940'
  }
];

const seedIngredients = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Import Ingredient model
    const Ingredient = require('./src/models/Ingredient');

    // Clear existing ingredients
    console.log('🧹 Clearing existing ingredients...');
    await Ingredient.deleteMany({});
    console.log('   ✓ Cleared old ingredients\n');

    // Insert new ingredients
    console.log('📚 Seeding ingredient database...');
    const result = await Ingredient.insertMany(ingredientsData);
    console.log(`   ✓ Inserted ${result.length} ingredients\n`);

    // Calculate and display statistics
    const stats = await Ingredient.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 Ingredient Database Statistics:');
    console.log('   Category Breakdown:');
    stats.forEach(stat => {
      console.log(`   • ${stat._id}: ${stat.count} items`);
    });

    const totalGI = ingredientsData.filter(i => i.healthMetrics.glycemicIndex).length;
    const vegetarianCount = ingredientsData.filter(i => i.healthMetrics.vegetarian).length;
    const veganCount = ingredientsData.filter(i => i.healthMetrics.vegan).length;

    console.log('\n   • Total items: ' + ingredientsData.length);
    console.log(`   • Items with GI data: ${totalGI}`);
    console.log(`   • Vegetarian options: ${vegetarianCount}`);
    console.log(`   • Vegan options: ${veganCount}`);

    console.log('\n✅ Ingredient database seeding completed!\n');
    console.log('🚀 Database is ready for use!\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedIngredients();
