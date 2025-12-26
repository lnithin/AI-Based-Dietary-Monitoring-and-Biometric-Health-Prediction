const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const Meal = require('../models/Meal');
const Biometric = require('../models/Biometric');
const Alert = require('../models/Alert');
const User = require('../models/User');

// Treat anything other than "connected" (or if demo mode is forced) as not connected.
const isMongoConnected = () => global.IS_DEMO_MODE !== true && mongoose.connection.readyState === 1;

/**
 * GET /api/dashboard/stats
 * Get comprehensive dashboard statistics for the logged-in user
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // If MongoDB isn't connected, return demo/empty stats instead of triggering
    // Mongoose command buffering (which leads to 10s timeouts on countDocuments).
    if (!isMongoConnected()) {
      const demoDb = global.demoDatabase || {};
      const meals = Array.isArray(demoDb.meals) ? demoDb.meals.filter(m => String(m.userId) === String(userId)) : [];
      const biometrics = Array.isArray(demoDb.biometrics) ? demoDb.biometrics.filter(b => String(b.userId) === String(userId)) : [];
      const alerts = Array.isArray(demoDb.alerts) ? demoDb.alerts.filter(a => String(a.userId) === String(userId)) : [];
      const user = Array.isArray(demoDb.users) ? demoDb.users.find(u => String(u._id) === String(userId)) : null;

      const recentMeals = meals
        .slice()
        .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
        .slice(0, 5);

      const unreadAlertsCount = alerts.filter(a => a && a.isRead === false).length;

      res.json({
        success: true,
        dbConnected: false,
        message: 'MongoDB not connected (demo mode). Returning empty dashboard stats.',
        user: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          profileCompleteness: user?.profileCompleteness || 0
        },
        meals: {
          total: meals.length,
          today: 0,
          recent: recentMeals.map(meal => ({
            _id: meal._id,
            mealType: meal.mealType,
            timestamp: meal.timestamp,
            calories: meal.totalNutrition?.calories_kcal || meal.totalNutrition?.calories || 0,
            description: meal.rawDescription || meal.mealType
          }))
        },
        biometrics: {
          total: biometrics.length,
          thisWeek: 0,
          glucose: { average: null, latest: null, count: 0 },
          bloodPressure: { systolic: null, diastolic: null, latest: null, count: 0 }
        },
        alerts: {
          recent: alerts
            .slice()
            .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0))
            .slice(0, 5),
          unreadCount: unreadAlertsCount
        }
      });
      return;
    }

    // Get meal statistics
    const totalMeals = await Meal.countDocuments({ userId });
    const recentMeals = await Meal.find({ userId })
      .sort({ timestamp: -1 })
      .limit(5)
      .select('mealType timestamp totalNutrition rawDescription')
      .lean();

    // Get biometric statistics
    const totalBiometrics = await Biometric.countDocuments({ userId });
    
    // Get glucose stats
    const glucoseReadings = await Biometric.find({
      userId,
      biometricType: 'glucose',
      glucose_mg_dl: { $exists: true, $ne: null }
    })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    const glucoseStats = glucoseReadings.length > 0 ? {
      average: Math.round(
        glucoseReadings.reduce((sum, r) => sum + (r.glucose_mg_dl || 0), 0) / glucoseReadings.length
      ),
      latest: glucoseReadings[0]?.glucose_mg_dl || null,
      count: glucoseReadings.length
    } : { average: null, latest: null, count: 0 };

    // Get blood pressure stats
    const bpReadings = await Biometric.find({
      userId,
      biometricType: 'blood_pressure',
      systolic: { $exists: true, $ne: null },
      diastolic: { $exists: true, $ne: null }
    })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    const bpStats = bpReadings.length > 0 ? {
      systolic: Math.round(
        bpReadings.reduce((sum, r) => sum + (r.systolic || 0), 0) / bpReadings.length
      ),
      diastolic: Math.round(
        bpReadings.reduce((sum, r) => sum + (r.diastolic || 0), 0) / bpReadings.length
      ),
      latest: bpReadings[0] ? `${bpReadings[0].systolic}/${bpReadings[0].diastolic}` : null,
      count: bpReadings.length
    } : { systolic: null, diastolic: null, latest: null, count: 0 };

    // Get recent alerts
    const recentAlerts = await Alert.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('alertType severity message createdAt isRead')
      .lean();

    const unreadAlertsCount = await Alert.countDocuments({
      userId,
      isRead: false
    });

    // Get user profile info
    const user = await User.findById(userId).select('firstName lastName profileCompleteness createdAt').lean();

    // Calculate today's meal count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMealsCount = await Meal.countDocuments({
      userId,
      timestamp: { $gte: today }
    });

    // Calculate this week's biometric count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekBiometricsCount = await Biometric.countDocuments({
      userId,
      timestamp: { $gte: weekAgo }
    });

    res.json({
      success: true,
      user: {
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        profileCompleteness: user?.profileCompleteness || 0
      },
      meals: {
        total: totalMeals,
        today: todayMealsCount,
        recent: recentMeals.map(meal => ({
          _id: meal._id,
          mealType: meal.mealType,
          timestamp: meal.timestamp,
          calories: meal.totalNutrition?.calories_kcal || meal.totalNutrition?.calories || 0,
          description: meal.rawDescription || meal.mealType
        }))
      },
      biometrics: {
        total: totalBiometrics,
        thisWeek: weekBiometricsCount,
        glucose: glucoseStats,
        bloodPressure: bpStats
      },
      alerts: {
        recent: recentAlerts,
        unreadCount: unreadAlertsCount
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

