const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const jwt = require('jsonwebtoken');

async function testFeedback() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dietary-monitoring';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a user to get token
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No user found. Please create a user first.');
      process.exit(1);
    }

    console.log('📧 Testing with user:', user.email);

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key-here');
    console.log('🔑 Token generated\n');

    // Test feedback endpoint
    console.log('🧪 Testing feedback endpoint...');
    const response = await fetch('http://localhost:8000/api/recommendations/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        foodName: 'Biryani',
        mealType: 'lunch',
        action: 'accepted',
        feedback: 'User liked the suggestion'
      })
    });

    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📦 Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Feedback endpoint working!');
    } else {
      console.log('\n❌ Feedback endpoint failed');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
    process.exit(0);
  }
}

testFeedback();
