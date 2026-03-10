from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'tontine-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_DAYS = 7

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI(title="Savyn API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    accept_terms: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    kyc_status: str = "pending"
    trust_score: int = 50
    created_at: str
    language: str = "fr"

class KYCSubmission(BaseModel):
    id_type: str  # passport, id_card
    id_number: str
    iban: str
    address: str
    city: str
    postal_code: str
    country: str = "FR"

class TontineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    monthly_amount: float
    max_participants: int
    duration_months: int
    start_date: str
    attribution_mode: str = "fixed"  # fixed, random, auction
    min_trust_score: int = 30

class TontineJoin(BaseModel):
    tontine_id: str

class PaymentCreate(BaseModel):
    tontine_id: str
    origin_url: str

class SupportTicket(BaseModel):
    subject: str
    message: str
    category: str = "general"

class TontineContract(BaseModel):
    tontine_id: str
    accept_contract: bool = False

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Check cookie first, then Authorization header
    token = request.cookies.get('session_token')
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token (from Google OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if user:
            return user
    
    # Try JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload['user_id']}, {"_id": 0})
        if user:
            return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        pass
    
    raise HTTPException(status_code=401, detail="Invalid authentication")

# ============ AUTH ROUTES ============

import re
import html

# XSS Sanitization helper
def sanitize_input(text: str) -> str:
    """Remove potential XSS payloads from user input"""
    if not text:
        return text
    # First, remove script tags and dangerous patterns BEFORE escaping
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<[^>]+>', '', text)  # Remove all HTML tags
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    # Then HTML escape any remaining dangerous characters
    text = html.escape(text)
    return text.strip()

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    if not user_data.accept_terms:
        raise HTTPException(status_code=400, detail="Vous devez accepter les conditions d'utilisation")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Sanitize user inputs
    sanitized_name = sanitize_input(user_data.name)
    sanitized_phone = sanitize_input(user_data.phone) if user_data.phone else None
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": sanitized_name,
        "phone": sanitized_phone,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "kyc_status": "pending",
        "trust_score": 50,
        "language": "fr",
        "is_suspended": False,
        "terms_accepted_at": now,
        "created_at": now,
        "updated_at": now
    }
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    is_admin = user_data.email in ADMIN_EMAILS
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": sanitized_name,
        "phone": sanitized_phone,
        "kyc_status": "pending",
        "trust_score": 50,
        "is_admin": is_admin,
        "token": token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, request: Request, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Votre compte est suspendu. Contactez le support.")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        # Track failed login attempts for fraud detection
        now = datetime.now(timezone.utc).isoformat()
        ip = request.client.host if request.client else "unknown"
        await db.login_attempts.insert_one({
            "email": credentials.email,
            "ip": ip,
            "success": False,
            "timestamp": now
        })
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Track successful login
    now = datetime.now(timezone.utc).isoformat()
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    await db.login_attempts.insert_one({
        "email": credentials.email,
        "user_id": user["user_id"],
        "ip": ip,
        "user_agent": user_agent,
        "success": True,
        "timestamp": now
    })
    
    token = create_jwt_token(user["user_id"], user["email"])
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    is_admin = user.get("is_admin", False) or user.get("email") in ADMIN_EMAILS
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone"),
        "picture": user.get("picture"),
        "kyc_status": user.get("kyc_status", "pending"),
        "trust_score": user.get("trust_score", 50),
        "is_admin": is_admin,
        "token": token
    }

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange Emergent OAuth session_id for user data"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        data = resp.json()
    
    # Check if user exists
    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture"), "updated_at": now}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "phone": None,
            "password_hash": None,
            "kyc_status": "pending",
            "trust_score": 50,
            "language": "fr",
            "created_at": now,
            "updated_at": now
        }
        await db.users.insert_one(user_doc)
    
    # Store session
    session_token = data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {"session_token": session_token, "expires_at": expires_at, "created_at": now}},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "kyc_status": user.get("kyc_status", "pending"),
        "trust_score": user.get("trust_score", 50),
        "session_token": session_token  # Include token for mobile fallback
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    is_admin = user.get("is_admin", False) or user.get("email") in ADMIN_EMAILS
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone"),
        "picture": user.get("picture"),
        "kyc_status": user.get("kyc_status", "pending"),
        "trust_score": user.get("trust_score", 50),
        "language": user.get("language", "fr"),
        "is_admin": is_admin,
        "created_at": user.get("created_at")
    }

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    await db.user_sessions.delete_one({"user_id": user["user_id"]})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ============ KYC ROUTES ============

