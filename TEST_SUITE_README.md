# End-to-End Test Suite Documentation

## Overview

This automated test suite provides comprehensive validation of the entire AI-based dietary monitoring system. It validates backend health, ML model accuracy, explainability consistency, physiological safety, and database integrity in a single automated run.

## Quick Start

### Prerequisites

```bash
# Python 3.8+ required
python --version

# Install dependencies
pip install requests pymongo
```

### Running the Tests

**Option 1: Default configuration**
```bash
python test_system_e2e.py
```

**Option 2: Custom configuration** (edit script Config class first)
```bash
python test_system_e2e.py
```

### Expected Output

```
================================================================================
=================== AI-BASED DIETARY MONITORING SYSTEM ========================
==================== END-TO-END VALIDATION TEST SUITE =========================
================================================================================

Test started at: 2025-12-31 10:30:45
Backend URL: http://localhost:8000
LSTM Service URL: http://localhost:5001
CV Service URL: http://localhost:5002

--------------------------------------------------------------------------------

[1/9] Testing backend health...
✓ Backend Health & Availability
  → Backend is healthy and reachable
    • Server reachable: True
    • Response has status: True
    • Status is healthy: True

[2/9] Testing LSTM service health...
✓ LSTM Service Health & Model Availability
  → LSTM model is loaded and trained
    • LSTM service reachable: True
    • Model loaded: True
    • Model trained: True

[3/9] Validating API contract...
✓ API Contract Validation
  → All 15 expected features present
    • Total features: 15
    • Expected features present: True
    • Missing features: None

[4/9] Running golden case prediction...
✓ Golden Case Glucose Prediction
  → Golden case prediction physiologically valid
    • Predicted glucose: 152.3 mg/dL
    • Delta: 54.3 mg/dL
    • Risk level: Elevated
    • Confidence: 0.87
    • Within expected range: True
    • Delta within range: True
    • Final = baseline + delta: True
    • Confidence adequate: True

[5/9] Validating physiological safety...
✓ Physiological Safety Validation
  → All physiological safety checks passed
    • Test cases evaluated: 3
    • Violations detected: 0
    • Violations: None

[6/9] Testing SHAP explainability consistency...
✓ SHAP Explainability Consistency
  → SHAP explanations are consistent
    • SHAP predicted glucose: 152.1 mg/dL
    • API predicted glucose: 152.3 mg/dL
    • Difference: 0.2 mg/dL
    • Predictions match: True
    • SHAP contributions sum: 53.8 mg/dL
    • Expected delta: 54.3 mg/dL
    • Sum matches delta: True
    • Top contributor: net_carbs
    • Carbs in top features: True

[7/9] Testing computer vision pipeline...
✓ Computer Vision Pipeline
  → CV pipeline working correctly
    • Recognized food: Vada
    • Confidence: 99.5%
    • Confidence is realistic: True
    • Nutrition data present: True
    • Expected food match: True

[8/9] Validating database integrity...
✓ Database Integrity & Record Linkage
  → Database structure intact
    • Database reachable: True
    • Required collections present: True
    • Missing collections: None
    • Recent meal records: 5
    • Collections found: 12

[9/9] Validating UI-compatible response structure...
✓ UI-Compatible Response Structure
  → All required UI fields present
    • Required fields: 4
    • Present fields: 4
    • Missing fields: None

================================================================================
=============================== FINAL TEST REPORT ==============================
================================================================================

📊 TEST SUMMARY
   Total Tests: 9
   ✓ Passed: 9
   ✗ Failed: 0
   ⊘ Skipped: 0
   🚨 Critical Failures: 0
   Pass Rate: 100.0%
   Duration: 8.45s

🏥 MEDICAL SAFETY VERDICT: SAFE
   No critical physiological violations detected

🔍 EXPLAINABILITY VERDICT: CONSISTENT
   SHAP explanations align with predictions

🎯 SYSTEM VERDICT: READY FOR DEMO
   Ready for Academic Demo: YES ✓
   Ready for Production: YES ✓

================================================================================

💾 Report saved to: test_report.json
```

## Test Coverage

### 1. Backend Health & Availability
- Validates backend server is running
- Checks health endpoint responds with 200 status
- Verifies system is in healthy state

**Critical**: YES - Cannot proceed if backend is down

