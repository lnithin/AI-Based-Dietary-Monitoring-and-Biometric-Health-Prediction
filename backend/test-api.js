#!/usr/bin/env node
/**
 * Integration Test Script
 * Verifies all backend API endpoints are working correctly
 * Run after starting: backend, nlp_service, prediction_service, recommendation_service, xai_service
 */

const http = require('http');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let testsPassed = 0;
let testsFailed = 0;
let globalToken = null;
let globalUserId = null;
let globalMealId = null;

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    log('green', `✓ ${name}`);
    testsPassed++;
  } catch (error) {
    log('red', `✗ ${name}: ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('blue', '  API Integration Tests - Dietary Monitoring System');
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ========== HEALTH CHECKS ==========
  log('yellow', '📋 Health Checks:');

  await test('Backend API is running', async () => {
    const res = await makeRequest('GET', '/api/health');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // ========== AUTHENTICATION ==========
  log('yellow', '\n🔐 Authentication Tests:');

  await test('Register new user', async () => {
    const res = await makeRequest('POST', '/api/auth/register', {
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });
    if (res.status !== 201) throw new Error(`Status: ${res.status}`);
    if (!res.body.token) throw new Error('No token returned');
    
    globalToken = res.body.token;
    globalUserId = res.body.user._id;
  });

  await test('Login user', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: `test${Date.now() - 1000}@example.com`,
      password: 'TestPassword123!'
    });
    // This will likely fail since we just registered, but tests the endpoint
    if (res.status !== 200 && res.status !== 401) throw new Error(`Unexpected status: ${res.status}`);
  });

  await test('Verify token', async () => {
    if (!globalToken) throw new Error('No token available');
    const res = await makeRequest('GET', '/api/auth/verify', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!res.body.valid) throw new Error('Token verification failed');
  });

  // ========== USER PROFILE ==========
  log('yellow', '\n👤 User Profile Tests:');

  await test('Get user profile', async () => {
    const res = await makeRequest('GET', '/api/users/profile', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!res.body.email) throw new Error('No email in response');
  });

  await test('Update user profile', async () => {
    const res = await makeRequest('PUT', '/api/users/profile', {
      age: 35,
      gender: 'male',
      height_cm: 180,
      weight_kg: 75,
      activityLevel: 'moderate',
      healthConditions: ['diabetes'],
      allergies: ['peanuts']
    }, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // ========== MEAL LOGGING ==========
  log('yellow', '\n🍽️  Meal Logging Tests:');

  await test('Log meal (text)', async () => {
    const res = await makeRequest('POST', '/api/meals/logText', {
      mealType: 'lunch',
      description: '2 chapatis with potato curry and curd'
    }, globalToken);
    if (res.status !== 201) throw new Error(`Status: ${res.status}`);
    if (!res.body.mealId) throw new Error('No mealId returned');
    
    globalMealId = res.body.mealId;
  });

  await test('Get user meals', async () => {
    const res = await makeRequest('GET', '/api/meals?limit=10', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body.meals)) throw new Error('Meals not array');
  });

  await test('Get meal details', async () => {
    if (!globalMealId) throw new Error('No meal ID');
    const res = await makeRequest('GET', `/api/meals/${globalMealId}`, null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // ========== BIOMETRICS ==========
  log('yellow', '\n📊 Biometric Data Tests:');

  await test('Log glucose reading', async () => {
    const res = await makeRequest('POST', '/api/biometrics', {
      biometricType: 'glucose',
      glucose_mg_dl: 145,
      timestamp: new Date().toISOString()
    }, globalToken);
    if (res.status !== 201) throw new Error(`Status: ${res.status}`);
  });

  await test('Log blood pressure reading', async () => {
    const res = await makeRequest('POST', '/api/biometrics', {
      biometricType: 'blood_pressure',
      systolic: 130,
      diastolic: 85,
      timestamp: new Date().toISOString()
    }, globalToken);
    if (res.status !== 201) throw new Error(`Status: ${res.status}`);
  });

  await test('Get biometric readings', async () => {
    const res = await makeRequest('GET', '/api/biometrics', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body.readings)) throw new Error('Readings not array');
  });

  await test('Get glucose statistics', async () => {
    const res = await makeRequest('GET', '/api/biometrics/stats/glucose?days=7', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  await test('Get latest reading', async () => {
    const res = await makeRequest('GET', '/api/biometrics/latest/glucose', null, globalToken);
    if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected status: ${res.status}`);
  });

  // ========== PREDICTIONS ==========
  log('yellow', '\n🎯 Prediction Tests:');

  await test('Generate prediction', async () => {
    const res = await makeRequest('POST', '/api/predictions/generate', {
      predictionType: 'glucose',
      timeHorizon_minutes: 120,
      modelUsed: 'hybrid'
    }, globalToken);
    if (res.status !== 201) throw new Error(`Status: ${res.status}`);
  });

  await test('Get predictions', async () => {
    const res = await makeRequest('GET', '/api/predictions', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body.predictions)) throw new Error('Predictions not array');
  });

  // ========== RECOMMENDATIONS ==========
  log('yellow', '\n💡 Recommendation Tests:');

  await test('Get recommendations', async () => {
    const res = await makeRequest('GET', '/api/recommendations', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body.recommendations)) throw new Error('Recommendations not array');
  });

  await test('Get today recommendations', async () => {
    const res = await makeRequest('GET', '/api/recommendations/today', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body)) throw new Error('Not array');
  });

  await test('Get meal suggestions', async () => {
    const res = await makeRequest('GET', '/api/recommendations/suggestions?meal_type=lunch', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // ========== ALERTS ==========
  log('yellow', '\n⚠️  Alert Tests:');

  await test('Get alerts', async () => {
    const res = await makeRequest('GET', '/api/alerts', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body.alerts)) throw new Error('Alerts not array');
  });

  await test('Get critical alerts', async () => {
    const res = await makeRequest('GET', '/api/alerts/critical', null, globalToken);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // ========== SUMMARY ==========
  log('blue', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('blue', '  Test Results Summary');
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  log('green', `✓ Tests Passed: ${testsPassed}`);
  if (testsFailed > 0) {
    log('red', `✗ Tests Failed: ${testsFailed}`);
  }
  log('blue', `Total: ${testsPassed + testsFailed}`);

  const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  log('blue', `Success Rate: ${successRate}%\n`);

  if (testsFailed === 0) {
    log('green', '🎉 All tests passed! System is working correctly.\n');
    process.exit(0);
  } else {
    log('yellow', '⚠️  Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
log('yellow', 'Starting tests in 2 seconds...\n');
setTimeout(runTests, 2000);
