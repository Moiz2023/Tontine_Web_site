import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const translations = {
  fr: {
    nav: {
      home: 'Accueil',
      dashboard: 'Tableau de bord',
      marketplace: 'Marketplace',
      create: 'Créer',
      wallet: 'Portefeuille',
      support: 'Support',
      profile: 'Profil',
    },
    auth: {
      login_title: 'Connexion',
      register_title: 'Créer un compte',
      email: 'Email',
      password: 'Mot de passe',
      name: 'Nom complet',
      phone: 'Téléphone',
      login_btn: 'Se connecter',
      register_btn: "S'inscrire",
      google_btn: 'Continuer avec Google',
      no_account: "Pas encore de compte ?",
      has_account: 'Déjà un compte ?',
    },
    kyc: {
      title: "Vérification d'identité",
      subtitle: 'Complétez votre KYC pour accéder à toutes les fonctionnalités.',
      id_type: 'Type de document',
      id_number: 'Numéro du document',
      passport: 'Passeport',
      id_card: "Carte d'identité",
      iban: 'IBAN',
      address: 'Adresse',
      city: 'Ville',
      postal_code: 'Code postal',
      country: 'Pays',
      submit: 'Soumettre',
      status_verified: 'Vérifié',
    },
    dashboard: {
      welcome: 'Bienvenue',
      active_tontines: 'Tontines actives',
      next_payment: 'Prochain paiement',
      trust_score: 'Score de confiance',
      total_contributed: 'Total contribué',
      total_received: 'Total reçu',
      no_tontines: "Vous n'avez pas encore rejoint de tontine.",
      join_now: 'Rejoindre une tontine',
      your_position: 'Votre position',
    },
    tontine: {
      create_title: 'Créer une nouvelle tontine',
      name: 'Nom de la tontine',
      description: 'Description',
      monthly_amount: 'Montant mensuel (€)',
      max_participants: 'Nombre de participants',
      duration: 'Durée (mois)',
      start_date: 'Date de début',
      mode_fixed: 'Ordre fixe',
      mode_random: 'Tirage au sort',
      mode_auction: 'Enchères',
      min_trust_score: 'Score minimum requis',
      create_btn: 'Créer la tontine',
      join_btn: 'Rejoindre',
      spots_left: 'places restantes',
      participants: 'Participants',
    },
    wallet: {
      title: 'Portefeuille',
      balance: 'Solde net',
      contributed: 'Total contribué',
      received: 'Total reçu',
      fees: 'Frais de garantie',
      recent_transactions: 'Transactions récentes',
      no_transactions: 'Aucune transaction',
    },
    common: {
      loading: 'Chargement...',
      error: 'Une erreur est survenue',
      success: 'Succès',
      cancel: 'Annuler',
      save: 'Enregistrer',
      back: 'Retour',
      next: 'Suivant',
      euro: '€',
      per_month: '/mois',
    },
  },
  en: {
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      marketplace: 'Marketplace',
      create: 'Create',
      wallet: 'Wallet',
      support: 'Support',
      profile: 'Profile',
    },
    auth: {
      login_title: 'Login',
      register_title: 'Create Account',
      email: 'Email',
      password: 'Password',
      name: 'Full Name',
      phone: 'Phone',
      login_btn: 'Sign In',
      register_btn: 'Sign Up',
      google_btn: 'Continue with Google',
      no_account: "Don't have an account?",
      has_account: 'Already have an account?',
    },
    kyc: {
      title: 'Identity Verification',
      subtitle: 'Complete your KYC to access all features.',
      id_type: 'Document Type',
      id_number: 'Document Number',
      passport: 'Passport',
      id_card: 'ID Card',
      iban: 'IBAN',
      address: 'Address',
      city: 'City',
      postal_code: 'Postal Code',
      country: 'Country',
      submit: 'Submit',
      status_verified: 'Verified',
    },
    dashboard: {
      welcome: 'Welcome',
      active_tontines: 'Active Tontines',
      next_payment: 'Next Payment',
      trust_score: 'Trust Score',
      total_contributed: 'Total Contributed',
      total_received: 'Total Received',
      no_tontines: "You haven't joined any tontine yet.",
      join_now: 'Join a Tontine',
      your_position: 'Your Position',
    },
    tontine: {
      create_title: 'Create New Tontine',
      name: 'Tontine Name',
      description: 'Description',
      monthly_amount: 'Monthly Amount (€)',
      max_participants: 'Number of Participants',
      duration: 'Duration (months)',
      start_date: 'Start Date',
      mode_fixed: 'Fixed Order',
      mode_random: 'Random Draw',
      mode_auction: 'Auction',
      min_trust_score: 'Minimum Trust Score',
      create_btn: 'Create Tontine',
      join_btn: 'Join',
      spots_left: 'spots left',
      participants: 'Participants',
    },
    wallet: {
      title: 'Wallet',
      balance: 'Net Balance',
      contributed: 'Total Contributed',
      received: 'Total Received',
      fees: 'Guarantee Fees',
      recent_transactions: 'Recent Transactions',
      no_transactions: 'No transactions',
    },
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      back: 'Back',
      next: 'Next',
      euro: '€',
      per_month: '/month',
    },
  },
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const saved = await AsyncStorage.getItem('language');
    if (saved) setLanguage(saved);
  };

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('language', lang);
  };

  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'fr' ? 'en' : 'fr';
    changeLanguage(newLang);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
