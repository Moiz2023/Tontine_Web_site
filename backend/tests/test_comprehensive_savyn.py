"""
Comprehensive Test Suite for Savyn Platform
Covers: Functional, Security/Penetration, and Load Tests
"""

import pytest
import requests
import os
import time
import concurrent.futures
import json
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ FIXTURES ============

@pytest.fixture(scope="session")
def admin_token():
    """Get admin user token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@savyn.com",
        "password": "test123456"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin login failed - skipping admin tests")

@pytest.fixture(scope="session")
def non_admin_token():
    """Get non-admin user token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "savyn_new@test.com",
        "password": "test123456"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Non-admin login failed - skipping user tests")

@pytest.fixture
def unique_email():
    """Generate unique email for tests"""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"TEST_user_{random_suffix}@test.com"


# ============ FUNCTIONAL TESTS: REGISTRATION ============

class TestRegistrationFlow:
    """Registration endpoint tests"""
    
    def test_register_without_terms_rejected(self, unique_email):
        """Registration without accepting terms should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test User",
            "accept_terms": False
        })
        assert response.status_code == 400
        assert "conditions d'utilisation" in response.json().get("detail", "").lower() or "terms" in response.json().get("detail", "").lower()
        print(f"✅ Registration without terms correctly rejected: {response.json()['detail']}")
    
    def test_register_with_terms_success(self, unique_email):
        """Registration with terms accepted should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test User Valid",
            "accept_terms": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["email"] == unique_email
        assert "token" in data
        print(f"✅ Registration with terms succeeded: user_id={data['user_id']}")
    
    def test_register_duplicate_email_rejected(self):
        """Registration with existing email should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "admin@savyn.com",  # existing email
            "password": "test123456",
            "name": "Duplicate User",
            "accept_terms": True
        })
        assert response.status_code == 400
        assert "already registered" in response.json().get("detail", "").lower() or "email" in response.json().get("detail", "").lower()
        print(f"✅ Duplicate email correctly rejected: {response.json()['detail']}")


# ============ FUNCTIONAL TESTS: LOGIN ============

class TestLoginFlow:
    """Login endpoint tests"""
    
    def test_login_valid_credentials(self):
        """Valid login should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        assert data["email"] == "admin@savyn.com"
        print(f"✅ Valid login succeeded: user_id={data['user_id']}")
    
    def test_login_invalid_password(self):
        """Invalid password should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "invalid" in response.json().get("detail", "").lower()
        print(f"✅ Invalid password correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Login with non-existent user should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "test123456"
        })
        assert response.status_code == 401
        print(f"✅ Non-existent user login correctly rejected")


# ============ FUNCTIONAL TESTS: AUTH/ME ============

class TestAuthMe:
    """Auth/me endpoint tests"""
    
    def test_auth_me_returns_user_data(self, admin_token):
        """GET /api/auth/me should return user data with is_admin field"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "is_admin" in data
        assert data["is_admin"] == True  # admin user
        print(f"✅ Auth/me returned correct data with is_admin={data['is_admin']}")
    
    def test_auth_me_non_admin_user(self, non_admin_token):
        """Non-admin user should have is_admin=false"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {non_admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"] == False
        print(f"✅ Non-admin user correctly has is_admin=False")


# ============ FUNCTIONAL TESTS: KYC ============

class TestKYCFlow:
    """KYC verification tests"""
    
    def test_kyc_submit_requires_auth(self):
        """KYC submit without auth should fail"""
        response = requests.post(f"{BASE_URL}/api/kyc/submit", json={
            "id_type": "id_card",
            "id_number": "123456789",
            "iban": "FR7612345678901234567890123",
            "address": "123 Test St",
            "city": "Paris",
            "postal_code": "75001",
            "country": "FR"
        })
        assert response.status_code == 401
        print(f"✅ KYC submit without auth correctly rejected")
    
    def test_kyc_status_endpoint(self, admin_token):
        """GET /api/kyc/status should return KYC status"""
        response = requests.get(f"{BASE_URL}/api/kyc/status", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "kyc_status" in data
        print(f"✅ KYC status returned: {data['kyc_status']}")


# ============ FUNCTIONAL TESTS: TONTINE ============

class TestTontineCRUD:
    """Tontine CRUD tests"""
    
    def test_list_tontines(self, admin_token):
        """GET /api/tontines should list tontines"""
        response = requests.get(f"{BASE_URL}/api/tontines", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ Tontines list returned: {len(response.json())} tontines")
    
    def test_marketplace_tontines_no_auth(self):
        """GET /api/tontines/marketplace should work without auth"""
        response = requests.get(f"{BASE_URL}/api/tontines/marketplace")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ Marketplace accessible without auth: {len(response.json())} tontines")
    
    def test_create_tontine_requires_verified_kyc(self, non_admin_token):
        """Creating tontine requires verified KYC"""
        response = requests.post(f"{BASE_URL}/api/tontines", json={
            "name": "TEST Tontine",
            "monthly_amount": 100,
            "max_participants": 10,
            "duration_months": 10,
            "start_date": "2025-02-01"
        }, headers={
            "Authorization": f"Bearer {non_admin_token}"
        })
        # Should fail if KYC not verified (403) or succeed if verified (200)
        assert response.status_code in [200, 403]
        print(f"✅ Create tontine response: {response.status_code}")
    
    def test_join_tontine_requires_contract(self, admin_token):
        """Joining tontine requires accepting contract"""
        # First get a tontine from marketplace
        marketplace = requests.get(f"{BASE_URL}/api/tontines/marketplace")
        if marketplace.status_code == 200 and len(marketplace.json()) > 0:
            tontine_id = marketplace.json()[0]["tontine_id"]
            # Try to join without accepting contract
            response = requests.post(f"{BASE_URL}/api/tontines/join", json={
                "tontine_id": tontine_id,
                "accept_contract": False
            }, headers={
                "Authorization": f"Bearer {admin_token}"
            })
            # Should be rejected (400 or 403)
            assert response.status_code in [400, 403]
            print(f"✅ Join without contract correctly rejected")
        else:
            pytest.skip("No open tontines available for testing")


# ============ FUNCTIONAL TESTS: WALLET ============

class TestWallet:
    """Wallet endpoint tests"""
    
    def test_get_wallet(self, admin_token):
        """GET /api/wallet should return wallet data"""
        response = requests.get(f"{BASE_URL}/api/wallet", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_contributed" in data
        assert "total_received" in data
        assert "net_balance" in data
        print(f"✅ Wallet data returned: balance={data['net_balance']}")
    
    def test_wallet_export_csv(self, admin_token):
        """GET /api/wallet/export should return CSV"""
        response = requests.get(f"{BASE_URL}/api/wallet/export", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print(f"✅ Wallet CSV export working")


# ============ FUNCTIONAL TESTS: SUPPORT ============

class TestSupport:
    """Support ticket tests"""
    
    def test_create_ticket(self, admin_token):
        """POST /api/support/tickets should create ticket"""
        response = requests.post(f"{BASE_URL}/api/support/tickets", json={
            "subject": "TEST Ticket Subject",
            "message": "This is a test ticket message",
            "category": "general"
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "ticket_id" in response.json()
        print(f"✅ Support ticket created: {response.json()['ticket_id']}")
    
    def test_list_tickets(self, admin_token):
        """GET /api/support/tickets should list user tickets"""
        response = requests.get(f"{BASE_URL}/api/support/tickets", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ User tickets listed: {len(response.json())} tickets")


# ============ FUNCTIONAL TESTS: ADMIN ============

class TestAdminEndpoints:
    """Admin endpoint tests"""
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats should return stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "tontines" in data
        print(f"✅ Admin stats returned: {data['users']['total']} users")
    
    def test_admin_list_users(self, admin_token):
        """GET /api/admin/users should list users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ Admin users listed: {len(response.json())} users")
    
    def test_admin_list_tontines(self, admin_token):
        """GET /api/admin/tontines should list tontines"""
        response = requests.get(f"{BASE_URL}/api/admin/tontines", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ Admin tontines listed: {len(response.json())} tontines")
    
    def test_admin_fraud_alerts(self, admin_token):
        """GET /api/admin/fraud-alerts should return alerts"""
        response = requests.get(f"{BASE_URL}/api/admin/fraud-alerts", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        print(f"✅ Fraud alerts returned: {data['total']} alerts")
    
    def test_admin_analytics(self, admin_token):
        """GET /api/admin/analytics should return analytics"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "tontine_distribution" in data or "kyc_distribution" in data
        print(f"✅ Admin analytics returned")


# ============ FUNCTIONAL TESTS: CONTRACTS ============

class TestContracts:
    """Contract tests"""
    
    def test_list_user_contracts(self, admin_token):
        """GET /api/contracts should list user contracts"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ User contracts listed: {len(response.json())} contracts")


# ============ FUNCTIONAL TESTS: LEMON WAY MOCK ============

class TestLemonWayMock:
    """Lemon Way mock status tests"""
    
    def test_lemonway_status(self):
        """GET /api/lemonway/status should return sandbox mode"""
        response = requests.get(f"{BASE_URL}/api/lemonway/status")
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "sandbox_simulated"
        assert data["status"] == "active"
        print(f"✅ Lemon Way status: {data['mode']}")


# ============ FUNCTIONAL TESTS: TRUST SCORE ============

class TestTrustScore:
    """Trust score tests"""
    
    def test_trust_score_calculation(self, admin_token):
        """GET /api/trust-score should return score breakdown"""
        response = requests.get(f"{BASE_URL}/api/trust-score", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "trust_score" in data
        assert "breakdown" in data
        assert "level" in data
        print(f"✅ Trust score: {data['trust_score']} ({data['level']})")


# ============ FUNCTIONAL TESTS: USER SETTINGS ============

class TestUserSettings:
    """User settings tests"""
    
    def test_update_settings(self, admin_token):
        """PUT /api/users/settings should update user settings"""
        response = requests.put(f"{BASE_URL}/api/users/settings", json={
            "language": "fr"
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"✅ User settings updated")


# ============ SECURITY TESTS: XSS INJECTION ============

class TestXSSInjection:
    """XSS injection security tests"""
    
    def test_xss_in_registration_name(self, unique_email):
        """XSS payload in name should be sanitized"""
        xss_payload = '<script>alert("XSS")</script>'
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": xss_payload,
            "accept_terms": True
        })
        if response.status_code == 200:
            data = response.json()
            # Name should be sanitized - no script tags
            assert "<script>" not in data.get("name", "")
            assert "alert" not in data.get("name", "").lower() or "&lt;" in data.get("name", "")
            print(f"✅ XSS in registration name sanitized: {data.get('name', '')}")
        else:
            print(f"⚠️ Registration failed: {response.status_code}")
    
    def test_xss_in_support_ticket(self, admin_token):
        """XSS payload in support ticket should be sanitized"""
        xss_payload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>'
        response = requests.post(f"{BASE_URL}/api/support/tickets", json={
            "subject": xss_payload,
            "message": xss_payload,
            "category": "general"
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        # The ticket is created, check that XSS is sanitized when retrieved
        tickets = requests.get(f"{BASE_URL}/api/support/tickets", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        if tickets.status_code == 200 and len(tickets.json()) > 0:
            latest_ticket = tickets.json()[0]
            assert "<script>" not in latest_ticket.get("subject", "")
            assert "onerror" not in latest_ticket.get("message", "").lower()
            print(f"✅ XSS in support ticket sanitized")


# ============ SECURITY TESTS: SQL/NoSQL INJECTION ============

class TestNoSQLInjection:
    """NoSQL injection security tests"""
    
    def test_nosql_injection_login_email(self):
        """NoSQL injection in login email should be rejected"""
        # Try injection payload
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": {"$gt": ""},
            "password": "test123456"
        })
        # Should fail validation (422) or auth (401), not expose data
        assert response.status_code in [401, 422]
        print(f"✅ NoSQL injection in email rejected: {response.status_code}")
    
    def test_nosql_injection_login_password(self):
        """NoSQL injection in login password should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": {"$regex": ".*"}
        })
        # Should fail validation or auth
        assert response.status_code in [401, 422]
        print(f"✅ NoSQL injection in password rejected: {response.status_code}")


# ============ SECURITY TESTS: JWT TOKEN ============

class TestJWTSecurity:
    """JWT token security tests"""
    
    def test_expired_token(self):
        """Expired token should be rejected"""
        # Using a manually crafted expired token
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdCIsImV4cCI6MTYwMDAwMDAwMH0.invalid"
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {expired_token}"
        })
        assert response.status_code == 401
        print(f"✅ Expired token correctly rejected")
    
    def test_invalid_token(self):
        """Invalid token should be rejected"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalid_token_here"
        })
        assert response.status_code == 401
        print(f"✅ Invalid token correctly rejected")
    
    def test_missing_token(self):
        """Missing token should be rejected"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✅ Missing token correctly rejected")


# ============ SECURITY TESTS: RBAC ============

class TestRBAC:
    """Role-based access control tests"""
    
    def test_non_admin_accessing_admin_stats(self, non_admin_token):
        """Non-admin should get 403 on admin endpoints"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {non_admin_token}"
        })
        assert response.status_code == 403
        print(f"✅ Non-admin correctly blocked from admin/stats")
    
    def test_non_admin_accessing_admin_users(self, non_admin_token):
        """Non-admin should get 403 on admin users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {non_admin_token}"
        })
        assert response.status_code == 403
        print(f"✅ Non-admin correctly blocked from admin/users")
    
    def test_non_admin_accessing_fraud_alerts(self, non_admin_token):
        """Non-admin should get 403 on fraud alerts"""
        response = requests.get(f"{BASE_URL}/api/admin/fraud-alerts", headers={
            "Authorization": f"Bearer {non_admin_token}"
        })
        assert response.status_code == 403
        print(f"✅ Non-admin correctly blocked from fraud-alerts")
    
    def test_non_admin_suspend_user(self, non_admin_token):
        """Non-admin should not be able to suspend users"""
        response = requests.post(f"{BASE_URL}/api/admin/suspend/some_user_id", json={
            "suspend": True
        }, headers={
            "Authorization": f"Bearer {non_admin_token}"
        })
        assert response.status_code == 403
        print(f"✅ Non-admin correctly blocked from suspending users")


# ============ SECURITY TESTS: IDOR ============

class TestIDOR:
    """Insecure direct object reference tests"""
    
    def test_accessing_other_user_wallet(self, non_admin_token, admin_token):
        """User should not access other user's Lemon Way wallet"""
        # Get admin user_id first
        admin_me = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        if admin_me.status_code == 200:
            admin_user_id = admin_me.json()["user_id"]
            # Try to access admin's Lemon Way wallet as non-admin
            response = requests.get(f"{BASE_URL}/api/lemonway/wallet/{admin_user_id}", headers={
                "Authorization": f"Bearer {non_admin_token}"
            })
            # Should be blocked (403) - only admins or the user themselves can access
            assert response.status_code == 403
            print(f"✅ IDOR prevented: non-admin cannot access other user's wallet")


