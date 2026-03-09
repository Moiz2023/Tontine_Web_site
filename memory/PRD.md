# Savyn - PRD (Product Requirements Document)

## Original Problem Statement
Plateforme digitale pour la gestion de tontines (epargne collective). Application web et mobile, backend securise, avec KYC, paiements SEPA, et gestion des groupes de tontine. Utilisation de Lemon Way pour la gestion des fonds.

## Brand Name: **Savyn**

## Core Requirements (MVP)
- **Onboarding & KYC:** Inscription email/mot de passe + Google OAuth. KYC simule (auto-approve). Acceptation conditions legales obligatoire.
- **Gestion des Tontines:** Creation, participation avec contrat digital, attribution intelligente des tours, ordre de reception fixe.
- **Paiements:** Simulation Stripe (test mode). SEPA simule. Integration Lemon Way prevue (sandbox mock actif).
- **Dashboard:** Vue d'ensemble tontines actives, paiements, Trust Score.
- **Admin Panel:** Supervision, gestion utilisateurs (suspension/reactivation), validation KYC manuelle, gestion payouts, detection fraude, analytics financiers.
- **Securite:** XSS sanitization, RBAC, JWT auth, detection fraude (brute force, multi-comptes), suspension comptes.
- **Contrat Digital:** Signature electronique obligatoire pour rejoindre une tontine.
- **Wallet:** Historique complet avec export CSV.

## Tech Stack
- **Frontend:** React, React Router, Tailwind CSS, Shadcn/UI, Framer Motion, Axios, i18next-style translations
- **Backend:** FastAPI (Python), MongoDB (motor), JWT (bcrypt/passlib)
- **Auth:** JWT + Emergent Google OAuth
- **Payments:** Stripe (test mode), Lemon Way (sandbox mock - en attente cles API)

## DB Collections
- **users:** {user_id, email, hashed_password, name, phone, picture, kyc_status, trust_score, role, is_admin, is_suspended, suspension_reason, terms_accepted_at, language, created_at, updated_at}
- **tontines:** {tontine_id, name, description, monthly_amount, max_participants, duration_months, start_date, attribution_mode, min_trust_score, creator_id, status, participants[], current_cycle, total_collected, guarantee_fund, created_at}
- **payment_transactions:** {payment_id, session_id, user_id, tontine_id, amount, base_amount, guarantee_fee, currency, status, payment_status, type, created_at}
- **kyc_submissions:** {kyc_id, user_id, id_type, id_number, iban, address, city, postal_code, country, status, submitted_at, verified_at}
- **support_tickets:** {ticket_id, user_id, user_email, subject, message, category, status, admin_response, created_at}
- **contracts:** {contract_id, user_id, tontine_id, contract_type, terms{}, accepted_at, ip_address}
- **payouts:** {payout_id, tontine_id, user_id, cycle, amount, status, method, created_at}
- **login_attempts:** {email, user_id, ip, user_agent, success, timestamp}
- **admin_actions:** {action, target_user_id, admin_user_id, reason, timestamp}

## What's Implemented
- Full web app MVP (auth, tontines, KYC, admin, wallet, marketplace, support)
- Rebranding to "Savyn" completed
- Admin emails via env variable (ADMIN_EMAILS)
- N+1 query performance fixes
- Terms acceptance at registration
- Digital contract for joining tontines
- Smart turn attribution (trust-score-based positioning when tontine activates)
- Wallet CSV export
- Admin: user suspension/reactivation
- Admin: manual KYC approve/reject
- Admin: trigger payouts for active tontines
- Fraud detection (brute force, multi-account detection)
- Analytics dashboard (tontine/KYC distributions)
- Lemon Way sandbox mock (status endpoint, wallet endpoint)
- Suspended users blocked from login

## What's Mocked/Simulated
- KYC verification (auto-approved)
- SEPA payments (Stripe test mode)
- Lemon Way (sandbox_simulated - awaiting real API keys)

## Backlog
- P0: Real Lemon Way integration (needs API keys from user)
- P1: Mobile app (separate repository, as requested by user)
- P1: Real KYC provider integration (document upload, selfie verification)
- P1: Email/SMS/Push notifications
- P2: Chat support en direct
- P2: Advanced fraud detection (device fingerprinting)
- P2: Automatic SEPA Direct Debit mandates
