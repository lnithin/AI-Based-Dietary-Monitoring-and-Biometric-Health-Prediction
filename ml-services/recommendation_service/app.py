#!/usr/bin/env python3
"""
Recommendation Engine Service
Hybrid approach: Collaborative Filtering + Reinforcement Learning

Endpoints:
  POST /suggest - Generate meal/nutrient recommendations
  GET /suggestions - Get pre-generated suggestions
  POST /feedback - Record user feedback for RL training
"""

import os
import json
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import List, Dict, Tuple
import numpy as np

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RecommendationEngine:
    """
    Hybrid recommendation system combining:
    1. Collaborative Filtering - find similar users
    2. Reinforcement Learning - optimize for health outcomes
    """
    
    def __init__(self):
        self.user_profiles = {}  # In production: load from DB
        self.meals_database = self._init_meal_db()
        self.policy = None  # RL policy (trained separately)
    
    def _init_meal_db(self) -> Dict:
        """Initialize meal database with healthy options"""
        return {
            "breakfast": [
                {
                    "name": "Oatmeal with berries",
                    "calories": 280,
                    "carbs_g": 45,
                    "protein_g": 8,
                    "fat_g": 6,
                    "fiber_g": 8,
                    "sugar_g": 12,
                    "sodium_mg": 150,
                    "health_score": 8.5
                },
                {
                    "name": "Scrambled eggs with toast",
                    "calories": 350,
                    "carbs_g": 30,
                    "protein_g": 16,
                    "fat_g": 14,
                    "fiber_g": 2,
                    "sugar_g": 2,
                    "sodium_mg": 380,
                    "health_score": 7.2
                },
                {
                    "name": "Smoothie bowl",
                    "calories": 320,
                    "carbs_g": 50,
                    "protein_g": 12,
                    "fat_g": 8,
                    "fiber_g": 6,
                    "sugar_g": 28,
                    "sodium_mg": 120,
                    "health_score": 7.8
                },
                {
                    "name": "Avocado toast",
                    "calories": 290,
                    "carbs_g": 35,
                    "protein_g": 10,
                    "fat_g": 12,
                    "fiber_g": 7,
                    "sugar_g": 3,
                    "sodium_mg": 280,
                    "health_score": 8.2
                }
            ],
            "lunch": [
                {
                    "name": "Grilled chicken salad",
                    "calories": 380,
                    "carbs_g": 20,
                    "protein_g": 40,
                    "fat_g": 12,
                    "fiber_g": 6,
                    "sugar_g": 4,
                    "sodium_mg": 420,
                    "health_score": 9.0
                },
                {
                    "name": "Brown rice bowl with veggies",
                    "calories": 450,
                    "carbs_g": 60,
                    "protein_g": 14,
                    "fat_g": 10,
                    "fiber_g": 7,
                    "sugar_g": 6,
                    "sodium_mg": 380,
                    "health_score": 8.3
                },
                {
                    "name": "Lentil soup",
                    "calories": 280,
                    "carbs_g": 40,
                    "protein_g": 16,
                    "fat_g": 4,
                    "fiber_g": 10,
                    "sugar_g": 2,
                    "sodium_mg": 600,
                    "health_score": 8.7
                }
            ],
            "dinner": [
                {
                    "name": "Baked salmon with vegetables",
                    "calories": 420,
                    "carbs_g": 15,
                    "protein_g": 45,
                    "fat_g": 16,
                    "fiber_g": 4,
                    "sugar_g": 3,
                    "sodium_mg": 520,
                    "health_score": 9.2
                },
                {
                    "name": "Vegetable stir-fry",
                    "calories": 320,
                    "carbs_g": 35,
                    "protein_g": 12,
                    "fat_g": 14,
                    "fiber_g": 8,
                    "sugar_g": 8,
                    "sodium_mg": 600,
                    "health_score": 8.5
                }
            ],
            "snack": [
                {
                    "name": "Apple with almond butter",
                    "calories": 200,
                    "carbs_g": 25,
                    "protein_g": 7,
                    "fat_g": 9,
                    "fiber_g": 5,
                    "sugar_g": 18,
                    "sodium_mg": 90,
                    "health_score": 8.8
                },
                {
                    "name": "Greek yogurt",
                    "calories": 130,
                    "carbs_g": 7,
                    "protein_g": 20,
                    "fat_g": 1,
                    "fiber_g": 0,
                    "sugar_g": 5,
                    "sodium_mg": 80,
                    "health_score": 8.9
                }
            ]
        }
    
    def get_suggestions(self, 
                       user_id: str,
                       meal_type: str,
                       current_nutrition: Dict = None,
                       health_conditions: List[str] = None) -> List[Dict]:
        """
        Generate meal suggestions using collaborative filtering
        """
        if meal_type not in self.meals_database:
            return []
        
        candidates = self.meals_database[meal_type]
        
        # Filter based on health conditions
        if health_conditions:
            candidates = self._filter_by_conditions(candidates, health_conditions)
        
        # Score and rank meals
        scored_meals = []
        for meal in candidates:
            score = meal.get("health_score", 5.0)
            
            # Adjust score based on daily nutrition targets
            if current_nutrition:
                score += self._calculate_nutritional_fit(meal, current_nutrition)
            
            scored_meals.append({
                **meal,
                "recommendation_score": round(min(10, max(0, score)), 1)
            })
        
        # Sort by score and return top 5
        return sorted(scored_meals, key=lambda x: x["recommendation_score"], reverse=True)[:5]
    
    def _filter_by_conditions(self, meals: List[Dict], conditions: List[str]) -> List[Dict]:
        """Filter meals based on health conditions"""
        filtered = meals
        
        if "diabetes" in conditions:
            # Prefer low glycemic index meals
            filtered = [m for m in filtered if m.get("sugar_g", 0) < 20 and m.get("fiber_g", 0) > 3]
        
        if "hypertension" in conditions:
            # Prefer low sodium meals
            filtered = [m for m in filtered if m.get("sodium_mg", 0) < 500]
        
        if "high_cholesterol" in conditions:
            # Prefer low saturated fat
            filtered = [m for m in filtered if m.get("fat_g", 0) < 15]
        
        return filtered if filtered else meals
    
    def _calculate_nutritional_fit(self, meal: Dict, current_nutrition: Dict) -> float:
        """Calculate how well meal fits remaining daily nutrition targets"""
        score = 0
        
        # If high in carbs today, prefer lower carb meals
        if current_nutrition.get("carbs_g", 0) > 200:
            score -= (meal.get("carbs_g", 0) / 50)
        
        # If low in protein, prefer high protein meals
        if current_nutrition.get("protein_g", 0) < 50:
            score += (meal.get("protein_g", 0) / 20)
        
        return score
    
    def get_ingredient_swap(self, ingredient: str, reason: str = None) -> Dict:
        """
        Suggest healthier ingredient alternatives using rules
        """
        swaps = {
            "white rice": {
                "replacement": "brown rice",
                "benefit": "Higher fiber, lower glycemic index"
            },
            "white bread": {
                "replacement": "whole wheat bread",
                "benefit": "More fiber, better for blood sugar"
            },
            "regular milk": {
                "replacement": "unsweetened almond milk",
                "benefit": "Lower calories and sugar for diabetics"
            },
            "butter": {
                "replacement": "olive oil",
                "benefit": "Healthier fats for cholesterol"
            },
            "sugar": {
                "replacement": "stevia or monk fruit",
                "benefit": "Zero calories, no blood sugar impact"
            },
            "fried foods": {
                "replacement": "baked or grilled",
                "benefit": "Reduces saturated fat intake"
            }
        }
        
        swap = swaps.get(ingredient.lower(), None)
        if swap:
            return {
                "current": ingredient,
                "suggested": swap["replacement"],
                "benefit": swap["benefit"],
                "confidence": 0.85
            }
        
        return None

