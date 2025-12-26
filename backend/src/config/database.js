const mongoose = require('mongoose');

// In-memory storage for demo mode
global.demoDatabase = {
  users: [],
  meals: [],
  biometrics: [],
  alerts: [],
  recommendations: [],
  predictions: []
};

const connectDB = async () => {
  try {
    // Default to non-demo mode; we'll flip this if connection fails.
    global.IS_DEMO_MODE = false;

    // Avoid hanging requests when Mongo is unavailable.
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    global.IS_DEMO_MODE = true;

    // Ensure we don't later "half connect" and mix demo IDs with ObjectId models.
    try {
      await mongoose.disconnect();
    } catch (_) {
      // ignore
    }

    console.warn(`⚠️  MongoDB Connection Warning: ${error.message}`);
    console.log('📝 Running in DEMO MODE - Using in-memory database');
    console.log('💡 To connect MongoDB Atlas:');
    console.log('   1. Sign up at https://www.mongodb.com/cloud/atlas');
    console.log('   2. Create a cluster and get connection string');
    console.log('   3. Update MONGODB_URI in .env file');
    console.log('');
    
    // Initialize demo user
    global.demoDatabase.users.push({
      _id: '507f1f77bcf86cd799439011',
      email: 'demo@example.com',
      password: '$2a$10$zPQ5lZDf2R8dCyBtmJe4luTbRNXhVZnBD9Oj.Mj1kV1nKVPRhKd3K', // demo123
      firstName: 'Demo',
      lastName: 'User',
      age: 28,
      gender: 'male',
      createdAt: new Date()
    });
    
    return null;
  }
};

module.exports = connectDB;
