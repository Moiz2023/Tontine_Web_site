# Savyn - PRD (Product Requirements Document)

## Original Problem Statement
Plateforme digitale pour la gestion de tontines (epargne collective). Application web et mobile, backend securise, avec KYC, paiements SEPA, et gestion des groupes de tontine. Utilisation de Lemon Way pour la gestion des fonds.

## Brand Name: **Savyn**

## Core Requirements (MVP)
- **Onboarding & KYC:** Inscription email/mot de passe + Google OAuth. KYC simule (auto-approve). Acceptation conditions legales obligatoire.
- **Gestion des Tontines:** Creation, participation avec contrat digital, attribution intelligente des tours, ordre de reception fixe.
- **Paiements:** Simulation Stripe (test mode). SEPA simule. Integration Lemon Way prevue (sandbox mock actif).
- **Dashboard:** Vue d'ensemble tontines actives, paiements, Trust Score.
- **Admin Panel:** Supervision, gestion utilisateurs (suspension/reactivation), validation KYC manuelle, gestion payouts, detection fraude, analytics financiers. Menu admin visible uniquement pour les admins.
- **Securite:** XSS sanitization, RBAC, JWT auth, detection fraude (brute force, multi-comptes), suspension comptes.
- **Contrat Digital:** Signature electronique obligatoire pour rejoindre une tontine.
- **Wallet:** Historique complet avec export CSV.
- **Marketplace:** Bouton "Rejoindre" desactive si l'utilisateur est deja inscrit dans la tontine.

## Tech Stack
- **Frontend Web:** React, React Router, Tailwind CSS, Shadcn/UI, Framer Motion, Axios
- **Frontend Mobile:** React Native, React Navigation, react-native-vector-icons
- **Backend:** FastAPI (Python), MongoDB (motor), JWT (bcrypt/passlib)
- **Auth:** JWT + Emergent Google OAuth
- **Payments:** Stripe (test mode), Lemon Way (sandbox mock - en attente cles API)

## Architecture
```
/app/
├── backend/         # FastAPI backend (server.py)
├── frontend/        # React web app
│   └── src/
│       ├── components/  # Layout, UI (Shadcn)
│       ├── context/     # AuthContext, LanguageContext
│       └── pages/       # All page components
└── mobile/          # React Native app (separate codebase)
    └── src/
        ├── components/  # Reusable UI components
        ├── config/      # Colors, spacing, API URL
        ├── context/     # AuthContext, LanguageContext
        ├── navigation/  # AppNavigator (tabs + stack)
        ├── screens/     # auth/ + main/ screens
        └── services/    # API service layer
```

## DB Collections
- **users:** {user_id, email, hashed_password, name, phone, picture, kyc_status, trust_score, is_admin, is_suspended, terms_accepted_at, language, created_at}
- **tontines:** {tontine_id, name, description, monthly_amount, max_participants, duration_months, start_date, attribution_mode, min_trust_score, creator_id, status, participants[], current_cycle, total_collected, guarantee_fund}
- **payment_transactions:** {payment_id, user_id, tontine_id, amount, base_amount, guarantee_fee, payment_status, created_at}
- **kyc_submissions:** {kyc_id, user_id, id_type, id_number, iban, address, city, postal_code, country, status}
- **support_tickets:** {ticket_id, user_id, user_email, subject, message, category, status, admin_response}
- **contracts:** {contract_id, user_id, tontine_id, contract_type, terms{}, accepted_at}
- **payouts:** {payout_id, tontine_id, user_id, cycle, amount, status, method}
- **login_attempts:** {email, user_id, ip, user_agent, success, timestamp}
- **admin_actions:** {action, target_user_id, admin_user_id, reason, timestamp}

## What's Implemented
### Web App (complete)
- Full authentication (JWT + Google OAuth)
- KYC flow (simulated auto-approve)
- Tontine management (create, join with contract, detail, marketplace)
- Admin panel (users, tontines, tickets, fraud alerts, analytics, KYC validation, suspension, payouts)
- Wallet with CSV export
- Support ticketing + FAQ
- Trust Score system
- Branding "Savyn" throughout
- Admin menu visible only for admin users
- Join button disabled for already-joined tontines
- 47/47 backend + frontend tests passing

### Mobile App (complete code, needs real device testing)
- Login/Register with terms acceptance
- KYC flow
- Dashboard (tontines, wallet, trust score)
- Marketplace with contract dialog + join disabled for already-joined
- Create Tontine (3-step wizard)
- Tontine Detail (participants, payments, stats)
- Wallet (balance, transactions, Lemon Way info)
- Profile (settings, language toggle, logout)
- Support (FAQ, ticket creation, ticket history)
- Bottom tab navigation
- Pull-to-refresh on all lists
- FR/EN translations

## What's Mocked/Simulated
- KYC verification (auto-approved)
- SEPA payments (Stripe test mode)
- Lemon Way (sandbox_simulated - awaiting real API keys)

## Admin Access
- Configured via ADMIN_EMAILS env var in backend/.env
- Current admins: admin@savyn.com, slimimoez@gmail.com

## Testing Status
- Comprehensive tests passed: functional (47/47), security (XSS, RBAC, JWT, injection), load (concurrent requests)
- All penetration tests passed

## Backlog
- P0: Real Lemon Way integration (needs API keys from user)
- P1: Real KYC provider integration (document upload, selfie verification)
- P1: Email/SMS/Push notifications
- P2: Chat support en direct
- P2: Advanced fraud detection (device fingerprinting)
- P2: Automatic SEPA Direct Debit mandates