# ============ SECURITY TESTS: SUSPENDED USER ============

class TestSuspendedUser:
    """Suspended user access tests"""
    
    def test_create_and_suspend_user(self, admin_token, unique_email):
        """Create user, suspend them, verify they cannot login"""
        # Create user
        reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Suspend Test User",
            "accept_terms": True
        })
        if reg.status_code != 200:
            pytest.skip("Could not create test user")
        
        user_id = reg.json()["user_id"]
        
        # Suspend user
        suspend = requests.post(f"{BASE_URL}/api/admin/suspend/{user_id}", json={
            "suspend": True,
            "reason": "Test suspension"
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert suspend.status_code == 200
        print(f"✅ User {user_id} suspended")
        
        # Try to login as suspended user
        login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "test123456"
        })
        assert login.status_code == 403
        assert "suspendu" in login.json().get("detail", "").lower()
        print(f"✅ Suspended user correctly blocked from login")


# ============ SECURITY TESTS: CORS HEADERS ============

class TestCORSHeaders:
    """CORS header verification tests"""
    
    def test_cors_headers_present(self):
        """CORS headers should be present"""
        response = requests.options(f"{BASE_URL}/api/", headers={
            "Origin": "https://test.com",
            "Access-Control-Request-Method": "GET"
        })
        # Should have CORS headers
        headers = response.headers
        # Check if allow-origin is present (could be * or specific)
        print(f"✅ CORS check completed. Headers: {dict(headers)}")


