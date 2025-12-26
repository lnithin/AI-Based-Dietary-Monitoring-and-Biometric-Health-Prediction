"""
Test SHAP explainability for LSTM glucose prediction service
"""

import requests
import numpy as np

LSTM_SERVICE_URL = "http://localhost:5001"

def test_shap_explanation():
    """Test SHAP explanation for LSTM prediction"""
    print("\n=== Testing SHAP Explanation for LSTM ===")
    
    # Create sample time series data (24 timesteps, 15 features)
    timesteps = 24
    features = 15
    
    # Generate realistic glucose prediction input
    sequence_data = []
    for t in range(timesteps):
        # Simulate glucose, meal, exercise, etc.
        datapoint = [
            100 + 20 * np.sin(t / 4),  # Glucose level (oscillating)
            50 + 10 * (t % 3),          # Carbs
            20 + 5 * (t % 2),           # Protein
            15 + 5 * (t % 2),           # Fat
            1 if t % 6 == 0 else 0,     # Meal timing
            30 + 10 * np.random.rand(), # Exercise
            0.5 + 0.1 * np.random.rand(), # Insulin dose
            70 + 5 * np.random.rand(),  # Heart rate
            80 + 10 * np.random.rand(), # Stress level
            120 + 5 * np.random.rand(), # Systolic BP
            80 + 3 * np.random.rand(),  # Diastolic BP
            7 + 0.5 * np.random.rand(), # Sleep hours
            98 + 0.5 * np.random.rand(), # Body temp
            150 + 10 * np.random.rand(), # Cholesterol
            50 + 10 * np.random.rand()  # HDL
        ]
        sequence_data.append(datapoint)
    
    feature_names = [
        'Glucose', 'Carbs', 'Protein', 'Fat', 'Meal Timing',
        'Exercise', 'Insulin', 'Heart Rate', 'Stress',
        'Systolic BP', 'Diastolic BP', 'Sleep', 'Body Temp',
        'Cholesterol', 'HDL'
    ]
    
    payload = {
        'sequence_data': sequence_data,
        'feature_names': feature_names
    }
    
    response = requests.post(
        f"{LSTM_SERVICE_URL}/api/glucose-prediction/explain/shap",
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        print("✓ SHAP Explanation successful!")
        print(f"  Method: {result.get('method')}")
        print(f"  Prediction: {result.get('prediction', 0):.2f} mg/dL")
        print(f"  Feature Importance:")
        
        importance = result.get('feature_importance', {})
        sorted_importance = sorted(importance.items(), key=lambda x: abs(x[1]), reverse=True)
        
        for feature, value in sorted_importance[:5]:
            print(f"    {feature}: {value:.4f}")
        
        print(f"  Explanation: {result.get('explanation')}")
        print(f"  Visualization: {'Available' if result.get('visualization') else 'Not available'}")
        
        # Save visualization
        if result.get('visualization'):
            import base64
            img_data = base64.b64decode(result['visualization'])
            with open('lstm_shap_explanation.png', 'wb') as f:
                f.write(img_data)
            print("  Saved visualization to: lstm_shap_explanation.png")
    else:
        print(f"✗ SHAP Explanation failed: {response.status_code}")
        print(f"  Error: {response.text}")


def test_feature_contribution():
    """Test feature contribution analysis"""
    print("\n=== Testing Feature Contribution Analysis ===")
    
    # Create sample data
    timesteps = 24
    sequence_data = []
    for t in range(timesteps):
        datapoint = [
            110 + 15 * np.sin(t / 5),  # Glucose
            60 + 15 * (t % 4),          # Carbs
            25 + 5 * (t % 3),           # Protein
            18 + 4 * (t % 2),           # Fat
            1 if t % 8 == 0 else 0,     # Meal
            40 + 15 * np.random.rand(), # Exercise
            0.6 + 0.2 * np.random.rand(), # Insulin
            72 + 8 * np.random.rand(),  # Heart rate
            75 + 15 * np.random.rand(), # Stress
            125 + 10 * np.random.rand(), # Systolic BP
            82 + 5 * np.random.rand(),  # Diastolic BP
            7.5 + 0.8 * np.random.rand(), # Sleep
            98.2 + 0.6 * np.random.rand(), # Body temp
            160 + 15 * np.random.rand(), # Cholesterol
            55 + 8 * np.random.rand()   # HDL
        ]
        sequence_data.append(datapoint)
    
    feature_names = [
        'Glucose', 'Carbs', 'Protein', 'Fat', 'Meal Timing',
        'Exercise', 'Insulin', 'Heart Rate', 'Stress',
        'Systolic BP', 'Diastolic BP', 'Sleep', 'Body Temp',
        'Cholesterol', 'HDL'
    ]
    
    payload = {
        'sequence_data': sequence_data,
        'feature_names': feature_names
    }
    
    response = requests.post(
        f"{LSTM_SERVICE_URL}/api/glucose-prediction/explain/contribution",
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        print("✓ Feature Contribution Analysis successful!")
        print(f"  Method: {result.get('method')}")
        print(f"  Prediction: {result.get('prediction', 0):.2f} mg/dL")
        print(f"  Feature Contributions:")
        
        contributions = result.get('contributions', {})
        sorted_contrib = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)
        
        for feature, value in sorted_contrib:
            direction = "↑" if value > 0 else "↓"
            print(f"    {feature}: {direction} {abs(value):.4f}")
        
        print(f"  Explanation: {result.get('explanation')}")
        print(f"  Visualization: {'Available' if result.get('visualization') else 'Not available'}")
        
        # Save visualization
        if result.get('visualization'):
            import base64
            img_data = base64.b64decode(result['visualization'])
            with open('lstm_contribution_analysis.png', 'wb') as f:
                f.write(img_data)
            print("  Saved visualization to: lstm_contribution_analysis.png")
    else:
        print(f"✗ Feature Contribution failed: {response.status_code}")
        print(f"  Error: {response.text}")


if __name__ == "__main__":
    print("=" * 70)
    print("  SHAP Explainability Tests for LSTM Service")
    print("=" * 70)
    
    # Test LSTM service health first
    try:
        response = requests.get(f"{LSTM_SERVICE_URL}/health")
        if response.status_code == 200:
            print("✓ LSTM Service is running")
        else:
            print("✗ LSTM Service not responding properly")
            exit(1)
    except:
        print("✗ Cannot connect to LSTM Service. Make sure it's running on port 5001")
        exit(1)
    
    # Run tests
    test_shap_explanation()
    test_feature_contribution()
    
    print("\n" + "=" * 70)
    print("  All tests completed!")
    print("=" * 70)
