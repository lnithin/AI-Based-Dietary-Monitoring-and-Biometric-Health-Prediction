from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras
from PIL import Image
import numpy as np
import os
import io
import logging
import sys

# Add parent directory to path for explainer import
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Try to import explainer, but don't fail if not available
try:
    from xai_service.explainer import ImageExplainer
    EXPLAINER_AVAILABLE = True
except ImportError as e:
    EXPLAINER_AVAILABLE = False
    print(f"Warning: Explainer not available: {e}")

app = Flask(__name__)
CORS(app)

# Increase max upload size to 16MB (default is 16MB but being explicit)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Food classes (10 South Indian foods)
FOOD_CLASSES = [
    'Appam',
    'Biryani',
    'Chapati',
    'Dosa',
    'Idli',
    'Pongal',
    'Poori',
    'Porotta',
    'Vada',
    'White Rice'
]

# Image preprocessing parameters
IMG_SIZE = 224
MODEL_PATH = 'models/food_recognition_model.h5'

# Global model variable
model = None
explainer = None
model = None

def load_model_file():
    """Load the trained model"""
    global model, explainer
    try:
        if os.path.exists(MODEL_PATH):
            logger.info(f"Loading model from {MODEL_PATH}")
            model = keras.models.load_model(MODEL_PATH, compile=False)
            logger.info("Model loaded successfully")
            # Initialize explainer if available
            if EXPLAINER_AVAILABLE:
                explainer = ImageExplainer(model, FOOD_CLASSES)
                logger.info("Explainer initialized")
            else:
                logger.warning("Explainer not available - explainability features disabled")
        else:
            logger.warning(f"Model file not found at {MODEL_PATH}. Building default model.")
            model = build_default_model()
            if EXPLAINER_AVAILABLE:
                explainer = ImageExplainer(model, FOOD_CLASSES)
            logger.info("Default model created")
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        model = build_default_model()
        if EXPLAINER_AVAILABLE:
            explainer = ImageExplainer(model, FOOD_CLASSES)

