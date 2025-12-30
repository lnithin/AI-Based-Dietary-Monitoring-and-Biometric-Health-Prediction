const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FoodNutrition = require('../models/FoodNutrition');
const Meal = require('../models/Meal');
const authMiddleware = require('../middleware/authMiddleware');
const { matchFood, getAvailableFoods } = require('../utils/imageMatcher');

// Configure multer for image uploads
const uploadDir = path.join(__dirname, '../../uploads/food-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'food-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * POST /api/food-recognition/upload
 * Upload food image and get nutrition data
 */
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePath = req.file.path;
    const imageName = req.file.filename;
    req.startTime = Date.now(); // Track processing time

    console.log(`Processing image: ${imageName}`);

    let recognizedFood = null;
    let confidence = 0;
    let recognitionMethod = 'unknown';

    // Strategy 1: Try CV service first (if available)
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));

      const cvResponse = await axios.post(
        'http://localhost:5002/recognize',
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      recognizedFood = cvResponse.data.food_name || null;
      confidence = cvResponse.data.confidence || 0;
      recognitionMethod = 'cv_service';
      console.log(`✅ CV Service recognized: ${recognizedFood} (${(confidence * 100).toFixed(1)}%)`);
    } catch (cvError) {
      console.log('❌ CV Service error:', cvError.response?.data || cvError.message || cvError);
      if (cvError.response) {
        console.log('   Response status:', cvError.response.status);
        console.log('   Response data:', cvError.response.data);
      }
      console.log('⚠️  Using fallback image matching');
      
      // Strategy 2: Enhanced image matching using our utility
      try {
        const matchResult = await matchFood(imagePath, req.file.originalname);
        if (matchResult) {
          recognizedFood = matchResult.foodName;
          confidence = matchResult.confidence;
          recognitionMethod = 'image_matcher';
          console.log(`✅ Image Matcher recognized: ${recognizedFood} (${(confidence * 100).toFixed(1)}%)`);
        } else {
          console.log('⚠️  Image matcher returned no results');
        }
      } catch (matchError) {
        console.error('❌ Image matching error:', matchError.message);
      }
    }

    let foodData = null;

    // Search database with recognized food name
    if (recognizedFood) {
      console.log(`🔍 Searching database for: ${recognizedFood}`);
      
      // Try exact match first
      foodData = await FoodNutrition.findOne({
        foodName: new RegExp(`^${recognizedFood}$`, 'i')
      });
      
      // Try partial match if exact match fails
      if (!foodData) {
        foodData = await FoodNutrition.findOne({
          foodName: new RegExp(recognizedFood, 'i')
        });
      }
      
      // Try matching with common variations
      if (!foodData) {
        const variations = {
          'Dosa': ['Dosa', 'Dosai'],
          'Idli': ['Idli', 'Idly'],
          'Chapati': ['Chapati', 'Roti'],
          'Poori': ['Poori', 'Puri'],
          'Porotta': ['Porotta', 'Parotta', 'Paratha'],
          'Vada': ['Vada', 'Wada'],
          'Rice': ['White Rice', 'Rice'],
          'Biryani': ['Biryani']
        };
        
        for (const [key, variants] of Object.entries(variations)) {
          if (variants.some(v => recognizedFood.toLowerCase().includes(v.toLowerCase()))) {
            foodData = await FoodNutrition.findOne({
              foodName: new RegExp(key, 'i')
            });
            if (foodData) {
              console.log(`✅ Found via variation: ${foodData.foodName}`);
              break;
            }
          }
        }
      }
      
      if (foodData) {
        console.log(`✅ Database match found: ${foodData.foodName}`);
      }
    }

    // Strategy 3: If still not found, try available foods from data folder
    if (!foodData && !recognizedFood) {
      console.log('📂 Trying folder-based matching...');
      const availableFoods = getAvailableFoods();
      if (availableFoods.length > 0) {
        console.log(`Available foods: ${availableFoods.join(', ')}`);
        
        // Try to find matching food in database based on folder names
        for (const folderName of availableFoods) {
          foodData = await FoodNutrition.findOne({
            foodName: new RegExp(folderName, 'i')
          });
          if (foodData) {
            recognizedFood = foodData.foodName;
            confidence = 0.6; // Medium confidence for folder match
            recognitionMethod = 'folder_match';
            console.log(`✅ Folder match: ${recognizedFood}`);
            break;
          }
        }
      }
    }

    // Strategy 4: Smart fallback - get all available foods and pick best one
    if (!foodData) {
      console.log('🎲 Using smart fallback...');
      const allFoods = await FoodNutrition.find({});
      
      if (allFoods.length > 0) {
        // Prefer common foods
        const preferredFoods = ['Dosa', 'Idli', 'Biryani', 'White Rice', 'Chapati'];
        
        for (const preferred of preferredFoods) {
          foodData = allFoods.find(food => 
            food.foodName.toLowerCase().includes(preferred.toLowerCase())
          );
          if (foodData) {
            recognizedFood = foodData.foodName;
            confidence = 0.45; // Low confidence
            recognitionMethod = 'fallback';
            console.log(`⚠️  Fallback to: ${recognizedFood}`);
            break;
          }
        }
        
        // If still nothing, use first available
        if (!foodData) {
          foodData = allFoods[0];
          recognizedFood = foodData.foodName;
          confidence = 0.4;
          recognitionMethod = 'default';
          console.log(`⚠️  Default fallback: ${recognizedFood}`);
        }
      }
    }

    if (!foodData) {
      console.error('❌ No food data found in database');
      return res.status(404).json({
        error: 'Food not recognized',
        recognizedFood: recognizedFood || 'unknown',
        message: 'Unable to identify food. Please ensure your database has food items.',
        suggestions: [
          'Try uploading a clear image',
          'Use a filename with the food name (e.g., dosa.jpg)',
          'Ensure database is seeded with food items'
        ]
      });
    }

    console.log(`✅ Final result: ${recognizedFood} (${recognitionMethod}, ${(confidence * 100).toFixed(1)}%)`);

    // Store the upload record
    const uploadRecord = {
      userId: req.userId,
      imagePath: imagePath,
      imageFilename: imageName,
      recognizedFood: foodData.foodName,
      confidence: confidence,
      nutrition: foodData.nutrition,
      timestamp: new Date()
    };

    // Calculate additional nutritional metrics
    const nutrition = foodData.nutrition || {};
    const servingSize = foodData.servingSize || { amount: 1, unit: 'serving', approxGram: 100 };
    
    // Calculate macros percentages
    const totalCalories = nutrition.calories_kcal || 0;
    const proteinCal = (nutrition.protein_g || 0) * 4;
    const carbsCal = (nutrition.carbs_g || 0) * 4;
    const fatCal = (nutrition.fat_g || 0) * 9;
    const totalMacroCal = proteinCal + carbsCal + fatCal;
    
    const macroPercentages = totalMacroCal > 0 ? {
      protein: ((proteinCal / totalMacroCal) * 100).toFixed(1),
      carbs: ((carbsCal / totalMacroCal) * 100).toFixed(1),
      fat: ((fatCal / totalMacroCal) * 100).toFixed(1)
    } : { protein: 0, carbs: 0, fat: 0 };

    // Automatically create a meal entry with all biometric/nutritional data
    let mealEntry = null;
    try {
      // Determine meal type based on current time
      const currentHour = new Date().getHours();
      let mealType = 'lunch'; // default
      if (currentHour >= 6 && currentHour < 11) {
        mealType = 'breakfast';
      } else if (currentHour >= 11 && currentHour < 15) {
        mealType = 'lunch';
      } else if (currentHour >= 15 && currentHour < 19) {
        mealType = 'snack';
      } else {
        mealType = 'dinner';
      }

      // Create ingredient entry from food data
      const ingredient = {
        name: foodData.foodName,
        portion_grams: servingSize.approxGram || 100,
        portion_unit: servingSize.unit || 'serving',
        calories: nutrition.calories_kcal || 0,
        protein_g: nutrition.protein_g || 0,
        carbs_g: nutrition.carbs_g || 0,
        fat_g: nutrition.fat_g || 0,
        fiber_g: nutrition.fiber_g || 0,
        sodium_mg: nutrition.sodium_mg || 0,
        confidence_score: confidence
      };

      // Create meal with all nutritional biometric data
      mealEntry = new Meal({
        userId: req.userId,
        mealType: mealType,
        timestamp: new Date(),
        logType: 'image',
        rawDescription: `Recognized: ${foodData.foodName}`,
        imageUrl: `/uploads/food-images/${imageName}`,
        imagePath: imagePath,
        cvPredictions: [{
          dishName: foodData.foodName,
          confidence: confidence
        }],
        ingredients: [ingredient],
        totalNutrition: {
          calories: nutrition.calories_kcal || 0,
          calories_kcal: nutrition.calories_kcal || 0, // Also include for compatibility
          protein_g: nutrition.protein_g || 0,
          carbs_g: nutrition.carbs_g || 0,
          fat_g: nutrition.fat_g || 0,
          fiber_g: nutrition.fiber_g || 0,
          sodium_mg: nutrition.sodium_mg || 0
        },
        healthMetrics: {
          allergens: foodData.allergens || []
        },
        nlpProcessing: {
          status: 'completed',
          confidence: confidence,
          extractedEntities: [foodData.foodName],
          processingTime_ms: Date.now() - req.startTime || 0
        },
        isProcessed: true
      });

      await mealEntry.save();
      console.log(`✓ Meal entry created for recognized food: ${foodData.foodName}`);
    } catch (mealError) {
      console.error('Error creating meal entry:', mealError);
      // Continue even if meal creation fails
    }

    res.json({
      success: true,
      recognized: foodData.foodName,
      confidence: confidence,
      confidenceScore: {
        value: parseFloat((confidence * 100).toFixed(1)),
        unit: '%',
        level: confidence >= 0.8 ? 'HIGH' : confidence >= 0.5 ? 'MEDIUM' : 'LOW',
        requiresUserConfirmation: confidence < 0.5 // Flag for UI to request user confirmation
      },
      recognitionMethod: recognitionMethod,
      servingSize: servingSize,
      nutrition: {
        ...nutrition,
        // Add calculated fields
        macroPercentages: macroPercentages,
        proteinCalories: proteinCal,
        carbsCalories: carbsCal,
        fatCalories: fatCal,
        // Calculate per 100g values
        per100g: {
          calories: servingSize.approxGram > 0 ? ((nutrition.calories_kcal || 0) / servingSize.approxGram * 100).toFixed(1) : 0,
          protein: servingSize.approxGram > 0 ? ((nutrition.protein_g || 0) / servingSize.approxGram * 100).toFixed(1) : 0,
          carbs: servingSize.approxGram > 0 ? ((nutrition.carbs_g || 0) / servingSize.approxGram * 100).toFixed(1) : 0,
          fat: servingSize.approxGram > 0 ? ((nutrition.fat_g || 0) / servingSize.approxGram * 100).toFixed(1) : 0
        }
      },
      category: foodData.category,
      cuisineType: foodData.cuisineType,
      isVegetarian: foodData.isVegetarian,
      allergens: foodData.allergens || [],
      imagePath: `/uploads/food-images/${imageName}`,
      mealCreated: mealEntry ? true : false,
      mealId: mealEntry ? mealEntry._id : null,
      mealType: mealEntry ? mealEntry.mealType : null
    });

  } catch (error) {
    console.error('Food recognition error:', error);
    res.status(500).json({
      error: 'Food recognition failed',
      message: error.message
    });
  }
});

