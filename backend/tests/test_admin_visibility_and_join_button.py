"""
Tests for two bug fixes:
1. Admin menu visibility - is_admin field in auth responses
2. Marketplace join button disabled for already-joined tontines
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestAdminFieldInAuthResponses:
    """Test that is_admin field is returned in login/register/me responses"""
    
    def test_admin_login_returns_is_admin_true(self):
        """Admin user (admin@savyn.com) should get is_admin=True in login response"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify is_admin field exists and is True for admin
        assert "is_admin" in data, "is_admin field missing from login response"
        assert data["is_admin"] == True, f"Expected is_admin=True for admin, got {data['is_admin']}"
        print(f"PASS: Admin login returns is_admin=True")
        
    def test_non_admin_login_returns_is_admin_false(self):
        """Non-admin user should get is_admin=False in login response"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "savyn_new@test.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify is_admin field exists and is False for non-admin
        assert "is_admin" in data, "is_admin field missing from login response"
        assert data["is_admin"] == False, f"Expected is_admin=False for non-admin, got {data['is_admin']}"
        print(f"PASS: Non-admin login returns is_admin=False")
        
    def test_admin_auth_me_returns_is_admin_true(self):
        """GET /api/auth/me for admin user should include is_admin=True"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        
        # Get /auth/me with token
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        
        assert "is_admin" in data, "is_admin field missing from auth/me response"
        assert data["is_admin"] == True, f"Expected is_admin=True for admin, got {data['is_admin']}"
        print(f"PASS: Admin auth/me returns is_admin=True")
        
    def test_non_admin_auth_me_returns_is_admin_false(self):
        """GET /api/auth/me for non-admin should include is_admin=False"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "savyn_new@test.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        
        # Get /auth/me with token
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        
        assert "is_admin" in data, "is_admin field missing from auth/me response"
        assert data["is_admin"] == False, f"Expected is_admin=False for non-admin, got {data['is_admin']}"
        print(f"PASS: Non-admin auth/me returns is_admin=False")
        
    def test_register_returns_is_admin_false(self):
        """New user registration should return is_admin=False"""
        unique_email = f"TEST_admin_test_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test User",
            "accept_terms": True
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        assert "is_admin" in data, "is_admin field missing from register response"
        assert data["is_admin"] == False, f"Expected is_admin=False for new user, got {data['is_admin']}"
        print(f"PASS: New user registration returns is_admin=False")


class TestMarketplaceJoinButtonDisabling:
    """Test that user's active tontines endpoint works for disabling join buttons"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session with verified KYC"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "test123456"
        })
        token = login_response.json().get("token")
        return {
            "headers": {"Authorization": f"Bearer {token}"},
            "user_id": login_response.json().get("user_id")
        }
    
    def test_user_active_tontines_endpoint(self, admin_session):
        """GET /api/tontines/user/active should return tontines user has joined"""
        response = requests.get(f"{BASE_URL}/api/tontines/user/active", 
                                headers=admin_session["headers"])
        assert response.status_code == 200, f"User active tontines failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        # Each tontine should have tontine_id for frontend to track
        for tontine in data:
            assert "tontine_id" in tontine, "Tontine should have tontine_id"
        print(f"PASS: User active tontines returns list with {len(data)} tontines")
        
    def test_marketplace_returns_tontines(self):
        """GET /api/tontines/marketplace should return open tontines"""
        response = requests.get(f"{BASE_URL}/api/tontines/marketplace")
        assert response.status_code == 200, f"Marketplace failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        for tontine in data:
            assert "tontine_id" in tontine, "Tontine should have tontine_id"
            # Participants should be removed in marketplace (privacy)
            assert "participants" not in tontine, "Marketplace should not expose participants list"
        print(f"PASS: Marketplace returns {len(data)} open tontines")
        
    def test_join_tontine_already_joined_fails(self, admin_session):
        """Joining a tontine user already joined should fail"""
        # First get user's active tontines
        active_response = requests.get(f"{BASE_URL}/api/tontines/user/active",
                                       headers=admin_session["headers"])
        active_tontines = active_response.json()
        
        if len(active_tontines) == 0:
            pytest.skip("No active tontines to test join rejection")
            
        # Try to join first active tontine again
        tontine_id = active_tontines[0]["tontine_id"]
        response = requests.post(f"{BASE_URL}/api/tontines/join", 
                                json={"tontine_id": tontine_id, "accept_contract": True},
                                headers=admin_session["headers"])
        
        # Should fail with 400 "Already joined this tontine"
        assert response.status_code == 400, f"Expected 400 for already joined, got {response.status_code}"
        assert "already joined" in response.text.lower() or "deja" in response.text.lower(), \
            f"Error should mention already joined: {response.text}"
        print(f"PASS: Re-joining tontine correctly fails with 400")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