def build_default_model():
    """Build a pre-trained MobileNetV2 model for food recognition"""
    logger.info("Building MobileNetV2-based model...")
    
    base_model = keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False
    
    model = keras.Sequential([
        base_model,
        keras.layers.GlobalAveragePooling2D(),
        keras.layers.Dense(256, activation='relu'),
        keras.layers.Dropout(0.5),
        keras.layers.Dense(128, activation='relu'),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(len(FOOD_CLASSES), activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    logger.info("Model built successfully")
    return model

def preprocess_image(image_bytes):
    """Preprocess image for model input"""
    try:
        # Load image
        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize
        img = img.resize((IMG_SIZE, IMG_SIZE))
        
        # Convert to array and normalize
        img_array = np.array(img)
        img_array = img_array.astype('float32') / 255.0
        
        # Expand dimensions for batch
        img_array = np.expand_dims(img_array, axis=0)
        
        # Apply MobileNetV2 preprocessing
        img_array = keras.applications.mobilenet_v2.preprocess_input(img_array * 255.0)
        
        return img_array
    except Exception as e:
        logger.error(f"Error preprocessing image: {e}")
        raise

def enhance_prediction_with_heuristics(predictions, image_bytes):
    """
    Enhance predictions using image analysis heuristics
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        aspect_ratio = width / height
        
        # Get base predictions
        pred_scores = predictions[0]
        
        # Apply heuristic adjustments based on image characteristics
        adjusted_scores = pred_scores.copy()
        
        # Wide images (aspect ratio > 1.3) - likely flatbreads
        if aspect_ratio > 1.3:
            flatbread_indices = [FOOD_CLASSES.index(name) for name in ['Dosa', 'Chapati', 'Poori', 'Porotta'] if name in FOOD_CLASSES]
            for idx in flatbread_indices:
                adjusted_scores[idx] *= 1.3
        
        # Tall/square images - likely stacked items or rice dishes
        elif aspect_ratio < 1.2:
            stacked_indices = [FOOD_CLASSES.index(name) for name in ['Idli', 'Vada', 'Appam'] if name in FOOD_CLASSES]
            rice_indices = [FOOD_CLASSES.index(name) for name in ['Biryani', 'Pongal', 'White Rice'] if name in FOOD_CLASSES]
            for idx in stacked_indices + rice_indices:
                adjusted_scores[idx] *= 1.2
        
        # Analyze average color for additional hints
        img_array = np.array(img.resize((100, 100)))
        avg_color = np.mean(img_array, axis=(0, 1))
        
        # White/light colored foods
        if np.mean(avg_color) > 180:
            white_food_indices = [FOOD_CLASSES.index(name) for name in ['Idli', 'Appam', 'White Rice'] if name in FOOD_CLASSES]
            for idx in white_food_indices:
                adjusted_scores[idx] *= 1.2
        
        # Brown/golden foods
        elif avg_color[0] > 150 and avg_color[1] > 100 and avg_color[2] < 100:
            brown_food_indices = [FOOD_CLASSES.index(name) for name in ['Dosa', 'Vada', 'Poori'] if name in FOOD_CLASSES]
            for idx in brown_food_indices:
                adjusted_scores[idx] *= 1.15
        
        # Normalize scores
        adjusted_scores = adjusted_scores / np.sum(adjusted_scores)
        
        return adjusted_scores
        
    except Exception as e:
        logger.error(f"Error in heuristic enhancement: {e}")
        return predictions[0]

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Food Recognition CV Service',
        'model_loaded': model is not None,
        'supported_foods': FOOD_CLASSES
    })

@app.route('/recognize', methods=['POST'])
def recognize_food():
    """
    Recognize food from uploaded image
    """
    try:
        # Check if image is in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        # Read image bytes
        image_bytes = image_file.read()
        
        # Preprocess image
        img_array = preprocess_image(image_bytes)
        
        # Make prediction
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        predictions = model.predict(img_array, verbose=0)
        
        # Apply heuristic enhancements
        enhanced_predictions = enhance_prediction_with_heuristics(predictions, image_bytes)
        
        # Get top predictions
        top_indices = np.argsort(enhanced_predictions)[-3:][::-1]
        
        results = []
        for idx in top_indices:
            results.append({
                'food_name': FOOD_CLASSES[idx],
                'confidence': float(enhanced_predictions[idx]),
                'probability': float(enhanced_predictions[idx])
            })
        
        # Primary prediction
        predicted_idx = top_indices[0]
        predicted_food = FOOD_CLASSES[predicted_idx]
        confidence = float(enhanced_predictions[predicted_idx])
        
        logger.info(f"Predicted: {predicted_food} with confidence {confidence:.2f}")
        
        return jsonify({
            'success': True,
            'food_name': predicted_food,
            'confidence': confidence,
            'all_predictions': results,
            'model_type': 'MobileNetV2'
        })
        
    except Exception as e:
        logger.error(f"Error in food recognition: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/explain/lime', methods=['POST'])
def explain_with_lime():
    """Generate LIME explanation for food recognition"""
    try:
        if not EXPLAINER_AVAILABLE:
            return jsonify({
                'success': False, 
                'error': 'Explainability features not available. Install: pip install shap lime matplotlib scikit-image'
            }), 503
        
        if not model or not explainer:
            return jsonify({'success': False, 'error': 'Model not loaded'}), 500
        
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        # Read and preprocess image
        image_file = request.files['image']
        image = Image.open(io.BytesIO(image_file.read()))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image = image.resize((IMG_SIZE, IMG_SIZE))
        img_array = np.array(image) / 255.0
        
        # Get LIME explanation
        logger.info("Generating LIME explanation...")
        explanation = explainer.explain_with_lime(img_array, top_labels=3, num_samples=500)
        
        return jsonify({
            'success': True,
            **explanation
        })
        
    except Exception as e:
        logger.error(f"Error in LIME explanation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/explain/shap', methods=['POST'])
def explain_with_shap():
    """Generate SHAP explanation for food recognition"""
    try:
        if not EXPLAINER_AVAILABLE:
            return jsonify({
                'success': False, 
                'error': 'Explainability features not available. Install: pip install shap lime matplotlib scikit-image'
            }), 503
        
        if not model or not explainer:
            return jsonify({'success': False, 'error': 'Model not loaded'}), 500
        
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        # Read and preprocess image
        image_file = request.files['image']
        image = Image.open(io.BytesIO(image_file.read()))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image = image.resize((IMG_SIZE, IMG_SIZE))
        img_array = np.array(image) / 255.0
        
        # Get SHAP explanation
        logger.info("Generating SHAP explanation...")
        explanation = explainer.explain_with_shap(img_array, background_samples=20)
        
        return jsonify({
            'success': True,
            **explanation
        })
        
    except Exception as e:
        logger.error(f"Error in SHAP explanation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/explain/both', methods=['POST'])
def explain_with_both():
    """Generate both LIME and SHAP explanations"""
    try:
        if not EXPLAINER_AVAILABLE:
            return jsonify({
                'success': False, 
                'error': 'Explainability features not available. Install: pip install shap lime matplotlib scikit-image'
            }), 503
        
        if not model or not explainer:
            return jsonify({'success': False, 'error': 'Model not loaded'}), 500
        
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        # Read and preprocess image
        image_file = request.files['image']
        image = Image.open(io.BytesIO(image_file.read()))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image = image.resize((IMG_SIZE, IMG_SIZE))
        img_array = np.array(image) / 255.0
        
        # Get both explanations
        logger.info("Generating LIME and SHAP explanations...")
        lime_result = explainer.explain_with_lime(img_array, top_labels=3, num_samples=500)
        shap_result = explainer.explain_with_shap(img_array, background_samples=20)
        
        return jsonify({
            'success': True,
            'lime': lime_result,
            'shap': shap_result,
            'summary': {
                'prediction': lime_result['top_prediction'],
                'confidence': lime_result['confidence'],
                'methods_used': ['LIME', 'SHAP'],
                'interpretation': f"Both explainability methods analyzed the prediction of {lime_result['top_prediction']} with {lime_result['confidence']*100:.1f}% confidence."
            }
        })
        
    except Exception as e:
        logger.error(f"Error in combined explanation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/train-status', methods=['GET'])
def train_status():
    """Get model training status"""
    return jsonify({
        'model_loaded': model is not None,
        'model_path': MODEL_PATH,
        'model_exists': os.path.exists(MODEL_PATH),
        'food_classes': FOOD_CLASSES,
        'num_classes': len(FOOD_CLASSES)
    })

# Load model on startup
load_model_file()

if __name__ == '__main__':
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    logger.info("Starting Food Recognition CV Service...")
    logger.info(f"Supported foods: {', '.join(FOOD_CLASSES)}")
    
    app.run(host='0.0.0.0', port=5002, debug=False)
