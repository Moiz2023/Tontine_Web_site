from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random  # FIX: moved from inside route handler to top-level imports
import csv
import io
import html
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
from cryptography.fernet import Fernet
from starlette.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
# FIX: removed fallback string — app crashes loudly at startup if secret is missing
# rather than silently using a known-public string that allows JWT forgery
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_DAYS = 7

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# FIX: ADMIN_EMAILS moved to top-level — was defined at line 974 but referenced
# at lines 219 and 276 (register and login routes), causing a potential NameError
# during startup if those routes were hit before the module finished loading.
ADMIN_EMAILS = [e.strip() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()]

# FIX: IBAN encryption key — must be set in environment, 32-byte URL-safe base64 key
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
_IBAN_KEY = os.environ.get('IBAN_ENCRYPTION_KEY')
if _IBAN_KEY:
    _fernet = Fernet(_IBAN_KEY.encode())
else:
    _fernet = None
    logging.warning("IBAN_ENCRYPTION_KEY not set — IBAN will not be encrypted at rest. Set this before production.")

def encrypt_iban(iban: str) -> str:
    """Encrypt IBAN before storing in DB (GDPR requirement for financial data)."""
    if _fernet is None:
        return iban  # fallback for dev only
    return _fernet.encrypt(iban.encode()).decode()

def decrypt_iban(encrypted: str) -> str:
    """Decrypt IBAN for internal use only — never expose in API responses."""
    if _fernet is None:
        return encrypted
    try:
        return _fernet.decrypt(encrypted.encode()).decode()
    except Exception:
        return "****"

def mask_iban(iban_or_encrypted: str) -> str:
    """Return masked IBAN safe for API responses (e.g. FR76 **** **** 1234)."""
    raw = decrypt_iban(iban_or_encrypted)
    if len(raw) >= 4:
        return raw[:4] + " **** **** " + raw[-4:]
    return "****"

# Create the main app
app = FastAPI(title="Savyn API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ RATE LIMITING ============
# FIX: add rate limiting on auth endpoints to prevent brute-force attacks
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    RATE_LIMITING_ENABLED = True
except ImportError:
    logger.warning("slowapi not installed — rate limiting disabled. Run: pip install slowapi")
    RATE_LIMITING_ENABLED = False
    # Provide a no-op decorator so the route definitions below still work
    class _NoopLimiter:
        def limit(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator
    limiter = _NoopLimiter()

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
    token = request.cookies.get('session_token')
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check session token (Google OAuth)
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

# ============ XSS SANITIZATION ============

def sanitize_input(text: str) -> str:
    """Remove potential XSS payloads from user input."""
    if not text:
        return text
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = html.escape(text)
    return text.strip()

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
# FIX: rate limit registration to 10 per minute per IP
@limiter.limit("10/minute")
async def register(request: Request, user_data: UserCreate, response: Response):
    if not user_data.accept_terms:
        raise HTTPException(status_code=400, detail="Vous devez accepter les conditions d'utilisation")

    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

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
# FIX: rate limit login to 5 per minute per IP to block brute-force attacks
@limiter.limit("5/minute")
async def login(request: Request, credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Votre compte est suspendu. Contactez le support.")

    if not verify_password(credentials.password, user.get("password_hash", "")):
        now = datetime.now(timezone.utc).isoformat()
        ip = request.client.host if request.client else "unknown"
        await db.login_attempts.insert_one({
            "email": credentials.email,
            "ip": ip,
            "success": False,
            "timestamp": now
        })
        raise HTTPException(status_code=401, detail="Invalid credentials")

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
    """Exchange Emergent OAuth session_id for user data."""
    body = await request.json()
    session_id = body.get("session_id")

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = resp.json()

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
        "session_token": session_token
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
    """Submit KYC verification (simulated for MVP)."""
    now = datetime.now(timezone.utc).isoformat()

    # FIX: encrypt IBAN before storing — GDPR requires financial data to be
    # protected at rest. The raw IBAN is never stored or returned in responses.
    encrypted_iban = encrypt_iban(kyc_data.iban)

    kyc_doc = {
        "kyc_id": f"kyc_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "id_type": kyc_data.id_type,
        "id_number": kyc_data.id_number,
        "iban_encrypted": encrypted_iban,      # encrypted value stored
        "iban_masked": mask_iban(encrypted_iban),  # safe display value
        "address": kyc_data.address,
        "city": kyc_data.city,
        "postal_code": kyc_data.postal_code,
        "country": kyc_data.country,
        "status": "verified",  # Auto-approve for MVP
        "submitted_at": now,
        "verified_at": now
    }

    await db.kyc_submissions.insert_one(kyc_doc)

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"kyc_status": "verified", "updated_at": now}}
    )

    return {"status": "verified", "message": "KYC verification completed"}

