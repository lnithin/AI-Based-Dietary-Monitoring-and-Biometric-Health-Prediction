"""
Direct Backend Test - Tests the backend /recognize endpoint
"""

import requests
import base64
import os
import sys

BACKEND_URL = "http://localhost:8000/api/food-recognition/recognize"
TEST_IMAGE = "../data/Dosa/Dosa_1.jpg"

# Get token from command line or environment
TOKEN = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('AUTH_TOKEN', None)

def test_backend():
    print("=" * 60)
    print("  TESTING BACKEND /recognize ENDPOINT")
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
    print(f"   Expected: Dosa")
    print(f"   Image size: {len(image_data)} bytes\n")
    
    if TOKEN:
        print(f"   Using auth token: {TOKEN[:20]}...\n")
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {TOKEN}'
        }
    else:
        print("   ⚠️  No auth token provided - testing without authentication")
        print("   This may fail with 401 Unauthorized\n")
        headers = {'Content-Type': 'application/json'}
    
    try:
        print("   Sending request to backend...")
        response = requests.post(
            BACKEND_URL,
            json={'image': base64_with_prefix},
            headers=headers,
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            recognized = data.get('foodName', 'Unknown')
            confidence = data.get('confidence', 0)
            
            print(f"\n   ✅ SUCCESS!")
            print(f"   Recognized: {recognized}")
            print(f"   Confidence: {confidence:.2%}")
            print(f"   Expected: Dosa")
            
            if recognized == "Dosa":
                print(f"\n   ✅✅ CORRECT! Backend is working properly!")
            else:
                print(f"\n   ❌❌ WRONG! Backend returned: {recognized}")
                print(f"   This is the problem - backend is not getting correct data from CV service")
            
            print(f"\n   Full Response:")
            import json
            print(json.dumps(data, indent=2))
            
        elif response.status_code == 401:
            print(f"\n   ❌ Authentication required!")
            print(f"   Response: {response.json()}")
            print(f"\n   To fix this, get your auth token:")
            print(f"   1. Login at http://localhost:5173")
            print(f"   2. Open DevTools (F12) -> Application -> Local Storage")
            print(f"   3. Copy the 'token' value")
            print(f"   4. Run: python test_backend.py YOUR_TOKEN_HERE")
        else:
            print(f"\n   ❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print(f"\n   ❌ Cannot connect to backend!")
        print(f"   Make sure backend is running on http://localhost:8000")
    except Exception as e:
        print(f"\n   ❌ Error: {e}")

if __name__ == "__main__":
    test_backend()
    
    if not TOKEN:
        print("\n" + "=" * 60)
        print("  TO TEST WITH AUTHENTICATION")
        print("=" * 60)
        print("  1. Login at: http://localhost:5173")
        print("  2. Open DevTools: F12")
        print("  3. Go to: Application -> Local Storage -> http://localhost:5173")
        print("  4. Copy the 'token' value")
        print("  5. Run: python test_backend.py YOUR_TOKEN")
        print("=" * 60)
