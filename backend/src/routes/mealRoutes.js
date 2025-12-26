const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Meal = require('../models/Meal');
const FoodNutrition = require('../models/FoodNutrition');
const ingredientExtractor = require('../services/ingredientExtractor');
const complianceChecker = require('../services/complianceChecker');
const User = require('../models/User');

// Extract biometric data without saving meal
router.post('/extract', authMiddleware, async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description required' });
    }

    const matchedFood = await findMatchingFood(description);

    if (matchedFood) {
      const nutrition = matchedFood.nutrition || {};
      const servingSize = matchedFood.servingSize || { amount: 1, unit: 'serving', approxGram: 100 };

      res.json({
        success: true,
        foodMatched: {
          foodName: matchedFood.foodName,
          nutrition: nutrition,
          servingSize: servingSize,
          category: matchedFood.category,
          isVegetarian: matchedFood.isVegetarian,
          allergens: matchedFood.allergens || []
        },
        ingredients: [{
          name: matchedFood.foodName,
          calories: nutrition.calories_kcal || 0,
          protein_g: nutrition.protein_g || 0,
          carbs_g: nutrition.carbs_g || 0,
          fat_g: nutrition.fat_g || 0,
          fiber_g: nutrition.fiber_g || 0,
          sodium_mg: nutrition.sodium_mg || 0,
          confidence: 0.9
        }],
        totalNutrition: {
          calories: nutrition.calories_kcal || 0,
          protein_g: nutrition.protein_g || 0,
          carbs_g: nutrition.carbs_g || 0,
          fat_g: nutrition.fat_g || 0,
          fiber_g: nutrition.fiber_g || 0,
          sodium_mg: nutrition.sodium_mg || 0
        },
        confidence: 0.9,
        processingTime_ms: 0
      });
    } else {
      res.json({
        success: false,
        message: 'Food not recognized. Try one of the 10 supported foods.',
        foodMatched: null
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to match food names from description with enhanced fuzzy matching
async function findMatchingFood(description) {
  if (!description) return null;
  
  const lowerDescription = description.toLowerCase().trim();
  
  // Enhanced list of all 10 foods with comprehensive variations
  const foodVariations = {
    'Appam': ['appam', 'aapam', 'hoppers', 'palappam'],
    'Biryani': ['biryani', 'biriyani', 'briyani', 'biryani rice', 'dum biryani', 'veg biryani'],
    'Chapati': ['chapati', 'roti', 'chappati', 'chapathi', 'chapti', 'rotti', 'phulka', 'whole wheat roti'],
    'Dosa': ['dosa', 'dosai', 'dosha', 'dose', 'dhosha', 'plain dosa', 'masala dosa', 'paper dosa'],
    'Idli': ['idli', 'idly', 'idlee', 'idlly', 'steamed idli'],
    'Pongal': ['pongal', 'pongaal', 'ven pongal', 'sakkarai pongal', 'khara pongal'],
    'Poori': ['poori', 'puri', 'poorie', 'puri bread', 'fried bread'],
    'Porotta': ['porotta', 'parotta', 'paratha', 'parota', 'barota', 'kerala parotta', 'layered bread'],
    'Vada': ['vada', 'wada', 'vadai', 'medu vada', 'medhu vada', 'urad vada', 'lentil donut'],
    'White Rice': ['white rice', 'rice', 'cooked rice', 'steamed rice', 'boiled rice', 'plain rice', 'basmati rice', 'sona masuri']
  };

  // Strategy 1: Exact variation match (highest confidence)
  for (const [foodName, variations] of Object.entries(foodVariations)) {
    for (const variation of variations) {
      if (lowerDescription === variation) {
        const foodData = await FoodNutrition.findOne({
          foodName: new RegExp(foodName.split('(')[0].trim(), 'i')
        });
        if (foodData) return foodData;
      }
    }
  }

  // Strategy 2: Contains variation (high confidence)
  for (const [foodName, variations] of Object.entries(foodVariations)) {
    for (const variation of variations) {
      if (lowerDescription.includes(variation)) {
        const foodData = await FoodNutrition.findOne({
          foodName: new RegExp(foodName.split('(')[0].trim(), 'i')
        });
        if (foodData) return foodData;
      }
    }
  }

  // Strategy 3: Word-level matching (medium confidence)
  const words = lowerDescription.split(/[\s,;.]+/);
  for (const [foodName, variations] of Object.entries(foodVariations)) {
    for (const variation of variations) {
      for (const word of words) {
        if (word.length >= 3 && (word === variation || variation.includes(word) || word.includes(variation))) {
          const foodData = await FoodNutrition.findOne({
            foodName: new RegExp(foodName.split('(')[0].trim(), 'i')
          });
          if (foodData) return foodData;
        }
      }
    }
  }

  // Strategy 4: Fuzzy match - similarity scoring
  let bestMatch = null;
  let highestSimilarity = 0;
  
  for (const [foodName, variations] of Object.entries(foodVariations)) {
    for (const variation of variations) {
      const similarity = calculateSimilarity(lowerDescription, variation);
      if (similarity > highestSimilarity && similarity > 0.6) {
        highestSimilarity = similarity;
        const foodData = await FoodNutrition.findOne({
          foodName: new RegExp(foodName.split('(')[0].trim(), 'i')
        });
        if (foodData) bestMatch = foodData;
      }
    }
  }
  
  if (bestMatch) return bestMatch;

  // Strategy 5: Direct database search with regex
  const allFoods = await FoodNutrition.find();
  for (const food of allFoods) {
    const foodNameLower = food.foodName.toLowerCase();
    const mainName = foodNameLower.split('(')[0].trim();
    
    // Check if main name appears in description
    if (lowerDescription.includes(mainName) || mainName.includes(lowerDescription)) {
      return food;
    }
    
    // Check word by word
    for (const word of words) {
      if (word.length >= 3 && mainName.includes(word)) {
        return food;
      }
    }
  }

  return null;
}

// Helper function to calculate string similarity (Levenshtein-like)
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Check if shorter is contained in longer
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // Simple character-based similarity
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
}

// Log meal (text)
router.post('/logText', authMiddleware, async (req, res) => {
  try {
    const { mealType, timestamp, description } = req.body;

    // Get user profile for compliance checking
    const user = await User.findById(req.userId);

    // Check if description matches any of the 10 foods
    const matchedFood = await findMatchingFood(description);
    let mealData = {
      userId: req.userId,
      mealType,
      timestamp: timestamp || new Date(),
      logType: 'text',
      rawDescription: description,
      nlpProcessing: {
        status: matchedFood ? 'completed' : 'pending',
        confidence: matchedFood ? 0.9 : null
      }
    };

    // If food matched, include all biometric/nutritional data
    if (matchedFood) {
      const nutrition = matchedFood.nutrition || {};
      const servingSize = matchedFood.servingSize || { amount: 1, unit: 'serving', approxGram: 100 };

      // Create ingredient entry
      const ingredient = {
        name: matchedFood.foodName,
        portion_grams: servingSize.approxGram || 100,
        portion_unit: servingSize.unit || 'serving',
        calories: nutrition.calories_kcal || 0,
        protein_g: nutrition.protein_g || 0,
        carbs_g: nutrition.carbs_g || 0,
        fat_g: nutrition.fat_g || 0,
        fiber_g: nutrition.fiber_g || 0,
        sodium_mg: nutrition.sodium_mg || 0,
        saturated_fat_g: nutrition.saturated_fat_g || 0,
        cholesterol_mg: nutrition.cholesterol_mg || 0,
        sugar_g: nutrition.sugar_g || 0,
        confidence_score: 0.9
      };

      mealData.ingredients = [ingredient];
      mealData.totalNutrition = {
        calories: nutrition.calories_kcal || 0,
        calories_kcal: nutrition.calories_kcal || 0,
        protein_g: nutrition.protein_g || 0,
        carbs_g: nutrition.carbs_g || 0,
        fat_g: nutrition.fat_g || 0,
        fiber_g: nutrition.fiber_g || 0,
        sodium_mg: nutrition.sodium_mg || 0,
        saturated_fat_g: nutrition.saturated_fat_g || 0,
        cholesterol_mg: nutrition.cholesterol_mg || 0,
        sugar_g: nutrition.sugar_g || 0
      };
      mealData.healthMetrics = {
        allergens: matchedFood.allergens || []
      };
      mealData.nlpProcessing = {
        status: 'completed',
        confidence: 0.9,
        extractedEntities: [matchedFood.foodName],
        processingTime_ms: 0
      };
      mealData.isProcessed = true;
    }

    const meal = new Meal(mealData);
    await meal.save();

    // Run compliance check on saved meal
    let complianceReport = null;
    if (meal.totalNutrition && user) {
      complianceReport = complianceChecker.checkMealCompliance(meal, user);
    }

    // Analyze health risks from ingredients
    let healthRisks = [];
    if (meal.ingredients && meal.ingredients.length > 0 && user) {
      healthRisks = ingredientExtractor.analyzeHealthRisks(meal.ingredients, user);
    }

    res.status(201).json({
      message: matchedFood 
        ? `Meal logged with biometric data for ${matchedFood.foodName}!` 
        : 'Meal logged. Processing...',
      mealId: meal._id,
      meal,
      foodMatched: matchedFood ? {
        foodName: matchedFood.foodName,
        nutrition: matchedFood.nutrition,
        servingSize: matchedFood.servingSize,
        category: matchedFood.category,
        isVegetarian: matchedFood.isVegetarian
      } : null,
      complianceReport, // WHO/AHA guidelines compliance
      healthRisks // Real-time health risk alerts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log meal (image)
router.post('/logImage', authMiddleware, async (req, res) => {
  try {
    const { mealType, timestamp, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data required' });
    }

    const meal = new Meal({
      userId: req.userId,
      mealType,
      timestamp: timestamp || new Date(),
      logType: 'image',
      imageUrl: imageBase64, // In production, save to cloud storage
      nlpProcessing: {
        status: 'pending'
      }
    });

    await meal.save();

    res.status(201).json({
      message: 'Meal image logged. Processing with CV model...',
      mealId: meal._id,
      meal
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log meal (nutrition label scan)
router.post('/logLabel', authMiddleware, async (req, res) => {
  try {
    const { mealType, timestamp, labelImageBase64 } = req.body;

    if (!labelImageBase64) {
      return res.status(400).json({ error: 'Label image data required' });
    }

    const meal = new Meal({
      userId: req.userId,
      mealType,
      timestamp: timestamp || new Date(),
      logType: 'label',
      imageUrl: labelImageBase64,
      nlpProcessing: {
        status: 'pending'
      }
    });

    await meal.save();

    res.status(201).json({
      message: 'Nutrition label scanned. Extracting text...',
      mealId: meal._id,
      meal
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user meals
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, mealType, limit = 50, skip = 0 } = req.query;

    const filter = { userId: req.userId };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (mealType) filter.mealType = mealType;

    const meals = await Meal.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Meal.countDocuments(filter);

    res.json({
      meals,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get meal details
router.get('/:mealId', authMiddleware, async (req, res) => {
  try {
    const meal = await Meal.findOne({
      _id: req.params.mealId,
      userId: req.userId
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update meal
router.put('/:mealId', authMiddleware, async (req, res) => {
  try {
    const meal = await Meal.findOne({
      _id: req.params.mealId,
      userId: req.userId
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const { ingredients, userRating, notes } = req.body;

    if (ingredients) {
      meal.ingredients = ingredients;
      meal.totalNutrition = calculateTotalNutrition(ingredients);
    }

    if (userRating) meal.userRating = userRating;
    if (notes) meal.notes = notes;

    await meal.save();

    res.json({
      message: 'Meal updated successfully',
      meal
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete meal
router.delete('/:mealId', authMiddleware, async (req, res) => {
  try {
    const meal = await Meal.findOneAndDelete({
      _id: req.params.mealId,
      userId: req.userId
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate total nutrition
function calculateTotalNutrition(ingredients) {
  return {
    calories: ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0),
    protein_g: ingredients.reduce((sum, ing) => sum + (ing.protein_g || 0), 0),
    carbs_g: ingredients.reduce((sum, ing) => sum + (ing.carbs_g || 0), 0),
    fat_g: ingredients.reduce((sum, ing) => sum + (ing.fat_g || 0), 0),
    saturated_fat_g: ingredients.reduce((sum, ing) => sum + (ing.saturated_fat_g || 0), 0),
    fiber_g: ingredients.reduce((sum, ing) => sum + (ing.fiber_g || 0), 0),
    sugar_g: ingredients.reduce((sum, ing) => sum + (ing.sugar_g || 0), 0),
    sodium_mg: ingredients.reduce((sum, ing) => sum + (ing.sodium_mg || 0), 0)
  };
}

module.exports = router;