@api_router.post("/kyc/submit")
async def submit_kyc(kyc_data: KYCSubmission, user: dict = Depends(get_current_user)):
    """Submit KYC verification (simulated for MVP)"""
    now = datetime.now(timezone.utc).isoformat()
    
    kyc_doc = {
        "kyc_id": f"kyc_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "id_type": kyc_data.id_type,
        "id_number": kyc_data.id_number,
        "iban": kyc_data.iban,
        "address": kyc_data.address,
        "city": kyc_data.city,
        "postal_code": kyc_data.postal_code,
        "country": kyc_data.country,
        "status": "verified",  # Auto-approve for MVP
        "submitted_at": now,
        "verified_at": now
    }
    
    await db.kyc_submissions.insert_one(kyc_doc)
    
    # Update user KYC status
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"kyc_status": "verified", "updated_at": now}}
    )
    
    return {"status": "verified", "message": "KYC verification completed"}

@api_router.get("/kyc/status")
async def get_kyc_status(user: dict = Depends(get_current_user)):
    kyc = await db.kyc_submissions.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "kyc_status": user.get("kyc_status", "pending"),
        "kyc_details": kyc
    }

# ============ TONTINE ROUTES ============

@api_router.post("/tontines")
async def create_tontine(tontine_data: TontineCreate, user: dict = Depends(get_current_user)):
    if user.get("kyc_status") != "verified":
        raise HTTPException(status_code=403, detail="KYC verification required")
    
    now = datetime.now(timezone.utc).isoformat()
    tontine_id = f"tontine_{uuid.uuid4().hex[:12]}"
    
    tontine_doc = {
        "tontine_id": tontine_id,
        "name": tontine_data.name,
        "description": tontine_data.description,
        "monthly_amount": tontine_data.monthly_amount,
        "max_participants": tontine_data.max_participants,
        "duration_months": tontine_data.duration_months,
        "start_date": tontine_data.start_date,
        "attribution_mode": tontine_data.attribution_mode,
        "min_trust_score": tontine_data.min_trust_score,
        "creator_id": user["user_id"],
        "status": "open",  # open, active, completed
        "participants": [{
            "user_id": user["user_id"],
            "name": user["name"],
            "position": 1,
            "joined_at": now,
            "payments_made": 0,
            "received_payout": False
        }],
        "current_cycle": 0,
        "total_collected": 0.0,
        "guarantee_fund": 0.0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.tontines.insert_one(tontine_doc)
    
    return {"tontine_id": tontine_id, "message": "Tontine created successfully"}

@api_router.get("/tontines")
async def list_tontines(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    
    tontines = await db.tontines.find(query, {"_id": 0}).to_list(100)
    
    # Batch fetch all participant trust scores to avoid N+1 queries
    all_user_ids = set()
    for t in tontines:
        for p in t.get("participants", []):
            all_user_ids.add(p["user_id"])
    
    user_scores = {}
    if all_user_ids:
        users = await db.users.find(
            {"user_id": {"$in": list(all_user_ids)}},
            {"_id": 0, "user_id": 1, "trust_score": 1}
        ).to_list(len(all_user_ids))
        user_scores = {u["user_id"]: u.get("trust_score", 50) for u in users}
    
    for t in tontines:
        participants = t.get("participants", [])
        if participants:
            scores = [user_scores.get(p["user_id"], 50) for p in participants]
            t["avg_trust_score"] = sum(scores) // len(scores) if scores else 50
        t["spots_left"] = t["max_participants"] - len(participants)
    
    return tontines

@api_router.get("/tontines/marketplace")
async def marketplace_tontines():
    """Public marketplace - no auth required"""
    tontines = await db.tontines.find({"status": "open"}, {"_id": 0}).to_list(50)
    
    # Batch fetch all participant trust scores to avoid N+1 queries
    all_user_ids = set()
    for t in tontines:
        for p in t.get("participants", []):
            all_user_ids.add(p["user_id"])
    
    user_scores = {}
    if all_user_ids:
        users = await db.users.find(
            {"user_id": {"$in": list(all_user_ids)}},
            {"_id": 0, "user_id": 1, "trust_score": 1}
        ).to_list(len(all_user_ids))
        user_scores = {u["user_id"]: u.get("trust_score", 50) for u in users}
    
    for t in tontines:
        participants = t.get("participants", [])
        if participants:
            scores = [user_scores.get(p["user_id"], 50) for p in participants]
            t["avg_trust_score"] = sum(scores) // len(scores) if scores else 50
        t["spots_left"] = t["max_participants"] - len(participants)
        t["participant_count"] = len(participants)
        del t["participants"]
    
    return tontines

@api_router.get("/tontines/{tontine_id}")
async def get_tontine(tontine_id: str, user: dict = Depends(get_current_user)):
    tontine = await db.tontines.find_one({"tontine_id": tontine_id}, {"_id": 0})
    if not tontine:
        raise HTTPException(status_code=404, detail="Tontine not found")
    
    # Get participant details
    participants = tontine.get("participants", [])
    user_ids = [p["user_id"] for p in participants]
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0}).to_list(100)
    user_map = {u["user_id"]: u for u in users}
    
    for p in participants:
        u = user_map.get(p["user_id"], {})
        p["trust_score"] = u.get("trust_score", 50)
        p["picture"] = u.get("picture")
    
    # Get payment history
    payments = await db.payments.find({"tontine_id": tontine_id}, {"_id": 0}).to_list(500)
    tontine["payment_history"] = payments
    
    return tontine

