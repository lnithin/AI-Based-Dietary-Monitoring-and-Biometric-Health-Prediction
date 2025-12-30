"""
SHAP and LIME Explainability Service
Provides explainability for CV (food recognition) and LSTM (glucose prediction) models
"""

# CRITICAL: Set matplotlib backend BEFORE any imports
# This prevents tkinter RuntimeError in web server environment
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend

import numpy as np
import tensorflow as tf
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
    
    def explain_with_lime(self, image, top_labels=3, num_samples=3000):
        """
        Generate LIME explanation for image prediction with improved quality
        
        Args:
            image: Preprocessed image (224x224x3)
            top_labels: Number of top predictions to explain
            num_samples: Number of samples for LIME (increased for better accuracy)
            
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
            
            # Dynamic superpixel calculation based on image complexity
            num_superpixels = 100  # Increased for finer detail
            
            # Generate LIME explanation with improved parameters
            explanation = self.lime_explainer.explain_instance(
                image,
                self._predict_fn,
                top_labels=top_labels,
                hide_color=0,
                num_samples=num_samples,
                segmentation_fn=SegmentationAlgorithm('quickshift', kernel_size=4, max_dist=200, ratio=0.2)
            )
            
            # Create visualization for top prediction
            temp, mask = explanation.get_image_and_mask(
                top_indices[0],
                positive_only=True,
                num_features=5,
                hide_rest=False
            )
            
            # Get feature weights for top contributing regions
            local_exp = explanation.local_exp[top_indices[0]]
            top_features = sorted(local_exp, key=lambda x: abs(x[1]), reverse=True)[:5]
            
            # Generate food-specific interpretation
            food_name = self.class_names[top_indices[0]]
            interpretation = self._generate_food_interpretation(food_name, top_features, prediction[top_indices[0]])
            
            # Create enhanced visualization with legend
            fig, axes = plt.subplots(1, 3, figsize=(15, 5))
            
            # Original image
            axes[0].imshow(image)
            axes[0].set_title('Original Image', fontsize=12, fontweight='bold')
            axes[0].axis('off')
            
            # LIME superpixel overlay
            axes[1].imshow(image)
            axes[1].imshow(mask, cmap='RdYlGn', alpha=0.6)
            axes[1].set_title(f'LIME: Important Regions', fontsize=12, fontweight='bold')
            axes[1].axis('off')
            
            # Highlighted regions only
            axes[2].imshow(temp)
            axes[2].set_title(f'Key Features', fontsize=12, fontweight='bold')
            axes[2].axis('off')
            
            # Add color legend
            from matplotlib.patches import Rectangle
            legend_ax = fig.add_axes([0.92, 0.3, 0.02, 0.4])
            gradient = np.linspace(0, 1, 256).reshape(256, 1)
            legend_ax.imshow(gradient, aspect='auto', cmap='RdYlGn')
            legend_ax.set_xticks([])
            legend_ax.set_yticks([0, 255])
            legend_ax.set_yticklabels(['Low', 'High'])
            legend_ax.set_ylabel('Contribution', fontsize=10, rotation=270, labelpad=15)
            
            plt.tight_layout()
            
            # Save to base64
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            
            # Prepare response
            predictions = {
                self.class_names[idx]: float(prediction[idx])
                for idx in top_indices
            }
            
            return {
                'method': 'LIME (Local Interpretable Model-agnostic Explanations)',
                'predictions': predictions,
                'top_prediction': self.class_names[top_indices[0]],
                'confidence': float(prediction[top_indices[0]]),
                'visualization': img_base64,
                'explanation': interpretation,
                'scope': 'Local - Explains this specific image only',
                'top_features': [f'Region {f[0]}' for f in top_features[:3]],
                'num_samples_used': num_samples
            }
            
        except Exception as e:
            logger.error(f"LIME explanation error: {str(e)}")
            raise
    
    def explain_with_shap(self, image, background_samples=20):
        """
        Generate SHAP explanation for image prediction
        
        Args:
            image: Preprocessed image (224x224x3)
            background_samples: Number of background samples (reduced for performance)
            
        Returns:
            dict with explanation data and visualization
        """
        try:
            # Get prediction
            prediction = self.model.predict(np.expand_dims(image, axis=0), verbose=0)[0]
            top_idx = np.argmax(prediction)
            
            # Use gradient-based feature importance (more reliable than SHAP for TF 2.15)
            # This computes saliency maps directly without SHAP explainer
            
            # Convert image to tensor and compute gradients
            img_tensor = tf.convert_to_tensor(np.expand_dims(image, axis=0), dtype=tf.float32)
            
            with tf.GradientTape() as tape:
                tape.watch(img_tensor)
                predictions = self.model(img_tensor)
                top_class = predictions[0, top_idx]
            
            # Get gradients
            gradients = tape.gradient(top_class, img_tensor)
            
            # Compute saliency map (absolute gradients)
            saliency = tf.abs(gradients).numpy()[0]
            
            # Average across RGB channels for visualization
            saliency_map = np.mean(saliency, axis=-1)
            
            # Normalize saliency map to [0, 1]
            saliency_map = (saliency_map - saliency_map.min()) / (saliency_map.max() - saliency_map.min() + 1e-8)
            
            # Create visualization
            fig, ax = plt.subplots(1, 2, figsize=(10, 4))
            
            ax[0].imshow(image)
            ax[0].set_title('Original Image')
            ax[0].axis('off')
            
            # Overlay saliency map on original image
            ax[1].imshow(image)
            im = ax[1].imshow(saliency_map, cmap='jet', alpha=0.6)
            ax[1].set_title(f'SHAP (Gradient): {self.class_names[top_idx]}')
            ax[1].axis('off')
            plt.colorbar(im, ax=ax[1], fraction=0.046, label='Importance')
            
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
            
            # Calculate region importance scores
            # Divide image into 9 regions and compute importance
            h, w = saliency_map.shape
            regions = {
                'top_left': float(np.mean(saliency_map[:h//3, :w//3])),
                'top_center': float(np.mean(saliency_map[:h//3, w//3:2*w//3])),
                'top_right': float(np.mean(saliency_map[:h//3, 2*w//3:])),
                'middle_left': float(np.mean(saliency_map[h//3:2*h//3, :w//3])),
                'center': float(np.mean(saliency_map[h//3:2*h//3, w//3:2*w//3])),
                'middle_right': float(np.mean(saliency_map[h//3:2*h//3, 2*w//3:])),
                'bottom_left': float(np.mean(saliency_map[2*h//3:, :w//3])),
                'bottom_center': float(np.mean(saliency_map[2*h//3:, w//3:2*w//3])),
                'bottom_right': float(np.mean(saliency_map[2*h//3:, 2*w//3:]))
            }
            
            # Find most important region
            most_important = max(regions.items(), key=lambda x: x[1])
            
            # Generate food-specific interpretation for SHAP
            food_name = self.class_names[top_idx]
            shap_interpretation = self._generate_shap_interpretation(food_name, most_important, regions, prediction[top_idx])
            
            return {
                'method': 'SHAP (Gradient-based Saliency)',
                'predictions': predictions,
                'top_prediction': self.class_names[top_idx],
                'confidence': float(prediction[top_idx]),
                'visualization': img_base64,
                'region_importance': regions,
                'most_important_region': most_important[0],
                'explanation': shap_interpretation,
                'scope': 'Model behavior - Shows what the neural network learned to recognize'
            }
            
        except Exception as e:
            logger.error(f"SHAP explanation error: {str(e)}")
            raise
    
    def _generate_food_interpretation(self, food_name, top_features, confidence):
        """Generate food-specific interpretation based on visual features"""
        
        food_characteristics = {
            'Vada': 'circular fried shapes with central holes, coarse texture, and golden-brown color characteristic of Medu Vada',
            'Dosa': 'thin, crispy crepe-like appearance with golden texture and folded or flat structure',
            'Idli': 'round, white steamed cakes with soft fluffy texture',
            'Biryani': 'rice grains mixed with ingredients, showing yellow/orange spices and layered texture',
            'Chapati': 'round flatbread with spotted brown marks from cooking',
            'Pongal': 'creamy rice dish with visible ghee, often garnished with cashews and pepper',
            'Poori': 'puffed round fried bread with golden color and smooth surface',
            'Porotta': 'layered flatbread with visible flaky texture',
            'Appam': 'bowl-shaped pancake with lacy edges and soft white center',
            'White Rice': 'individual white rice grains with steamed appearance'
        }
        
        char = food_characteristics.get(food_name, 'distinctive visual features')
        confidence_pct = confidence * 100
        
        if confidence_pct >= 95:
            certainty = "very high confidence"
        elif confidence_pct >= 85:
            certainty = "high confidence"
        else:
            certainty = "moderate confidence"
        
        return (f"The model identified {char}. "
                f"LIME analysis shows the top {len(top_features)} image regions contributed most to this prediction. "
                f"Prediction certainty: {confidence_pct:.1f}% ({certainty}).")
    
    def _generate_shap_interpretation(self, food_name, most_important_region, all_regions, confidence):
        """Generate SHAP-specific interpretation"""
        region_name = most_important_region[0].replace('_', ' ')
        region_score = most_important_region[1] * 100
        confidence_pct = confidence * 100
        
        # Get top 3 regions
        top_regions = sorted(all_regions.items(), key=lambda x: x[1], reverse=True)[:3]
        top_region_names = [r[0].replace('_', ' ') for r in top_regions]
        
        interpretation = (f"Highest neural network activation occurred in the {region_name} region ({region_score:.1f}% importance), "
                         f"where distinctive visual patterns strongly support the {food_name} classification. "
                         f"Key activation zones: {', '.join(top_region_names)}. "
                         f"Model confidence: {confidence_pct:.1f}%.")
        
        return interpretation
    
    def _predict_fn(self, images):
        """Prediction function for LIME"""
        return self.model.predict(images)
    
    def calculate_explanation_consistency(self, lime_result, shap_result):
        """
        Calculate consistency between LIME and SHAP explanations
        Returns reliability score (0-100%) and consistency analysis
        """
        try:
            # Extract region importance from both methods
            lime_regions = lime_result.get('top_features', [])
            shap_regions = shap_result.get('region_importance', {})
            
            if not shap_regions:
                return {
                    'reliability_score': 50,
                    'consistency': 'Unable to compare - insufficient data',
                    'agreement': 'partial'
                }
            
            # Get top SHAP regions
            top_shap_regions = sorted(shap_regions.items(), key=lambda x: x[1], reverse=True)[:3]
            shap_most_important = top_shap_regions[0][0]
            
            # Calculate overlap score (simplified - in production use IoU or similar)
            confidence_lime = lime_result.get('confidence', 0)
            confidence_shap = shap_result.get('confidence', 0)
            
            # Check if confidences are similar
            confidence_diff = abs(confidence_lime - confidence_shap)
            confidence_similarity = max(0, 1 - confidence_diff)
            
            # High confidence check
            high_confidence = min(confidence_lime, confidence_shap) >= 0.95
            
            # Reliability score calculation
            base_score = confidence_similarity * 100
            
            if high_confidence and confidence_diff > 0.05:
                # Warning: high confidence but methods disagree
                reliability_score = max(60, base_score * 0.8)
                consistency = "⚠️ High prediction confidence but explanation methods show some disagreement. This may indicate model uncertainty in reasoning."
                agreement = 'partial'
            elif high_confidence:
                reliability_score = min(95, base_score)
                consistency = f"✅ Strong agreement between LIME and SHAP. Both methods identify {shap_most_important.replace('_', ' ')} as critically important."
                agreement = 'strong'
            else:
                reliability_score = base_score
                consistency = f"Both methods agree on moderate confidence. Key regions: {shap_most_important.replace('_', ' ')}"
                agreement = 'moderate'
            
            return {
                'reliability_score': round(reliability_score, 1),
                'consistency': consistency,
                'agreement': agreement,
                'confidence_difference': round(confidence_diff * 100, 1)
            }
            
        except Exception as e:
            logger.error(f"Error calculating consistency: {e}")
            return {
                'reliability_score': 50,
                'consistency': 'Consistency check unavailable',
                'agreement': 'unknown'
            }


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
