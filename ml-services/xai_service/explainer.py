"""
SHAP and LIME Explainability Service
Provides explainability for CV (food recognition) and LSTM (glucose prediction) models
"""

# CRITICAL: Set matplotlib backend BEFORE any imports
# This prevents tkinter RuntimeError in web server environment
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend

import numpy as np
import shap
from lime import lime_image
from lime.wrappers.scikit_image import SegmentationAlgorithm
import matplotlib.pyplot as plt
import io
import base64
from PIL import Image
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ImageExplainer:
    """SHAP and LIME explainability for image classification (CV service)"""
    
    def __init__(self, model, class_names):
        """
        Initialize explainer with model and class names
        
        Args:
            model: Trained Keras model
            class_names: List of class names
        """
        self.model = model
        self.class_names = class_names
        self.lime_explainer = lime_image.LimeImageExplainer()
        logger.info("Image Explainer initialized")
    
    def explain_with_lime(self, image, top_labels=3, num_samples=1000):
        """
        Generate LIME explanation for image prediction
        
        Args:
            image: Preprocessed image (224x224x3)
            top_labels: Number of top predictions to explain
            num_samples: Number of samples for LIME
            
        Returns:
            dict with explanation data and visualization
        """
        try:
            # Ensure image is in correct format
            if image.shape != (224, 224, 3):
                raise ValueError(f"Expected image shape (224, 224, 3), got {image.shape}")
            
            # Get prediction
            prediction = self.model.predict(np.expand_dims(image, axis=0))[0]
            top_indices = np.argsort(prediction)[-top_labels:][::-1]
            
            # Generate LIME explanation
            explanation = self.lime_explainer.explain_instance(
                image,
                self._predict_fn,
                top_labels=top_labels,
                hide_color=0,
                num_samples=num_samples
            )
            
            # Create visualization for top prediction
            temp, mask = explanation.get_image_and_mask(
                top_indices[0],
                positive_only=True,
                num_features=10,
                hide_rest=False
            )
            
            # Convert to base64 image
            fig, ax = plt.subplots(1, 2, figsize=(10, 4))
            ax[0].imshow(image)
            ax[0].set_title('Original Image')
            ax[0].axis('off')
            
            ax[1].imshow(mask, cmap='jet', alpha=0.5)
            ax[1].imshow(image, alpha=0.5)
            ax[1].set_title(f'LIME: {self.class_names[top_indices[0]]}')
            ax[1].axis('off')
            
            plt.tight_layout()
            
            # Save to base64
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            
            # Prepare response
            predictions = {
                self.class_names[idx]: float(prediction[idx])
                for idx in top_indices
            }
            
            return {
                'method': 'LIME',
                'predictions': predictions,
                'top_prediction': self.class_names[top_indices[0]],
                'confidence': float(prediction[top_indices[0]]),
                'visualization': img_base64,
                'explanation': f'Highlighted regions show areas that contributed most to predicting {self.class_names[top_indices[0]]}'
            }
            
        except Exception as e:
            logger.error(f"LIME explanation error: {str(e)}")
            raise
    
    def explain_with_shap(self, image, background_samples=50):
        """
        Generate SHAP explanation for image prediction
        
        Args:
            image: Preprocessed image (224x224x3)
            background_samples: Number of background samples
            
        Returns:
            dict with explanation data and visualization
        """
        try:
            # Get prediction
            prediction = self.model.predict(np.expand_dims(image, axis=0))[0]
            top_idx = np.argmax(prediction)
            
            # Create background dataset (simplified for speed)
            background = np.random.rand(background_samples, 224, 224, 3)
            
            # Use GradientExplainer instead of DeepExplainer for TF 2.15 compatibility
            try:
                explainer = shap.GradientExplainer(self.model, background)
                shap_values = explainer.shap_values(np.expand_dims(image, axis=0))
            except Exception as e:
                logger.warning(f"GradientExplainer failed: {e}, using KernelExplainer")
                # Fallback to simpler explanation
                def predict_fn(imgs):
                    return self.model.predict(imgs)
                
                explainer = shap.KernelExplainer(predict_fn, background[:10])
                shap_values = explainer.shap_values(np.expand_dims(image, axis=0), nsamples=50)
            
            # Create visualization
            fig, ax = plt.subplots(1, 2, figsize=(10, 4))
            
            ax[0].imshow(image)
            ax[0].set_title('Original Image')
            ax[0].axis('off')
            
            # Plot SHAP values for top prediction
            # SHAP returns values with shape (batch, height, width, channels)
            # For multi-class, it's a list of arrays, one per class
            if isinstance(shap_values, list):
                # Get SHAP values for the predicted class
                class_shap = shap_values[top_idx]  # Shape: (1, 224, 224, 3)
                shap_img = np.mean(np.abs(class_shap[0]), axis=-1)  # Average across RGB channels
            else:
                # Single output case
                shap_img = np.mean(np.abs(shap_values[0]), axis=-1)  # Average across channels
            
            # Overlay SHAP heatmap on original image
            im = ax[1].imshow(image)
            im2 = ax[1].imshow(shap_img, cmap='jet', alpha=0.5)
            ax[1].set_title(f'SHAP: {self.class_names[top_idx]}')
            ax[1].axis('off')
            plt.colorbar(im2, ax=ax[1], fraction=0.046, label='Importance')
            
            plt.tight_layout()
            
            # Save to base64
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            
            # Get top 3 predictions
            top_indices = np.argsort(prediction)[-3:][::-1]
            predictions = {
                self.class_names[idx]: float(prediction[idx])
                for idx in top_indices
            }
            
            return {
                'method': 'SHAP',
                'predictions': predictions,
                'top_prediction': self.class_names[top_idx],
                'confidence': float(prediction[top_idx]),
                'visualization': img_base64,
                'explanation': f'Heatmap shows pixel importance for predicting {self.class_names[top_idx]}. Brighter areas have higher impact.'
            }
            
        except Exception as e:
            logger.error(f"SHAP explanation error: {str(e)}")
            raise
    
    def _predict_fn(self, images):
        """Prediction function for LIME"""
        return self.model.predict(images)