@api_router.post("/tontines/join")
async def join_tontine(join_data: TontineContract, user: dict = Depends(get_current_user)):
    if user.get("kyc_status") != "verified":
        raise HTTPException(status_code=403, detail="KYC verification required")
    
    if user.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Votre compte est suspendu")
    
    if not join_data.accept_contract:
        raise HTTPException(status_code=400, detail="Vous devez accepter le contrat digital pour rejoindre la tontine")
    
    tontine = await db.tontines.find_one({"tontine_id": join_data.tontine_id}, {"_id": 0})
    if not tontine:
        raise HTTPException(status_code=404, detail="Tontine not found")
    
    if tontine["status"] != "open":
        raise HTTPException(status_code=400, detail="Tontine is not open for joining")
    
    participants = tontine.get("participants", [])
    if len(participants) >= tontine["max_participants"]:
        raise HTTPException(status_code=400, detail="Tontine is full")
    
    # Check trust score
    if user.get("trust_score", 50) < tontine.get("min_trust_score", 0):
        raise HTTPException(status_code=403, detail="Trust score too low")
    
    # Check if already joined
    if any(p["user_id"] == user["user_id"] for p in participants):
        raise HTTPException(status_code=400, detail="Already joined this tontine")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Smart attribution: new users go to end, high-score users get better positions
    # For fixed mode, newcomers always go last (natural order)
    # Position is simply next available
    position = len(participants) + 1
    
    new_participant = {
        "user_id": user["user_id"],
        "name": user["name"],
        "position": position,
        "joined_at": now,
        "payments_made": 0,
        "received_payout": False
    }
    
    await db.tontines.update_one(
        {"tontine_id": join_data.tontine_id},
        {
            "$push": {"participants": new_participant},
            "$set": {"updated_at": now}
        }
    )
    
    # Store digital contract
    contract_doc = {
        "contract_id": f"contract_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "tontine_id": join_data.tontine_id,
        "contract_type": "participation",
        "terms": {
            "monthly_amount": tontine["monthly_amount"],
            "duration_months": tontine["duration_months"],
            "max_participants": tontine["max_participants"],
            "guarantee_fee_pct": 3,
            "platform_fee_pct": 2,
            "obligations": [
                "Effectuer tous les paiements mensuels à temps",
                "Autoriser le prélèvement SEPA automatique",
                "Accepter la procédure de recouvrement en cas de défaut",
                "Contribuer au fonds de garantie (3% par contribution)",
                "Accepter les frais de service Savyn (2% sur chaque versement reçu)"
            ]
        },
        "accepted_at": now,
        "ip_address": "recorded"
    }
    await db.contracts.insert_one(contract_doc)
    
    # Check if tontine is now full -> activate and apply smart attribution
    if len(participants) + 1 >= tontine["max_participants"]:
        # Smart attribution for non-fixed modes
        if tontine.get("attribution_mode") == "random":
            import random
            all_participants = participants + [new_participant]
            random.shuffle(all_participants)
            for i, p in enumerate(all_participants):
                p["position"] = i + 1
            await db.tontines.update_one(
                {"tontine_id": join_data.tontine_id},
                {"$set": {"status": "active", "participants": all_participants, "current_cycle": 1}}
            )
        else:
            # Fixed mode: keep order but apply smart positioning
            # High trust score users get earlier positions, new users at end
            all_participants = participants + [new_participant]
            # Fetch trust scores
            user_ids = [p["user_id"] for p in all_participants]
            users_data = await db.users.find(
                {"user_id": {"$in": user_ids}},
                {"_id": 0, "user_id": 1, "trust_score": 1, "created_at": 1}
            ).to_list(len(user_ids))
            score_map = {u["user_id"]: u.get("trust_score", 50) for u in users_data}
            
            # Sort: higher trust score first, then by join date (earlier first)
            all_participants.sort(key=lambda p: (-score_map.get(p["user_id"], 50), p.get("joined_at", "")))
            for i, p in enumerate(all_participants):
                p["position"] = i + 1
            
            await db.tontines.update_one(
                {"tontine_id": join_data.tontine_id},
                {"$set": {"status": "active", "participants": all_participants, "current_cycle": 1}}
            )
    
    return {"message": "Successfully joined tontine", "position": position, "contract_id": contract_doc["contract_id"]}

