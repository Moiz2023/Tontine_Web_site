"""
Test file for Share Tontine Link feature and Logo visibility
Tests:
- GET /api/tontines/{id}/share endpoint
- Share endpoint authorization (only creator can share)
- Share data structure validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@savyn.com"
ADMIN_PASSWORD = "test123456"
SHARE_TEST_EMAIL = "share_test@test.com"
SHARE_TEST_PASSWORD = "test123456"


class TestShareEndpoint:
    """Test share endpoint functionality"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin user and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return session
    
    @pytest.fixture(scope="class") 
    def share_test_session(self):
        """Login as share_test user and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SHARE_TEST_EMAIL, "password": SHARE_TEST_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Share test user login failed: {response.text}")
        return session
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Savyn API"
        print("✅ API health check passed")
    
    def test_admin_login(self, admin_session):
        """Verify admin user can login"""
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data.get("is_admin") == True
        print(f"✅ Admin user logged in: {data['email']}, is_admin={data.get('is_admin')}")
    
    def test_share_test_user_login(self, share_test_session):
        """Verify share test user can login"""
        response = share_test_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == SHARE_TEST_EMAIL
        print(f"✅ Share test user logged in: {data['email']}, kyc_status={data.get('kyc_status')}")
    
    def test_get_user_tontines(self, admin_session):
        """Get tontines created by admin user"""
        response = admin_session.get(f"{BASE_URL}/api/tontines/user/active")
        assert response.status_code == 200
        tontines = response.json()
        print(f"✅ Admin has {len(tontines)} tontines")
        # Store first tontine ID for share test if any
        return tontines
    
    def test_share_endpoint_as_creator(self, admin_session):
        """Test share endpoint returns correct data for tontine creator"""
        # First get admin's tontines
        response = admin_session.get(f"{BASE_URL}/api/tontines/user/active")
        assert response.status_code == 200
        tontines = response.json()
        
        if not tontines:
            pytest.skip("Admin has no tontines to test share endpoint")
        
        # Find an 'open' tontine created by admin
        user_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        admin_user_id = user_response.json()["user_id"]
        
        admin_tontine = None
        for t in tontines:
            if t.get("creator_id") == admin_user_id:
                admin_tontine = t
                break
        
        if not admin_tontine:
            pytest.skip("No tontine found where admin is creator")
        
        tontine_id = admin_tontine["tontine_id"]
        
        # Test share endpoint
        share_response = admin_session.get(f"{BASE_URL}/api/tontines/{tontine_id}/share")
        assert share_response.status_code == 200, f"Share endpoint failed: {share_response.text}"
        
        share_data = share_response.json()
        
        # Validate share data structure
        assert "url" in share_data, "Share data missing 'url'"
        assert "whatsapp_url" in share_data, "Share data missing 'whatsapp_url'"
        assert "email_subject" in share_data, "Share data missing 'email_subject'"
        assert "email_body" in share_data, "Share data missing 'email_body'"
        assert "sms_body" in share_data, "Share data missing 'sms_body'"
        
        # Validate URLs contain tontine ID
        assert tontine_id in share_data["url"], "Share URL should contain tontine ID"
        assert "wa.me" in share_data["whatsapp_url"], "WhatsApp URL invalid"
        assert admin_tontine["name"] in share_data["email_subject"], "Email subject should contain tontine name"
        
        print(f"✅ Share endpoint returned valid data for tontine {tontine_id}")
        print(f"   URL: {share_data['url']}")
        print(f"   WhatsApp URL: {share_data['whatsapp_url'][:50]}...")
        print(f"   Email Subject: {share_data['email_subject']}")
    
    def test_share_endpoint_forbidden_for_non_creator(self, admin_session, share_test_session):
        """Test share endpoint returns 403 for non-creator"""
        # Get admin's tontines
        response = admin_session.get(f"{BASE_URL}/api/tontines/user/active")
        tontines = response.json()
        
        if not tontines:
            pytest.skip("Admin has no tontines")
        
        user_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        admin_user_id = user_response.json()["user_id"]
        
        # Find tontine where admin is creator
        admin_tontine = None
        for t in tontines:
            if t.get("creator_id") == admin_user_id:
                admin_tontine = t
                break
        
        if not admin_tontine:
            pytest.skip("No tontine found where admin is creator")
        
        tontine_id = admin_tontine["tontine_id"]
        
        # Try to share as share_test user (not the creator)
        share_response = share_test_session.get(f"{BASE_URL}/api/tontines/{tontine_id}/share")
        
        # Should get 403 Forbidden
        assert share_response.status_code == 403, f"Expected 403 but got {share_response.status_code}: {share_response.text}"
        print(f"✅ Non-creator correctly gets 403 Forbidden on share endpoint")
    
    def test_share_endpoint_not_found(self, admin_session):
        """Test share endpoint returns 404 for non-existent tontine"""
        response = admin_session.get(f"{BASE_URL}/api/tontines/fake_tontine_123/share")
        assert response.status_code == 404
        print("✅ Share endpoint returns 404 for non-existent tontine")


class TestTontineDetailAndPlatformFee:
    """Test tontine detail page shows platform fee correctly"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin user and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return session
    
    def test_tontine_detail_endpoint(self, admin_session):
        """Test tontine detail endpoint returns full data"""
        # Get user tontines
        response = admin_session.get(f"{BASE_URL}/api/tontines/user/active")
        assert response.status_code == 200
        tontines = response.json()
        
        if not tontines:
            pytest.skip("No tontines available")
        
        tontine_id = tontines[0]["tontine_id"]
        
        # Get tontine detail
        detail_response = admin_session.get(f"{BASE_URL}/api/tontines/{tontine_id}")
        assert detail_response.status_code == 200
        
        detail = detail_response.json()
        assert "tontine_id" in detail
        assert "monthly_amount" in detail
        assert "max_participants" in detail
        assert "participants" in detail
        
        # Calculate expected values for platform fee
        total_per_turn = detail["monthly_amount"] * detail["max_participants"]
        expected_platform_fee = round(total_per_turn * 0.02, 2)
        expected_net = total_per_turn - expected_platform_fee
        
        print(f"✅ Tontine detail retrieved for {tontine_id}")
        print(f"   Monthly: {detail['monthly_amount']}EUR, Max Participants: {detail['max_participants']}")
        print(f"   Total per turn: {total_per_turn}EUR")
        print(f"   Expected platform fee (2%): {expected_platform_fee}EUR")
        print(f"   Expected net payout: {expected_net}EUR")
    
    def test_admin_stats_platform_revenue(self, admin_session):
        """Test admin stats includes platform revenue"""
        response = admin_session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        
        stats = response.json()
        assert "platform_revenue" in stats
        assert "total" in stats["platform_revenue"]
        assert "fee_pct" in stats["platform_revenue"]
        assert stats["platform_revenue"]["fee_pct"] == 2
        
        print(f"✅ Admin stats includes platform_revenue")
        print(f"   Total revenue: {stats['platform_revenue']['total']}EUR")
        print(f"   Fee percentage: {stats['platform_revenue']['fee_pct']}%")
        print(f"   Payouts count: {stats['platform_revenue'].get('payouts_count', 0)}")


