# Savyn Mobile - Application Mobile React Native (Expo)

Application mobile pour la plateforme d'epargne collective Savyn.

## Pre-requis

- Node.js >= 18
- npm ou yarn
- Application **Expo Go** sur votre telephone :
  - [iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)
  - [Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Installation et lancement

```bash
# 1. Installez les dependances
npm install

# 2. Lancez le serveur de developpement
npx expo start
```

Un QR code apparaitra dans le terminal.

## Tester sur votre telephone

1. Assurez-vous que votre telephone et votre ordinateur sont sur le **meme reseau WiFi**
2. Ouvrez l'app **Expo Go** sur votre telephone
3. Scannez le **QR code** affiche dans le terminal
4. L'app Savyn se lancera automatiquement !

### Alternative : Emulateur
```bash
# Android
npx expo start --android

# iOS (Mac uniquement)
npx expo start --ios
```

## Configuration

L'URL du backend est configuree dans `src/config/index.js` :
```javascript
export const API_BASE_URL = 'https://votre-backend-url.com/api';
```

Modifiez cette URL pour pointer vers votre serveur backend.

## Structure du projet

```
mobile/
├── App.js                  # Point d'entree Expo
├── app.json                # Configuration Expo
├── assets/                 # Icones et images
├── src/
│   ├── config/             # Configuration (couleurs, API URL)
│   ├── context/            # AuthContext, LanguageContext
│   ├── navigation/         # Navigation (tabs + stack)
│   ├── screens/
│   │   ├── auth/           # Login, Register, KYC
│   │   └── main/           # Dashboard, Marketplace, Wallet, etc.
│   ├── services/           # API service (axios)
│   └── components/         # Composants UI reutilisables
```

## Ecrans disponibles

| Ecran | Description |
|---|---|
| **Login** | Connexion email/mot de passe |
| **Register** | Inscription avec acceptation des conditions |
| **KYC** | Verification d'identite (simulee) |
| **Dashboard** | Tontines actives, Trust Score, solde |
| **Marketplace** | Tontines disponibles avec contrat digital |
| **Creer Tontine** | Assistant 3 etapes |
| **Detail Tontine** | Participants, paiements, stats |
| **Wallet** | Solde, transactions, Lemon Way |
| **Profil** | Parametres, langue, deconnexion |
| **Support** | FAQ, creation de tickets |

## Build pour production

```bash
# Android (APK)
npx expo build:android

# iOS
npx expo build:ios
```

Ou utilisez EAS Build :
```bash
npx eas build --platform android
npx eas build --platform ios
```