@api_router.get("/tontines/user/active")
async def get_user_tontines(user: dict = Depends(get_current_user)):
    """Get tontines where user is a participant"""
    tontines = await db.tontines.find(
        {"participants.user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(50)
    
    for t in tontines:
        participants = t.get("participants", [])
        user_participant = next((p for p in participants if p["user_id"] == user["user_id"]), None)
        t["user_position"] = user_participant["position"] if user_participant else None
        t["participant_count"] = len(participants)
    
    return tontines

# ============ PAYMENT ROUTES ============

@api_router.post("/payments/checkout")
async def create_checkout(payment_data: PaymentCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create Stripe checkout session for tontine contribution"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    tontine = await db.tontines.find_one({"tontine_id": payment_data.tontine_id}, {"_id": 0})
    if not tontine:
        raise HTTPException(status_code=404, detail="Tontine not found")
    
    # Check if user is participant
    participants = tontine.get("participants", [])
    if not any(p["user_id"] == user["user_id"] for p in participants):
        raise HTTPException(status_code=403, detail="Not a participant")
    
    amount = tontine["monthly_amount"]
    guarantee_fee = amount * 0.03  # 3% guarantee fund
    total_amount = amount + guarantee_fee
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{payment_data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payment_data.origin_url}/dashboard"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(total_amount),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "tontine_id": payment_data.tontine_id,
            "type": "contribution",
            "base_amount": str(amount),
            "guarantee_fee": str(guarantee_fee)
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Record payment transaction
    now = datetime.now(timezone.utc).isoformat()
    payment_doc = {
        "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "tontine_id": payment_data.tontine_id,
        "amount": total_amount,
        "base_amount": amount,
        "guarantee_fee": guarantee_fee,
        "currency": "eur",
        "status": "pending",
        "payment_status": "initiated",
        "type": "contribution",
        "created_at": now
    }
    await db.payment_transactions.insert_one(payment_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    """Check payment status"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check with Stripe
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update payment status
    if status.payment_status == "paid" and payment["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed", "payment_status": "paid", "paid_at": now}}
        )
        
        # Update tontine
        await db.tontines.update_one(
            {"tontine_id": payment["tontine_id"]},
            {
                "$inc": {
                    "total_collected": payment["base_amount"],
                    "guarantee_fund": payment["guarantee_fee"]
                }
            }
        )
        
        # Update participant payment count
        await db.tontines.update_one(
            {"tontine_id": payment["tontine_id"], "participants.user_id": user["user_id"]},
            {"$inc": {"participants.$.payments_made": 1}}
        )
        
        # Increase trust score
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"trust_score": 2}, "$set": {"updated_at": now}}
        )
    elif status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "expired", "payment_status": "expired"}}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(
            body,
            request.headers.get("Stripe-Signature")
        )
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            now = datetime.now(timezone.utc).isoformat()
            
            payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if payment and payment["payment_status"] != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"status": "completed", "payment_status": "paid", "paid_at": now}}
                )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": True}

@api_router.get("/payments/history")
async def get_payment_history(user: dict = Depends(get_current_user)):
    """Get user's payment history"""
    payments = await db.payment_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return payments

# ============ WALLET ROUTES ============

@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    """Get user's wallet summary"""
    # Get all payments
    payments = await db.payment_transactions.find(
        {"user_id": user["user_id"], "payment_status": "paid"},
        {"_id": 0}
    ).to_list(500)
    
    total_contributed = sum(p.get("base_amount", 0) for p in payments if p.get("type") == "contribution")
    total_fees = sum(p.get("guarantee_fee", 0) for p in payments)
    
    # Get payouts received
    payouts = await db.payouts.find(
        {"user_id": user["user_id"], "status": "completed"},
        {"_id": 0}
    ).to_list(100)
    total_received = sum(p.get("amount", 0) for p in payouts)
    total_platform_fees = sum(p.get("platform_fee", 0) for p in payouts)
    
    return {
        "total_contributed": total_contributed,
        "total_fees_paid": total_fees,
        "total_received": total_received,
        "total_platform_fees": total_platform_fees,
        "net_balance": total_received - total_contributed - total_fees,
        "recent_transactions": payments[:10],
        "recent_payouts": payouts[:10]
    }

# ============ TRUST SCORE ROUTES ============

@api_router.get("/trust-score")
async def get_trust_score(user: dict = Depends(get_current_user)):
    """Get detailed trust score breakdown"""
    # Count successful payments
    successful_payments = await db.payment_transactions.count_documents({
        "user_id": user["user_id"],
        "payment_status": "paid"
    })
    
    # Count tontines participated
    tontines_count = await db.tontines.count_documents({
        "participants.user_id": user["user_id"]
    })
    
    # Calculate account age bonus
    created_at = datetime.fromisoformat(user.get("created_at", datetime.now(timezone.utc).isoformat()))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    account_age_days = (datetime.now(timezone.utc) - created_at).days
    
    # Calculate breakdown
    breakdown = {
        "base_score": 50,
        "payment_bonus": min(successful_payments * 2, 30),
        "participation_bonus": min(tontines_count * 5, 15),
        "account_age_bonus": min(account_age_days // 30, 5),
        "kyc_bonus": 10 if user.get("kyc_status") == "verified" else 0
    }
    
    # Calculate actual trust score from breakdown
    calculated_score = sum(breakdown.values())
    
    # Update user's trust score if different
    stored_score = user.get("trust_score", 50)
    if calculated_score != stored_score:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"trust_score": calculated_score}}
        )
    
    return {
        "trust_score": calculated_score,
        "breakdown": breakdown,
        "level": "Gold" if calculated_score >= 80 else "Silver" if calculated_score >= 60 else "Bronze"
    }

# ============ SUPPORT ROUTES ============

@api_router.post("/support/tickets")
async def create_ticket(ticket: SupportTicket, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    ticket_doc = {
        "ticket_id": f"ticket_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "user_email": user["email"],
        "subject": sanitize_input(ticket.subject),
        "message": sanitize_input(ticket.message),
        "category": ticket.category,
        "status": "open",
        "created_at": now,
        "updated_at": now
    }
    await db.support_tickets.insert_one(ticket_doc)
    return {"ticket_id": ticket_doc["ticket_id"], "message": "Ticket created"}

@api_router.get("/support/tickets")
async def get_user_tickets(user: dict = Depends(get_current_user)):
    tickets = await db.support_tickets.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return tickets

# ============ USER SETTINGS ============

@api_router.put("/users/settings")
async def update_settings(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    allowed_fields = ["name", "phone", "language"]
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return updated_user

# ============ ADMIN ROUTES ============

# Admin email whitelist from environment variable
ADMIN_EMAILS = [e.strip() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()]

async def verify_admin(user: dict):
    """Verify user has admin privileges"""
    is_admin = user.get("is_admin", False) or user.get("email") in ADMIN_EMAILS
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return True

@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    await verify_admin(user)
    
    total_users = await db.users.count_documents({})
    verified_users = await db.users.count_documents({"kyc_status": "verified"})
    total_tontines = await db.tontines.count_documents({})
    active_tontines = await db.tontines.count_documents({"status": "active"})
    total_payments = await db.payment_transactions.count_documents({"payment_status": "paid"})
    
    # Calculate total volume using aggregation (more efficient)
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result = await db.payment_transactions.aggregate(pipeline).to_list(1)
    total_volume = result[0]["total"] if result else 0
    
    # Calculate platform revenue
    revenue_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    revenue_result = await db.platform_revenue.aggregate(revenue_pipeline).to_list(1)
    platform_revenue = revenue_result[0]["total"] if revenue_result else 0
    platform_payouts = revenue_result[0]["count"] if revenue_result else 0
    
    return {
        "users": {"total": total_users, "verified": verified_users},
        "tontines": {"total": total_tontines, "active": active_tontines},
        "payments": {"total": total_payments, "volume": total_volume},
        "platform_revenue": {"total": round(platform_revenue, 2), "fee_pct": 2, "payouts_count": platform_payouts},
        "open_tickets": await db.support_tickets.count_documents({"status": "open"})
    }

@api_router.get("/admin/users")
async def admin_list_users(user: dict = Depends(get_current_user)):
    await verify_admin(user)
    # Sanitize output - hide sensitive fields
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    # Sanitize names for display
    for u in users:
        if u.get("name"):
            u["name"] = html.escape(u["name"])
    return users

@api_router.get("/admin/tontines")
async def admin_list_tontines(user: dict = Depends(get_current_user)):
    await verify_admin(user)
    tontines = await db.tontines.find({}, {"_id": 0}).to_list(500)
    return tontines

@api_router.get("/admin/tickets")
async def admin_list_tickets(user: dict = Depends(get_current_user)):
    await verify_admin(user)
    tickets = await db.support_tickets.find({}, {"_id": 0}).to_list(500)
    return tickets

@api_router.put("/admin/tickets/{ticket_id}")
async def admin_update_ticket(ticket_id: str, request: Request, user: dict = Depends(get_current_user)):
    await verify_admin(user)
    body = await request.json()
    now = datetime.now(timezone.utc).isoformat()
    
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": body.get("status", "open"), "admin_response": body.get("response"), "updated_at": now}}
    )
    return {"message": "Ticket updated"}

# Endpoint to make a user admin (protected - only existing admins can use)
@api_router.post("/admin/make-admin/{user_id}")
async def make_user_admin(user_id: str, user: dict = Depends(get_current_user)):
    await verify_admin(user)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_admin": True}}
    )
    return {"message": f"User {user_id} is now an admin"}

# ============ WALLET EXPORT ============

@api_router.get("/wallet/export")
async def export_wallet(user: dict = Depends(get_current_user)):
    """Export wallet transactions as CSV"""
    import csv
    import io
    from starlette.responses import StreamingResponse
    
    payments = await db.payment_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    payouts = await db.payouts.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Tontine", "Montant", "Frais", "Statut"])
    
    for p in payments:
        writer.writerow([
            p.get("created_at", ""),
            "Contribution",
            p.get("tontine_id", ""),
            f"{p.get('base_amount', p.get('amount', 0)):.2f}",
            f"{p.get('guarantee_fee', 0):.2f}",
            p.get("payment_status", "")
        ])
    
    for p in payouts:
        writer.writerow([
            p.get("created_at", ""),
            "Versement recu",
            p.get("tontine_id", ""),
            f"{p.get('amount', 0):.2f}",
            f"{p.get('platform_fee', 0):.2f}",
            p.get("status", "")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=savyn_releve_{user['user_id']}.csv"}
    )

# ============ CONTRACTS ============

@api_router.get("/contracts")
async def get_user_contracts(user: dict = Depends(get_current_user)):
    """Get user's digital contracts"""
    contracts = await db.contracts.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("accepted_at", -1).to_list(50)
    return contracts

# ============ FRAUD DETECTION ============

@api_router.get("/admin/fraud-alerts")
async def get_fraud_alerts(user: dict = Depends(get_current_user)):
    """Get fraud detection alerts"""
    await verify_admin(user)
    
    alerts = []
    
    # Detect multiple failed login attempts (>5 from same IP in 1 hour)
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    pipeline = [
        {"$match": {"success": False, "timestamp": {"$gte": one_hour_ago}}},
        {"$group": {"_id": "$ip", "count": {"$sum": 1}, "emails": {"$addToSet": "$email"}}},
        {"$match": {"count": {"$gte": 5}}}
    ]
    brute_force = await db.login_attempts.aggregate(pipeline).to_list(50)
    for bf in brute_force:
        alerts.append({
            "type": "brute_force",
            "severity": "high",
            "message": f"IP {bf['_id']}: {bf['count']} tentatives echouees en 1h",
            "details": {"ip": bf["_id"], "count": bf["count"], "emails": bf["emails"]}
        })
    
    # Detect accounts with same IP creating multiple accounts
    pipeline = [
        {"$match": {"success": True}},
        {"$group": {"_id": "$ip", "users": {"$addToSet": "$user_id"}}},
        {"$match": {"$expr": {"$gte": [{"$size": "$users"}, 3]}}}
    ]
    multi_accounts = await db.login_attempts.aggregate(pipeline).to_list(50)
    for ma in multi_accounts:
        alerts.append({
            "type": "multi_account",
            "severity": "medium",
            "message": f"IP {ma['_id']}: {len(ma['users'])} comptes differents",
            "details": {"ip": ma["_id"], "user_count": len(ma["users"]), "user_ids": ma["users"][:5]}
        })
    
    # Detect suspended users
    suspended = await db.users.count_documents({"is_suspended": True})
    if suspended > 0:
        alerts.append({
            "type": "suspended_accounts",
            "severity": "info",
            "message": f"{suspended} compte(s) suspendu(s)",
            "details": {"count": suspended}
        })
    
    return {"alerts": alerts, "total": len(alerts)}

# ============ ADMIN EXTENDED ============

@api_router.post("/admin/suspend/{user_id}")
async def suspend_user(user_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Suspend or unsuspend a user account"""
    await verify_admin(user)
    body = await request.json()
    suspend = body.get("suspend", True)
    reason = body.get("reason", "")
    
    now = datetime.now(timezone.utc).isoformat()
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "is_suspended": suspend,
            "suspension_reason": reason if suspend else None,
            "suspended_at": now if suspend else None,
            "updated_at": now
        }}
    )
    
    # Log admin action
    await db.admin_actions.insert_one({
        "action": "suspend" if suspend else "unsuspend",
        "target_user_id": user_id,
        "admin_user_id": user["user_id"],
        "reason": reason,
        "timestamp": now
    })
    
    return {"message": f"User {'suspended' if suspend else 'unsuspended'}", "user_id": user_id}

@api_router.put("/admin/kyc/{user_id}")
async def admin_update_kyc(user_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Manually approve or reject KYC"""
    await verify_admin(user)
    body = await request.json()
    status = body.get("status", "verified")  # verified, rejected
    reason = body.get("reason", "")
    
    if status not in ["verified", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid KYC status")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": status, "updated_at": now}}
    )
    
    # Update trust score based on KYC
    if status == "verified":
        await db.users.update_one(
            {"user_id": user_id},
            {"$inc": {"trust_score": 10}}
        )
    
    await db.admin_actions.insert_one({
        "action": "kyc_update",
        "target_user_id": user_id,
        "admin_user_id": user["user_id"],
        "new_status": status,
        "reason": reason,
        "timestamp": now
    })
    
    return {"message": f"KYC status updated to {status}", "user_id": user_id}

@api_router.get("/admin/analytics")
async def admin_analytics(user: dict = Depends(get_current_user)):
    """Financial analytics for admin dashboard"""
    await verify_admin(user)
    
    # Monthly payment volume
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 7]},
            "volume": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 12}
    ]
    monthly_volume = await db.payment_transactions.aggregate(pipeline).to_list(12)
    
    # User growth
    pipeline = [
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 7]},
            "new_users": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 12}
    ]
    user_growth = await db.users.aggregate(pipeline).to_list(12)
    
    # Tontine status distribution
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    tontine_distribution = await db.tontines.aggregate(pipeline).to_list(10)
    
    # KYC status distribution
    pipeline = [
        {"$group": {"_id": "$kyc_status", "count": {"$sum": 1}}}
    ]
    kyc_distribution = await db.users.aggregate(pipeline).to_list(10)
    
    return {
        "monthly_volume": monthly_volume,
        "user_growth": user_growth,
        "tontine_distribution": {d["_id"]: d["count"] for d in tontine_distribution},
        "kyc_distribution": {d["_id"]: d["count"] for d in kyc_distribution}
    }

