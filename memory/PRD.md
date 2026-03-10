# Savyn - PRD (Product Requirements Document)

## Original Problem Statement
Plateforme digitale pour la gestion de tontines (epargne collective). Application web et mobile, backend securise, avec KYC, paiements SEPA, et gestion des groupes de tontine. Utilisation de Lemon Way pour la gestion des fonds.

## Brand Name: **Savyn**

## Architecture
```
/
├── backend/         # FastAPI (Python) + MongoDB
├── frontend/        # React web app
└── mobile/          # React Native (Expo) - code separe pour push independant
    ├── App.js       # Point d'entree Expo
    ├── app.json     # Config Expo (nom, icone, splash)
    ├── assets/      # Icone app
    └── src/
        ├── config/      # API URL, colors, spacing
        ├── context/     # AuthContext, LanguageContext
        ├── navigation/  # Tab + Stack navigation
        ├── screens/     # auth/ (Login, Register, KYC) + main/ (8 ecrans)
        ├── services/    # API service (axios)
        └── components/  # UI reutilisable
```

## What's Implemented

### Web App (complete, tested)
- Auth (JWT + Google OAuth), KYC (simule), Tontines CRUD, Marketplace, Wallet (CSV export)
- Admin (users, tontines, tickets, fraud, analytics, KYC validation, suspension, payouts)
- Contrat digital, Trust Score, Support (FAQ + tickets)
- 47/47 tests (fonctionnels + securite + penetration + charge)

### Mobile App (Expo, complete code)
- 10 ecrans: Login, Register (terms), KYC, Dashboard, Marketplace (contrat), Create Tontine, Detail, Wallet, Profile, Support
- Navigation tabs + stack, FR/EN, pull-to-refresh
- Compatible Expo Go pour test sur telephone

### Simule/Mock
- KYC (auto-approve), SEPA (Stripe test), Lemon Way (sandbox mock)

## Admin Access
ADMIN_EMAILS env var: admin@savyn.com, slimimoez@gmail.com

## Backlog
- P0: Real Lemon Way (needs API keys)
- P1: Real KYC, Notifications (email/SMS/push)
- P2: Chat support, SEPA Direct Debit, Advanced fraud detection
