"""
Test Backend Food Recognition API
Tests the full flow: Frontend -> Backend -> CV Service
"""

import requests
import base64
import os

BACKEND_URL = "http://localhost:8000/api/food-recognition/recognize"
TEST_IMAGE = "../../data/Dosa/Dosa_1.jpg"

# You'll need a valid token - get it from browser localStorage after login
# For now, let's test without auth to see the error
TOKEN = "your_token_here"  # Replace with actual token

def test_backend_recognition():
    """Test backend recognition endpoint"""
    
    print("=" * 60)
    print("  TESTING BACKEND FOOD RECOGNITION API")
    print("=" * 60)
    
    if not os.path.exists(TEST_IMAGE):
        print(f"\n❌ Test image not found: {TEST_IMAGE}")
        return
    
    # Read and encode image
    with open(TEST_IMAGE, 'rb') as f:
        image_data = f.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        base64_with_prefix = f"data:image/jpeg;base64,{base64_image}"
    
    print(f"\n📸 Testing with: {TEST_IMAGE}")
    print(f"   Image size: {len(image_data)} bytes")
    print(f"   Base64 length: {len(base64_image)} chars")
    
    # Test without authentication first
    print("\n1️⃣ Testing WITHOUT authentication:")
    try:
        response = requests.post(
            BACKEND_URL,
            json={'image': base64_with_prefix},
            timeout=30
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test with authentication
    print("\n2️⃣ Testing WITH authentication:")
    print("   NOTE: You need to add a valid token above")
    print(f"   Token set: {'Yes' if TOKEN != 'your_token_here' else 'No (using placeholder)'}")
    
    if TOKEN != "your_token_here":
        try:
            response = requests.post(
                BACKEND_URL,
                json={'image': base64_with_prefix},
                headers={'Authorization': f'Bearer {TOKEN}'},
                timeout=30
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"\n   ✅ SUCCESS!")
                print(f"   Recognized: {data.get('foodName', 'Unknown')}")
                print(f"   Confidence: {data.get('confidence', 0):.2%}")
                print(f"\n   Full response:")
                print(f"   {response.json()}")
            else:
                print(f"   ❌ Failed: {response.text}")
        except Exception as e:
            print(f"   Error: {e}")
    
    print("\n" + "=" * 60)
    print("  HOW TO GET YOUR TOKEN")
    print("=" * 60)
    print("""
    1. Open your browser and go to http://localhost:5173
    2. Login to your account
    3. Open Developer Tools (F12)
    4. Go to: Application tab -> Local Storage -> http://localhost:5173
    5. Copy the value of 'token'
    6. Paste it in this script where it says 'your_token_here'
    7. Run this test again
    """)

if __name__ == "__main__":
    test_backend_recognition()
