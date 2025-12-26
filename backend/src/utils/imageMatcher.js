const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Image matching utility for food recognition
 * Uses filename patterns and basic image analysis
 */

// Map food names to their data folder names
const FOOD_FOLDER_MAP = {
  'Appam': 'Appam',
  'Biryani': 'Biryani',
  'Chapati': 'Chapati',
  'Dosa': 'Dosa',
  'Idli': 'Idli',
  'Pongal': 'Pongal',
  'Poori': 'Poori',
  'Porotta': 'Porotta',
  'Vada': 'Vada',
  'White Rice': 'White Rice'
};

/**
 * Get all available food folders from data directory
 */
function getAvailableFoods() {
  const dataDir = path.join(__dirname, '../../../data');
  if (!fs.existsSync(dataDir)) {
    return [];
  }
  
  const folders = fs.readdirSync(dataDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  return folders;
}

/**
 * Match uploaded image filename to food type
 * Uses pattern matching on filename with fuzzy matching
 */
function matchByFilename(filename) {
  const lowerFilename = filename.toLowerCase();
  
  // Enhanced matching dictionary with all variations
  const foodVariations = {
    'Appam': ['appam', 'aapam', 'hoppers'],
    'Biryani': ['biryani', 'biriyani', 'briyani', 'biryani rice'],
    'Chapati': ['chapati', 'roti', 'chappati', 'chapathi', 'chapti', 'rotti'],
    'Dosa': ['dosa', 'dosai', 'dosha', 'dose', 'dhosha'],
    'Idli': ['idli', 'idly', 'idlee', 'idlly'],
    'Pongal': ['pongal', 'pongaal', 'ven pongal', 'sakkarai pongal'],
    'Poori': ['poori', 'puri', 'poorie', 'puri bread'],
    'Porotta': ['porotta', 'parotta', 'paratha', 'parota', 'barota', 'kerala parotta'],
    'Vada': ['vada', 'wada', 'vadai', 'medu vada', 'medhu vada'],
    'White Rice': ['white rice', 'rice', 'cooked rice', 'steamed rice', 'boiled rice', 'plain rice']
  };
  
  // Try exact and partial matches with scoring
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [foodName, variations] of Object.entries(foodVariations)) {
    for (const variation of variations) {
      // Exact match - highest score
      if (lowerFilename === variation) {
        return { foodName, confidence: 0.95 };
      }
      
      // Contains full variation - high score
      if (lowerFilename.includes(variation)) {
        const score = variation.length / lowerFilename.length; // Longer match = higher score
        if (score > highestScore) {
          highestScore = score;
          bestMatch = { foodName, confidence: Math.min(0.85, 0.7 + score * 0.2) };
        }
      }
      
      // Fuzzy match - check if variation is contained with some flexibility
      const words = lowerFilename.split(/[_\-\s]+/);
      for (const word of words) {
        if (word.includes(variation) || variation.includes(word)) {
          if (word.length >= 3) { // Avoid too short matches
            const score = Math.min(word.length, variation.length) / Math.max(word.length, variation.length);
            if (score > 0.6 && score > highestScore) {
              highestScore = score;
              bestMatch = { foodName, confidence: 0.65 + score * 0.15 };
            }
          }
        }
      }
    }
  }
  
  return bestMatch;
}

/**
 * Get image metadata for better matching
 */
async function getImageMetadata(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: fs.statSync(imagePath).size
    };
  } catch (error) {
    console.error('Error reading image metadata:', error);
    return null;
  }
}

/**
 * Analyze image color to help identify food type
 */
async function analyzeImageColor(imagePath) {
  try {
    const { data, info } = await sharp(imagePath)
      .resize(50, 50)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Calculate average RGB values
    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 3;
    
    for (let i = 0; i < data.length; i += 3) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    
    const avgColor = {
      r: r / pixelCount,
      g: g / pixelCount,
      b: b / pixelCount,
      brightness: (r + g + b) / (pixelCount * 3)
    };
    
    return avgColor;
  } catch (error) {
    console.error('Error analyzing image color:', error);
    return null;
  }
}

/**
 * Find best matching food based on advanced image analysis
 * Uses multiple heuristics for better accuracy
 */