@api_router.get("/kyc/status")
async def get_kyc_status(user: dict = Depends(get_current_user)):
    kyc = await db.kyc_submissions.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if kyc:
        # FIX: never expose the raw encrypted IBAN — return only the masked version
        kyc.pop("iban_encrypted", None)
        kyc.pop("iban", None)
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
        "status": "open",
        "participants": [{
            "user_id": user["user_id"],
            "name": user["name"],
            "position": 1,
            "joined_at": now,
            "payments_made": 0,
            "received_payout": False
        }],
        "current_cycle": 1,
        "total_collected": 0,
        "guarantee_fund": 0,
        "created_at": now,
        "updated_at": now
    }
    await db.tontines.insert_one(tontine_doc)
    tontine_doc.pop("_id", None)
    return tontine_doc

@api_router.get("/tontines/{tontine_id}")
async def get_tontine(tontine_id: str, user: dict = Depends(get_current_user)):
    tontine = await db.tontines.find_one({"tontine_id": tontine_id}, {"_id": 0})
    if not tontine:
        raise HTTPException(status_code=404, detail="Tontine not found")

    participants = tontine.get("participants", [])
    user_ids = [p["user_id"] for p in participants]
    users_data = await db.users.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "trust_score": 1, "picture": 1}
    ).to_list(len(user_ids))
    user_map = {u["user_id"]: u for u in users_data}

    for p in participants:
        u = user_map.get(p["user_id"], {})
        p["trust_score"] = u.get("trust_score", 50)
        p["picture"] = u.get("picture")

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

    if user.get("trust_score", 50) < tontine.get("min_trust_score", 0):
        raise HTTPException(status_code=403, detail="Trust score too low")

    if any(p["user_id"] == user["user_id"] for p in participants):
        raise HTTPException(status_code=400, detail="Already joined this tontine")

    now = datetime.now(timezone.utc).isoformat()
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

    if len(participants) + 1 >= tontine["max_participants"]:
        if tontine.get("attribution_mode") == "random":
            # FIX: random imported at top of file, not inside handler
            all_participants = participants + [new_participant]
            random.shuffle(all_participants)
            for i, p in enumerate(all_participants):
                p["position"] = i + 1
            await db.tontines.update_one(
                {"tontine_id": join_data.tontine_id},
                {"$set": {"status": "active", "participants": all_participants, "current_cycle": 1}}
            )
        else:
            all_participants = participants + [new_participant]
            user_ids = [p["user_id"] for p in all_participants]
            users_data = await db.users.find(
                {"user_id": {"$in": user_ids}},
                {"_id": 0, "user_id": 1, "trust_score": 1, "created_at": 1}
            ).to_list(len(user_ids))
            score_map = {u["user_id"]: u.get("trust_score", 50) for u in users_data}

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

# ============ MARKETPLACE ============

