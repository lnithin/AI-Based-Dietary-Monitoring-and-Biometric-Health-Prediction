"""
Test SHAP and LIME explainability for CV service
"""

import requests
import os

CV_SERVICE_URL = "http://localhost:5002"

def test_lime_explanation():
    """Test LIME explanation endpoint"""
    print("\n=== Testing LIME Explanation ===")
    
    # Use a test image
    test_image_path = "../../data/Dosa/dosa_1.jpg"
    
    if not os.path.exists(test_image_path):
        print(f"Test image not found: {test_image_path}")
        print("Using first available image...")
        # Find any image
        for root, dirs, files in os.walk("../../data"):
            for file in files:
                if file.endswith(('.jpg', '.jpeg', '.png')):
                    test_image_path = os.path.join(root, file)
                    break
            if os.path.exists(test_image_path):
                break
    
    print(f"Testing with image: {test_image_path}")
    
    with open(test_image_path, 'rb') as f:
        files = {'image': f}
        response = requests.post(f"{CV_SERVICE_URL}/explain/lime", files=files)
    
    if response.status_code == 200:
        result = response.json()
        print("✓ LIME Explanation successful!")
        print(f"  Method: {result.get('method')}")
        print(f"  Top Prediction: {result.get('top_prediction')}")
        print(f"  Confidence: {result.get('confidence', 0)*100:.2f}%")
        print(f"  Predictions: {result.get('predictions')}")
        print(f"  Explanation: {result.get('explanation')}")
        print(f"  Visualization: {'Available' if result.get('visualization') else 'Not available'}")
        
        # Save visualization
        if result.get('visualization'):
            import base64
            img_data = base64.b64decode(result['visualization'])
            with open('lime_explanation.png', 'wb') as f:
                f.write(img_data)
            print("  Saved visualization to: lime_explanation.png")
    else:
        print(f"✗ LIME Explanation failed: {response.status_code}")
        print(f"  Error: {response.text}")


def test_shap_explanation():
    """Test SHAP explanation endpoint"""
    print("\n=== Testing SHAP Explanation ===")
    
    test_image_path = "../../data/Idli/idli_1.jpg"
    
    if not os.path.exists(test_image_path):
        print(f"Test image not found: {test_image_path}")
        # Find any image
        for root, dirs, files in os.walk("../../data"):
            for file in files:
                if file.endswith(('.jpg', '.jpeg', '.png')):
                    test_image_path = os.path.join(root, file)
                    break
            if os.path.exists(test_image_path):
                break
    
    print(f"Testing with image: {test_image_path}")
    
    with open(test_image_path, 'rb') as f:
        files = {'image': f}
        response = requests.post(f"{CV_SERVICE_URL}/explain/shap", files=files)
    
    if response.status_code == 200:
        result = response.json()
        print("✓ SHAP Explanation successful!")
        print(f"  Method: {result.get('method')}")
        print(f"  Top Prediction: {result.get('top_prediction')}")
        print(f"  Confidence: {result.get('confidence', 0)*100:.2f}%")
        print(f"  Predictions: {result.get('predictions')}")
        print(f"  Explanation: {result.get('explanation')}")
        print(f"  Visualization: {'Available' if result.get('visualization') else 'Not available'}")
        
        # Save visualization
        if result.get('visualization'):
            import base64
            img_data = base64.b64decode(result['visualization'])
            with open('shap_explanation.png', 'wb') as f:
                f.write(img_data)
            print("  Saved visualization to: shap_explanation.png")
    else:
        print(f"✗ SHAP Explanation failed: {response.status_code}")
        print(f"  Error: {response.text}")


def test_both_explanations():
    """Test combined LIME and SHAP explanation"""
    print("\n=== Testing Combined LIME + SHAP Explanation ===")
    
    test_image_path = "../../data/Biryani/biryani_1.jpg"
    
    if not os.path.exists(test_image_path):
        for root, dirs, files in os.walk("../../data"):
            for file in files:
                if file.endswith(('.jpg', '.jpeg', '.png')):
                    test_image_path = os.path.join(root, file)
                    break
            if os.path.exists(test_image_path):
                break
    
    print(f"Testing with image: {test_image_path}")
    
    with open(test_image_path, 'rb') as f:
        files = {'image': f}
        response = requests.post(f"{CV_SERVICE_URL}/explain/both", files=files)
    
    if response.status_code == 200:
        result = response.json()
        print("✓ Combined Explanation successful!")
        print(f"\nSummary:")
        print(f"  Prediction: {result['summary']['prediction']}")
        print(f"  Confidence: {result['summary']['confidence']*100:.2f}%")
        print(f"  Methods Used: {result['summary']['methods_used']}")
        print(f"  Interpretation: {result['summary']['interpretation']}")
        
        print(f"\nLIME Results:")
        print(f"  Top Prediction: {result['lime']['top_prediction']}")
        print(f"  Predictions: {result['lime']['predictions']}")
        
        print(f"\nSHAP Results:")
        print(f"  Top Prediction: {result['shap']['top_prediction']}")
        print(f"  Predictions: {result['shap']['predictions']}")
        
        # Save visualizations
        if result['lime'].get('visualization'):
            import base64
            img_data = base64.b64decode(result['lime']['visualization'])
            with open('combined_lime.png', 'wb') as f:
                f.write(img_data)
            print("\n  Saved LIME visualization to: combined_lime.png")
        
        if result['shap'].get('visualization'):
            img_data = base64.b64decode(result['shap']['visualization'])
            with open('combined_shap.png', 'wb') as f:
                f.write(img_data)
            print("  Saved SHAP visualization to: combined_shap.png")
    else:
        print(f"✗ Combined Explanation failed: {response.status_code}")
        print(f"  Error: {response.text}")


if __name__ == "__main__":
    print("=" * 60)
    print("  SHAP/LIME Explainability Tests for CV Service")
    print("=" * 60)
    
    # Test CV service health first
    try:
        response = requests.get(f"{CV_SERVICE_URL}/health")
        if response.status_code == 200:
            print("✓ CV Service is running")
        else:
            print("✗ CV Service not responding properly")
            exit(1)
    except:
        print("✗ Cannot connect to CV Service. Make sure it's running on port 5002")
        exit(1)
    
    # Run tests
    test_lime_explanation()
    test_shap_explanation()
    test_both_explanations()
    
    print("\n" + "=" * 60)
    print("  All tests completed!")
    print("=" * 60)