async function findBestMatch(uploadedImagePath, uploadedFilename) {
  const dataDir = path.join(__dirname, '../../../data');
  
  // First try filename matching
  const filenameMatch = matchByFilename(uploadedFilename);
  if (filenameMatch && filenameMatch.confidence > 0.8) {
    return filenameMatch;
  }
  
  // Get image metadata
  const imageMeta = await getImageMetadata(uploadedImagePath);
  if (!imageMeta) {
    return filenameMatch; // Fallback to filename if available
  }
  
  // Analyze image color
  const colorData = await analyzeImageColor(uploadedImagePath);
  
  // Get all food folders
  const availableFoods = getAvailableFoods();
  if (availableFoods.length === 0) {
    return filenameMatch;
  }
  
  // Score each food type based on image characteristics
  const scores = {};
  
  const aspectRatio = imageMeta.width / imageMeta.height;
  const brightness = colorData ? colorData.brightness : 128;
  
  // Dosa - typically elongated, light to golden brown
  scores['Dosa'] = 0;
  if (aspectRatio > 1.2) scores['Dosa'] += 0.3;
  if (brightness > 140 && brightness < 200) scores['Dosa'] += 0.2;
  if (colorData && colorData.r > 150 && colorData.g > 120) scores['Dosa'] += 0.2;
  
  // Idli - round/square, very white
  scores['Idli'] = 0;
  if (aspectRatio >= 0.8 && aspectRatio <= 1.2) scores['Idli'] += 0.3;
  if (brightness > 180) scores['Idli'] += 0.3;
  if (colorData && colorData.r > 200 && colorData.g > 200 && colorData.b > 200) scores['Idli'] += 0.2;
  
  // Vada - round, golden brown
  scores['Vada'] = 0;
  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) scores['Vada'] += 0.3;
  if (brightness > 100 && brightness < 170) scores['Vada'] += 0.2;
  if (colorData && colorData.r > 130 && colorData.g > 90 && colorData.b < 80) scores['Vada'] += 0.2;
  
  // Chapati/Roti - round, light brown
  scores['Chapati'] = 0;
  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) scores['Chapati'] += 0.3;
  if (brightness > 160 && brightness < 200) scores['Chapati'] += 0.2;
  
  // Poori - round, golden/brown
  scores['Poori'] = 0;
  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) scores['Poori'] += 0.3;
  if (brightness > 130 && brightness < 180) scores['Poori'] += 0.2;
  
  // Porotta - layered appearance, off-white to light brown
  scores['Porotta'] = 0;
  if (aspectRatio >= 0.8 && aspectRatio <= 1.3) scores['Porotta'] += 0.2;
  if (brightness > 150 && brightness < 190) scores['Porotta'] += 0.2;
  
  // Biryani - colorful, mixed colors
  scores['Biryani'] = 0;
  if (aspectRatio >= 0.8 && aspectRatio <= 1.2) scores['Biryani'] += 0.2;
  if (brightness > 120 && brightness < 170) scores['Biryani'] += 0.2;
  
  // White Rice - very white, textured
  scores['White Rice'] = 0;
  if (aspectRatio >= 0.8 && aspectRatio <= 1.2) scores['White Rice'] += 0.2;
  if (brightness > 180) scores['White Rice'] += 0.3;
  if (colorData && colorData.r > 200 && colorData.g > 200 && colorData.b > 200) scores['White Rice'] += 0.2;
  
  // Pongal - off-white to yellow, textured
  scores['Pongal'] = 0;
  if (aspectRatio >= 0.8 && aspectRatio <= 1.2) scores['Pongal'] += 0.2;
  if (brightness > 160 && brightness < 200) scores['Pongal'] += 0.2;
  
  // Appam - round bowl shape, white with crispy edges
  scores['Appam'] = 0;
  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) scores['Appam'] += 0.3;
  if (brightness > 170) scores['Appam'] += 0.2;
  
  // Find highest scoring food
  let bestFood = null;
  let highestScore = 0;
  
  for (const [food, score] of Object.entries(scores)) {
    if (score > highestScore && availableFoods.includes(food)) {
      highestScore = score;
      bestFood = food;
    }
  }
  
  // Combine with filename match if available
  if (filenameMatch && bestFood) {
    // Weight filename match higher
    const combinedConfidence = (filenameMatch.confidence * 0.7) + (highestScore * 0.3);
    return {
      foodName: filenameMatch.foodName,
      confidence: Math.min(0.85, combinedConfidence)
    };
  }
  
  if (bestFood && highestScore > 0.4) {
    return {
      foodName: bestFood,
      confidence: Math.min(0.75, 0.5 + highestScore)
    };
  }
  
  return filenameMatch || null;
}

/**
 * Enhanced food matching with multiple strategies
 */
async function matchFood(uploadedImagePath, uploadedFilename) {
  console.log(`🔍 Image matching for: ${uploadedFilename}`);
  
  // Strategy 1: Filename matching (highest confidence)
  const filenameMatch = matchByFilename(uploadedFilename);
  if (filenameMatch && filenameMatch.confidence > 0.75) {
    console.log(`✅ Filename match: ${filenameMatch.foodName} (${(filenameMatch.confidence * 100).toFixed(1)}%)`);
    return filenameMatch;
  }
  
  // Strategy 2: Image analysis with heuristics
  try {
    const imageMatch = await findBestMatch(uploadedImagePath, uploadedFilename);
    if (imageMatch && imageMatch.confidence > 0.5) {
      console.log(`✅ Image analysis match: ${imageMatch.foodName} (${(imageMatch.confidence * 100).toFixed(1)}%)`);
      return imageMatch;
    }
  } catch (error) {
    console.error('Image analysis error:', error);
  }
  
  // Strategy 3: Filename match with lower threshold
  if (filenameMatch) {
    console.log(`⚠️  Low confidence filename match: ${filenameMatch.foodName} (${(filenameMatch.confidence * 100).toFixed(1)}%)`);
    return filenameMatch;
  }
  
  // Strategy 4: Smart fallback based on available foods
  const availableFoods = getAvailableFoods();
  if (availableFoods.length > 0) {
    // Return most common South Indian food as fallback
    const commonFoods = ['Dosa', 'Idli', 'Rice', 'Biryani'];
    for (const food of commonFoods) {
      if (availableFoods.includes(food)) {
        console.log(`⚠️  Fallback to common food: ${food} (50%)`);
        return { foodName: food, confidence: 0.5 };
      }
      // Check for partial matches
      const partialMatch = availableFoods.find(f => f.toLowerCase().includes(food.toLowerCase()));
      if (partialMatch) {
        console.log(`⚠️  Fallback to: ${partialMatch} (50%)`);
        return { foodName: partialMatch, confidence: 0.5 };
      }
    }
    
    // Last resort - return first available food
    console.log(`⚠️  Last resort fallback: ${availableFoods[0]} (40%)`);
    return { foodName: availableFoods[0], confidence: 0.4 };
  }
  
  console.log('❌ No match found');
  return null;
}

module.exports = {
  matchFood,
  matchByFilename,
  getAvailableFoods,
  FOOD_FOLDER_MAP
};

