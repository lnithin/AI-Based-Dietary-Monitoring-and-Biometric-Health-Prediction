"""
Quick setup script for CV service
"""
import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a command and show progress"""
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=False)
        print(f"✅ {description} - SUCCESS")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - FAILED")
        return False

def main():
    print("\n" + "="*60)
    print("  FOOD RECOGNITION CV SERVICE SETUP")
    print("="*60)
    
    # Check Python version
    print(f"\nPython version: {sys.version}")
    
    # Install dependencies
    if not run_command(
        f"{sys.executable} -m pip install --upgrade pip",
        "Upgrading pip"
    ):
        return
    
    if not run_command(
        f"{sys.executable} -m pip install -r requirements.txt",
        "Installing dependencies"
    ):
        return
    
    # Create models directory
    os.makedirs('models', exist_ok=True)
    print("\n✅ Models directory created")
    
    print("\n" + "="*60)
    print("  SETUP COMPLETE!")
    print("="*60)
    print("\nNext steps:")
    print("1. (Optional) Train the model:")
    print("   python train_model.py")
    print("\n2. Start the service:")
    print("   python app.py")
    print("\n3. The service will run on http://localhost:5002")
    print("\nWithout training, the service will use MobileNetV2")
    print("with transfer learning (good baseline accuracy)")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