# ============ PAYOUT / FUND RECEPTION ============

@api_router.post("/admin/trigger-payout/{tontine_id}")
async def trigger_payout(tontine_id: str, user: dict = Depends(get_current_user)):
    """Admin trigger payout for current cycle recipient"""
    await verify_admin(user)
    
    tontine = await db.tontines.find_one({"tontine_id": tontine_id}, {"_id": 0})
    if not tontine:
        raise HTTPException(status_code=404, detail="Tontine not found")
    
    if tontine["status"] != "active":
        raise HTTPException(status_code=400, detail="Tontine is not active")
    
    current_cycle = tontine.get("current_cycle", 1)
    participants = tontine.get("participants", [])
    
    # Find recipient for current cycle
    recipient = next((p for p in participants if p["position"] == current_cycle), None)
    if not recipient:
        raise HTTPException(status_code=400, detail="No recipient for current cycle")
    
    if recipient.get("received_payout"):
        raise HTTPException(status_code=400, detail="Recipient already received payout for this cycle")
    
    now = datetime.now(timezone.utc).isoformat()
    gross_amount = tontine["monthly_amount"] * tontine["max_participants"]
    platform_fee = round(gross_amount * 0.02, 2)  # 2% platform service fee
    net_amount = round(gross_amount - platform_fee, 2)
    
    # Create payout record
    payout_doc = {
        "payout_id": f"payout_{uuid.uuid4().hex[:12]}",
        "tontine_id": tontine_id,
        "user_id": recipient["user_id"],
        "cycle": current_cycle,
        "gross_amount": gross_amount,
        "platform_fee": platform_fee,
        "platform_fee_pct": 2,
        "amount": net_amount,
        "status": "completed",
        "method": "lemonway_simulated",
        "created_at": now
    }
    await db.payouts.insert_one(payout_doc)
    
    # Track platform revenue
    await db.platform_revenue.insert_one({
        "revenue_id": f"rev_{uuid.uuid4().hex[:12]}",
        "source": "payout_fee",
        "payout_id": payout_doc["payout_id"],
        "tontine_id": tontine_id,
        "amount": platform_fee,
        "created_at": now
    })
    
    # Mark recipient as received
    await db.tontines.update_one(
        {"tontine_id": tontine_id, "participants.user_id": recipient["user_id"]},
        {"$set": {"participants.$.received_payout": True}}
    )
    
    # Advance cycle
    next_cycle = current_cycle + 1
    new_status = "completed" if next_cycle > len(participants) else "active"
    await db.tontines.update_one(
        {"tontine_id": tontine_id},
        {"$set": {"current_cycle": next_cycle, "status": new_status, "updated_at": now}}
    )
    
    return {
        "message": f"Payout de {net_amount}EUR declenche (cycle {current_cycle})",
        "gross_amount": gross_amount,
        "platform_fee": platform_fee,
        "net_amount": net_amount,
        "recipient_user_id": recipient["user_id"],
        "payout_id": payout_doc["payout_id"],
        "next_cycle": next_cycle,
        "tontine_status": new_status
    }

