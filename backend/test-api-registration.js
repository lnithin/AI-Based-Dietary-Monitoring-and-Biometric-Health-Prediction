const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🧪 Testing Registration API...\n');
    
    const payload = {
      email: 'newuser@example.com',
      password: 'Test123!',
      firstName: 'New',
      lastName: 'User',
      age: 30,
      gender: 'female',
      height_cm: 165,
      weight_kg: 60
    };

    console.log('📤 Sending request to http://localhost:8000/api/auth/register');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await fetch('http://localhost:8000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log('📥 Response Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Registration successful!');
      console.log('User:', data.user);
      console.log('Token:', data.token ? 'Generated ✓' : 'Missing ✗');
      console.log('BMI:', data.user.currentBMI);
      console.log('BMI Category:', data.user.bmiCategory);
    } else {
      console.log('\n❌ Registration failed:', data.error);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testAPI();