@api_router.get("/tontines/marketplace")
async def get_marketplace(user: dict = Depends(get_current_user)):
    tontines = await db.tontines.find(
        {"status": "open"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return tontines

# ============ PAYMENT ROUTES ============

@api_router.post("/payments/checkout")
async def create_checkout(payment_data: PaymentCreate, request: Request, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

    tontine = await db.tontines.find_one({"tontine_id": payment_data.tontine_id}, {"_id": 0})
    if not tontine:
        raise HTTPException(status_code=404, detail="Tontine not found")

    participants = tontine.get("participants", [])
    if not any(p["user_id"] == user["user_id"] for p in participants):
        raise HTTPException(status_code=403, detail="Not a participant")

    amount = tontine["monthly_amount"]
    guarantee_fee = amount * 0.03
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
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)

    now = datetime.now(timezone.utc).isoformat()

    if status.payment_status == "paid" and payment["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed", "payment_status": "paid", "paid_at": now}}
        )
        await db.tontines.update_one(
            {"tontine_id": payment["tontine_id"]},
            {"$inc": {"total_collected": payment["base_amount"], "guarantee_fund": payment["guarantee_fee"]}}
        )
        await db.tontines.update_one(
            {"tontine_id": payment["tontine_id"], "participants.user_id": user["user_id"]},
            {"$inc": {"participants.$.payments_made": 1}}
        )
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
    """Handle Stripe webhooks."""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    body = await request.body()
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")

    try:
        webhook_response = await stripe_checkout.handle_webhook(
            body,
            request.headers.get("Stripe-Signature")
        )
    except Exception as e:
        # FIX: signature verification failure should return 400, not 200.
        # Returning 200 on error tells Stripe the webhook was handled successfully
        # and stops it from retrying — meaning missed payments go unrecorded.
        logger.error(f"Stripe webhook signature error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # FIX: DB errors are now allowed to propagate as 500 so Stripe retries
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

@api_router.get("/payments/history")
async def get_payment_history(user: dict = Depends(get_current_user)):
    payments = await db.payment_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return payments

# ============ WALLET ROUTES ============

@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    payments = await db.payment_transactions.find(
        {"user_id": user["user_id"], "payment_status": "paid"},
        {"_id": 0}
    ).to_list(500)

    total_contributed = sum(p.get("base_amount", 0) for p in payments if p.get("type") == "contribution")
    total_fees = sum(p.get("guarantee_fee", 0) for p in payments)

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
    successful_payments = await db.payment_transactions.count_documents({
        "user_id": user["user_id"],
        "payment_status": "paid"
    })

    tontines_count = await db.tontines.count_documents({
        "participants.user_id": user["user_id"]
    })

    created_at = datetime.fromisoformat(user.get("created_at", datetime.now(timezone.utc).isoformat()))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    account_age_days = (datetime.now(timezone.utc) - created_at).days

    breakdown = {
        "base_score": 50,
        "payment_bonus": min(successful_payments * 2, 30),
        "participation_bonus": min(tontines_count * 5, 15),
        "account_age_bonus": min(account_age_days // 30, 5),
        "kyc_bonus": 10 if user.get("kyc_status") == "verified" else 0
    }

    calculated_score = sum(breakdown.values())
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
    updates = {k: sanitize_input(str(v)) if isinstance(v, str) else v
               for k, v in body.items() if k in allowed_fields}

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})

    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return updated_user

# ============ ADMIN ROUTES ============

