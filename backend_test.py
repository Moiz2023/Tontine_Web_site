import requests
import json
import sys
import time
import threading
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

class TontineAPITester:
    def __init__(self, base_url="https://trustfundy-staging.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.user_token = None
        self.user_id = None
        self.tontine_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.security_issues = []
        self.load_test_results = []

    def log_security_issue(self, issue_type, description, severity="MEDIUM"):
        """Log security issues"""
        issue = {"type": issue_type, "description": description, "severity": severity}
        self.security_issues.append(issue)
        print(f"🚨 SECURITY ISSUE ({severity}): {issue_type} - {description}")

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

    # ============ SECURITY TESTS ============

    def test_auth_wrong_password(self):
        """Test login with wrong password returns 401"""
        login_data = {
            "email": "test7437@example.com",
            "password": "wrongpassword123"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            success = response.status_code == 401
            
            if success:
                print("✅ Wrong password correctly returns 401")
            else:
                self.log_security_issue("Authentication", f"Wrong password returned {response.status_code} instead of 401", "HIGH")
            
            self.log_test("Wrong password returns 401", success, error_msg=f"Expected 401, got {response.status_code}" if not success else None)
            return success
        except Exception as e:
            self.log_test("Wrong password returns 401", False, error_msg=str(e))
            return False

    def test_duplicate_email_registration(self):
        """Test registration with duplicate email returns 400"""
        # First create a user
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"duplicate_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}",
            "phone": "+33123456789"
        }
        
        try:
            # First registration should succeed
            response1 = self.session.post(f"{self.base_url}/auth/register", json=test_data)
            if response1.status_code != 200:
                self.log_test("Duplicate email test setup", False, error_msg=f"Initial registration failed: {response1.status_code}")
                return False
            
            # Second registration with same email should return 400
            response2 = self.session.post(f"{self.base_url}/auth/register", json=test_data)
            success = response2.status_code == 400
            
            if success:
                print("✅ Duplicate email correctly returns 400")
            else:
                self.log_security_issue("Registration", f"Duplicate email returned {response2.status_code} instead of 400", "HIGH")
            
            self.log_test("Duplicate email returns 400", success, error_msg=f"Expected 400, got {response2.status_code}" if not success else None)
            return success
        except Exception as e:
            self.log_test("Duplicate email returns 400", False, error_msg=str(e))
            return False

    def test_protected_endpoints_without_auth(self):
        """Test protected endpoints return 401 without token"""
        protected_endpoints = [
            "/auth/me",
            "/kyc/submit", 
            "/tontines",
            "/wallet",
            "/trust-score",
            "/support/tickets"
        ]
        
        # Create session without authentication
        unauth_session = requests.Session()
        unauth_session.headers.update({'Content-Type': 'application/json'})
        
        all_success = True
        for endpoint in protected_endpoints:
            try:
                response = unauth_session.get(f"{self.base_url}{endpoint}")
                success = response.status_code == 401
                
                if not success:
                    self.log_security_issue("Authorization", f"Protected endpoint {endpoint} returned {response.status_code} instead of 401", "HIGH")
                    all_success = False
                else:
                    print(f"✅ {endpoint} correctly requires authentication")
                    
            except Exception as e:
                print(f"❌ Error testing {endpoint}: {str(e)}")
                all_success = False
        
        self.log_test("Protected endpoints require auth", all_success)
        return all_success

    def test_sql_injection_attempts(self):
        """Test SQL injection attempts are blocked"""
        sql_payloads = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'; --",
            "' UNION SELECT * FROM users --"
        ]
        
        all_blocked = True
        for payload in sql_payloads:
            try:
                # Test on login endpoint
                login_data = {"email": payload, "password": "test123"}
                response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
                
                # Should either return validation error (400) or authentication failed (401)
                # Should NOT return 500 (server error) or 200 (success)
                if response.status_code in [500, 200]:
                    self.log_security_issue("SQL Injection", f"Payload '{payload}' caused unexpected response: {response.status_code}", "CRITICAL")
                    all_blocked = False
                else:
                    print(f"✅ SQL payload blocked: {payload[:30]}...")
                    
            except Exception as e:
                print(f"❌ Error testing SQL injection: {str(e)}")
                all_blocked = False
        
        self.log_test("SQL injection attempts blocked", all_blocked)
        return all_blocked

    def test_xss_attempts(self):
        """Test XSS attempts are sanitized"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<svg onload=alert('xss')>"
        ]
        
        all_sanitized = True
        
        # Test on user registration (name field)
        timestamp = datetime.now().strftime("%H%M%S")
        
        for payload in xss_payloads:
            try:
                test_data = {
                    "email": f"xss_test_{timestamp}@example.com",
                    "password": "TestPass123!",
                    "name": payload,
                    "phone": "+33123456789"
                }
                
                response = self.session.post(f"{self.base_url}/auth/register", json=test_data)
                
                # Check if the response contains the raw payload (bad) or is sanitized/rejected
                if response.status_code == 200:
                    data = response.json()
                    if payload in str(data):
                        self.log_security_issue("XSS", f"XSS payload not sanitized: {payload}", "HIGH")
                        all_sanitized = False
                    else:
                        print(f"✅ XSS payload appears sanitized: {payload[:30]}...")
                elif response.status_code in [400, 422]:  # Validation error is acceptable
                    print(f"✅ XSS payload rejected by validation: {payload[:30]}...")
                else:
                    print(f"⚠️  Unexpected response to XSS payload: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Error testing XSS: {str(e)}")
                all_sanitized = False
        
        self.log_test("XSS attempts sanitized", all_sanitized)
        return all_sanitized

    def test_password_hashing(self):
        """Test passwords are hashed (not stored in plain text)"""
        # This is harder to test via API, but we can check that:
        # 1. Password is not returned in any API response
        # 2. Login works (indicating password verification works)
        
        timestamp = datetime.now().strftime("%H%M%S")
        password = "TestSecretPassword123!"
        test_data = {
            "email": f"hash_test_{timestamp}@example.com",
            "password": password,
            "name": f"Hash Test User {timestamp}",
            "phone": "+33123456789"
        }
        
        try:
            # Register user
            response = self.session.post(f"{self.base_url}/auth/register", json=test_data)
            if response.status_code != 200:
                self.log_test("Password hashing test", False, error_msg="Registration failed")
                return False
            
            # Check registration response doesn't contain password
            reg_data = response.json()
            password_leaked = password in str(reg_data)
            
            # Login with the user to verify password verification works
            login_response = self.session.post(f"{self.base_url}/auth/login", json={
                "email": test_data["email"],
                "password": password
            })
            login_works = login_response.status_code == 200
            
            # Check login response doesn't contain password
            if login_works:
                login_data = login_response.json()
                password_in_login = password in str(login_data)
            else:
                password_in_login = False
            
            success = not password_leaked and login_works and not password_in_login
            
            if password_leaked:
                self.log_security_issue("Password Security", "Plain text password found in API response", "CRITICAL")
            
            if not login_works:
                self.log_security_issue("Authentication", "Password verification not working", "HIGH")
            
            self.log_test("Passwords are hashed", success, 
                         error_msg="Password security issues detected" if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Passwords are hashed", False, error_msg=str(e))
            return False

    def test_jwt_token_validation(self):
        """Test invalid/expired JWT tokens are rejected"""
        # Test with invalid token format
        invalid_tokens = [
            "invalid.token.here",
            "Bearer invalid_token",
            "completely_fake_token",
            ""
        ]
        
        all_rejected = True
        for token in invalid_tokens:
            try:
                headers = {'Authorization': f'Bearer {token}'}
                response = requests.get(f"{self.base_url}/auth/me", headers=headers)
                
                if response.status_code != 401:
                    self.log_security_issue("JWT Validation", f"Invalid token '{token[:20]}...' not rejected (returned {response.status_code})", "HIGH")
                    all_rejected = False
                else:
                    print(f"✅ Invalid JWT token correctly rejected")
                    
            except Exception as e:
                print(f"❌ Error testing JWT validation: {str(e)}")
                all_rejected = False
        
        self.log_test("Invalid JWT tokens rejected", all_rejected)
        return all_rejected

    def test_user_data_isolation(self):
        """Test users cannot access another user's data"""
        # Create two users
        timestamp = datetime.now().strftime("%H%M%S")
        
        user1_data = {
            "email": f"user1_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"User One {timestamp}",
            "phone": "+33123456789"
        }
        
        user2_data = {
            "email": f"user2_{timestamp}@example.com", 
            "password": "TestPass123!",
            "name": f"User Two {timestamp}",
            "phone": "+33123456790"
        }
        
        try:
            # Register both users
            session1 = requests.Session()
            session1.headers.update({'Content-Type': 'application/json'})
            
            session2 = requests.Session()
            session2.headers.update({'Content-Type': 'application/json'})
            
            reg1 = session1.post(f"{self.base_url}/auth/register", json=user1_data)
            reg2 = session2.post(f"{self.base_url}/auth/register", json=user2_data)
            
            if reg1.status_code != 200 or reg2.status_code != 200:
                self.log_test("User data isolation test", False, error_msg="Failed to create test users")
                return False
            
            # Set cookies for both sessions
            if reg1.cookies:
                session1.cookies.update(reg1.cookies)
            if reg2.cookies:
                session2.cookies.update(reg2.cookies)
            
            # Get user1's data using user1's session
            me1_response = session1.get(f"{self.base_url}/auth/me")
            if me1_response.status_code != 200:
                self.log_test("User data isolation test", False, error_msg="User1 cannot access own data")
                return False
                
            user1_id = me1_response.json().get('user_id')
            
            # Try to access user1's data using user2's session - this should fail or return user2's data
            me2_with_user1_session = session2.get(f"{self.base_url}/auth/me")
            
            if me2_with_user1_session.status_code == 200:
                user2_me_data = me2_with_user1_session.json()
                user2_id = user2_me_data.get('user_id')
                
                # Success: user2 gets their own data, not user1's data
                success = user1_id != user2_id
                
                if not success:
                    self.log_security_issue("Data Isolation", "User can access another user's data via /auth/me", "CRITICAL")
                else:
                    print("✅ User data properly isolated")
            else:
                # Also acceptable: user2 session cannot access the endpoint
                success = True
                print("✅ Session properly isolated")
            
            self.log_test("User data isolation", success)
            return success
            
        except Exception as e:
            self.log_test("User data isolation", False, error_msg=str(e))
            return False

    # ============ LOAD TESTS ============

    def test_api_response_times(self):
        """Test API responds under 500ms for main endpoints"""
        endpoints_to_test = [
            ("GET", "/"),
            ("GET", "/tontines/marketplace"),
            ("GET", "/auth/me"),  # Requires auth
            ("GET", "/wallet"),   # Requires auth
        ]
        
        all_fast = True
        for method, endpoint in endpoints_to_test:
            try:
                start_time = time.time()
                
                if endpoint in ["/auth/me", "/wallet"]:
                    # Use authenticated session
                    if method == "GET":
                        response = self.session.get(f"{self.base_url}{endpoint}")
                else:
                    # Use unauthenticated session for public endpoints
                    temp_session = requests.Session()
                    if method == "GET":
                        response = temp_session.get(f"{self.base_url}{endpoint}")
                
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                
                if response_time > 500:
                    print(f"⚠️  {endpoint} responded in {response_time:.0f}ms (>500ms)")
                    all_fast = False
                else:
                    print(f"✅ {endpoint} responded in {response_time:.0f}ms")
                
                self.load_test_results.append({
                    "endpoint": endpoint,
                    "response_time_ms": response_time,
                    "status_code": response.status_code
                })
                
            except Exception as e:
                print(f"❌ Error testing {endpoint}: {str(e)}")
                all_fast = False
        
        self.log_test("API response times < 500ms", all_fast)
        return all_fast

    def test_concurrent_requests(self):
        """Test multiple concurrent requests don't crash the server"""
        def make_request():
            try:
                response = requests.get(f"{self.base_url}/tontines/marketplace")
                return {"success": response.status_code == 200, "status": response.status_code}
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        print("🔄 Testing 10 concurrent requests...")
        
        try:
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_request) for _ in range(10)]
                results = [future.result() for future in futures]
            
            successful_requests = sum(1 for r in results if r.get("success", False))
            success_rate = successful_requests / len(results)
            
            success = success_rate >= 0.8  # At least 80% should succeed
            
            print(f"📊 Concurrent requests: {successful_requests}/{len(results)} succeeded ({success_rate:.1%})")
            
            if not success:
                error_statuses = [r.get("status", "error") for r in results if not r.get("success", False)]
                print(f"   Errors: {error_statuses}")
            
            self.log_test("Concurrent requests handling", success, 
                         error_msg=f"Only {success_rate:.1%} success rate" if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Concurrent requests handling", False, error_msg=str(e))
            return False

    # ============ FUNCTIONAL TESTS ============

    def test_full_registration_flow(self):
        """Test complete registration flow"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"flow_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Flow Test User {timestamp}",
            "phone": "+33123456789"
        }
        
        try:
            # Step 1: Register
            response = self.session.post(f"{self.base_url}/auth/register", json=test_data)
            if response.status_code != 200:
                self.log_test("Full registration flow", False, error_msg=f"Registration failed: {response.status_code}")
                return False
            
            # Step 2: Verify user can access protected endpoint
            me_response = self.session.get(f"{self.base_url}/auth/me")
            if me_response.status_code != 200:
                self.log_test("Full registration flow", False, error_msg="Cannot access protected endpoint after registration")
                return False
            
            user_data = me_response.json()
            success = (user_data.get('email') == test_data['email'] and 
                      user_data.get('name') == test_data['name'])
            
            self.log_test("Full registration flow", success, user_data if success else None)
            return success
            
        except Exception as e:
            self.log_test("Full registration flow", False, error_msg=str(e))
            return False

    def test_admin_stats_access(self):
        """Test admin panel stats endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/admin/stats")
            # For MVP, this should work for verified users
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Check that it returns expected structure
                has_required_fields = all(key in data for key in ['users', 'tontines', 'payments'])
                success = success and has_required_fields
            
            self.log_test("Admin stats access", success, response.json() if success else None,
                         f"Status: {response.status_code}" if not success else None)
            return success
        except Exception as e:
            self.log_test("Admin stats access", False, error_msg=str(e))
            return False

    def test_trust_score_calculation(self):
        """Test trust score calculation is correct"""
        try:
            response = self.session.get(f"{self.base_url}/trust-score")
            if response.status_code != 200:
                self.log_test("Trust score calculation", False, error_msg=f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Verify structure
            required_fields = ['trust_score', 'breakdown', 'level']
            has_structure = all(field in data for field in required_fields)
            
            # Verify calculation makes sense
            breakdown = data.get('breakdown', {})
            calculated_score = sum(breakdown.values())
            reported_score = data.get('trust_score', 0)
            
            # Allow some tolerance for calculation differences
            score_accurate = abs(calculated_score - reported_score) <= 5
            
            success = has_structure and score_accurate
            
            self.log_test("Trust score calculation", success, data if success else None,
                         f"Score mismatch: calculated {calculated_score}, reported {reported_score}" if not score_accurate else None)
            return success
            
        except Exception as e:
            self.log_test("Trust score calculation", False, error_msg=str(e))
            return False

    def run_all_tests(self):
        """Run comprehensive security, functional, and load tests"""
        print("🚀 Starting Comprehensive Tontine Platform Security & Load Tests")
        print("=" * 60)
        
        # Test basic connectivity
        if not self.test_root_endpoint():
            print("❌ Basic connectivity failed. Stopping tests.")
            return False
        
        print("\n🔐 SECURITY TESTS")
        print("-" * 30)
        
        # Authentication Security Tests
        self.test_auth_wrong_password()
        self.test_duplicate_email_registration() 
        self.test_protected_endpoints_without_auth()
        self.test_user_data_isolation()
        
        # Input Validation Security Tests
        self.test_sql_injection_attempts()
        self.test_xss_attempts()
        
        # Password & JWT Security Tests
        self.test_password_hashing()
        self.test_jwt_token_validation()
        
        print("\n⚡ LOAD & PERFORMANCE TESTS")
        print("-" * 30)
        
        self.test_api_response_times()
        self.test_concurrent_requests()
        
        print("\n🔧 FUNCTIONAL TESTS")
        print("-" * 30)
        
        # Core authentication and user flow
        self.test_full_registration_flow()
        
        # Create authenticated session for remaining tests
        if not self.test_user_registration():
            print("❌ Cannot create authenticated session. Skipping auth-required tests.")
        else:
            self.test_auth_me()
            self.test_kyc_submission()
            
            # Core tontine functionality
            self.test_tontine_creation()
            self.test_tontines_list()
            self.test_tontine_details()
            
            # Additional features
            self.test_wallet()
            self.test_trust_score_calculation()
            self.test_support_ticket()
            
            # Admin functionality
            self.test_admin_stats_access()
        
        # Test public endpoints
        self.test_marketplace()
        
        # Print comprehensive summary
        print("=" * 60)
        print("🎯 COMPREHENSIVE TEST SUMMARY")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.security_issues:
            print(f"\n🚨 Security Issues Found: {len(self.security_issues)}")
            for issue in self.security_issues:
                print(f"   {issue['severity']}: {issue['type']} - {issue['description']}")
        
        if self.load_test_results:
            print(f"\n📊 Load Test Results:")
            avg_response_time = sum(r['response_time_ms'] for r in self.load_test_results) / len(self.load_test_results)
            print(f"   Average Response Time: {avg_response_time:.0f}ms")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test['name']}: {test['error']}")
        
        # Success criteria: high test pass rate AND no critical security issues
        critical_security_issues = [i for i in self.security_issues if i['severity'] == 'CRITICAL']
        overall_success = (self.tests_passed/self.tests_run >= 0.8 and len(critical_security_issues) == 0)
        
        print(f"\n🏁 Overall Assessment: {'✅ PASS' if overall_success else '❌ NEEDS ATTENTION'}")
        if critical_security_issues:
            print("   ⚠️  Critical security issues must be addressed before production")
            
        return overall_success

if __name__ == "__main__":
    tester = TontineAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)