const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Recommendation = require('../models/Recommendation');
const RecommendationEngine = require('../services/recommendationEngine');
const axios = require('axios');

// Get recommendations for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status = 'pending', priority, limit = 20, skip = 0 } = req.query;

    const filter = { userId: req.userId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const recommendations = await Recommendation.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('linkedMealId')
      .populate('linkedBiometricId');

    const total = await Recommendation.countDocuments(filter);

    res.json({
      recommendations,
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

// Get today's recommendations
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const recommendations = await Recommendation.find({
      userId: req.userId,
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'presented'] }
    })
      .sort({ priority: -1 })
      .populate('linkedMealId');

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get meal suggestions (enhanced with intelligent recommendations)
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const { meal_type } = req.query;

    // Use our intelligent recommendation engine
    const recommendations = await RecommendationEngine.generateRecommendations(
      req.userId,
      meal_type || 'lunch'
    );

    res.json({
      success: true,
      suggestions: recommendations.suggestions,
      recommendations: recommendations.recommendations,
      generatedAt: recommendations.generatedAt,
      message: 'Personalized meal suggestions based on your health profile'
    });
  } catch (error) {
    console.error('Recommendation generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Submit feedback for suggestion (no database ID needed) - MUST BE BEFORE /:recId routes
router.post('/feedback', authMiddleware, async (req, res) => {
  console.log('📝 Feedback endpoint hit! User ID:', req.userId);
  console.log('📝 Request body:', req.body);
  
  try {
    const { foodName, mealType, action, feedback } = req.body;

    console.log('📝 Parsed data - Food:', foodName, 'Meal:', mealType, 'Action:', action);

    // Create a recommendation record for tracking
    const rec = new Recommendation({
      userId: req.userId,
      title: `Meal Suggestion: ${foodName}`,
      description: `User ${action} suggestion for ${mealType}`,
      recommendationType: 'meal_suggestion',
      priority: 'medium',
      triggeredBy: 'user_request',  // Required field
      status: action === 'accepted' ? 'accepted' : 'rejected',
      userFeedback: {
        accepted: action === 'accepted',
        helpful: action === 'accepted',
        reason: feedback
      },
      recommendation: foodName,
      confidence: 0.8
    });

    await rec.save();
    console.log('✅ Recommendation saved with ID:', rec._id);

    // Update user's compliance metrics
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    console.log('📊 User found:', user ? user.email : 'none');
    
    if (user && user.complianceMetrics) {
      if (action === 'accepted') {
        user.complianceMetrics.recommendationsFollowed += 1;
      } else {
        user.complianceMetrics.recommendationsIgnored += 1;
      }
      
      const total = user.complianceMetrics.recommendationsFollowed + user.complianceMetrics.recommendationsIgnored;
      user.complianceMetrics.complianceScore = total > 0 
        ? user.complianceMetrics.recommendationsFollowed / total 
        : 0.5;
      
      await user.save();
      console.log('📊 User compliance updated! Score:', user.complianceMetrics.complianceScore);
    }

    console.log('✅ Sending success response');
    res.json({
      success: true,
      message: action === 'accepted' ? 'Thank you for your feedback!' : 'Feedback recorded!',
      recommendation: rec
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create recommendation
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      recommendationType,
      priority = 'medium',
      triggeredBy,
      linkedMealId,
      linkedBiometricId,
      recommendation,
      confidence,
      expectedImpact
    } = req.body;

    const rec = new Recommendation({
      userId: req.userId,
      title,
      description,
      recommendationType,
      priority,
      triggeredBy,
      linkedMealId: linkedMealId || null,
      linkedBiometricId: linkedBiometricId || null,
      recommendation,
      confidence: confidence || 0.7,
      expectedImpact,
      reasoningChain: []
    });

    await rec.save();

    res.status(201).json({
      message: 'Recommendation created',
      recommendation: rec
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific recommendation
router.get('/:recId', authMiddleware, async (req, res) => {
  try {
    const rec = await Recommendation.findOne({
      _id: req.params.recId,
      userId: req.userId
    })
      .populate('linkedMealId')
      .populate('linkedBiometricId');

    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json(rec);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept recommendation
router.put('/:recId/accept', authMiddleware, async (req, res) => {
  try {
    const rec = await Recommendation.findOne({
      _id: req.params.recId,
      userId: req.userId
    });

    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    rec.status = 'accepted';
    rec.userFeedback = {
      accepted: true,
      helpful: req.body.helpful !== undefined ? req.body.helpful : true,
      reason: req.body.reason
    };

    await rec.save();

    res.json({
      message: 'Recommendation accepted',
      recommendation: rec
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject recommendation
router.put('/:recId/reject', authMiddleware, async (req, res) => {
  try {
    const rec = await Recommendation.findOne({
      _id: req.params.recId,
      userId: req.userId
    });

    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    rec.status = 'rejected';
    rec.userFeedback = {
      accepted: false,
      helpful: req.body.helpful !== undefined ? req.body.helpful : false,
      reason: req.body.reason
    };

    await rec.save();

    res.json({
      message: 'Recommendation rejected',
      recommendation: rec
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
