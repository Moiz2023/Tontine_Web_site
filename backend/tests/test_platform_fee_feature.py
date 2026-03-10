"""
Test Suite for Savyn Platform 2% Service Fee Feature

This test verifies the new 2% platform service fee on payouts:
1. POST /api/admin/trigger-payout/{tontine_id} - payout includes gross_amount, platform_fee (2%), net_amount
2. Platform revenue stored in db.platform_revenue collection
3. GET /api/admin/stats returns platform_revenue field
4. GET /api/wallet returns total_platform_fees field  
5. GET /api/wallet/export CSV includes platform fees
6. Digital contract terms include platform_fee_pct and 2% obligation

Prerequisites:
- Admin user: admin@savyn.com / test123456
- API URL from environment
"""

import pytest
import requests
import os
import uuid
import time
import csv
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://trustfundy-staging.preview.emergentagent.com').rstrip('/')


class TestPlatformFeeFeature:
    """Tests for the 2% platform service fee feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin JWT token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "test123456"
        })
        
        if response.status_code != 200:
            pytest.skip("Admin login failed - cannot proceed with admin tests")
        
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_session(self, admin_token):
        """Get admin authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_users_and_tontine(self, admin_token):
        """Create test users and tontine for payout testing"""
        # Generate unique identifiers
        unique_id = uuid.uuid4().hex[:8]
        
        # Create 2 test users with KYC verified
        users = []
        for i in range(2):
            user_email = f"TEST_payout_user_{unique_id}_{i}@test.com"
            register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": user_email,
                "password": "test123456",
                "name": f"Test Payout User {i}",
                "accept_terms": True
            })
            
            if register_resp.status_code in [200, 201]:
                user_data = register_resp.json()
                users.append({
                    "user_id": user_data.get("user_id"),
                    "email": user_email,
                    "token": user_data.get("token")
                })
                
                # Submit KYC for each user to make them verified
                user_session = requests.Session()
                user_session.headers.update({
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {user_data.get('token')}"
                })
                kyc_resp = user_session.post(f"{BASE_URL}/api/kyc/submit", json={
                    "id_type": "passport",
                    "id_number": f"TEST{unique_id}{i}",
                    "iban": "FR7630006000011234567890189",
                    "address": "123 Test Street",
                    "city": "Paris",
                    "postal_code": "75001",
                    "country": "FR"
                })
                print(f"KYC submission for user {i}: {kyc_resp.status_code}")
        
        if len(users) < 2:
            pytest.skip("Could not create enough test users for payout test")
        
        # Create tontine with max 2 participants (so it activates quickly)
        user1_session = requests.Session()
        user1_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {users[0]['token']}"
        })
        
        tontine_name = f"TEST_Payout_Tontine_{unique_id}"
        create_resp = user1_session.post(f"{BASE_URL}/api/tontines", json={
            "name": tontine_name,
            "description": "Tontine for testing payout fees",
            "monthly_amount": 100.0,
            "max_participants": 2,
            "duration_months": 2,
            "start_date": "2025-02-01",
            "attribution_mode": "fixed",
            "min_trust_score": 30
        })
        
        if create_resp.status_code not in [200, 201]:
            pytest.skip(f"Could not create test tontine: {create_resp.text}")
        
        tontine_id = create_resp.json().get("tontine_id")
        print(f"Created tontine: {tontine_id}")
        
        # User 2 joins the tontine (with contract acceptance)
        user2_session = requests.Session()
        user2_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {users[1]['token']}"
        })
        
        join_resp = user2_session.post(f"{BASE_URL}/api/tontines/join", json={
            "tontine_id": tontine_id,
            "accept_contract": True
        })
        print(f"User 2 join response: {join_resp.status_code} - {join_resp.text}")
        
        # Wait a moment for DB to sync
        time.sleep(0.5)
        
        return {
            "users": users,
            "tontine_id": tontine_id,
            "tontine_name": tontine_name,
            "monthly_amount": 100.0,
            "max_participants": 2
        }
    
    # ==================== ADMIN TRIGGER-PAYOUT TESTS ====================
    
    def test_admin_trigger_payout_returns_fee_breakdown(self, admin_session, test_users_and_tontine):
        """Test POST /api/admin/trigger-payout returns gross_amount, platform_fee, net_amount"""
        tontine_id = test_users_and_tontine["tontine_id"]
        monthly_amount = test_users_and_tontine["monthly_amount"]
        max_participants = test_users_and_tontine["max_participants"]
        
        # Verify tontine is active before payout
        tontine_resp = admin_session.get(f"{BASE_URL}/api/tontines/{tontine_id}")
        assert tontine_resp.status_code == 200, f"Could not fetch tontine: {tontine_resp.text}"
        
        tontine_data = tontine_resp.json()
        print(f"Tontine status before payout: {tontine_data.get('status')}, participants: {len(tontine_data.get('participants', []))}")
        
        if tontine_data.get("status") != "active":
            pytest.skip(f"Tontine not active (status={tontine_data.get('status')}), cannot test payout")
        
        # Trigger payout
        payout_resp = admin_session.post(f"{BASE_URL}/api/admin/trigger-payout/{tontine_id}", json={})
        
        assert payout_resp.status_code == 200, f"Payout failed: {payout_resp.text}"
        
        payout_data = payout_resp.json()
        print(f"Payout response: {payout_data}")
        
        # Verify response contains fee breakdown
        assert "gross_amount" in payout_data, "Response missing gross_amount"
        assert "platform_fee" in payout_data, "Response missing platform_fee"
        assert "net_amount" in payout_data, "Response missing net_amount"
        
        # Verify calculations
        expected_gross = monthly_amount * max_participants  # 100 * 2 = 200
        expected_fee = round(expected_gross * 0.02, 2)  # 2% = 4.00
        expected_net = expected_gross - expected_fee  # 200 - 4 = 196
        
        assert payout_data["gross_amount"] == expected_gross, f"Expected gross {expected_gross}, got {payout_data['gross_amount']}"
        assert payout_data["platform_fee"] == expected_fee, f"Expected fee {expected_fee}, got {payout_data['platform_fee']}"
        assert payout_data["net_amount"] == expected_net, f"Expected net {expected_net}, got {payout_data['net_amount']}"
        
        # Store payout_id for later tests
        test_users_and_tontine["payout_id"] = payout_data.get("payout_id")
        test_users_and_tontine["recipient_user_id"] = payout_data.get("recipient_user_id")
        
    # ==================== ADMIN STATS TESTS ====================
    
    def test_admin_stats_includes_platform_revenue(self, admin_session):
        """Test GET /api/admin/stats returns platform_revenue with total and fee_pct"""
        response = admin_session.get(f"{BASE_URL}/api/admin/stats")
        
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        
        data = response.json()
        print(f"Admin stats: {data}")
        
        # Verify platform_revenue field exists
        assert "platform_revenue" in data, "Admin stats missing platform_revenue field"
        
        platform_revenue = data["platform_revenue"]
        
        # Verify structure
        assert "total" in platform_revenue, "platform_revenue missing 'total' field"
        assert "fee_pct" in platform_revenue, "platform_revenue missing 'fee_pct' field"
        
        # Verify fee_pct is 2
        assert platform_revenue["fee_pct"] == 2, f"Expected fee_pct=2, got {platform_revenue['fee_pct']}"
        
        # Total should be a number >= 0
        assert isinstance(platform_revenue["total"], (int, float)), "platform_revenue.total should be numeric"
        assert platform_revenue["total"] >= 0, "platform_revenue.total should be >= 0"
        
        print(f"Platform revenue total: {platform_revenue['total']}EUR, fee_pct: {platform_revenue['fee_pct']}%")
    
    # ==================== WALLET TESTS ====================
    
    def test_wallet_includes_total_platform_fees(self, admin_session, test_users_and_tontine):
        """Test GET /api/wallet returns total_platform_fees field"""
        # Use recipient user's session if we have them, otherwise admin
        if test_users_and_tontine.get("recipient_user_id"):
            # Find the recipient and use their token
            recipient_id = test_users_and_tontine["recipient_user_id"]
            recipient = next((u for u in test_users_and_tontine["users"] if u["user_id"] == recipient_id), None)
            if recipient:
                session = requests.Session()
                session.headers.update({
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {recipient['token']}"
                })
            else:
                session = admin_session
        else:
            session = admin_session
        
        response = session.get(f"{BASE_URL}/api/wallet")
        
        assert response.status_code == 200, f"Wallet endpoint failed: {response.text}"
        
        data = response.json()
        print(f"Wallet data: {data}")
        
        # Verify total_platform_fees field exists
        assert "total_platform_fees" in data, "Wallet response missing total_platform_fees field"
        
        # Should be a number
        assert isinstance(data["total_platform_fees"], (int, float)), "total_platform_fees should be numeric"
        
    def test_wallet_export_csv_includes_platform_fees(self, admin_session, test_users_and_tontine):
        """Test GET /api/wallet/export CSV includes platform fees in payout rows"""
        # Use recipient user's session
        if test_users_and_tontine.get("recipient_user_id"):
            recipient_id = test_users_and_tontine["recipient_user_id"]
            recipient = next((u for u in test_users_and_tontine["users"] if u["user_id"] == recipient_id), None)
            if recipient:
                session = requests.Session()
                session.headers.update({
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {recipient['token']}"
                })
            else:
                session = admin_session
        else:
            session = admin_session
        
        response = session.get(f"{BASE_URL}/api/wallet/export")
        
        assert response.status_code == 200, f"Wallet export failed: {response.text}"
        
        # Verify it's CSV
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type, f"Expected CSV content type, got {content_type}"
        
        # Parse CSV and check for Frais column (platform fees)
        csv_content = response.text
        print(f"CSV first 500 chars: {csv_content[:500]}")
        
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader, [])
        
        # Headers should include "Frais" column
        assert "Frais" in headers, f"CSV headers missing 'Frais' column: {headers}"
        
        print(f"CSV Headers: {headers}")
    
    # ==================== CONTRACT TERMS TESTS ====================
    
    def test_contract_terms_include_platform_fee(self, admin_session, test_users_and_tontine):
        """Test that digital contract terms include platform_fee_pct: 2 and 2% fee obligation"""
        # Check contracts collection via user contracts endpoint
        if test_users_and_tontine.get("users"):
            user = test_users_and_tontine["users"][1]  # User 2 who joined
            session = requests.Session()
            session.headers.update({
                "Content-Type": "application/json",
                "Authorization": f"Bearer {user['token']}"
            })
            
            response = session.get(f"{BASE_URL}/api/contracts")
            
            assert response.status_code == 200, f"Contracts endpoint failed: {response.text}"
            
            contracts = response.json()
            print(f"User contracts count: {len(contracts)}")
            
            if len(contracts) > 0:
                latest_contract = contracts[0]
                print(f"Latest contract terms: {latest_contract.get('terms', {})}")
                
                terms = latest_contract.get("terms", {})
                
                # Verify platform_fee_pct is in terms
                assert "platform_fee_pct" in terms, "Contract terms missing platform_fee_pct"
                assert terms["platform_fee_pct"] == 2, f"Expected platform_fee_pct=2, got {terms['platform_fee_pct']}"
                
                # Verify obligations mention 2% fee
                obligations = terms.get("obligations", [])
                has_fee_obligation = any("2%" in obl for obl in obligations)
                assert has_fee_obligation, f"Contract obligations should mention 2% fee: {obligations}"
            else:
                print("No contracts found for user - may need to check DB directly")


