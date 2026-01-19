# 🚀 Quick Start Guide

## Start Everything (Windows)
- Recommended: `./start-all.ps1` (starts backend :8000, frontend :5173, biomarker/fusion API :5001, CV service :5002).
- If you prefer manual start:
  - Backend: `cd backend; npm start`
  - Frontend: `cd frontend; npm run dev`
  - Biomarker + Fusion API: `cd ml-services/prediction_service; python run_api.py`
  - CV service: `cd ml-services/cv_service; python app.py`

## Service Map (after start)
| Service | Port | Health/Info |
|---------|------|-------------|
| React Frontend | 5173 | Home at http://localhost:5173 |
| Node.js Backend | 8000 | (REST) http://localhost:8000 |
| Biomarker + Fusion API | 5001 | http://localhost:5001/health |
| CV Service | 5002 | http://localhost:5002 (food recognition) |
| MongoDB | 27017 | Local/Atlas connection |

## Quick Interactions
- Open the app: http://localhost:5173
- Register/Login, then log a meal or biometric reading
- Hit health checks: `/health` on backend (if available) and `http://localhost:5001/health`
- Fusion info: `GET http://localhost:5001/api/fusion/info`

## Fusion Smoke Test (PowerShell)
```powershell
$body = @{
    biomarker = "cholesterol"
    cv_data = @{ food_name = "Vada"; confidence = 0.95 }
    nlp_data = @{ saturated_fat_g = 12; trans_fat_g = 0.3; dietary_cholesterol_mg = 180; fiber_g = 6; sugar_g = 20; sodium_mg = 1500 }
    biometric_data = @{ predicted_value = 195.5; baseline = 180.0; delta = 15.5; risk_level = "Borderline"; confidence = 0.82 }
} | ConvertTo-Json -Depth 4
Invoke-WebRequest -Uri "http://localhost:5001/api/fusion/predict" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: `fusion_result.final_prediction` ≈ `baseline + delta`, with reliability label and driver_summary.

## BP Explainability Smoke Test (PowerShell)
```powershell
# 1) Predict and cache
$feat = @{ sodium_mg=2400; stress_level=0.6; activity_level=0.4; age=45; weight_kg=78; caffeine_mg=120; sleep_quality=0.8; hydration_level=0.7; medication_taken=0; baseline_systolic=128; baseline_diastolic=82; time_since_last_meal=3 }
Invoke-WebRequest -Uri "http://localhost:5001/api/blood-pressure/predict" -Method POST -Body ($feat | ConvertTo-Json) -ContentType "application/json" -UseBasicParsing | Out-Null
# 2) Explain the cached prediction
$explainBody = @{ features = $feat; explain_method = "shap" } | ConvertTo-Json -Depth 3
Invoke-WebRequest -Uri "http://localhost:5001/api/blood-pressure/explain" -Method POST -Body $explainBody -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: `delta` matches predict output; `sum_rule_validated` should be true.

## Restart/Stop
- Stop all: close the spawned terminals or use `taskkill /IM node.exe` and Ctrl+C on Python windows.
- If ports are busy, stop old processes before rerunning `start-all.ps1`.

_Last updated: January 9, 2026_

