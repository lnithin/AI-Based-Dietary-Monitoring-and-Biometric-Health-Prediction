const axios = require('axios');

// Test the recommendation feedback endpoint
async function testFeedback() {
  try {
    // First, login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'test@example.com', // Replace with your test user
      password: 'password123' // Replace with your test password
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful! Token:', token.substring(0, 20) + '...');

    // Test accepting a recommendation
    console.log('\n🔵 Testing ACCEPT feedback...');
    const acceptResponse = await axios.post(
      'http://localhost:8000/api/recommendations/feedback',
      {
        foodName: 'Dosa',
        mealType: 'breakfast',
        action: 'accepted',
        feedback: 'User liked the suggestion'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Accept response:', acceptResponse.data);

    // Test rejecting a recommendation
    console.log('\n🔴 Testing REJECT feedback...');
    const rejectResponse = await axios.post(
      'http://localhost:8000/api/recommendations/feedback',
      {
        foodName: 'Idli',
        mealType: 'breakfast',
        action: 'rejected',
        feedback: 'User skipped the suggestion'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Reject response:', rejectResponse.data);

    // Verify recommendations were saved
    console.log('\n📊 Fetching all recommendations...');
    const allRecommendations = await axios.get(
      'http://localhost:8000/api/recommendations',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Total recommendations:', allRecommendations.data.pagination.total);
    console.log('Recommendations:');
    allRecommendations.data.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.title} - Status: ${rec.status} - Accepted: ${rec.userFeedback?.accepted}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testFeedback();
