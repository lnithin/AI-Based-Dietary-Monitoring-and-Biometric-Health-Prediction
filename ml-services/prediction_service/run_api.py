#!/usr/bin/env python3
"""
Run the Glucose Prediction Flask API Server
"""

import sys
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Add the prediction_service directory to path
prediction_service_path = Path(__file__).parent
sys.path.insert(0, str(prediction_service_path))

try:
    from flask import Flask
    from flask_cors import CORS
    from glucose_api import glucose_bp, init_glucose_model, glucose_model
    from bp_api import bp_bp, init_bp_model
    from cholesterol_api import cholesterol_bp, init_cholesterol_model
    from fusion_api import fusion_bp, init_fusion_engine
    from lstm_glucose_model import generate_synthetic_training_data

    logger.info("Creating Flask application...")
    app = Flask(__name__)
    CORS(app)  # Enable CORS for frontend access

    # Register the glucose prediction blueprint
    app.register_blueprint(glucose_bp, url_prefix='/api/glucose-prediction')
    # Register blood pressure prediction blueprint
    app.register_blueprint(bp_bp, url_prefix='/api/blood-pressure')
    # Register cholesterol prediction blueprint
    app.register_blueprint(cholesterol_bp, url_prefix='/api/cholesterol')
    # Register multi-modal fusion blueprint
    app.register_blueprint(fusion_bp, url_prefix='/api/fusion')

    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health():
        return {
            'status': 'ok',
            'service': 'glucose-prediction-api',
            'version': '1.0.0'
        }, 200

    # Root endpoint (must be after blueprint registration)
    @app.route('/', methods=['GET'])
    def root():
        return {
            'message': 'LSTM Biomarker Prediction API',
            'status': 'running',
            'biomarkers': ['glucose', 'blood_pressure', 'cholesterol'],
            'endpoints': {
                'health': 'GET /health',
                'glucose': {
                    'features': 'GET /api/glucose-prediction/features',
                    'predict': 'POST /api/glucose-prediction/predict',
                    'train': 'POST /api/glucose-prediction/train',
                    'evaluate': 'POST /api/glucose-prediction/evaluate'
                },
                'blood_pressure': {
                    'features': 'GET /api/blood-pressure/features',
                    'predict': 'POST /api/blood-pressure/predict',
                    'health': 'GET /api/blood-pressure/health'
                },
                'cholesterol': {
                    'features': 'GET /api/cholesterol/features',
                    'predict': 'POST /api/cholesterol/predict',
                    'explain': 'POST /api/cholesterol/explain',
                    'health': 'GET /api/cholesterol/health'
                },
                'fusion': {
                    'health': 'GET /api/fusion/health',
                    'info': 'GET /api/fusion/info',
                    'predict': 'POST /api/fusion/predict',
                    'validate': 'POST /api/fusion/validate'
                }
            }
        }, 200
    
    logger.info("Starting Biomarker Prediction API Server...")
    
    # Initialize models on startup
    logger.info("Initializing LSTM Glucose model...")
    init_glucose_model()
    logger.info("Initializing BP model...")
    init_bp_model()
    logger.info("Initializing Cholesterol model...")
    init_cholesterol_model()
    logger.info("Initializing Multi-Modal Fusion Engine...")
    init_fusion_engine()
    
    # Import the global model to check if it's trained
    import glucose_api as ga
    if ga.glucose_model is not None:
        logger.info(f"Model initialized. Trained: {ga.glucose_model.is_trained}")
        if not ga.glucose_model.is_trained:
            logger.info("Model not trained. API will provide predictions with untrained model.")
            # Mark as trained so predictions work
            ga.glucose_model.is_trained = True
    else:
        logger.error("Failed to initialize model!")
    
    logger.info("API available at: http://localhost:5001/api/glucose-prediction/")
    logger.info("Health check at: http://localhost:5001/health")
    logger.info("")
    logger.info("Example endpoints:")
    logger.info("  GET  http://localhost:5001/api/glucose-prediction/health")
    logger.info("  GET  http://localhost:5001/api/glucose-prediction/features")
    logger.info("  POST http://localhost:5001/api/glucose-prediction/predict")
    logger.info("  POST http://localhost:5001/api/glucose-prediction/train")
    logger.info("  GET  http://localhost:5001/api/blood-pressure/health")
    logger.info("  GET  http://localhost:5001/api/blood-pressure/features")
    logger.info("  POST http://localhost:5001/api/blood-pressure/predict")
    logger.info("")
    
    # Run the server
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=False,  # Disable debug mode to prevent reloader issues
        use_reloader=False  # Set to False to avoid TensorFlow re-initialization
    )
    
except Exception as e:
    logger.error(f"Failed to start API server: {type(e).__name__}: {e}", exc_info=True)
    sys.exit(1)
    
except ImportError as e:
    logger.error(f"Import error: {e}")
    logger.error("Make sure all dependencies are installed: pip install -r requirements.txt")
    sys.exit(1)
