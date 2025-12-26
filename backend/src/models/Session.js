const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Session lifecycle
  loginTime: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  logoutTime: Date,
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  duration_minutes: Number, // Calculated on logout
  
  // Client info
  userAgent: String,
  ipAddress: String,
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  
  // Session activity
  activitiesPerformed: [{
    activity: String, // e.g., "log_meal", "view_recommendations", "update_biometrics"
    timestamp: Date,
    status: {
      type: String,
      enum: ['success', 'error', 'pending'],
      default: 'success'
    }
  }],
  
  // Metrics
  mealsLogged: {
    type: Number,
    default: 0
  },
  
  biometricsRecorded: {
    type: Number,
    default: 0
  },
  
  recommendationsViewed: {
    type: Number,
    default: 0
  },
  
  // Session health
  errorCount: {
    type: Number,
    default: 0
  },
  
  lastActivity: Date,
  
  // Session token (for audit purposes)
  tokenHash: String,
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for user session queries
sessionSchema.index({ userId: 1, loginTime: -1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ loginTime: 1 }); // For cleanup of old sessions

module.exports = mongoose.model('Session', sessionSchema);
