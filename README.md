# Savyn - Plateforme d'Epargne Collective

Application web pour la gestion de tontines (epargne collective securisee).

## Architecture

```
/
├── backend/        # API FastAPI (Python)
├── frontend/       # Application web React
└── mobile/         # Application mobile React Native (Expo) - voir mobile/README.md
```

## Stack technique

- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, MongoDB, JWT
- **Mobile:** React Native (Expo)
- **Paiements:** Lemon Way (sandbox)

## Fonctionnalites

- Inscription/Connexion (email + Google OAuth)
- Verification d'identite KYC
- Creation et participation a des tontines
- Contrat digital obligatoire
- Marketplace des tontines
- Wallet avec export CSV
- Trust Score dynamique
- Panel d'administration
- Detection de fraude
- Support (FAQ + tickets)

## Comptes admin

Configure via la variable `ADMIN_EMAILS` dans `backend/.env`

## Application mobile

Voir le dossier `mobile/` et son [README](./mobile/README.md) pour les instructions de lancement avec Expo Go.