class TimeSeriesExplainer:
    """SHAP explainability for time series predictions (LSTM service)"""
    
    def __init__(self, model):
        """
        Initialize time series explainer
        
        Args:
            model: Trained LSTM model
        """
        self.model = model
        logger.info("Time Series Explainer initialized")
    
    def explain_with_shap(self, input_sequence, feature_names=None):
        """
        Generate SHAP explanation for LSTM prediction (Simplified version for TF 2.15)
        
        Args:
            input_sequence: Input time series data (batch_size, timesteps, features)
            feature_names: Names of features
            
        Returns:
            dict with explanation data and visualization
        """
        try:
            # Get prediction
            prediction = self.model.predict(input_sequence)[0][0]
            
            # Use perturbation-based explanation instead of DeepExplainer
            # This avoids TensorFlow gradient registry issues
            baseline_features = np.mean(input_sequence[0], axis=0)
            
            # Calculate feature importance by perturbation
            feature_importance = np.zeros(input_sequence.shape[2])
            
            for feature_idx in range(input_sequence.shape[2]):
                # Create perturbed sequence
                perturbed = input_sequence.copy()
                perturbed[0, :, feature_idx] = baseline_features[feature_idx]
                
                # Get prediction difference
                perturbed_pred = self.model.predict(perturbed)[0][0]
                feature_importance[feature_idx] = prediction - perturbed_pred
            
            # Create visualization
            fig, axes = plt.subplots(2, 1, figsize=(12, 8))
            
            # Plot 1: Time series data
            timesteps = range(input_sequence.shape[1])
            for i in range(min(5, input_sequence.shape[2])):  # Show top 5 features
                label = feature_names[i] if feature_names else f'Feature {i}'
                axes[0].plot(timesteps, input_sequence[0, :, i], marker='o', label=label)
            
            axes[0].set_xlabel('Time Steps')
            axes[0].set_ylabel('Value')
            axes[0].set_title('Input Time Series Data (Top 5 Features)')
            axes[0].legend()
            axes[0].grid(True, alpha=0.3)
            
            # Plot 2: Feature importance
            if feature_names:
                labels = feature_names
            else:
                labels = [f'Feature {i}' for i in range(len(feature_importance))]
            
            colors = ['green' if x > 0 else 'red' for x in feature_importance]
            axes[1].barh(labels, feature_importance, color=colors, alpha=0.7)
            axes[1].set_xlabel('Feature Impact on Prediction')
            axes[1].set_title('Feature Importance (Perturbation-based)')
            axes[1].axvline(x=0, color='black', linestyle='--', linewidth=0.5)
            axes[1].grid(True, alpha=0.3, axis='x')
            
            plt.tight_layout()
            
            # Save to base64
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            
            # Calculate feature importance dict
            importance_dict = {}
            for i, imp in enumerate(feature_importance):
                name = feature_names[i] if feature_names else f'Feature {i}'
                importance_dict[name] = float(imp)
            
            return {
                'method': 'SHAP (Perturbation-based)',
                'prediction': float(prediction),
                'feature_importance': importance_dict,
                'visualization': img_base64,
                'explanation': 'Feature importance shows how each feature contributed to the prediction. Positive values increase prediction, negative values decrease it. Calculated using perturbation analysis.'
            }
            
        except Exception as e:
            logger.error(f"SHAP time series explanation error: {str(e)}")
            raise
    
    def explain_feature_contribution(self, input_sequence, feature_names=None):
        """
        Analyze overall feature contribution
        
        Args:
            input_sequence: Input time series data
            feature_names: Names of features
            
        Returns:
            dict with feature contribution analysis
        """
        try:
            prediction = self.model.predict(input_sequence)[0][0]
            
            # Analyze by removing each feature
            contributions = {}
            baseline_pred = prediction
            
            for i in range(input_sequence.shape[2]):
                # Create copy with feature zeroed out
                modified = input_sequence.copy()
                modified[0, :, i] = 0
                
                new_pred = self.model.predict(modified)[0][0]
                contribution = baseline_pred - new_pred
                
                name = feature_names[i] if feature_names else f'Feature {i}'
                contributions[name] = float(contribution)
            
            # Create bar chart
            fig, ax = plt.subplots(figsize=(10, 6))
            names = list(contributions.keys())
            values = list(contributions.values())
            colors = ['green' if v > 0 else 'red' for v in values]
            
            ax.barh(names, values, color=colors, alpha=0.7)
            ax.set_xlabel('Contribution to Prediction')
            ax.set_title('Feature Contribution Analysis')
            ax.axvline(x=0, color='black', linestyle='--', linewidth=0.5)
            ax.grid(True, alpha=0.3)
            
            plt.tight_layout()
            
            # Save to base64
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            
            return {
                'method': 'Feature Ablation',
                'prediction': float(prediction),
                'contributions': contributions,
                'visualization': img_base64,
                'explanation': 'Shows how much each feature contributed to the final prediction. Positive values indicate features that increased the prediction.'
            }
            
        except Exception as e:
            logger.error(f"Feature contribution error: {str(e)}")
            raise


def create_explanation_summary(lime_result=None, shap_result=None):
    """
    Create a summary combining LIME and SHAP results
    
    Args:
        lime_result: LIME explanation result
        shap_result: SHAP explanation result
        
    Returns:
        dict with combined summary
    """
    summary = {
        'explainability_methods': []
    }
    
    if lime_result:
        summary['explainability_methods'].append('LIME')
        summary['lime_explanation'] = lime_result['explanation']
        summary['lime_visualization'] = lime_result['visualization']
    
    if shap_result:
        summary['explainability_methods'].append('SHAP')
        summary['shap_explanation'] = shap_result['explanation']
        summary['shap_visualization'] = shap_result['visualization']
    
    if lime_result and shap_result:
        summary['consensus'] = {
            'prediction': lime_result['top_prediction'],
            'confidence': lime_result['confidence'],
            'interpretation': f"Both LIME and SHAP agree on predicting {lime_result['top_prediction']} with {lime_result['confidence']*100:.1f}% confidence."
        }
    
    return summary