/**
 * GET /api/food-recognition/all
 * Get all available foods in database
 */
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const foods = await FoodNutrition.find()
      .select('foodName nutrition servingSize category isVegetarian')
      .sort({ foodName: 1 });

    res.json({
      success: true,
      count: foods.length,
      foods: foods
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/food-recognition/search
 * Search foods by name
 */
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const foods = await FoodNutrition.find({
      foodName: new RegExp(query, 'i')
    });

    res.json({
      success: true,
      count: foods.length,
      foods: foods
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/food-recognition/:foodName
 * Get specific food details
 */
router.get('/:foodName', authMiddleware, async (req, res) => {
  try {
    const food = await FoodNutrition.findOne({
      foodName: new RegExp(req.params.foodName, 'i')
    });

    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    res.json({
      success: true,
      food: food
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/food-recognition/category/:category
 * Get foods by category
 */
router.get('/category/:category', authMiddleware, async (req, res) => {
  try {
    const foods = await FoodNutrition.find({
      category: req.params.category
    });

    res.json({
      success: true,
      category: req.params.category,
      count: foods.length,
      foods: foods
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/food-recognition/recognize
 * Recognize food from base64 image (for frontend upload)
 */
router.post('/recognize', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;

    console.log('📥 Received recognition request');

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Save temporary file
    const tempFileName = `temp-${Date.now()}.jpg`;
    const tempFilePath = path.join(uploadDir, tempFileName);
    fs.writeFileSync(tempFilePath, imageBuffer);

    console.log(`💾 Saved temp file: ${tempFileName}`);

    let recognizedFood = null;
    let confidence = 0;

    // Try CV service first
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('image', fs.createReadStream(tempFilePath));

      console.log('🔍 Calling CV service at http://localhost:5002/recognize');

      const cvResponse = await axios.post(
        'http://localhost:5002/recognize',
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      recognizedFood = cvResponse.data.food_name || null;
      confidence = cvResponse.data.confidence || 0;
      
      console.log(`✅ CV Service recognized: ${recognizedFood} (${(confidence * 100).toFixed(1)}%)`);
    } catch (cvError) {
      console.log('❌ CV Service error:', cvError.response?.data || cvError.message || cvError);
      if (cvError.response) {
        console.log('   Response status:', cvError.response.status);
        console.log('   Response data:', cvError.response.data);
      }
      console.log('⚠️  Using fallback image matching');
      
      // Fallback to image matcher
      try {
        const matchResult = await matchFood(tempFilePath, tempFileName);
        if (matchResult) {
          recognizedFood = matchResult.foodName;
          confidence = matchResult.confidence;
        }
      } catch (matchError) {
        console.error('Image matching error:', matchError);
      }

      // If image matcher also fails, try simple filename matching
      if (!recognizedFood) {
        const knownFoods = ['biryani', 'dosa', 'idli', 'chapati', 'pongal', 'poori', 'porotta', 'vada', 'appam', 'white rice'];
        const fileName = tempFileName.toLowerCase();
        
        for (const food of knownFoods) {
          if (fileName.includes(food.toLowerCase().replace(' ', ''))) {
            recognizedFood = food.charAt(0).toUpperCase() + food.slice(1);
            confidence = 0.75;
            break;
          }
        }
      }

      // Last resort: default to first available food with low confidence
      if (!recognizedFood) {
        console.log('No match found, suggesting manual selection');
        recognizedFood = 'Biryani'; // Default fallback
        confidence = 0.3;
      }
    }

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.log(`🔍 Looking up food in database: "${recognizedFood}"`);

    // Always have a recognized food at this point (even if it's a fallback)
    // Get nutrition data from database - try multiple search strategies
    let foodData = null;
    
    // Strategy 1: Exact match (case-insensitive)
    foodData = await FoodNutrition.findOne({
      foodName: { $regex: new RegExp(`^${recognizedFood}$`, 'i') }
    });

    // Strategy 2: If not found, try matching the start of the foodName (handles "White Rice" vs "White Rice (cooked)")
    if (!foodData) {
      console.log(`   ⚠️  Exact match failed, trying partial match...`);
      foodData = await FoodNutrition.findOne({
        foodName: { $regex: new RegExp(`^${recognizedFood}`, 'i') }
      });
    }

    // Strategy 3: If still not found, try if recognized food is contained in foodName
    if (!foodData) {
      console.log(`   ⚠️  Partial match failed, trying contains match...`);
      foodData = await FoodNutrition.findOne({
        foodName: { $regex: new RegExp(recognizedFood, 'i') }
      });
    }

    if (!foodData) {
      console.log(`   ❌ Food not found in database: "${recognizedFood}"`);
      
      // If specific food not found, try to get any available food
      const anyFood = await FoodNutrition.findOne({});
      
      if (!anyFood) {
        return res.status(404).json({ 
          error: 'Nutrition database empty',
          message: 'Please seed the food nutrition database first'
        });
      }

      return res.json({
        success: true,
        foodName: anyFood.foodName,
        confidence: 0.3,
        nutrition: anyFood.nutrition,
        servingSize: anyFood.servingSize,
        category: anyFood.category,
        message: 'Food not recognized accurately. Showing default food. Please verify and adjust manually.'
      });
    }

    console.log(`✅ Found in database: "${foodData.foodName}"`);

    res.json({
      success: true,
      foodName: foodData.foodName,
      confidence: confidence,
      nutrition: foodData.nutrition,
      servingSize: foodData.servingSize,
      category: foodData.category
    });

  } catch (error) {
    console.error('Recognition error:', error);
    res.status(500).json({ 
      error: 'Recognition failed',
      details: error.message 
    });
  }
});

module.exports = router;