async def verify_admin(user: dict):
    """Verify user has admin privileges."""
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

    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result = await db.payment_transactions.aggregate(pipeline).to_list(1)
    total_volume = result[0]["total"] if result else 0

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
async def admin_list_users(
    user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50   # FIX: paginated — was .to_list(500) with no pagination
):
    await verify_admin(user)
    users = await db.users.find(
        {}, {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    for u in users:
        if u.get("name"):
            u["name"] = html.escape(u["name"])
    return {"users": users, "total": total, "skip": skip, "limit": limit}

@api_router.get("/admin/tontines")
async def admin_list_tontines(
    user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50   # FIX: paginated
):
    await verify_admin(user)
    tontines = await db.tontines.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.tontines.count_documents({})
    return {"tontines": tontines, "total": total, "skip": skip, "limit": limit}

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

@api_router.post("/admin/make-admin/{user_id}")
async def make_user_admin(user_id: str, user: dict = Depends(get_current_user)):
    await verify_admin(user)
    await db.users.update_one({"user_id": user_id}, {"$set": {"is_admin": True}})
    return {"message": f"User {user_id} is now an admin"}

@api_router.post("/admin/suspend/{user_id}")
async def suspend_user(user_id: str, request: Request, user: dict = Depends(get_current_user)):
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
    await verify_admin(user)
    body = await request.json()
    status = body.get("status", "verified")
    reason = body.get("reason", "")

    if status not in ["verified", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid KYC status")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": status, "updated_at": now}}
    )

    if status == "verified":
        await db.users.update_one({"user_id": user_id}, {"$inc": {"trust_score": 10}})

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
    await verify_admin(user)

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

    pipeline = [
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 7]},
            "new_users": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 12}
    ]
    user_growth = await db.users.aggregate(pipeline).to_list(12)

    tontine_dist = await db.tontines.aggregate(
        [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    ).to_list(10)

    kyc_dist = await db.users.aggregate(
        [{"$group": {"_id": "$kyc_status", "count": {"$sum": 1}}}]
    ).to_list(10)

    return {
        "monthly_volume": monthly_volume,
        "user_growth": user_growth,
        "tontine_distribution": {d["_id"]: d["count"] for d in tontine_dist},
        "kyc_distribution": {d["_id"]: d["count"] for d in kyc_dist}
    }

@api_router.get("/admin/fraud-alerts")
async def get_fraud_alerts(user: dict = Depends(get_current_user)):
    await verify_admin(user)

    alerts = []
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

    brute_force = await db.login_attempts.aggregate([
        {"$match": {"success": False, "timestamp": {"$gte": one_hour_ago}}},
        {"$group": {"_id": "$ip", "count": {"$sum": 1}, "emails": {"$addToSet": "$email"}}},
        {"$match": {"count": {"$gte": 5}}}
    ]).to_list(50)

    for bf in brute_force:
        alerts.append({
            "type": "brute_force",
            "severity": "high",
            "message": f"IP {bf['_id']}: {bf['count']} tentatives echouees en 1h",
            "details": {"ip": bf["_id"], "count": bf["count"], "emails": bf["emails"]}
        })

    multi_accounts = await db.login_attempts.aggregate([
        {"$match": {"success": True}},
        {"$group": {"_id": "$ip", "users": {"$addToSet": "$user_id"}}},
        {"$match": {"$expr": {"$gte": [{"$size": "$users"}, 3]}}}
    ]).to_list(50)

    for ma in multi_accounts:
        alerts.append({
            "type": "multi_account",
            "severity": "medium",
            "message": f"IP {ma['_id']}: {len(ma['users'])} comptes differents",
            "details": {"ip": ma["_id"], "user_count": len(ma["users"]), "user_ids": ma["users"][:5]}
        })

    suspended = await db.users.count_documents({"is_suspended": True})
    if suspended > 0:
        alerts.append({
            "type": "suspended_accounts",
            "severity": "info",
            "message": f"{suspended} compte(s) suspendu(s)",
            "details": {"count": suspended}
        })

    return {"alerts": alerts, "total": len(alerts)}

# ============ PAYOUT / FUND RECEPTION ============

@api_router.post("/admin/trigger-payout/{tontine_id}")
async def trigger_payout(tontine_id: str, user: dict = Depends(get_current_user)):
    await verify_admin(user)

    tontine = await db.tontines.find_one({"tontine_id": tontine_id}, {"_id": 0})
    if not tontine:
        raise HTTPException(status_code=404, detail="Tontine not found")

    if tontine["status"] != "active":
        raise HTTPException(status_code=400, detail="Tontine is not active")

    current_cycle = tontine.get("current_cycle", 1)
    participants = tontine.get("participants", [])

    recipient = next((p for p in participants if p["position"] == current_cycle), None)
    if not recipient:
        raise HTTPException(status_code=400, detail="No recipient for current cycle")

    if recipient.get("received_payout"):
        raise HTTPException(status_code=400, detail="Recipient already received payout for this cycle")

    now = datetime.now(timezone.utc).isoformat()
    gross_amount = tontine["monthly_amount"] * tontine["max_participants"]
    platform_fee = round(gross_amount * 0.02, 2)
    net_amount = round(gross_amount - platform_fee, 2)

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

    await db.platform_revenue.insert_one({
        "revenue_id": f"rev_{uuid.uuid4().hex[:12]}",
        "source": "payout_fee",
        "payout_id": payout_doc["payout_id"],
        "tontine_id": tontine_id,
        "amount": platform_fee,
        "created_at": now
    })

    await db.tontines.update_one(
        {"tontine_id": tontine_id, "participants.user_id": recipient["user_id"]},
        {"$set": {"participants.$.received_payout": True}}
    )

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

# ============ SHARE TONTINE LINK ============

@api_router.get("/tontines/{tontine_id}/share")
async def get_share_link(tontine_id: str, user: dict = Depends(get_current_user)):
    tontine = await db.tontines.find_one({"tontine_id": tontine_id}, {"_id": 0})
    if not tontine:
        raise HTTPException(status_code=404, detail="Tontine not found")

    if tontine["creator_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can share this tontine")

    base_url = os.environ.get("FRONTEND_URL", "https://trustfundy-staging.preview.emergentagent.com")
    share_url = f"{base_url}/tontines/{tontine_id}"
    share_text = f"Rejoignez ma tontine \"{tontine['name']}\" sur Savyn ! {tontine['monthly_amount']}EUR/mois, {tontine['max_participants']} participants. "

    return {
        "url": share_url,
        "text": share_text,
        "tontine_name": tontine["name"],
        "whatsapp_url": f"https://wa.me/?text={share_text}{share_url}",
        "email_subject": f"Invitation - Tontine \"{tontine['name']}\" sur Savyn",
        "email_body": f"Bonjour,\n\nJe vous invite a rejoindre ma tontine \"{tontine['name']}\" sur Savyn.\n\nMontant mensuel: {tontine['monthly_amount']}EUR\nParticipants: {len(tontine.get('participants', []))}/{tontine['max_participants']}\n\nRejoingnez ici: {share_url}\n\nA bientot !",
        "sms_body": f"{share_text}{share_url}"
    }

# ============ WALLET EXPORT ============

@api_router.get("/wallet/export")
async def export_wallet(user: dict = Depends(get_current_user)):
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
    contracts = await db.contracts.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("accepted_at", -1).to_list(50)
    return contracts

# ============ LEMON WAY MOCK ============

@api_router.get("/lemonway/status")
async def lemonway_status():
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

# FIX: CORS — explicit origin list required in production.
# With allow_credentials=True, browsers BLOCK wildcard '*' origins (CORS spec),
# so '*' was causing silent failures. Must be an explicit list.
_cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
if _cors_origins_raw.strip() and _cors_origins_raw.strip() != '*':
    _cors_origins = [o.strip() for o in _cors_origins_raw.split(',') if o.strip()]
else:
    # Dev fallback — explicit localhost origins instead of wildcard
    _cors_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        os.environ.get("FRONTEND_URL", "https://trustfundy-staging.preview.emergentagent.com")
    ]
    if not _cors_origins_raw:
        logger.warning("CORS_ORIGINS not set — falling back to localhost. Set this in production.")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