# ============ LEMON WAY MOCK ============

@api_router.get("/lemonway/status")
async def lemonway_status():
    """Lemon Way integration status (sandbox mock)"""
    return {
        "provider": "Lemon Way",
        "mode": "sandbox_simulated",
        "status": "active",
        "capabilities": [
            "KYC verification",
            "SEPA Direct Debit mandate",
            "Escrow wallet management",
            "Automated fund transfers",
            "Payout processing"
        ],
        "note": "Integration simulee - En attente des cles API Lemon Way pour activer le mode sandbox reel"
    }

@api_router.get("/lemonway/wallet/{user_id_param}")
async def lemonway_wallet(user_id_param: str, user: dict = Depends(get_current_user)):
    """Get simulated Lemon Way wallet for a user"""
    # Only allow users to see their own wallet, or admins
    if user["user_id"] != user_id_param:
        await verify_admin(user)
    
    payments = await db.payment_transactions.find(
        {"user_id": user_id_param, "payment_status": "paid"},
        {"_id": 0}
    ).to_list(500)
    
    payouts = await db.payouts.find(
        {"user_id": user_id_param, "status": "completed"},
        {"_id": 0}
    ).to_list(100)
    
    total_in = sum(p.get("amount", 0) for p in payments)
    total_out = sum(p.get("amount", 0) for p in payouts)
    
    return {
        "provider": "Lemon Way (simulated)",
        "wallet_id": f"LW_{user_id_param}",
        "balance": total_out - total_in,
        "total_deposits": total_in,
        "total_withdrawals": total_out,
        "sepa_mandate_active": True,
        "escrow_status": "funds_held_by_provider"
    }

# ============ ROOT ============

@api_router.get("/")
async def root():
    return {"message": "Savyn API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