class TestPlatformFeeCalculation:
    """Tests to verify 2% fee calculation across different amounts"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "test123456"
        })
        
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_admin_stats_platform_revenue_structure(self, admin_session):
        """Verify admin stats platform_revenue has correct structure"""
        response = admin_session.get(f"{BASE_URL}/api/admin/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields in platform_revenue
        pr = data.get("platform_revenue", {})
        assert "total" in pr, "Missing total"
        assert "fee_pct" in pr, "Missing fee_pct"
        assert "payouts_count" in pr, "Missing payouts_count"
        
        print(f"Platform revenue stats: total={pr['total']}, fee_pct={pr['fee_pct']}, payouts_count={pr['payouts_count']}")


class TestPlatformFeeEndToEnd:
    """End-to-end test for the full payout flow with 2% fee"""
    
    def test_full_payout_flow_with_fee(self):
        """Test complete flow: create tontine -> fill -> activate -> payout -> verify fee"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # 1. Login as admin
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@savyn.com",
            "password": "test123456"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Admin login failed")
        
        token = login_resp.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # 2. Get admin stats before payout
        stats_before = session.get(f"{BASE_URL}/api/admin/stats").json()
        revenue_before = stats_before.get("platform_revenue", {}).get("total", 0)
        payouts_before = stats_before.get("platform_revenue", {}).get("payouts_count", 0)
        
        print(f"Before: revenue={revenue_before}, payouts={payouts_before}")
        
        # 3. Check for any active tontines we can trigger payout on
        tontines_resp = session.get(f"{BASE_URL}/api/admin/tontines")
        assert tontines_resp.status_code == 200
        
        tontines = tontines_resp.json()
        active_tontines = [t for t in tontines if t.get("status") == "active"]
        
        if not active_tontines:
            # No active tontines - check stats anyway
            print("No active tontines to trigger payout on")
            assert "platform_revenue" in stats_before
            assert stats_before["platform_revenue"]["fee_pct"] == 2
            return
        
        # 4. Find a tontine where current cycle recipient hasn't received payout
        payout_triggered = False
        for tontine in active_tontines:
            tontine_id = tontine.get("tontine_id")
            current_cycle = tontine.get("current_cycle", 1)
            participants = tontine.get("participants", [])
            
            # Find participant at current cycle position
            recipient = next((p for p in participants if p.get("position") == current_cycle), None)
            
            if recipient and not recipient.get("received_payout"):
                print(f"Triggering payout for tontine {tontine_id}, cycle {current_cycle}")
                
                payout_resp = session.post(f"{BASE_URL}/api/admin/trigger-payout/{tontine_id}", json={})
                
                if payout_resp.status_code == 200:
                    payout_data = payout_resp.json()
                    print(f"Payout triggered: {payout_data}")
                    
                    # Verify fee calculations
                    gross = payout_data.get("gross_amount", 0)
                    fee = payout_data.get("platform_fee", 0)
                    net = payout_data.get("net_amount", 0)
                    
                    expected_fee = round(gross * 0.02, 2)
                    assert fee == expected_fee, f"Expected fee {expected_fee}, got {fee}"
                    assert net == gross - fee, f"Net amount mismatch"
                    
                    payout_triggered = True
                    break
        
        # 5. Check stats after payout
        if payout_triggered:
            time.sleep(0.5)  # Allow DB to sync
            stats_after = session.get(f"{BASE_URL}/api/admin/stats").json()
            revenue_after = stats_after.get("platform_revenue", {}).get("total", 0)
            payouts_after = stats_after.get("platform_revenue", {}).get("payouts_count", 0)
            
            print(f"After: revenue={revenue_after}, payouts={payouts_after}")
            
            assert revenue_after >= revenue_before, "Platform revenue should increase after payout"
            assert payouts_after >= payouts_before, "Payouts count should increase"


# Quick health check test
def test_api_health():
    """Verify API is accessible"""
    response = requests.get(f"{BASE_URL}/api/")
    assert response.status_code == 200
    assert response.json().get("message") == "Savyn API"