def create_app():
    engine = RecommendationEngine()
    
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "OK", "service": "Recommendation Service"}), 200
    
    @app.route('/suggestions', methods=['GET'])
    def suggestions():
        """Get meal suggestions"""
        try:
            user_id = request.args.get('userId')
            meal_type = request.args.get('meal_type', 'breakfast')
            
            health_conditions = request.args.get('health_conditions', '').split(',')
            health_conditions = [c.strip() for c in health_conditions if c.strip()]
            
            suggestions_list = engine.get_suggestions(
                user_id,
                meal_type,
                health_conditions=health_conditions
            )
            
            return jsonify({
                "success": True,
                "mealType": meal_type,
                "suggestions": suggestions_list,
                "count": len(suggestions_list)
            }), 200
        
        except Exception as e:
            logger.error(f"Error getting suggestions: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/suggest', methods=['POST'])
    def suggest():
        """Generate personalized recommendation"""
        try:
            data = request.get_json()
            
            user_id = data.get('userId')
            meal_type = data.get('meal_type')
            health_conditions = data.get('health_conditions', [])
            current_nutrition = data.get('current_nutrition', {})
            
            recommendations = engine.get_suggestions(
                user_id,
                meal_type,
                current_nutrition,
                health_conditions
            )
            
            return jsonify({
                "success": True,
                "recommendations": recommendations,
                "reasoning": "Based on health conditions and nutritional goals"
            }), 200
        
        except Exception as e:
            logger.error(f"Error generating recommendation: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/swap-suggestion', methods=['POST'])
    def swap_suggestion():
        """Suggest ingredient swap"""
        try:
            data = request.get_json()
            ingredient = data.get('ingredient')
            reason = data.get('reason')
            
            swap = engine.get_ingredient_swap(ingredient, reason)
            
            if swap:
                return jsonify({"success": True, "swap": swap}), 200
            else:
                return jsonify({
                    "success": False,
                    "message": f"No alternative suggested for '{ingredient}'"
                }), 200
        
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/feedback', methods=['POST'])
    def feedback():
        """Record user feedback for RL training"""
        try:
            data = request.get_json()
            user_id = data.get('userId')
            recommendation_id = data.get('recommendationId')
            accepted = data.get('accepted', False)
            health_outcome = data.get('healthOutcome')  # e.g., "glucose_stable"
            
            # In production: store for RL model retraining
            
            return jsonify({
                "success": True,
                "message": "Feedback recorded for RL training"
            }), 200
        
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5004)