### 2. LSTM Service Health & Model Availability
- Validates LSTM service is running
- Checks model is loaded into memory
- Verifies model is trained and ready

**Critical**: YES - Cannot make predictions without model

### 3. API Contract Validation
- Retrieves list of required input features
- Validates all expected features are present
- Checks for missing or extra fields
- Ensures frontend-backend compatibility

**Critical**: YES - Mismatched contracts cause runtime errors

### 4. Golden Case Glucose Prediction
- Sends known-safe input (baseline=98, carbs=35g, activity=0.4)
- Validates prediction in range (145-165 mg/dL)
- Checks delta is physiologically plausible (40-70 mg/dL)
- Verifies final = baseline + delta
- Confirms confidence ≥ 0.65
- Validates risk level classification

**Critical**: YES - Core functionality validation

### 5. Physiological Safety Validation
- Tests edge cases (low carbs, high carbs, high baseline)
- Ensures no negative deltas (glucose can't decrease from meal)
- Validates glucose stays within human limits (40-450 mg/dL)
- Checks critical risk only triggered appropriately

**Critical**: YES - Safety violations could harm users

### 6. SHAP Explainability Consistency
- Calls SHAP explanation endpoint
- Validates SHAP prediction matches API prediction (±2 mg/dL)
- Checks SHAP contributions sum ≈ delta (±5 mg/dL)
- Verifies carbohydrates are top contributor for high-carb meals

**Critical**: YES - Explainability is a core research claim

### 7. Computer Vision Pipeline
- Uploads test food image (e.g., Vada)
- Validates food is correctly recognized
- Checks confidence is realistic (not always 100%)
- Verifies nutrition data is populated

**Critical**: NO - Optional feature, can skip if image unavailable

### 8. Database Integrity & Record Linkage
- Connects to MongoDB
- Validates required collections exist
- Checks for recent test data
- Verifies record linkage (userId consistency)

**Critical**: NO - Can function without DB in demo mode

### 9. UI-Compatible Response Structure
- Validates response contains all fields frontend expects
- Checks nested structure (prediction.value, risk_classification.level, etc.)
- Ensures frontend won't crash due to missing data

**Critical**: NO - But important for user experience

## Configuration

Edit the `Config` class in `test_system_e2e.py`:

```python
class Config:
    # Service endpoints
    BACKEND_URL = "http://localhost:8000"
    CV_SERVICE_URL = "http://localhost:5002"
    LSTM_SERVICE_URL = "http://localhost:5001"
    
    # MongoDB connection
    MONGODB_URI = "mongodb://localhost:27017"
    DATABASE_NAME = "dietary_monitoring"
    
    # Test image path (for CV testing)
    TEST_IMAGE_PATH = "data/Vada/vada_test.jpg"
    EXPECTED_FOOD = "Vada"
    
    # Validation thresholds
    GLUCOSE_MIN = 40
    GLUCOSE_MAX = 450
    MIN_CONFIDENCE = 0.65
    SHAP_TOLERANCE_MG_DL = 2.0
```

## Output Files

### 1. Console Output
Real-time colored test results with symbols:
- ✓ = Pass (green)
- ✗ = Fail (red)
- ⊘ = Skip (yellow)

### 2. test_report.json
Structured JSON report containing:
```json
{
  "report_metadata": {
    "generated_at": "2025-12-31T10:30:53",
    "test_duration": "8.45s",
    "script_version": "1.0.0"
  },
  "test_summary": {
    "total_tests": 9,
    "passed": 9,
    "failed": 0,
    "skipped": 0,
    "critical_failures": 0,
    "pass_rate": "100.0%"
  },
  "test_results": [
    {
      "name": "Backend Health & Availability",
      "status": "PASS",
      "message": "Backend is healthy and reachable",
      "details": {...},
      "critical": false,
      "timestamp": "2025-12-31T10:30:45"
    },
    ...
  ],
  "medical_safety_verdict": {
    "status": "SAFE",
    "explanation": "No critical physiological violations detected"
  },
  "explainability_verdict": {
    "status": "CONSISTENT",
    "explanation": "SHAP explanations align with predictions"
  },
  "system_verdict": {
    "status": "READY FOR DEMO",
    "ready_for_academic_demo": true,
    "ready_for_production": true
  }
}
```

## Interpreting Results

### System Verdict Categories

**READY FOR DEMO** ✅
- All tests passed
- No critical failures
- Safe for academic presentation
- Can be demoed to evaluators

**NEEDS MINOR FIXES** ⚠️
- 1-2 non-critical test failures
- Core functionality works
- Safe to use but has rough edges
- Should fix before final submission

**NEEDS MAJOR FIXES** ❌
- Multiple test failures
- Core functionality broken
- Not ready for evaluation
- Requires significant work

**UNSAFE FOR USE** 🚨
- Critical medical safety violations
- Could produce dangerous predictions
- Must not be deployed
- Requires immediate investigation

### Medical Safety Verdict

**SAFE** ✅
- All physiological validations passed
- No negative deltas
- Glucose predictions within human limits
- Risk classifications appropriate

**UNSAFE** 🚨
- One or more critical violations detected
- System may predict impossible values
- Could mislead users about glucose levels
- Must be fixed before any deployment

### Explainability Verdict

**CONSISTENT** ✅
- SHAP predictions match API predictions
- Feature contributions sum correctly
- Top contributors make physiological sense
- Explanations can be trusted

**INCONSISTENT** ❌
- SHAP and API disagree
- Contributions don't sum to delta
- Explanations unreliable
- Research claims cannot be validated

**NOT_TESTED** ⊘
- Explainability tests skipped
- Usually due to service unavailability
- Cannot verify explainability claims

## Troubleshooting

### "Cannot connect to backend - service may be down"
```bash
# Start backend service
cd backend
npm start
# OR
python src/server.js
```

### "Cannot connect to LSTM service - may be down"
```bash
# Start LSTM service
cd ml-services/prediction_service
python app.py
```

### "Test image not found"
```bash
# Either:
# 1. Update TEST_IMAGE_PATH in Config
# 2. Or place test image at: data/Vada/vada_test.jpg
# 3. Or skip CV test (it's non-critical)
```

### "pymongo not installed"
```bash
pip install pymongo
# OR set MONGODB_AVAILABLE = False in script
```

### "Prediction outside expected range"
This may indicate:
1. Model needs retraining
2. Input features changed
3. Expected ranges need adjustment
4. Model is producing incorrect predictions

Check logs and adjust either the model or the test expectations.

## Integration with CI/CD

Add to GitHub Actions or GitLab CI:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          pip install requests pymongo
      - name: Start services
        run: |
          docker-compose up -d
          sleep 10
      - name: Run tests
        run: python test_system_e2e.py
      - name: Upload test report
        uses: actions/upload-artifact@v2
        with:
          name: test-report
          path: test_report.json
```

## Academic Use

This test suite is designed for:

### 1. Project Viva / Defense
- Run live during presentation
- Show real-time validation
- Demonstrate system reliability
- Prove no hardcoded results

### 2. Examiner Review
- Provide test_report.json as evidence
- Show systematic validation approach
- Demonstrate engineering rigor
- Prove claims about accuracy/explainability

### 3. Paper/Documentation
Include results in:
- Validation section
- Results chapter
- Appendix with full report
- Supplementary materials

### 4. Reproducibility
- Allows others to validate your work
- Shows transparency
- Demonstrates scientific method
- Enables independent verification

## Best Practices

1. **Run tests before every demo**
   ```bash
   python test_system_e2e.py
   ```

2. **Keep test_report.json in version control**
   - Shows system evolution
   - Tracks improvements over time
   - Provides audit trail

3. **Update golden case as model improves**
   - Adjust expected ranges if model is retrained
   - Document why ranges changed

4. **Add more test cases for edge cases**
   - Extreme carbohydrate values
   - Very high/low baselines
   - Multiple meals per day

5. **Run tests after any model changes**
   - Retraining
   - Hyperparameter tuning
   - Feature engineering
   - Architecture changes

## Exit Codes

- `0` = All tests passed or minor issues only
- `1` = Critical failures or unsafe system
- `130` = Tests interrupted by user (Ctrl+C)

## Support

For issues or questions:
1. Check [SYSTEM_STATUS.md](SYSTEM_STATUS.md) for known issues
2. Review console output for specific error messages
3. Examine test_report.json for detailed failure information
4. Check service logs (backend, LSTM, CV)

## License

Part of the AI-Based Dietary Monitoring System project.
Developed for academic purposes.
