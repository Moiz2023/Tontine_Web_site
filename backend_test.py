import requests
import json
import sys
from datetime import datetime, timedelta

class TontineAPITester:
    def __init__(self, base_url="https://group-fund-7.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.user_token = None
        self.user_id = None
        self.tontine_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, response_data=None, error_msg=None):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        
        if success:
            self.tests_passed += 1
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
        else:
            self.failed_tests.append({"name": name, "error": error_msg})
            if error_msg:
                print(f"   Error: {error_msg}")
        print()

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            success = response.status_code == 200
            data = response.json() if success else None
            error_msg = f"Status: {response.status_code}" if not success else None
            
            self.log_test("Root API endpoint", success, data, error_msg)
            return success
        except Exception as e:
            self.log_test("Root API endpoint", False, error_msg=str(e))
            return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"test_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}",
            "phone": "+33123456789"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/register", json=test_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.user_token = data.get('token')
                self.user_id = data.get('user_id')
                # Set cookies for subsequent requests
                if response.cookies:
                    self.session.cookies.update(response.cookies)
            else:
                data = response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("User registration", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("User registration", False, error_msg=str(e))
            return False

    def test_user_login(self):
        """Test user login (using the same credentials from registration)"""
        if not hasattr(self, 'test_email'):
            # Use a fresh set of credentials for login test
            timestamp = datetime.now().strftime("%H%M%S")
            self.test_email = f"test_{timestamp}@example.com"
            self.test_password = "TestPass123!"
            
            # First register the user
            register_data = {
                "email": self.test_email,
                "password": self.test_password,
                "name": f"Login Test User {timestamp}",
                "phone": "+33123456789"
            }
            
            register_response = self.session.post(f"{self.base_url}/auth/register", json=register_data)
            if register_response.status_code != 200:
                self.log_test("User login (setup)", False, error_msg="Failed to create test user for login")
                return False
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if response.cookies:
                    self.session.cookies.update(response.cookies)
            else:
                data = response.text
                
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("User login", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("User login", False, error_msg=str(e))
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        try:
            response = self.session.get(f"{self.base_url}/auth/me")
            success = response.status_code == 200
            data = response.json() if success else response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("Get current user (/auth/me)", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("Get current user (/auth/me)", False, error_msg=str(e))
            return False

    def test_kyc_submission(self):
        """Test KYC submission"""
        kyc_data = {
            "id_type": "id_card",
            "id_number": "123456789",
            "iban": "FR7612345678901234567890123",
            "address": "123 Test Street",
            "city": "Paris",
            "postal_code": "75001",
            "country": "FR"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/kyc/submit", json=kyc_data)
            success = response.status_code == 200
            data = response.json() if success else response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("KYC submission", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("KYC submission", False, error_msg=str(e))
            return False

    def test_tontine_creation(self):
        """Test tontine creation"""
        start_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        tontine_data = {
            "name": "Test Tontine API",
            "description": "Test tontine created via API testing",
            "monthly_amount": 200.0,
            "max_participants": 6,
            "duration_months": 6,
            "start_date": start_date,
            "attribution_mode": "fixed",
            "min_trust_score": 30
        }
        
        try:
            response = self.session.post(f"{self.base_url}/tontines", json=tontine_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.tontine_id = data.get('tontine_id')
            else:
                data = response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("Tontine creation", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("Tontine creation", False, error_msg=str(e))
            return False

    def test_tontines_list(self):
        """Test listing user's tontines"""
        try:
            response = self.session.get(f"{self.base_url}/tontines/user/active")
            success = response.status_code == 200
            data = response.json() if success else response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("List user tontines", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("List user tontines", False, error_msg=str(e))
            return False

    def test_marketplace(self):
        """Test marketplace endpoint (public)"""
        try:
            # Test without authentication first
            temp_session = requests.Session()
            response = temp_session.get(f"{self.base_url}/tontines/marketplace")
            success = response.status_code == 200
            data = response.json() if success else response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("Marketplace endpoint", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("Marketplace endpoint", False, error_msg=str(e))
            return False

    def test_tontine_details(self):
        """Test getting tontine details"""
        if not self.tontine_id:
            self.log_test("Tontine details", False, error_msg="No tontine_id available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/tontines/{self.tontine_id}")
            success = response.status_code == 200
            data = response.json() if success else response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("Tontine details", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("Tontine details", False, error_msg=str(e))
            return False

    def test_wallet(self):
        """Test wallet endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/wallet")
            success = response.status_code == 200
            data = response.json() if success else response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("Wallet endpoint", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("Wallet endpoint", False, error_msg=str(e))
            return False

    def test_trust_score(self):
        """Test trust score endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/trust-score")
            success = response.status_code == 200
            data = response.json() if success else response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("Trust score endpoint", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("Trust score endpoint", False, error_msg=str(e))
            return False

    def test_support_ticket(self):
        """Test support ticket creation"""
        ticket_data = {
            "subject": "API Test Ticket",
            "message": "This is a test ticket created during API testing.",
            "category": "general"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/support/tickets", json=ticket_data)
            success = response.status_code == 200
            data = response.json() if success else response.text
            
            error_msg = f"Status: {response.status_code}, Response: {data}" if not success else None
            self.log_test("Support ticket creation", success, data if success else None, error_msg)
            return success
        except Exception as e:
            self.log_test("Support ticket creation", False, error_msg=str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Tontine Platform API Tests")
        print("=" * 50)
        
        # Test basic connectivity
        if not self.test_root_endpoint():
            print("❌ Basic connectivity failed. Stopping tests.")
            return False
        
        # Test authentication flow
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me()
        
        # Test KYC (needed for tontine operations)
        self.test_kyc_submission()
        
        # Test core tontine functionality
        self.test_tontine_creation()
        self.test_tontines_list()
        self.test_marketplace()
        self.test_tontine_details()
        
        # Test additional features
        self.test_wallet()
        self.test_trust_score()
        self.test_support_ticket()
        
        # Print summary
        print("=" * 50)
        print("🎯 TEST SUMMARY")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test['name']}: {test['error']}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = TontineAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)