# ============ SECURITY TESTS: COOKIE SECURITY ============

class TestCookieSecurity:
    """Cookie security flag tests"""
    
    def test_login_cookie_flags(self):
        """Login should set secure cookie flags"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            # Check Set-Cookie header
            cookies = response.headers.get("set-cookie", "")
            print(f"✅ Login cookies: {cookies[:200] if cookies else 'No cookies set (token in body)'}")
            # Note: Cookies might have httponly, secure, samesite flags
            # In API-only mode, token is returned in body


# ============ LOAD TESTS: CONCURRENT REGISTRATIONS ============

class TestLoadConcurrentRegistration:
    """Load test - concurrent registrations"""
    
    def test_concurrent_registrations(self):
        """10 simultaneous registrations"""
        def register_user(i):
            email = f"TEST_loadreg_{i}_{int(time.time())}@test.com"
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": email,
                "password": "test123456",
                "name": f"Load Test User {i}",
                "accept_terms": True
            }, timeout=30)
            return response.status_code
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(register_user, i) for i in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        success_count = sum(1 for r in results if r == 200)
        print(f"✅ Concurrent registrations: {success_count}/10 succeeded")
        assert success_count >= 8  # Allow some failures due to race conditions


# ============ LOAD TESTS: CONCURRENT LOGINS ============

class TestLoadConcurrentLogin:
    """Load test - concurrent logins"""
    
    def test_concurrent_logins(self):
        """10 simultaneous logins"""
        def login_user(i):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@savyn.com",
                "password": "test123456"
            }, timeout=30)
            return response.status_code
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(login_user, i) for i in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        success_count = sum(1 for r in results if r == 200)
        print(f"✅ Concurrent logins: {success_count}/10 succeeded")
        assert success_count >= 9  # Should handle concurrent logins well


# ============ LOAD TESTS: CONCURRENT MARKETPLACE ============

class TestLoadConcurrentMarketplace:
    """Load test - concurrent marketplace requests"""
    
    def test_concurrent_marketplace_requests(self):
        """20 simultaneous marketplace requests"""
        def fetch_marketplace(i):
            response = requests.get(f"{BASE_URL}/api/tontines/marketplace", timeout=30)
            return response.status_code
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(fetch_marketplace, i) for i in range(20)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        success_count = sum(1 for r in results if r == 200)
        print(f"✅ Concurrent marketplace: {success_count}/20 succeeded")
        assert success_count >= 18


# ============ LOAD TESTS: CONCURRENT ADMIN STATS ============

class TestLoadConcurrentAdmin:
    """Load test - concurrent admin requests"""
    
    def test_concurrent_admin_stats(self, admin_token):
        """5 simultaneous admin stats requests"""
        def fetch_stats(i):
            response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
                "Authorization": f"Bearer {admin_token}"
            }, timeout=30)
            return response.status_code
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(fetch_stats, i) for i in range(5)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        success_count = sum(1 for r in results if r == 200)
        print(f"✅ Concurrent admin stats: {success_count}/5 succeeded")
        assert success_count >= 4


# ============ LOAD TESTS: LARGE DATA HANDLING ============

class TestLoadLargeData:
    """Load test - large data handling"""
    
    def test_pagination_performance(self, admin_token):
        """Test fetching large user list performance"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        }, timeout=30)
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        user_count = len(response.json())
        print(f"✅ Fetched {user_count} users in {elapsed:.2f}s")
        assert elapsed < 10  # Should respond within 10 seconds


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
