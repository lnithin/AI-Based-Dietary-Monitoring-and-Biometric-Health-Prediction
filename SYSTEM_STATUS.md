# � System Status

**Date:** January 9, 2026  
**State:** ✅ Ready after `./start-all.ps1` (backend 8000, frontend 5173, biomarker/fusion 5001, CV 5002)

---

## Services (expected after start)
| Service | Port | Health/Info |
|---------|------|-------------|
| Biomarker + Fusion API | 5001 | http://localhost:5001/health |
| Glucose features | 5001 | http://localhost:5001/api/glucose-prediction/features |
| BP explainability | 5001 | http://localhost:5001/api/blood-pressure/explain |
| Cholesterol | 5001 | http://localhost:5001/api/cholesterol/health |
| Fusion | 5001 | http://localhost:5001/api/fusion/info |
| Backend (Node) | 8000 | http://localhost:8000 |
| Frontend (React) | 5173 | http://localhost:5173 |
| CV Service | 5002 | http://localhost:5002 |

---

## Smoke Checks
- `GET http://localhost:5001/health` → status `ok`
- `POST /api/glucose-prediction/predict` with meal_features → returns `final_glucose`, `risk_classification`
- `POST /api/blood-pressure/predict` then `POST /api/blood-pressure/explain` → `sum_rule_validated: true`
- `POST /api/fusion/predict` → `final_prediction = baseline + delta` and reliability label

---

## Test Suite
- Fusion validation: `cd ml-services/prediction_service && python test_fusion_fixes.py`
- End-to-end (if configured): `python test_fusion_e2e.py`
- Status: **Not run in this session** (run locally after starting services)

---

## Notes
- Ports are defined in `start-all.ps1`; stop lingering `node`/`python` processes before restarting.
- CV service is optional but improves food recognition accuracy.

_Last updated: January 9, 2026_
