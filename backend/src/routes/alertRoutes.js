const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Alert = require('../models/Alert');

// Get user alerts with filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      severity,
      alertType,
      unread = false,
      limit = 50,
      skip = 0
    } = req.query;

    const filter = { userId: req.userId };
    if (severity) filter.severity = severity;
    if (alertType) filter.alertType = alertType;
    if (unread === 'true') filter.isRead = false;

    const alerts = await Alert.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('linkedMealId linkedBiometricId linkedPredictionId');

    const total = await Alert.countDocuments(filter);

    // Count by severity
    const severityCounts = await Alert.aggregate([
      { $match: filter },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    res.json({
      alerts,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
      severityCounts: Object.fromEntries(severityCounts.map(s => [s._id, s.count]))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get alert by ID
router.get('/:alertId', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.alertId,
      userId: req.userId
    }).populate('linkedMealId linkedBiometricId linkedPredictionId');

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark alert as read
router.patch('/:alertId/read', authMiddleware, async (req, res) => {
  console.log('📝 Mark as read endpoint hit! Alert ID:', req.params.alertId, 'User ID:', req.userId);
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.alertId, userId: req.userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!alert) {
      console.log('❌ Alert not found');
      return res.status(404).json({ error: 'Alert not found' });
    }

    console.log('✅ Alert marked as read:', alert._id);
    res.json({ message: 'Alert marked as read', alert });
  } catch (error) {
    console.error('❌ Error marking alert as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge alert
router.patch('/:alertId/acknowledge', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.alertId, userId: req.userId },
      {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        'userResponse.action': 'follow'
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert acknowledged', alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record user response to alert
router.post('/:alertId/respond', authMiddleware, async (req, res) => {
  try {
    const { action, reason, feedback } = req.body;

    if (!['follow', 'ignore', 'snooze', 'escalate'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.alertId, userId: req.userId },
      {
        userResponse: {
          action,
          timestamp: new Date(),
          reason,
          feedback
        },
        isAcknowledged: true,
        acknowledgedAt: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Response recorded', alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread alert count
router.get('/stats/unread', authMiddleware, async (req, res) => {
  try {
    const unreadCount = await Alert.countDocuments({
      userId: req.userId,
      isRead: false
    });

    const criticalCount = await Alert.countDocuments({
      userId: req.userId,
      severity: 'critical',
      isRead: false
    });

    res.json({ unreadCount, criticalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get trending alert types for user
router.get('/trending/types', authMiddleware, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - parseInt(days));

    const trends = await Alert.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId(req.userId),
          timestamp: { $gte: sinceDate }
        }
      },
      {
        $group: {
          _id: '$alertType',
          count: { $sum: 1 },
          avgSeverity: {
            $avg: {
              $cond: [{ $eq: ['$severity', 'critical'] }, 3,
                      { $cond: [{ $eq: ['$severity', 'warning'] }, 2, 1] }]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ trends, period_days: parseInt(days) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete alert
router.delete('/:alertId', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.alertId,
      userId: req.userId
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
