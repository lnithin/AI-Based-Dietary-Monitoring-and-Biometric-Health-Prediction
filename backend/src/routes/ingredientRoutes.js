const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');

// Search ingredients
router.get('/search', async (req, res) => {
  try {
    const { name, category, limit = 10, skip = 0 } = req.query;

    const filter = {};
    if (name) {
      filter.$or = [
        { name: { $regex: name, $options: 'i' } },
        { aliases: { $in: [new RegExp(name, 'i')] } },
        { keywords: { $in: [name.toLowerCase()] } }
      ];
    }
    if (category) filter.category = category;

    const ingredients = await Ingredient.find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-__v');

    const total = await Ingredient.countDocuments(filter);

    res.json({
      ingredients,
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

// Get ingredient by ID
router.get('/:ingredientId', async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.ingredientId);

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ingredients by category
router.get('/category/:category', async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const ingredients = await Ingredient.find({ category: req.params.category })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('name category macroNutrients.calories healthMetrics');

    const total = await Ingredient.countDocuments({ category: req.params.category });

    res.json({
      ingredients,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Ingredient.distinct('category');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch get ingredients
router.post('/batch', async (req, res) => {
  try {
    const { ingredientIds } = req.body;

    if (!Array.isArray(ingredientIds)) {
      return res.status(400).json({ error: 'ingredientIds must be an array' });
    }

    const ingredients = await Ingredient.find({ _id: { $in: ingredientIds } });
    res.json({ ingredients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get popular ingredients
router.get('/trending/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const ingredients = await Ingredient.find()
      .sort({ searchFrequency: -1, usageCount: -1 })
      .limit(parseInt(limit))
      .select('name category macroNutrients.calories healthMetrics searchFrequency usageCount');

    res.json({ ingredients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Filter by health metrics
router.post('/filter', async (req, res) => {
  try {
    const {
      vegetarian,
      vegan,
      keto_friendly,
      lowSodium,
      lowSugar,
      glycemicIndexMax,
      limit = 20
    } = req.body;

    const filter = {};
    if (vegetarian) filter['healthMetrics.vegetarian'] = true;
    if (vegan) filter['healthMetrics.vegan'] = true;
    if (keto_friendly) filter['healthMetrics.keto_friendly'] = true;
    if (lowSodium) filter['healthMetrics.lowSodium'] = true;
    if (lowSugar) filter['healthMetrics.lowSugar'] = true;
    if (glycemicIndexMax) {
      filter['healthMetrics.glycemicIndex'] = { $lte: glycemicIndexMax };
    }

    const ingredients = await Ingredient.find(filter)
      .limit(parseInt(limit))
      .select('name category healthMetrics macroNutrients.calories');

    res.json({ ingredients, count: ingredients.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
