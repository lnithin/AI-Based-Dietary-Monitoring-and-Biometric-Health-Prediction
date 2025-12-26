const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Prediction = require('../models/Prediction');
const axios = require('axios');

// Get predictions for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, predictionType, limit = 50, skip = 0 } = req.query;

    const filter = { userId: req.userId };

    if (predictionType) filter.predictionType = predictionType;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const predictions = await Prediction.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('mealId')
      .populate('userId', 'email firstName lastName');

    const total = await Prediction.countDocuments(filter);

    res.json({
      predictions,
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

// Get specific prediction
router.get('/:predictionId', authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({
      _id: req.params.predictionId,
      userId: req.userId
    }).populate('mealId');

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// New: POST /api/predictions - Integrate frontend with backend and Flask API
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Accept meal/biometric data from frontend
    const { mealData } = req.body;
    if (!mealData) {
      return res.status(400).json({ error: 'Missing mealData in request body' });
    }

    // Forward to Flask API with proper error handling
    const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5001/api/glucose-prediction/predict';
    let flaskResponse;
    try {
      console.log('Sending to Flask API:', { meal_features: mealData });
      flaskResponse = await axios.post(flaskUrl, { meal_features: mealData });
      console.log('Flask API response:', flaskResponse.data);
    } catch (err) {
      console.error('Flask API error:', err.response?.data || err.message);
      return res.status(502).json({ 
        error: 'Flask API error', 
        details: err.response?.data || err.message,
        flaskUrl: flaskUrl
      });
    }

    // Save prediction to MongoDB
    const prediction = new Prediction({
      userId: req.userId,
      predictionType: 'glucose',
      modelUsed: 'lstm',
      inputFeatures: mealData,
      predictions: [
        {
          biomarkerType: 'glucose',
          predictedValue: flaskResponse.data.predictions?.[0] || flaskResponse.data.prediction || null,
          confidence: flaskResponse.data.confidence || null
        }
      ],
      modelMetrics: flaskResponse.data.metrics || {},
      alerts: flaskResponse.data.alerts || [],
      processedAt: new Date()
    });
    await prediction.save();

    // Return result to frontend
    res.status(201).json({
      prediction: flaskResponse.data,
      dbId: prediction._id
    });
  } catch (error) {
    console.error('Prediction route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify prediction accuracy
router.put('/:predictionId/verify', authMiddleware, async (req, res) => {
  try {
    const { actualValue, recordedAt } = req.body;

    const prediction = await Prediction.findOne({
      _id: req.params.predictionId,
      userId: req.userId
    });

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    // Find the first prediction in the predictions array to compare
    if (prediction.predictions && prediction.predictions.length > 0) {
      const predictedValue = prediction.predictions[0].predictedValue;
      const error = Math.abs(actualValue - predictedValue);

      prediction.verification = {
        actualValue,
        recordedAt: recordedAt || new Date(),
        predictionError: error,
        wasAccurate: error < 20 // Threshold: within 20 units
      };
    }

    await prediction.save();

    res.json({
      message: 'Prediction verified',
      prediction
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
