# Savyn - PRD (Product Requirements Document)

## Original Problem Statement
Plateforme digitale pour la gestion de tontines (epargne collective). Application web et mobile, backend securise, avec KYC, paiements SEPA, et gestion des groupes de tontine.

## Brand Name: **Savyn**

## Core Requirements (MVP)
- **Onboarding & KYC:** Inscription email/mot de passe + Google OAuth. KYC simule (auto-approve).
- **Gestion des Tontines:** Creation, participation, ordre de reception fixe.
- **Paiements:** Simulation Stripe (test mode). SEPA simule.
- **Dashboard:** Vue d'ensemble tontines actives, paiements, Trust Score.
- **Admin Panel:** Supervision basique, gestion utilisateurs/tontines/tickets.
- **Securite:** XSS sanitization, RBAC, JWT auth.

## Tech Stack
- **Frontend:** React, React Router, Tailwind CSS, Shadcn/UI, Framer Motion, Axios, i18next-style translations
- **Backend:** FastAPI (Python), MongoDB (motor), JWT (bcrypt/passlib)
- **Auth:** JWT + Emergent Google OAuth
- **Payments:** Stripe (test mode via emergentintegrations)

## DB Schema
- **users:** {user_id, email, hashed_password, name, phone, picture, kyc_status, trust_score, role, is_admin, language, created_at, updated_at}
- **tontines:** {tontine_id, name, description, monthly_amount, max_participants, duration_months, start_date, attribution_mode, min_trust_score, creator_id, status, participants[], current_cycle, total_collected, guarantee_fund, created_at}
- **payment_transactions:** {payment_id, session_id, user_id, tontine_id, amount, base_amount, guarantee_fee, currency, status, payment_status, type, created_at}
- **kyc_submissions:** {kyc_id, user_id, id_type, id_number, iban, address, city, postal_code, country, status, submitted_at, verified_at}
- **support_tickets:** {ticket_id, user_id, user_email, subject, message, category, status, admin_response, created_at}
- **user_sessions:** {user_id, session_token, expires_at, created_at}

## Key API Endpoints
- POST /api/auth/register, /api/auth/login, /api/auth/session (Google OAuth), /api/auth/me, /api/auth/logout
- POST /api/kyc/submit, GET /api/kyc/status
- GET /api/tontines, POST /api/tontines, GET /api/tontines/{id}, POST /api/tontines/join, GET /api/tontines/user/active, GET /api/tontines/marketplace
- POST /api/payments/checkout, GET /api/payments/status/{id}, GET /api/payments/history
- GET /api/wallet, GET /api/trust-score
- POST /api/support/tickets, GET /api/support/tickets
- PUT /api/users/settings
- GET /api/admin/stats, /api/admin/users, /api/admin/tontines, /api/admin/tickets, PUT /api/admin/tickets/{id}, POST /api/admin/make-admin/{id}

## Admin Access
- Configured via ADMIN_EMAILS env var in backend/.env (comma-separated)
- Current admins: admin@savyn.com, slimimoez@gmail.com

## What's Implemented
- Full web app MVP (auth, tontines, KYC, admin, wallet, marketplace, support)
- Rebranding to "Savyn" completed
- Admin emails moved from hardcode to env variable
- N+1 query performance fixes (batch user trust score lookups)
- XSS protection, RBAC, JWT auth
- Google OAuth integration
- i18n (FR/EN)

## What's Mocked/Simulated
- KYC verification (auto-approved)
- SEPA payments (Stripe test mode)

## Backlog
- P1: Mobile app (separate repository requested by user)
- P2: Real KYC provider integration
- P2: Real SEPA payment integration
- P2: Advanced features (chat support, intelligent turn attribution, guarantee fund management)
