"""
Test suite for Savyn rebranding and admin email verification
Tests:
- API root returns 'Savyn API'
- Admin access via ADMIN_EMAILS env var
- Marketplace endpoint works
- Auth flows (registration, login)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = {
    "email": f"test_runner_{uuid.uuid4().hex[:6]}@test.com",
    "password": "test123456",
    "name": "Test Runner"
}

ADMIN_USER = {
    "email": "admin@savyn.com",
    "password": "test123456"
}

NON_ADMIN_USER = {
    "email": f"nonadmin_{uuid.uuid4().hex[:6]}@test.com",
    "password": "test123456",
    "name": "Non Admin User"
}


class TestSavynBranding:
    """Test Savyn branding in API responses"""
    
    def test_api_root_returns_savyn(self):
        """Verify API root returns 'Savyn API' instead of 'Tontine Platform API'"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Savyn API", f"Expected 'Savyn API', got '{data.get('message')}'"
        print(f"✅ API root returns: {data['message']}")


class TestMarketplace:
    """Test marketplace endpoint"""
    
    def test_marketplace_tontines_public(self):
        """Verify marketplace endpoint is public and returns data"""
        response = requests.get(f"{BASE_URL}/api/tontines/marketplace")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Marketplace should return a list"
        print(f"✅ Marketplace endpoint works, returned {len(data)} tontines")


class TestUserAuth:
    """Test user registration and login flows"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_user_registration(self, session):
        """Test new user registration"""
        response = session.post(f"{BASE_URL}/api/auth/register", json=TEST_USER)
        # Could be 200 (created) or 400 (already exists)
        if response.status_code == 200:
            data = response.json()
            assert "user_id" in data
            assert data["email"] == TEST_USER["email"]
            print(f"✅ User registered: {TEST_USER['email']}")
        elif response.status_code == 400:
            print(f"⚠️ User already exists: {TEST_USER['email']}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_user_login(self, session):
        """Test user login"""
        # First ensure user exists by registering (may fail if exists)
        session.post(f"{BASE_URL}/api/auth/register", json=TEST_USER)
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        print(f"✅ User login successful")
        return data.get("token")


class TestAdminAccess:
    """Test admin access via ADMIN_EMAILS env var"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token by logging in with admin@savyn.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin user not found or wrong credentials")
    
    @pytest.fixture(scope="class")
    def non_admin_token(self):
        """Create and login non-admin user"""
        # Register non-admin user
        requests.post(f"{BASE_URL}/api/auth/register", json=NON_ADMIN_USER)
        
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": NON_ADMIN_USER["email"],
            "password": NON_ADMIN_USER["password"]
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Failed to create/login non-admin user")
    
    def test_admin_login(self):
        """Verify admin@savyn.com can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["email"] == "admin@savyn.com"
        print(f"✅ Admin user admin@savyn.com can login")
    
    def test_admin_stats_access_with_admin_email(self, admin_token):
        """Verify admin@savyn.com can access admin/stats endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Admin stats access denied: {response.text}"
        data = response.json()
        assert "users" in data
        assert "tontines" in data
        print(f"✅ Admin stats accessible for admin@savyn.com")
    
    def test_admin_users_access_with_admin_email(self, admin_token):
        """Verify admin@savyn.com can access admin/users endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200, f"Admin users access denied: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin users list accessible for admin@savyn.com, returned {len(data)} users")
    
    def test_admin_stats_denied_for_non_admin(self, non_admin_token):
        """Verify non-admin users cannot access admin/stats"""
        headers = {"Authorization": f"Bearer {non_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print(f"✅ Admin stats correctly denied for non-admin user")
    
    def test_admin_users_denied_for_non_admin(self, non_admin_token):
        """Verify non-admin users cannot access admin/users"""
        headers = {"Authorization": f"Bearer {non_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print(f"✅ Admin users list correctly denied for non-admin user")


class TestAuthMe:
    """Test /auth/me endpoint"""
    
    def test_auth_me_requires_auth(self):
        """Verify /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✅ /auth/me correctly requires authentication")
    
    def test_auth_me_with_token(self):
        """Verify /auth/me returns user data with valid token"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if login_resp.status_code != 200:
            pytest.skip("Could not login to test /auth/me")
        
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == ADMIN_USER["email"]
        print(f"✅ /auth/me returns user data correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
