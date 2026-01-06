#!/usr/bin/env python3
import json
import unittest
from flask import Flask

class BPApiTest(unittest.TestCase):
    def setUp(self):
        from bp_api import bp_bp, init_bp_model
        init_bp_model()
        app = Flask(__name__)
        app.register_blueprint(bp_bp, url_prefix='/api/blood-pressure')
        self.app = app.test_client()

    def test_health(self):
        r = self.app.get('/api/blood-pressure/health')
        self.assertEqual(r.status_code, 200)

    def test_predict_high_sodium_raises(self):
        payload = {
            'sodium_mg': 3000, 'stress_level': 0.4, 'activity_level': 0.2,
            'age': 45, 'weight_kg': 80, 'caffeine_mg': 50, 'sleep_quality': 0.7,
            'hydration_level': 0.5, 'medication_taken': 0, 'baseline_systolic': 126,
            'baseline_diastolic': 82, 'time_since_last_meal': 1.0
        }
        r = self.app.post('/api/blood-pressure/predict', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        self.assertIn('prediction', data)
        # Expect systolic increase (delta contains +)
        self.assertTrue(data['prediction']['delta'].split('/')[0].startswith('+'))

    def test_predict_activity_hydration_reduce(self):
        payload = {
            'sodium_mg': 800, 'stress_level': 0.2, 'activity_level': 0.9,
            'age': 40, 'weight_kg': 78, 'caffeine_mg': 0, 'sleep_quality': 0.9,
            'hydration_level': 0.9, 'medication_taken': 0, 'baseline_systolic': 130,
            'baseline_diastolic': 85, 'time_since_last_meal': 2.0
        }
        r = self.app.post('/api/blood-pressure/predict', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        # Expect negative or small delta
        ds = float(data['prediction']['delta'].split('/')[0])
        self.assertLessEqual(ds, 5.0)

    def test_predict_medication_reduces(self):
        base = {
            'sodium_mg': 2400, 'stress_level': 0.6, 'activity_level': 0.3,
            'age': 55, 'weight_kg': 85, 'caffeine_mg': 100, 'sleep_quality': 0.6,
            'hydration_level': 0.5, 'baseline_systolic': 138, 'baseline_diastolic': 88,
            'time_since_last_meal': 0.5
        }
        with_med = dict(base, medication_taken=1)
        without_med = dict(base, medication_taken=0)

        r1 = self.app.post('/api/blood-pressure/predict', data=json.dumps(without_med), content_type='application/json')
        r2 = self.app.post('/api/blood-pressure/predict', data=json.dumps(with_med), content_type='application/json')
        d1 = json.loads(r1.data)['prediction']['delta']
        d2 = json.loads(r2.data)['prediction']['delta']
        ds1 = float(d1.split('/')[0])
        ds2 = float(d2.split('/')[0])
        self.assertLessEqual(ds2, ds1)

if __name__ == '__main__':
    unittest.main()
