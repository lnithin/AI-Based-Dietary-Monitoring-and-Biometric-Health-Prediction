"""
Test CV Service Recognition
Tests if the CV service is working correctly with different food images
"""

import requests
import os
import glob

CV_SERVICE_URL = "http://localhost:5002/recognize"
DATA_DIR = "../../data"

def test_food_recognition():
    """Test CV service with sample images from each food class"""
    
    print("=" * 60)
    print("  TESTING CV SERVICE RECOGNITION")
    print("=" * 60)
    
    # Test one image from each food class
    food_classes = [
        'Appam', 'Biryani', 'Chapati', 'Dosa', 'Idli',
        'Pongal', 'Poori', 'Porotta', 'Vada', 'White Rice'
    ]
    
    results = []
    
    for food_class in food_classes:
        food_dir = os.path.join(DATA_DIR, food_class)
        
        if not os.path.exists(food_dir):
            print(f"\n❌ Directory not found: {food_dir}")
            continue
        
        # Get first image from this class
        images = glob.glob(os.path.join(food_dir, "*.jpg")) + \
                 glob.glob(os.path.join(food_dir, "*.jpeg")) + \
                 glob.glob(os.path.join(food_dir, "*.png"))
        
        if not images:
            print(f"\n❌ No images found in {food_dir}")
            continue
        
        test_image = images[0]
        image_name = os.path.basename(test_image)
        
        print(f"\n📸 Testing: {food_class}/{image_name}")
        
        try:
            with open(test_image, 'rb') as f:
                files = {'image': f}
                response = requests.post(CV_SERVICE_URL, files=files, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    recognized = data.get('food_name', 'Unknown')
                    confidence = data.get('confidence', 0)
                    
                    correct = recognized == food_class
                    symbol = "✅" if correct else "❌"
                    
                    print(f"   Expected: {food_class}")
                    print(f"   Got: {recognized} ({confidence:.2%})")
                    print(f"   {symbol} {'CORRECT' if correct else 'WRONG'}")
                    
                    results.append({
                        'expected': food_class,
                        'recognized': recognized,
                        'confidence': confidence,
                        'correct': correct
                    })
                    
                    # Show top 3 predictions
                    top_preds = data.get('top_predictions', [])
                    if top_preds:
                        print(f"   Top 3:")
                        for i, pred in enumerate(top_preds[:3], 1):
                            print(f"      {i}. {pred['class']}: {pred['confidence']:.2%}")
                else:
                    print(f"   ❌ Error: HTTP {response.status_code}")
                    print(f"   {response.text}")
        
        except requests.exceptions.ConnectionError:
            print("   ❌ ERROR: Cannot connect to CV service!")
            print("   Make sure CV service is running on http://localhost:5002")
            return
        
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    
    if results:
        correct_count = sum(1 for r in results if r['correct'])
        total_count = len(results)
        accuracy = (correct_count / total_count) * 100 if total_count > 0 else 0
        
        print(f"\nAccuracy: {correct_count}/{total_count} ({accuracy:.1f}%)")
        
        if accuracy < 50:
            print("\n⚠️  WARNING: Accuracy is very low!")
            print("   This suggests the CV service may not be using the trained model.")
            print("   Try restarting the CV service:")
            print("   cd ml-services/cv_service")
            print("   python app.py")
        elif accuracy < 80:
            print("\n⚠️  Accuracy is moderate. Model may need more training.")
        else:
            print("\n✅ Good accuracy! CV service is working correctly.")
        
        # Show confusion
        print("\nRecognition Results:")
        for r in results:
            status = "✅" if r['correct'] else "❌"
            print(f"  {status} {r['expected']:12} -> {r['recognized']:12} ({r['confidence']:.2%})")
    else:
        print("❌ No tests run. Check data directory.")

if __name__ == "__main__":
    test_food_recognition()
