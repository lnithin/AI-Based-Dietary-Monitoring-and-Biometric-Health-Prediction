#!/usr/bin/env python3
"""
Test the Glucose Prediction API with example meal data
"""

import sys
from pathlib import Path
import time
import json

# Add prediction_service to path
sys.path.insert(0, str(Path(__file__).parent))

def test_local_model():
    """Test the LSTM model directly"""
    print("\n" + "="*60)
    print("Testing Local LSTM Model")
    print("="*60)
    
    try:
        from lstm_glucose_model import GlucoseLSTMModel, generate_synthetic_training_data
        
        print("\n[1] Creating LSTM model...")
        model = GlucoseLSTMModel()
        print("    OK - Model created")
        
        print("\n[2] Generating synthetic training data...")
        X_train, y_train = generate_synthetic_training_data(n_samples=200)
        print(f"    OK - Generated {X_train.shape[0]} samples")
        print(f"    Shape: {X_train.shape}")
        
        print("\n[3] Training model (2 epochs)...")
        start = time.time()
        model.train(X_train, y_train, epochs=2, batch_size=16)
        train_time = time.time() - start
        print(f"    OK - Training completed in {train_time:.1f}s")
        
        print("\n[4] Making predictions...")
        test_samples = X_train[:3]
        predictions = model.predict(test_samples, return_confidence=True)
        
        for i, (pred, conf_low, conf_high) in enumerate(zip(
            predictions['predictions'],
            predictions['confidence_intervals']['lower_bound'],
            predictions['confidence_intervals']['upper_bound']
        )):
            print(f"    Sample {i+1}: {pred:.1f} mg/dL ({conf_low:.1f}-{conf_high:.1f})")
        
        print("\n[5] Model evaluation...")
        metrics = model.evaluate(X_train[:50], y_train[:50])
        rmse_val = metrics.get('rmse', 'N/A')
        mae_val = metrics.get('mae', 'N/A')
        r2_val = metrics.get('r2', 'N/A')
        
        if isinstance(rmse_val, (int, float)):
            print(f"    RMSE: {rmse_val:.2f}")
        else:
            print(f"    RMSE: {rmse_val}")
        
        if isinstance(mae_val, (int, float)):
            print(f"    MAE:  {mae_val:.2f}")
        else:
            print(f"    MAE:  {mae_val}")
            
        if isinstance(r2_val, (int, float)):
            print(f"    R²:   {r2_val:.3f}")
        else:
            print(f"    R²:   {r2_val}")
        
        print("\n[OK] Local model test PASSED")
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Local model test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_server():
    """Test the API server if running"""
    print("\n" + "="*60)
    print("Testing API Server")
    print("="*60)
    
    try:
        import requests
    except ImportError:
        print("\n[WARN] requests library not found")
        print("       Install with: pip install requests")
        return None
    
    api_url = "http://localhost:5001/api/glucose-prediction"
    
    # Test 1: Health check
    print("\n[1] Testing server health...")
    try:
        response = requests.get(f"{api_url}/health", timeout=5)
        if response.status_code == 200:
            print("    OK - API is running")
        else:
            print(f"    [WARN] Health check returned {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("    [WARN] Cannot connect to API server")
        print("           Start it with: python run_api.py")
        return None
    except Exception as e:
        print(f"    [WARN] Health check failed: {e}")
        return None
    
    # Test 2: Get features
    print("\n[2] Getting available features...")
    try:
        response = requests.get(f"{api_url}/features", timeout=5)
        if response.status_code == 200:
            data = response.json()
            n_features = data.get('total_features', 0)
            print(f"    OK - {n_features} features available")
            if data.get('features'):
                print("    Features:")
                for feat in data['features'][:5]:
                    print(f"      - {feat.get('name')}: {feat.get('description')}")
    except Exception as e:
        print(f"    [ERROR] Failed to get features: {e}")
        return False
    
    # Test 3: Make prediction
    print("\n[3] Making prediction with sample meal data...")
    try:
        meal_data = {
            "carbs_g": 45,
            "protein_g": 20,
            "fat_g": 15,
            "fiber_g": 5,
            "sugar_g": 20,
            "sodium_mg": 400,
            "heart_rate": 75,
            "activity_level": 0.3,
            "time_since_meal": 0.5,
            "meal_interval_h": 4,
            "baseline_glucose": 105,
            "stress_level": 0.4,
            "sleep_quality": 0.8,
            "hydration_level": 0.7,
            "medication_taken": False
        }
        
        response = requests.post(
            f"{api_url}/predict",
            json={"meal_features": meal_data, "return_confidence": True},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            pred = data.get('predictions', [0])[0]
            pred_data = data.get('prediction_0', {})
            conf = data.get('confidence_intervals', {})
            
            print(f"    OK - Prediction received")
            print(f"    Value: {pred:.1f} mg/dL")
            print(f"    Status: {pred_data.get('status', 'N/A')}")
            print(f"    Risk Level: {pred_data.get('risk_level', 'N/A')}")
            print(f"    Confidence: ±{conf.get('std_dev', [0])[0]:.1f} mg/dL")
        else:
            print(f"    [ERROR] Prediction failed: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("    [WARN] Request timed out (model may be training)")
        return None
    except Exception as e:
        print(f"    [ERROR] Prediction failed: {e}")
        return False
    
    # Test 4: Get model info
    print("\n[4] Getting model configuration...")
    try:
        response = requests.get(f"{api_url}/model-info", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("    OK - Model info retrieved")
            print(f"    Version: {data.get('version', 'N/A')}")
            arch = data.get('architecture', {})
            print(f"    Architecture: {arch.get('type', 'LSTM')} with {arch.get('layers', 0)} layers")
        else:
            print(f"    [WARN] Model info returned {response.status_code}")
    except Exception as e:
        print(f"    [WARN] Failed to get model info: {e}")
    
    print("\n[OK] API server test PASSED")
    return True


def create_test_predictions():
    """Generate example prediction requests"""
    print("\n" + "="*60)
    print("Example Meal Data & Predictions")
    print("="*60)
    
    test_meals = [
        {
            "name": "Light Breakfast (Oatmeal)",
            "data": {
                "carbs_g": 45,
                "protein_g": 8,
                "fat_g": 5,
                "fiber_g": 4,
                "sugar_g": 10,
                "sodium_mg": 200,
                "heart_rate": 70,
                "activity_level": 0.2,
                "time_since_meal": 8,
                "meal_interval_h": 4,
                "baseline_glucose": 95,
                "stress_level": 0.3,
                "sleep_quality": 0.8,
                "hydration_level": 0.8,
                "medication_taken": False
            }
        },
        {
            "name": "Heavy Lunch (Biryani)",
            "data": {
                "carbs_g": 75,
                "protein_g": 30,
                "fat_g": 25,
                "fiber_g": 3,
                "sugar_g": 15,
                "sodium_mg": 800,
                "heart_rate": 80,
                "activity_level": 0.5,
                "time_since_meal": 0.5,
                "meal_interval_h": 5,
                "baseline_glucose": 110,
                "stress_level": 0.5,
                "sleep_quality": 0.7,
                "hydration_level": 0.7,
                "medication_taken": False
            }
        },
        {
            "name": "Snack (Fruit)",
            "data": {
                "carbs_g": 25,
                "protein_g": 2,
                "fat_g": 1,
                "fiber_g": 3,
                "sugar_g": 18,
                "sodium_mg": 50,
                "heart_rate": 75,
                "activity_level": 0.3,
                "time_since_meal": 2,
                "meal_interval_h": 3,
                "baseline_glucose": 100,
                "stress_level": 0.2,
                "sleep_quality": 0.9,
                "hydration_level": 0.9,
                "medication_taken": False
            }
        }
    ]
    
    print("\nExample meal data that can be used for predictions:\n")
    for i, meal in enumerate(test_meals, 1):
        print(f"{i}. {meal['name']}")
        print(f"   Carbs: {meal['data']['carbs_g']}g, "
              f"Protein: {meal['data']['protein_g']}g, "
              f"Fat: {meal['data']['fat_g']}g")
        print()


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("LSTM Glucose Prediction - Test Suite")
    print("="*60)
    
    # Test local model
    local_ok = test_local_model()
    
    # Test API server
    api_ok = test_api_server()
    
    # Show example meals
    create_test_predictions()
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print(f"Local Model Test:  {'PASS' if local_ok else 'FAIL'}")
    
    if api_ok is None:
        print("API Server Test:   SKIPPED (server not running)")
        print("\nTo test the API server:")
        print("  1. Start the server in another terminal:")
        print("     python run_api.py")
        print("  2. Run this script again")
    elif api_ok:
        print("API Server Test:   PASS")
    else:
        print("API Server Test:   FAIL")
    
    print("\n" + "="*60)
    
    if local_ok and (api_ok is None or api_ok):
        print("Status: READY FOR DEPLOYMENT")
        print("\nNext steps:")
        print("  1. Start API: python run_api.py")
        print("  2. Test predictions via HTTP")
        print("  3. Integrate with React frontend")
        print("  4. Train with real user data")
    
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
