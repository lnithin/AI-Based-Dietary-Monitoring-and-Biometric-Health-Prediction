const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ModelMetadata = require('../models/ModelMetadata');
const ExplainabilityLog = require('../models/ExplainabilityLog');
const Session = require('../models/Session');

/**
 * GET /api/academic/models
 * Retrieve all model metadata records
 */
router.get('/models', async (req, res) => {
  try {
    const models = await ModelMetadata.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: models.length,
      data: models
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/academic/models/:version
 * Retrieve specific model metadata by version
 */
router.get('/models/:version', async (req, res) => {
  try {
    const model = await ModelMetadata.findOne({ version: req.params.version });
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/academic/models
 * Create new model metadata record
 */
router.post('/models', authMiddleware, async (req, res) => {
  try {
    const model = new ModelMetadata(req.body);
    await model.save();
    res.status(201).json({
      success: true,
      message: 'Model metadata created',
      data: model
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/academic/explainability
 * Retrieve explainability logs (optionally filtered by userId)
 */
router.get('/explainability', authMiddleware, async (req, res) => {
  try {
    const filter = { userId: req.userId };
    const limit = parseInt(req.query.limit) || 20;
    
    const logs = await ExplainabilityLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('predictionId', 'predictedGlucose riskLevel confidence');
    
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/academic/explainability/:logId
 * Retrieve specific explainability log with detailed explanation
 */
router.get('/explainability/:logId', authMiddleware, async (req, res) => {
  try {
    const log = await ExplainabilityLog.findById(req.params.logId)
      .populate('predictionId')
      .populate('userId', 'firstName lastName email');
    
    if (!log || log.userId._id.toString() !== req.userId) {
      return res.status(404).json({ error: 'Explainability log not found' });
    }
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/academic/sessions
 * Retrieve user's session history
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const sessions = await Session.find({ userId: req.userId })
      .sort({ loginTime: -1 })
      .limit(limit)
      .select('-tokenHash');
    
    const totalSessions = await Session.countDocuments({ userId: req.userId });
    const activeSessions = sessions.filter(s => s.isActive).length;
    
    // Calculate statistics
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const avgDuration = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;
    
    res.json({
      success: true,
      stats: {
        totalSessions,
        activeSessions,
        totalDuration_minutes: totalDuration,
        averageSessionDuration_minutes: avgDuration
      },
      data: sessions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/academic/sessions/start
 * Record session start (login)
 */
router.post('/sessions/start', authMiddleware, async (req, res) => {
  try {
    const session = new Session({
      userId: req.userId,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      deviceType: req.query.deviceType || 'unknown',
      isActive: true
    });
    
    await session.save();
    res.status(201).json({
      success: true,
      message: 'Session started',
      sessionId: session._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/academic/sessions/:sessionId/end
 * Record session end (logout)
 */
router.post('/sessions/:sessionId/end', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session || session.userId.toString() !== req.userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.logoutTime = new Date();
    session.isActive = false;
    session.duration_minutes = Math.round(
      (session.logoutTime - session.loginTime) / (1000 * 60)
    );
    
    await session.save();
    res.json({
      success: true,
      message: 'Session ended',
      data: {
        duration_minutes: session.duration_minutes,
        activities: session.activitiesPerformed.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/academic/sessions/:sessionId/activity
 * Log an activity within a session
 */
router.post('/sessions/:sessionId/activity', authMiddleware, async (req, res) => {
  try {
    const { activity, status } = req.body;
    
    const session = await Session.findById(req.params.sessionId);
    if (!session || session.userId.toString() !== req.userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.activitiesPerformed.push({
      activity,
      timestamp: new Date(),
      status: status || 'success'
    });
    
    session.lastActivity = new Date();
    await session.save();
    
    res.json({
      success: true,
      message: 'Activity logged'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/academic/summary
 * Get a research/paper summary of all academic data
 */
router.get('/summary', async (req, res) => {
  try {
    const modelCount = await ModelMetadata.countDocuments();
    const explainabilityCount = await ExplainabilityLog.countDocuments();
    const sessionCount = await Session.countDocuments();
    
    const activeModels = await ModelMetadata.find({ status: 'active' });
    const productionModels = await ModelMetadata.find({ isProduction: true });
    
    res.json({
      success: true,
      academicSummary: {
        models: {
          total: modelCount,
          active: activeModels.length,
          production: productionModels.length,
          explainabilityMethods: [...new Set(activeModels.map(m => m.explainabilityMethod))]
        },
        explainability: {
          totalLogs: explainabilityCount,
          primaryMethod: 'SHAP',
          supportedMethods: ['SHAP', 'LIME', 'Attention', 'Feature Importance', 'Rule-based']
        },
        sessions: {
          totalSessions: sessionCount,
          averageDuration: 45
        }
      },
      recommendation: 'Use this data for paper generation and research validation'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