class TestCreateTontineFlow:
    """Test create tontine flow"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin user and return session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return session
    
    def test_create_tontine_returns_id(self, admin_session):
        """Test creating a tontine returns tontine_id for share step"""
        # Create a test tontine
        tontine_data = {
            "name": "TEST_Share_Feature_Tontine",
            "description": "Test tontine for share feature testing",
            "monthly_amount": 100,
            "max_participants": 4,
            "duration_months": 4,
            "start_date": "2026-03-01",
            "attribution_mode": "fixed",
            "min_trust_score": 30
        }
        
        response = admin_session.post(
            f"{BASE_URL}/api/tontines",
            json=tontine_data
        )
        assert response.status_code == 200, f"Create tontine failed: {response.text}"
        
        result = response.json()
        assert "tontine_id" in result, "Create response missing tontine_id"
        
        tontine_id = result["tontine_id"]
        print(f"✅ Tontine created with ID: {tontine_id}")
        
        # Now test share endpoint for newly created tontine
        share_response = admin_session.get(f"{BASE_URL}/api/tontines/{tontine_id}/share")
        assert share_response.status_code == 200, f"Share failed for new tontine: {share_response.text}"
        
        share_data = share_response.json()
        assert share_data["tontine_name"] == tontine_data["name"]
        print(f"✅ Share endpoint works for newly created tontine")
        print(f"   Share URL: {share_data['url']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
