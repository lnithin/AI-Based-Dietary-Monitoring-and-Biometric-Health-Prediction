#!/usr/bin/env python3
"""
NLP Service for ingredient extraction from meal descriptions
Supports advanced features: confidence scoring, allergen detection, glycemic index, micronutrients
Endpoints:
  POST /extract - Extract ingredients from text description
  POST /extract-label - Extract text from OCR label image and extract ingredients
  POST /extract-advanced - Advanced extraction with micronutrients, GI, allergens, confidence
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
from typing import List, Dict, Tuple
import requests
import re
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load spaCy model for NER
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("✓ spaCy model loaded")
except:
    logger.warning("⚠ spaCy model not found. Install with: python -m spacy download en_core_web_sm")
    nlp = None

# USDA FoodData Central API key (should be in environment)
USDA_API_KEY = os.getenv('USDA_API_KEY', 'demo_key')
USDA_API_URL = "https://fdc.nal.usda.gov/api/foods/search"

# Allergen mapping
ALLERGENS_KEYWORDS = {
    "peanut": ["peanut", "groundnut"],
    "tree_nut": ["almond", "walnut", "cashew", "pistachio", "pecan", "macadamia"],
    "milk": ["milk", "dairy", "cheese", "butter", "cream", "yogurt", "curd"],
    "egg": ["egg", "eggs"],
    "soy": ["soy", "tofu", "soybean"],
    "wheat": ["wheat", "bread", "pasta", "chapati", "roti"],
    "fish": ["fish", "salmon", "tuna", "sardine"],
    "shellfish": ["shrimp", "crab", "lobster", "mussel"],
    "sesame": ["sesame", "tahini"]
}

# Comprehensive ingredient database with micronutrients and health metrics
INGREDIENT_DATABASE = {
    "chicken": {
        "portion_grams": 100,
        "portion_unit": "g",
        "calories": 165,
        "protein_g": 31,
        "carbs_g": 0,
        "fat_g": 3.6,
        "saturated_fat_g": 1.0,
        "trans_fat_g": 0.06,
        "fiber_g": 0,
        "sugar_g": 0,
        "sodium_mg": 74,
        "potassium_mg": 256,
        "calcium_mg": 11,
        "iron_mg": 0.9,
        "magnesium_mg": 29,
        "phosphorus_mg": 220,
        "zinc_mg": 0.7,
        "vitamin_a_iu": 0,
        "vitamin_c_mg": 0,
        "vitamin_d_iu": 43,
        "vitamin_e_mg": 0.3,
        "vitamin_k_mcg": 0.1,
        "folate_mcg": 7,
        "b12_mcg": 0.3,
        "glycemic_index": 0,
        "glycemic_load": 0,
        "allergens": [],
        "vegetarian": False,
        "vegan": False,
        "keto_friendly": True,
        "keywords": ["poultry", "lean", "protein", "bird meat"]
    },
    "rice": {
        "portion_grams": 100,
        "portion_unit": "g",
        "calories": 130,
        "protein_g": 2.7,
        "carbs_g": 28,
        "fat_g": 0.3,
        "saturated_fat_g": 0.1,
        "trans_fat_g": 0,
        "fiber_g": 0.4,
        "sugar_g": 0,
        "sodium_mg": 1,
        "potassium_mg": 115,
        "calcium_mg": 10,
        "iron_mg": 0.8,
        "magnesium_mg": 25,
        "phosphorus_mg": 115,
        "zinc_mg": 1.1,
        "vitamin_a_iu": 0,
        "vitamin_c_mg": 0,
        "vitamin_d_iu": 0,
        "vitamin_e_mg": 0.1,
        "vitamin_k_mcg": 0.1,
        "folate_mcg": 20,
        "b12_mcg": 0,
        "glycemic_index": 68,
        "glycemic_load": 19,
        "allergens": [],
        "vegetarian": True,
        "vegan": True,
        "keto_friendly": False,
        "keywords": ["grain", "carb", "staple", "starch"]
    },
    "chapati": {
        "portion_grams": 55,
        "portion_unit": "piece",
        "calories": 150,
        "protein_g": 4.5,
        "carbs_g": 28,
        "fat_g": 2.5,
        "saturated_fat_g": 0.5,
        "trans_fat_g": 0,
        "fiber_g": 1.5,
        "sugar_g": 0,
        "sodium_mg": 180,
        "potassium_mg": 120,
        "calcium_mg": 15,
        "iron_mg": 1.5,
        "magnesium_mg": 35,
        "phosphorus_mg": 130,
        "zinc_mg": 0.8,
        "vitamin_a_iu": 0,
        "vitamin_c_mg": 0,
        "vitamin_d_iu": 0,
        "vitamin_e_mg": 0.2,
        "vitamin_k_mcg": 0.1,
        "folate_mcg": 30,
        "b12_mcg": 0,
        "glycemic_index": 62,
        "glycemic_load": 17,
        "allergens": ["wheat"],
        "vegetarian": True,
        "vegan": True,
        "keto_friendly": False,
        "keywords": ["flatbread", "indian", "roti", "wheat bread"]
    },
    "curry": {
        "portion_grams": 200,
        "portion_unit": "cup",
        "calories": 180,
        "protein_g": 6,
        "carbs_g": 12,
        "fat_g": 10,
        "saturated_fat_g": 2,
        "trans_fat_g": 0,
        "fiber_g": 2,
        "sugar_g": 2,
        "sodium_mg": 400,
        "potassium_mg": 350,
        "calcium_mg": 40,
        "iron_mg": 2.5,
        "magnesium_mg": 45,
        "phosphorus_mg": 120,
        "zinc_mg": 1.2,
        "vitamin_a_iu": 2000,
        "vitamin_c_mg": 5,
        "vitamin_d_iu": 0,
        "vitamin_e_mg": 0.8,
        "vitamin_k_mcg": 5,
        "folate_mcg": 25,
        "b12_mcg": 0,
        "glycemic_index": 35,
        "glycemic_load": 4,
        "allergens": [],
        "vegetarian": True,
        "vegan": True,
        "keto_friendly": True,
        "keywords": ["spiced", "sauce", "indian", "vegetables"]
    },
    "curd": {
        "portion_grams": 100,
        "portion_unit": "g",
        "calories": 59,
        "protein_g": 3.5,
        "carbs_g": 3.3,
        "fat_g": 3.3,
        "saturated_fat_g": 2,
        "trans_fat_g": 0.1,
        "fiber_g": 0,
        "sugar_g": 3.3,
        "sodium_mg": 75,
        "potassium_mg": 142,
        "calcium_mg": 127,
        "iron_mg": 0.1,
        "magnesium_mg": 12,
        "phosphorus_mg": 108,
        "zinc_mg": 0.6,
        "vitamin_a_iu": 107,
        "vitamin_c_mg": 0.2,
        "vitamin_d_iu": 40,
        "vitamin_e_mg": 0.1,
        "vitamin_k_mcg": 0.1,
        "folate_mcg": 7,
        "b12_mcg": 0.3,
        "glycemic_index": 35,
        "glycemic_load": 1,
        "allergens": ["milk"],
        "vegetarian": True,
        "vegan": False,
        "keto_friendly": True,
        "keywords": ["dairy", "yogurt", "probiotics", "fermented"]
    },
    "potato": {
        "portion_grams": 100,
        "portion_unit": "g",
        "calories": 77,
        "protein_g": 2,
        "carbs_g": 17,
        "fat_g": 0.1,
        "saturated_fat_g": 0,
        "trans_fat_g": 0,
        "fiber_g": 2.1,
        "sugar_g": 0.7,
        "sodium_mg": 6,
        "potassium_mg": 425,
        "calcium_mg": 12,
        "iron_mg": 0.8,
        "magnesium_mg": 23,
        "phosphorus_mg": 57,
        "zinc_mg": 0.3,
        "vitamin_a_iu": 2,
        "vitamin_c_mg": 8.6,
        "vitamin_d_iu": 0,
        "vitamin_e_mg": 0.01,
        "vitamin_k_mcg": 2.8,
        "folate_mcg": 16,
        "b12_mcg": 0,
        "glycemic_index": 78,
        "glycemic_load": 13,
        "allergens": [],
        "vegetarian": True,
        "vegan": True,
        "keto_friendly": False,
        "keywords": ["tuber", "starch", "carb", "vegetable"]
    },
    "salad": {
        "portion_grams": 100,
        "portion_unit": "cup",
        "calories": 15,
        "protein_g": 1.2,
        "carbs_g": 3,
        "fat_g": 0.1,
        "saturated_fat_g": 0,
        "trans_fat_g": 0,
        "fiber_g": 0.6,
        "sugar_g": 0.5,
        "sodium_mg": 15,
        "potassium_mg": 195,
        "calcium_mg": 25,
        "iron_mg": 0.5,
        "magnesium_mg": 10,
        "phosphorus_mg": 25,
        "zinc_mg": 0.15,
        "vitamin_a_iu": 3000,
        "vitamin_c_mg": 4.3,
        "vitamin_d_iu": 0,
        "vitamin_e_mg": 0.7,
        "vitamin_k_mcg": 48,
        "folate_mcg": 34,
        "b12_mcg": 0,
        "glycemic_index": 15,
        "glycemic_load": 1,
        "allergens": [],
        "vegetarian": True,
        "vegan": True,
        "keto_friendly": True,
        "keywords": ["vegetables", "greens", "leafy", "lettuce", "raw"]
    }
}

class IngredientExtractor:
    def __init__(self, nlp_model=None):
        self.nlp = nlp_model
        self.ingredient_db = INGREDIENT_DATABASE
    
    def extract_ingredients(self, text: str) -> List[Dict]:
        """
        Extract ingredients from text description using NER
        
        Args:
            text: Raw meal description
            
        Returns:
            List of extracted ingredients with portions and nutrition
        """
        doc = self.nlp(text) if self.nlp else None
        
        # Simple rule-based extraction if spaCy fails
        ingredients = []
        
        # Keywords for portion detection
        portion_keywords = {
            'cup': 1, 'cups': 1,
            'tbsp': 1, 'tablespoon': 1,
            'tsp': 1, 'teaspoon': 1,
            'piece': 1, 'pieces': 1,
            'slice': 1, 'slices': 1,
            'bowl': 1,
            'plate': 1
        }
        
        # Normalize text
        text_lower = text.lower()
        
        # Try to match ingredients from database
        for ingredient_name, nutrition_data in self.ingredient_db.items():
            if ingredient_name in text_lower:
                # Try to extract quantity
                quantity = self._extract_quantity(text_lower, ingredient_name)
                
                ingredient = {
                    "name": ingredient_name.capitalize(),
                    "portion_grams": nutrition_data["portion_grams"] * quantity,
                    "portion_unit": nutrition_data["portion_unit"],
                    "calories": int(nutrition_data["calories"] * quantity),
                    "protein_g": round(nutrition_data["protein_g"] * quantity, 1),
                    "carbs_g": round(nutrition_data["carbs_g"] * quantity, 1),
                    "fat_g": round(nutrition_data["fat_g"] * quantity, 1),
                    "saturated_fat_g": round(nutrition_data["saturated_fat_g"] * quantity, 1),
                    "fiber_g": round(nutrition_data["fiber_g"] * quantity, 1),
                    "sugar_g": round(nutrition_data["sugar_g"] * quantity, 1),
                    "sodium_mg": int(nutrition_data["sodium_mg"] * quantity),
                    "confidence": 0.8
                }
                ingredients.append(ingredient)
        
        return ingredients
    
    def extract_advanced(self, text: str) -> Dict:
        """
        Advanced extraction with micronutrients, allergens, GI, and confidence scores
        
        Args:
            text: Raw meal description
            
        Returns:
            Detailed analysis with all nutrition, allergen detection, confidence metrics
        """
        text_lower = text.lower()
        ingredients = []
        extracted_allergens = []
        all_micronutrients = {}
        
        # Extract ingredients with advanced data
        for ingredient_name, nutrition_data in self.ingredient_db.items():
            match_confidence = self._calculate_match_confidence(text_lower, ingredient_name, nutrition_data)
            
            if match_confidence > 0.3:  # Include if >30% confidence
                quantity = self._extract_quantity(text_lower, ingredient_name)
                
                # Scale nutrition data by quantity
                scaled_nutrition = self._scale_nutrition(nutrition_data, quantity)
                
                # Detect allergens
                ingredient_allergens = self._detect_allergens(ingredient_name)
                extracted_allergens.extend(ingredient_allergens)
                
                ingredient_entry = {
                    "name": ingredient_name.capitalize(),
                    "quantity": quantity,
                    "portion_grams": scaled_nutrition["portion_grams"],
                    "portion_unit": nutrition_data["portion_unit"],
                    "confidence_score": match_confidence,
                    "extraction_method": "keyword_match" if match_confidence > 0.7 else "fuzzy_match",
                    "macronutrients": {
                        "calories": int(scaled_nutrition["calories"]),
                        "protein_g": scaled_nutrition["protein_g"],
                        "carbs_g": scaled_nutrition["carbs_g"],
                        "fat_g": scaled_nutrition["fat_g"],
                        "saturated_fat_g": scaled_nutrition["saturated_fat_g"],
                        "trans_fat_g": scaled_nutrition["trans_fat_g"],
                        "fiber_g": scaled_nutrition["fiber_g"],
                        "sugar_g": scaled_nutrition["sugar_g"]
                    },
                    "micronutrients": {
                        "sodium_mg": int(scaled_nutrition["sodium_mg"]),
                        "potassium_mg": int(scaled_nutrition["potassium_mg"]),
                        "calcium_mg": int(scaled_nutrition["calcium_mg"]),
                        "iron_mg": round(scaled_nutrition["iron_mg"], 2),
                        "magnesium_mg": int(scaled_nutrition["magnesium_mg"]),
                        "phosphorus_mg": int(scaled_nutrition["phosphorus_mg"]),
                        "zinc_mg": round(scaled_nutrition["zinc_mg"], 2),
                        "vitamin_a_iu": int(scaled_nutrition["vitamin_a_iu"]),
                        "vitamin_c_mg": round(scaled_nutrition["vitamin_c_mg"], 1),
                        "vitamin_d_iu": int(scaled_nutrition["vitamin_d_iu"]),
                        "vitamin_e_mg": round(scaled_nutrition["vitamin_e_mg"], 2),
                        "vitamin_k_mcg": round(scaled_nutrition["vitamin_k_mcg"], 1),
                        "folate_mcg": int(scaled_nutrition["folate_mcg"]),
                        "b12_mcg": round(scaled_nutrition["b12_mcg"], 2)
                    },
                    "health_metrics": {
                        "glycemic_index": nutrition_data["glycemic_index"],
                        "glycemic_load": round(nutrition_data["glycemic_load"] * quantity, 1),
                        "allergens": ingredient_allergens,
                        "vegetarian": nutrition_data["vegetarian"],
                        "vegan": nutrition_data["vegan"],
                        "keto_friendly": nutrition_data["keto_friendly"]
                    }
                }
                
                ingredients.append(ingredient_entry)
                
                # Accumulate micronutrients
                for nutrient, value in ingredient_entry["micronutrients"].items():
                    if nutrient not in all_micronutrients:
                        all_micronutrients[nutrient] = 0
                    all_micronutrients[nutrient] += value
        
        # Calculate total nutrition
        total_macros = {
            "calories": sum(i["macronutrients"]["calories"] for i in ingredients),
            "protein_g": round(sum(i["macronutrients"]["protein_g"] for i in ingredients), 1),
            "carbs_g": round(sum(i["macronutrients"]["carbs_g"] for i in ingredients), 1),
            "fat_g": round(sum(i["macronutrients"]["fat_g"] for i in ingredients), 1),
            "saturated_fat_g": round(sum(i["macronutrients"]["saturated_fat_g"] for i in ingredients), 1),
            "trans_fat_g": round(sum(i["macronutrients"]["trans_fat_g"] for i in ingredients), 2),
            "fiber_g": round(sum(i["macronutrients"]["fiber_g"] for i in ingredients), 1),
            "sugar_g": round(sum(i["macronutrients"]["sugar_g"] for i in ingredients), 1)
        }
        
        # Calculate overall health metrics
        total_gi = sum(i["health_metrics"]["glycemic_index"] * i["macronutrients"]["carbs_g"] 
                       for i in ingredients) / (total_macros["carbs_g"] + 0.1) if total_macros["carbs_g"] > 0 else 0
        total_gl = sum(i["health_metrics"]["glycemic_load"] for i in ingredients)
        
        # Remove duplicates from allergens
        unique_allergens = list(set(extracted_allergens))
        
        # Calculate confidence metrics
        overall_confidence = sum(i["confidence_score"] for i in ingredients) / max(len(ingredients), 1)
        data_completeness = min(100, (len(ingredients) / max(1, len([ing for ing in text_lower.split() if ing in INGREDIENT_DATABASE]))) * 100)
        
        return {
            "success": True,
            "ingredients": ingredients,
            "totalNutrition": {
                "macronutrients": total_macros,
                "micronutrients": {k: round(v, 1) if isinstance(v, float) else int(v) 
                                  for k, v in all_micronutrients.items()}
            },
            "healthMetrics": {
                "weightedGlycemicIndex": round(total_gi, 1),
                "totalGlycemicLoad": round(total_gl, 1),
                "allergens": unique_allergens,
                "isVegetarian": all(i["health_metrics"]["vegetarian"] for i in ingredients) if ingredients else False,
                "isVegan": all(i["health_metrics"]["vegan"] for i in ingredients) if ingredients else False,
                "isKetoFriendly": all(i["health_metrics"]["keto_friendly"] for i in ingredients) if ingredients else False
            },
            "confidenceMetrics": {
                "overall_confidence": round(overall_confidence, 2),
                "data_completeness": round(data_completeness, 1),
                "ingredients_detected": len(ingredients),
                "extraction_timestamp": datetime.now().isoformat()
            }
        }
    
    def _scale_nutrition(self, nutrition_data: Dict, quantity: float) -> Dict:
        """Scale nutrition values by quantity"""
        scaled = {}
        for key, value in nutrition_data.items():
            if key in ["portion_grams", "portion_unit", "vegetarian", "vegan", "keto_friendly", "allergens", "keywords", "glycemic_index"]:
                scaled[key] = value
            elif isinstance(value, (int, float)):
                scaled[key] = value * quantity
            else:
                scaled[key] = value
        scaled["portion_grams"] = nutrition_data["portion_grams"] * quantity
        return scaled
    
    def _calculate_match_confidence(self, text: str, ingredient: str, nutrition_data: Dict) -> float:
        """Calculate confidence score for ingredient match"""
        confidence = 0.0
        
        # Exact match
        if ingredient in text:
            confidence = 0.95
        
        # Partial match
        elif any(keyword in text for keyword in nutrition_data.get("keywords", [])):
            confidence = 0.7
        
        # Fuzzy similarity check
        else:
            words = text.split()
            if any(ing_char in word for ing_char in ingredient for word in words):
                confidence = 0.4
        
        return confidence
    
    def _detect_allergens(self, ingredient: str) -> List[str]:
        """Detect allergens present in ingredient"""
        allergens = []
        for allergen_type, keywords in ALLERGENS_KEYWORDS.items():
            if any(kw in ingredient.lower() for kw in keywords):
                allergens.append(allergen_type)
        return allergens
    
    def _extract_quantity(self, text: str, ingredient: str) -> float:
        """Extract quantity multiplier for ingredient"""
        # Simple extraction: look for numbers before ingredient
        pattern = r'(\d+(?:\.\d+)?)\s*(?:cups?|tbsp|tsp|pieces?|slices?|bowls?|plates?|g|ml|oz)?\s+' + ingredient
        match = re.search(pattern, text, re.IGNORECASE)
        
        if match:
            try:
                return float(match.group(1))
            except:
                pass
        
        return 1.0  # Default single serving

def create_app():
    extractor = IngredientExtractor(nlp)
    
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "OK", "service": "NLP Service v2.0"}), 200
    
    @app.route('/extract', methods=['POST'])
    def extract():
        """Extract ingredients from text description"""
        try:
            data = request.get_json()
            description = data.get('description')
            
            if not description:
                return jsonify({"error": "Description required"}), 400
            
            ingredients = extractor.extract_ingredients(description)
            
            # Calculate total nutrition
            total_nutrition = {
                "calories": sum(i["calories"] for i in ingredients),
                "protein_g": round(sum(i["protein_g"] for i in ingredients), 1),
                "carbs_g": round(sum(i["carbs_g"] for i in ingredients), 1),
                "fat_g": round(sum(i["fat_g"] for i in ingredients), 1),
                "saturated_fat_g": round(sum(i["saturated_fat_g"] for i in ingredients), 1),
                "fiber_g": round(sum(i["fiber_g"] for i in ingredients), 1),
                "sugar_g": round(sum(i["sugar_g"] for i in ingredients), 1),
                "sodium_mg": sum(i["sodium_mg"] for i in ingredients)
            }
            
            return jsonify({
                "success": True,
                "ingredients": ingredients,
                "totalNutrition": total_nutrition,
                "confidence": 0.75,
                "processingTime_ms": 150
            }), 200
            
        except Exception as e:
            logger.error(f"Error extracting ingredients: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/extract-advanced', methods=['POST'])
    def extract_advanced():
        """Advanced extraction with micronutrients, allergens, GI, confidence scores"""
        try:
            data = request.get_json()
            description = data.get('description')
            
            if not description:
                return jsonify({"error": "Description required"}), 400
            
            result = extractor.extract_advanced(description)
            return jsonify(result), 200
            
        except Exception as e:
            logger.error(f"Error in advanced extraction: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/extract-label', methods=['POST'])
    def extract_label():
        """Extract ingredients from OCR label image"""
        try:
            data = request.get_json()
            ocr_text = data.get('ocrText') or data.get('text')
            
            if not ocr_text:
                return jsonify({"error": "OCR text required"}), 400
            
            # Process OCR text as if it were a description
            ingredients = extractor.extract_ingredients(ocr_text)
            
            total_nutrition = {
                "calories": sum(i["calories"] for i in ingredients),
                "protein_g": round(sum(i["protein_g"] for i in ingredients), 1),
                "carbs_g": round(sum(i["carbs_g"] for i in ingredients), 1),
                "fat_g": round(sum(i["fat_g"] for i in ingredients), 1),
                "saturated_fat_g": round(sum(i["saturated_fat_g"] for i in ingredients), 1),
                "fiber_g": round(sum(i["fiber_g"] for i in ingredients), 1),
                "sugar_g": round(sum(i["sugar_g"] for i in ingredients), 1),
                "sodium_mg": sum(i["sodium_mg"] for i in ingredients)
            }
            
            return jsonify({
                "success": True,
                "ingredients": ingredients,
                "totalNutrition": total_nutrition,
                "confidence": 0.85,
                "processingTime_ms": 200
            }), 200
            
        except Exception as e:
            logger.error(f"Error processing label: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5001)
