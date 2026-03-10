# Savyn - PRD (Product Requirements Document)

## Original Problem Statement
Plateforme digitale pour la gestion de tontines (epargne collective). Application web et mobile, backend securise, avec KYC, paiements SEPA, et gestion des groupes de tontine. Utilisation de Lemon Way pour la gestion des fonds.

## Brand Name: **Savyn**

## Business Model
- **Frais de service plateforme: 2%** preleves sur chaque versement (payout) recu par un membre
- **Fonds de garantie: 3%** sur chaque contribution mensuelle (couvre les defauts de paiement)
- Revenus plateforme suivis dans la collection `platform_revenue` et visibles dans l'admin

## Architecture
```
/
├── backend/         # FastAPI (Python) + MongoDB
├── frontend/        # React web app
└── mobile/          # React Native (Expo) - code separe
```

## What's Implemented
### Web App
- Auth (JWT + Google OAuth), KYC (simule), Tontines CRUD, Marketplace, Wallet (CSV export)
- Admin (users, tontines, tickets, fraud, analytics, KYC validation, suspension, payouts, revenus plateforme)
- Contrat digital (mentions 3% garantie + 2% frais service), Trust Score, Support
- Menu admin visible uniquement pour admins
- Bouton "Rejoindre" desactive pour tontines deja rejointes
- **2% frais de service sur payouts** avec suivi des revenus

### Mobile App (Expo)
- 10 ecrans complets, navigation tabs+stack, FR/EN, compatible Expo Go

### Simule/Mock
- KYC (auto-approve), SEPA (Stripe test), Lemon Way (sandbox mock)

## Testing Status
- 47+ tests backend passes (fonctionnels, securite, penetration, charge)
- 8 tests frais plateforme passes
- 100% success rate sur tous les tests

## Admin Access
ADMIN_EMAILS env var: admin@savyn.com, slimimoez@gmail.com

## Backlog
- P0: Real Lemon Way (needs API keys)
- P1: Real KYC, Notifications (email/SMS/push)
- P2: Chat support, SEPA Direct Debit, Advanced fraud detection
