# Tontine Platform - PRD (Product Requirements Document)

## Original Problem Statement
Développer une plateforme mobile et web permettant à des utilisateurs de participer à des groupes d'épargne collective ("tontines") de manière sécurisée, automatisée et conforme aux normes européennes.

## User Choices
- **Authentication**: JWT-based + Google OAuth (Emergent-managed)
- **KYC**: Simulated/mocked for MVP (auto-approval)
- **Payments**: Stripe integration (SEPA simulation)
- **Theme**: Light mode
- **Languages**: French + English (multilingual)

## Architecture

### Backend (FastAPI + MongoDB)
- **Auth**: JWT tokens + Emergent OAuth session management
- **Collections**: users, user_sessions, kyc_submissions, tontines, payment_transactions, payouts, support_tickets
- **API Prefix**: /api

### Frontend (React + Tailwind CSS + Shadcn UI)
- **Pages**: Landing, Login, Register, KYC, Dashboard, Create Tontine, Marketplace, Tontine Detail, Wallet, Support, Admin
- **State Management**: React Context (Auth, Language)
- **UI Framework**: Shadcn/UI components

## User Personas
1. **New User**: Wants to join a tontine group to save money collectively
2. **Organizer**: Creates and manages tontine groups
3. **Admin**: Supervises platform operations, validates KYC, handles disputes

## Core Requirements (Static)
1. Secure user authentication (JWT + OAuth)
2. KYC verification before participation
3. Tontine creation with configurable parameters
4. Public marketplace for joining tontines
5. Automatic payment processing via Stripe
6. Trust score system for user reliability
7. Guarantee fund (3% per contribution)
8. Support ticketing system
9. Admin panel for platform management

## What's Been Implemented (January 2026)

### Phase 1 - MVP Complete
- [x] Landing page with hero, features, testimonials
- [x] User registration and login (email/password)
- [x] Google OAuth integration (Emergent-managed)
- [x] KYC verification flow (simulated auto-approval)
- [x] User dashboard with stats and active tontines
- [x] Tontine creation wizard (4 steps)
- [x] Tontine marketplace with filters
- [x] Tontine detail page with participants, calendar, history
- [x] Join tontine functionality
- [x] Stripe checkout integration for payments
- [x] Payment success page with polling
- [x] Wallet page with transaction history
- [x] Trust score calculation and display
- [x] Support page with ticket creation and FAQ
- [x] Admin panel with stats, users, tontines, tickets
- [x] Multilingual support (FR/EN)
- [x] Responsive design

## Prioritized Backlog

### P0 - Critical (Next)
- [ ] Real KYC integration (when provider selected)
- [ ] SEPA Direct Debit implementation
- [ ] Automatic monthly payment scheduling
- [ ] Payout distribution to recipients

### P1 - High Priority
- [ ] Email notifications (payment reminders, payout alerts)
- [ ] SMS notifications via Twilio
- [ ] Push notifications
- [ ] Dispute resolution system
- [ ] Advanced fraud detection

### P2 - Medium Priority
- [ ] Mobile app (React Native)
- [ ] Digital contract signing
- [ ] Payment history export (PDF)
- [ ] Advanced analytics dashboard
- [ ] Referral system

### P3 - Nice to Have
- [ ] Community chat per tontine
- [ ] Achievement badges
- [ ] Social features (friends, invites)
- [ ] Multiple currency support

## Next Tasks
1. Implement real-time payment status updates
2. Add email notification system
3. Integrate real KYC provider
4. Implement automatic monthly payment cron job
5. Build payout distribution logic
