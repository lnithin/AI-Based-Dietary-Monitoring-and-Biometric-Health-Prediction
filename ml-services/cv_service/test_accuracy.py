"""
Test Food Recognition Accuracy
Tests both image and text-based recognition
"""

import requests
import os
import glob

# Configuration
BACKEND_URL = "http://localhost:8000"
CV_SERVICE_URL = "http://localhost:5002"

def test_cv_service_health():
    """Test if CV service is running"""
    try:
        response = requests.get(f"{CV_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ CV Service is running")
            print(f"   Model loaded: {data.get('model_loaded', False)}")
            print(f"   Supported foods: {', '.join(data.get('supported_foods', []))}")
            return True
        else:
            print("⚠️  CV Service responded but returned error")
            return False
    except requests.exceptions.RequestException as e:
        print("❌ CV Service not available")
        print(f"   Error: {e}")
        return False

def test_image_recognition(image_path):
    """Test image recognition with CV service"""
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        return None
    
    print(f"\nTesting: {os.path.basename(image_path)}")
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post(f"{CV_SERVICE_URL}/recognize", files=files, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"   ✅ Recognized: {data['food_name']}")
                print(f"   Confidence: {data['confidence']*100:.1f}%")
                print(f"   Top 3 predictions:")
                for pred in data.get('all_predictions', [])[:3]:
                    print(f"      - {pred['food_name']}: {pred['confidence']*100:.1f}%")
                return data
            else:
                print(f"   ❌ Recognition failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ Request failed with status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return None

def test_text_matching(description):
    """Test text-based food matching"""
    print(f"\nTesting text: '{description}'")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/meals/extract",
            json={"description": description},
            headers={"Authorization": "Bearer test-token"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                food = data.get('foodMatched', {})
                print(f"   ✅ Matched: {food.get('foodName', 'Unknown')}")
                print(f"   Confidence: {data.get('confidence', 0)*100:.0f}%")
                nutrition = data.get('totalNutrition', {})
                print(f"   Calories: {nutrition.get('calories', 0):.0f} kcal")
                return data
            else:
                print(f"   ❌ No match found")
        else:
            print(f"   ⚠️  Request returned status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return None

def run_comprehensive_tests():
    """Run all tests"""
    print("="*60)
    print("  FOOD RECOGNITION ACCURACY TEST")
    print("="*60)
    
    # Test 1: CV Service Health
    print("\n📊 TEST 1: CV Service Health Check")
    print("-"*60)
    cv_available = test_cv_service_health()
    
    if cv_available:
        # Test 2: Image Recognition
        print("\n📊 TEST 2: Image Recognition")
        print("-"*60)
        
        # Find sample images
        data_dir = "../../data"
        if os.path.exists(data_dir):
            test_images = []
            for food_folder in ['Dosa', 'Idli', 'Vada', 'Biryani', 'Chapati']:
                folder_path = os.path.join(data_dir, food_folder)
                if os.path.exists(folder_path):
                    images = glob.glob(os.path.join(folder_path, "*.*"))
                    if images:
                        test_images.append(images[0])  # Take first image
            
            if test_images:
                success_count = 0
                for img_path in test_images[:5]:  # Test up to 5 images
                    result = test_image_recognition(img_path)
                    if result:
                        success_count += 1
                
                print(f"\n   Success rate: {success_count}/{len(test_images[:5])} ({success_count*100//len(test_images[:5])}%)")
            else:
                print("   ⚠️  No test images found")
        else:
            print("   ⚠️  Data directory not found")
    
    # Test 3: Text Matching
    print("\n📊 TEST 3: Text-Based Recognition")
    print("-"*60)
    
    test_descriptions = [
        "I ate dosa for breakfast",
        "Had 2 idlis with sambar",
        "Lunch was veg biryani",
        "Evening snack - medu vada",
        "Dinner: 3 chapatis with dal",
        "pongal",
        "white rice and curry",
        "poori and potato curry"
    ]
    
    success_count = 0
    for desc in test_descriptions:
        result = test_text_matching(desc)
        if result and result.get('success'):
            success_count += 1
    
    print(f"\n   Success rate: {success_count}/{len(test_descriptions)} ({success_count*100//len(test_descriptions)}%)")
    
    # Summary
    print("\n" + "="*60)
    print("  TEST SUMMARY")
    print("="*60)
    print(f"✅ CV Service: {'Available' if cv_available else 'Not Available'}")
    print(f"✅ Text Recognition: {success_count}/{len(test_descriptions)} successful")
    print("\nFor best results:")
    print("1. Start CV service: python app.py")
    print("2. Train model: python train_model.py (optional)")
    print("3. Use clear, well-named images")
    print("="*60 + "\n")

if __name__ == '__main__':
    run_comprehensive_tests()
