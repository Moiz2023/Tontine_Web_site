# Savyn - PRD

## Brand: **Savyn**
## Logo: Modern abstract S-shaped swirl in teal gradient (/logo.png)

## Business Model
- 2% frais de service sur chaque payout
- 3% fonds de garantie sur chaque contribution

## Features Implemented
### Web App (complete, tested)
- Auth (JWT + Google OAuth), KYC (simule), Terms acceptance
- Tontines CRUD, Marketplace, Contrat digital, Smart attribution
- **Partage de lien tontine** via WhatsApp, Email, SMS (createur uniquement)
- Wallet (CSV export), Trust Score, Support (FAQ + tickets)
- Admin (users, tontines, tickets, fraud, analytics, KYC validation, suspension, payouts, revenus plateforme 2%)
- Menu admin visible uniquement pour admins, Join desactive si deja inscrit

### Mobile App (Expo)
- 10 ecrans, compatible Expo Go, FR/EN

### Simule/Mock
- KYC (auto-approve), SEPA (Stripe test), Lemon Way (sandbox mock)

## Admin Access
ADMIN_EMAILS env var: admin@savyn.com, slimimoez@gmail.com

## Testing
- 47+ backend tests, security/penetration/load tests, 100% pass rate

## Backlog
- P0: Real Lemon Way (needs API keys)
- P1: Real KYC, Notifications (email/SMS/push)
- P2: Chat support, SEPA Direct Debit, Advanced fraud detection
