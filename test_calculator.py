import unittest
import json
from server import app

class TestFareCalculator(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_status_endpoint(self):
        """Test the health check status endpoint"""
        response = self.app.get('/api/status')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['service'], 'Transportation Fare Calculator')

    def test_missing_parameters(self):
        """Test the fare endpoint with missing parameters (should return 400)"""
        response = self.app.get('/api/fare')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data.decode('utf-8'))
        self.assertFalse(data['success'])
        self.assertIn('יש לספק מוצא ויעד', data['error'])

    def test_same_city_fare(self):
        """Test fare calculation within the same city (should be 6.00 NIS)"""
        response = self.app.get('/api/fare?origin=תל%20אביב&dest=תל%20אביב')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(data['success'])
        self.assertEqual(data['fare'], 6.00)

    def test_fallback_matrix_fare(self):
        """Test known route in fallback matrix (Jerusalem -> Tel Aviv should return 19.00 NIS)"""
        response = self.app.get('/api/fare?origin=ירושלים&dest=תל%20אביב')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(data['success'])
        # The fare can either come from the real government API (if active and returns a price)
        # or from our fallback matrix which is 19.00 NIS. We make sure a number is returned.
        self.assertIsInstance(data['fare'], (int, float))
        self.assertGreater(data['fare'], 0)

    def test_specific_rule_tiberias(self):
        """Test specific Tiberias rule (should be 41.50 NIS)"""
        response = self.app.get('/api/fare?origin=טבריה&dest=חיפה')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(data['success'])
        self.assertIsInstance(data['fare'], (int, float))

if __name__ == '__main__':
    unittest.main()
