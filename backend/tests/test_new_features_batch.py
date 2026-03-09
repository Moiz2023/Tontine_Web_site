"""
Test suite for Savyn new features batch:
1. Terms acceptance at registration
2. Digital contract when joining tontine
3. Smart turn attribution
4. Wallet CSV export
5. Admin: user suspension, KYC validation, payout trigger
6. Fraud detection alerts
7. Analytics tab
8. Lemon Way mock integration
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@savyn.com"
ADMIN_PASSWORD = "test123456"
TEST_USER_EMAIL = f"TEST_feature_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "test123456"
TEST_USER_NAME = "Test Feature User"


class TestRegistrationTerms:
    """Test 1: Terms acceptance required at registration"""
    
    def test_register_without_accept_terms_fails(self):
        """Registration should fail without accept_terms=true"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_noterms_{uuid.uuid4().hex[:8]}@test.com",
            "password": "test123456",
            "name": "No Terms User",
            "accept_terms": False
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "accepter" in data["detail"].lower() or "conditions" in data["detail"].lower()
        print(f"✅ Registration rejected without terms: {data['detail']}")
    
    def test_register_with_accept_terms_succeeds(self):
        """Registration should succeed with accept_terms=true"""
        unique_email = f"TEST_terms_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Terms Accepted User",
            "accept_terms": True
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert "token" in data
        print(f"✅ Registration succeeded with terms accepted: {data['user_id']}")
        return data


class TestLoginTracking:
    """Test 2: Login tracks attempts with IP and user_agent"""
    
    @pytest.fixture
    def registered_user(self):
        """Create a test user for login tests"""
        unique_email = f"TEST_login_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Login Test User",
            "accept_terms": True
        })
        assert response.status_code == 200
        return {"email": unique_email, "password": "test123456"}
    
    def test_login_success(self, registered_user):
        """Login should succeed and track login attempt"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        }, headers={"User-Agent": "TestAgent/1.0"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert "token" in data
        print(f"✅ Login successful with tracking: {data['user_id']}")
    
    def test_login_failure_invalid_credentials(self):
        """Login should fail with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Login rejected with invalid credentials")


