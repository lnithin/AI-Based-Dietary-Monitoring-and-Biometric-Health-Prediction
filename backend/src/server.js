require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import configuration
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const mealRoutes = require('./routes/mealRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const alertRoutes = require('./routes/alertRoutes');
const userRoutes = require('./routes/userRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const foodRecognitionRoutes = require('./routes/foodRecognitionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const academicRoutes = require('./routes/academicRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/biometrics', biometricRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/food-recognition', foodRecognitionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/academic', academicRoutes);

// Serve uploaded images
app.use('/uploads', express.static(require('path').join(__dirname, '../../uploads')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB (optional for demo mode)
    await connectDB();

    app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   🚀 Backend Server Started Successfully   ║');
      console.log('╚════════════════════════════════════════╝\n');
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/health\n`);
      console.log('Available Endpoints:');
      console.log('  • POST   /api/auth/register');
      console.log('  • POST   /api/auth/login');
      console.log('  • GET    /api/auth/verify');
      console.log('  • GET    /api/users/profile');
      console.log('  • POST   /api/meals/logText');
      console.log('  • POST   /api/biometrics');
      console.log('  • POST   /api/predictions/generate');
      console.log('  • GET    /api/recommendations');
      console.log('  • GET    /api/alerts\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