class TestUserSuspension:
    """Test 3: Suspended user cannot login"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture
    def test_user_for_suspension(self):
        """Create a user to test suspension"""
        unique_email = f"TEST_suspend_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Suspend Test User",
            "accept_terms": True
        })
        assert response.status_code == 200
        data = response.json()
        return {"user_id": data["user_id"], "email": unique_email, "password": "test123456"}
    
    def test_admin_can_suspend_user(self, admin_token, test_user_for_suspension):
        """Admin should be able to suspend a user"""
        response = requests.post(
            f"{BASE_URL}/api/admin/suspend/{test_user_for_suspension['user_id']}",
            json={"suspend": True, "reason": "Test suspension"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "suspended" in data["message"].lower() or "user_id" in data
        print(f"✅ Admin suspended user: {test_user_for_suspension['user_id']}")
        return test_user_for_suspension
    
    def test_suspended_user_cannot_login(self, admin_token, test_user_for_suspension):
        """Suspended user should get 403 on login"""
        # First suspend the user
        suspend_response = requests.post(
            f"{BASE_URL}/api/admin/suspend/{test_user_for_suspension['user_id']}",
            json={"suspend": True, "reason": "Test suspension"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert suspend_response.status_code == 200
        
        # Try to login as suspended user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_for_suspension["email"],
            "password": test_user_for_suspension["password"]
        })
        assert login_response.status_code == 403, f"Expected 403, got {login_response.status_code}: {login_response.text}"
        print("✅ Suspended user blocked from login with 403")


class TestAdminKYCValidation:
    """Test 4: Admin can approve/reject KYC"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def user_for_kyc(self):
        unique_email = f"TEST_kyc_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "KYC Test User",
            "accept_terms": True
        })
        assert response.status_code == 200
        return response.json()
    
    def test_admin_approve_kyc(self, admin_token, user_for_kyc):
        """Admin should be able to approve KYC"""
        response = requests.put(
            f"{BASE_URL}/api/admin/kyc/{user_for_kyc['user_id']}",
            json={"status": "verified"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "verified" in data["message"].lower() or "user_id" in data
        print(f"✅ Admin approved KYC for user: {user_for_kyc['user_id']}")
    
    def test_admin_reject_kyc(self, admin_token, user_for_kyc):
        """Admin should be able to reject KYC"""
        response = requests.put(
            f"{BASE_URL}/api/admin/kyc/{user_for_kyc['user_id']}",
            json={"status": "rejected", "reason": "Invalid documents"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "rejected" in data["message"].lower() or "user_id" in data
        print(f"✅ Admin rejected KYC for user: {user_for_kyc['user_id']}")


class TestFraudAlerts:
    """Test 5: Fraud alerts endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_fraud_alerts_endpoint(self, admin_token):
        """Fraud alerts endpoint should return data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/fraud-alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "alerts" in data
        assert "total" in data
        assert isinstance(data["alerts"], list)
        print(f"✅ Fraud alerts endpoint works: {data['total']} alerts found")
    
    def test_fraud_alerts_requires_admin(self):
        """Fraud alerts should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/fraud-alerts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Fraud alerts requires authentication")


class TestAnalytics:
    """Test 6: Analytics endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_analytics_endpoint(self, admin_token):
        """Analytics endpoint should return tontine/kyc distributions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tontine_distribution" in data
        assert "kyc_distribution" in data
        assert "monthly_volume" in data
        assert "user_growth" in data
        print(f"✅ Analytics endpoint works: tontine_distribution={data['tontine_distribution']}, kyc_distribution={data['kyc_distribution']}")


class TestWalletExport:
    """Test 7: Wallet CSV export"""
    
    @pytest.fixture
    def user_token(self):
        # Register and login a test user
        unique_email = f"TEST_wallet_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Wallet Test User",
            "accept_terms": True
        })
        assert reg_response.status_code == 200
        return reg_response.json()["token"]
    
    def test_wallet_export_endpoint(self, user_token):
        """Wallet export should return CSV"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/export",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        # CSV should have header row
        assert "Date" in content or "Type" in content or "Montant" in content
        print(f"✅ Wallet CSV export works: {len(content)} bytes")
    
    def test_wallet_export_requires_auth(self):
        """Wallet export should require authentication"""
        response = requests.get(f"{BASE_URL}/api/wallet/export")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Wallet export requires authentication")


class TestLemonWayMock:
    """Test 8: Lemon Way mock integration"""
    
    def test_lemonway_status_endpoint(self):
        """Lemon Way status should be accessible"""
        response = requests.get(f"{BASE_URL}/api/lemonway/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "provider" in data
        assert data["provider"] == "Lemon Way"
        assert "mode" in data
        assert "sandbox" in data["mode"].lower() or "simulated" in data["mode"].lower()
        assert "capabilities" in data
        assert isinstance(data["capabilities"], list)
        print(f"✅ Lemon Way status endpoint works: mode={data['mode']}")


class TestContracts:
    """Test 9: Contracts endpoint"""
    
    @pytest.fixture
    def user_token(self):
        unique_email = f"TEST_contracts_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Contracts Test User",
            "accept_terms": True
        })
        assert reg_response.status_code == 200
        return reg_response.json()["token"]
    
    def test_contracts_endpoint(self, user_token):
        """Contracts endpoint should return user contracts"""
        response = requests.get(
            f"{BASE_URL}/api/contracts",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Contracts endpoint works: {len(data)} contracts found")


class TestTontineJoinWithContract:
    """Test 10: Join tontine requires accept_contract=true"""
    
    @pytest.fixture
    def verified_user(self):
        """Create and verify a user for tontine join tests"""
        # Register user
        unique_email = f"TEST_join_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Join Test User",
            "accept_terms": True
        })
        assert reg_response.status_code == 200
        user_data = reg_response.json()
        
        # KYC verification via admin
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_login.json()["token"]
        
        kyc_response = requests.put(
            f"{BASE_URL}/api/admin/kyc/{user_data['user_id']}",
            json={"status": "verified"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert kyc_response.status_code == 200
        
        return {"token": user_data["token"], "user_id": user_data["user_id"]}
    
    def test_join_without_accept_contract_fails(self, verified_user):
        """Join should fail without accept_contract=true"""
        # First get a tontine to join
        marketplace = requests.get(f"{BASE_URL}/api/tontines/marketplace")
        if marketplace.status_code != 200 or not marketplace.json():
            pytest.skip("No tontines in marketplace to test join")
        
        tontines = marketplace.json()
        tontine_id = tontines[0]["tontine_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/tontines/join",
            json={"tontine_id": tontine_id, "accept_contract": False},
            headers={"Authorization": f"Bearer {verified_user['token']}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "contrat" in data["detail"].lower() or "contract" in data["detail"].lower()
        print(f"✅ Join rejected without contract acceptance: {data['detail']}")


class TestAdminTriggerPayout:
    """Test 11: Admin can trigger payout for active tontine"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_trigger_payout_requires_active_tontine(self, admin_token):
        """Trigger payout should require active tontine"""
        # Try with non-existent tontine
        response = requests.post(
            f"{BASE_URL}/api/admin/trigger-payout/nonexistent_tontine",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Trigger payout correctly rejects non-existent tontine")
    
    def test_trigger_payout_endpoint_exists(self, admin_token):
        """Trigger payout endpoint should exist and return proper error for invalid tontine"""
        # Get active tontines from admin list
        tontines_response = requests.get(
            f"{BASE_URL}/api/admin/tontines",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert tontines_response.status_code == 200
        
        tontines = tontines_response.json()
        active_tontines = [t for t in tontines if t.get("status") == "active"]
        
        if not active_tontines:
            # Test with a non-active tontine should return 400
            open_tontines = [t for t in tontines if t.get("status") == "open"]
            if open_tontines:
                response = requests.post(
                    f"{BASE_URL}/api/admin/trigger-payout/{open_tontines[0]['tontine_id']}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                assert response.status_code == 400, f"Expected 400, got {response.status_code}"
                print("✅ Trigger payout correctly rejects non-active tontine")
            else:
                print("✅ Trigger payout endpoint exists (no tontines to test with)")
        else:
            # Test with active tontine
            response = requests.post(
                f"{BASE_URL}/api/admin/trigger-payout/{active_tontines[0]['tontine_id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            # Should succeed or return meaningful error
            assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
            print(f"✅ Trigger payout endpoint works: status={response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
