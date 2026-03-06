import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const translations = {
  fr: {
    // Navigation
    nav: {
      home: 'Accueil',
      dashboard: 'Tableau de bord',
      marketplace: 'Marketplace',
      create: 'Créer une Tontine',
      wallet: 'Portefeuille',
      support: 'Support',
      admin: 'Admin',
      login: 'Connexion',
      register: "S'inscrire",
      logout: 'Déconnexion',
      profile: 'Profil'
    },
    // Landing
    landing: {
      hero_title: "L'épargne collective réinventée",
      hero_subtitle: 'Rejoignez des groupes de tontine sécurisés et automatisés. Épargnez ensemble, recevez plus.',
      cta_start: 'Commencer',
      cta_learn: 'En savoir plus',
      feature1_title: 'Sécurisé & Fiable',
      feature1_desc: 'Vérification KYC obligatoire et fonds protégés par un prestataire agréé.',
      feature2_title: 'Automatisé',
      feature2_desc: 'Prélèvements SEPA automatiques. Plus de retards ni de complications.',
      feature3_title: 'Transparent',
      feature3_desc: 'Suivez chaque paiement et le statut de chaque membre en temps réel.',
      how_it_works: 'Comment ça marche ?',
      step1_title: 'Créez un compte',
      step1_desc: 'Inscrivez-vous et complétez votre vérification KYC.',
      step2_title: 'Rejoignez une tontine',
      step2_desc: 'Parcourez le marketplace et rejoignez un groupe.',
      step3_title: 'Contribuez mensuellement',
      step3_desc: 'Les prélèvements sont automatiques et sécurisés.',
      step4_title: 'Recevez votre tour',
      step4_desc: "À votre tour, recevez l'intégralité de la cagnotte.",
      testimonial_title: 'Ce que disent nos membres',
      stats_users: 'Utilisateurs',
      stats_tontines: 'Tontines actives',
      stats_volume: 'Volume total'
    },
    // Auth
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
      forgot_password: 'Mot de passe oublié ?'
    },
    // KYC
    kyc: {
      title: 'Vérification d\'identité',
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
      status_pending: 'En attente de vérification',
      status_verified: 'Vérifié',
      status_rejected: 'Rejeté'
    },
    // Dashboard
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
      members: 'membres',
      due_date: 'Échéance',
      pay_now: 'Payer maintenant',
      view_details: 'Voir détails'
    },
    // Tontine
    tontine: {
      create_title: 'Créer une nouvelle tontine',
      name: 'Nom de la tontine',
      description: 'Description',
      monthly_amount: 'Montant mensuel (€)',
      max_participants: 'Nombre de participants',
      duration: 'Durée (mois)',
      start_date: 'Date de début',
      attribution_mode: 'Mode d\'attribution',
      mode_fixed: 'Ordre fixe',
      mode_random: 'Tirage au sort',
      mode_auction: 'Enchères',
      min_trust_score: 'Score minimum requis',
      create_btn: 'Créer la tontine',
      join_btn: 'Rejoindre',
      full: 'Complet',
      spots_left: 'places restantes',
      avg_score: 'Score moyen',
      organizer: 'Organisateur',
      status: 'Statut',
      status_open: 'Ouvert',
      status_active: 'Actif',
      status_completed: 'Terminé',
      participants: 'Participants',
      payment_history: 'Historique des paiements',
      calendar: 'Calendrier',
      position: 'Position',
      payments_made: 'Paiements effectués',
      received_payout: 'Paiement reçu'
    },
    // Wallet
    wallet: {
      title: 'Portefeuille',
      balance: 'Solde net',
      contributed: 'Total contribué',
      received: 'Total reçu',
      fees: 'Frais de garantie',
      recent_transactions: 'Transactions récentes',
      export: 'Exporter',
      no_transactions: 'Aucune transaction'
    },
    // Support
    support: {
      title: 'Support',
      new_ticket: 'Nouveau ticket',
      subject: 'Sujet',
      message: 'Message',
      category: 'Catégorie',
      cat_general: 'Général',
      cat_payment: 'Paiement',
      cat_technical: 'Technique',
      submit: 'Envoyer',
      your_tickets: 'Vos tickets',
      status_open: 'Ouvert',
      status_closed: 'Fermé',
      faq_title: 'Questions fréquentes'
    },
    // Common
    common: {
      loading: 'Chargement...',
      error: 'Une erreur est survenue',
      success: 'Succès',
      cancel: 'Annuler',
      save: 'Enregistrer',
      edit: 'Modifier',
      delete: 'Supprimer',
      confirm: 'Confirmer',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Précédent',
      search: 'Rechercher',
      filter: 'Filtrer',
      sort: 'Trier',
      all: 'Tous',
      none: 'Aucun',
      yes: 'Oui',
      no: 'Non',
      or: 'ou',
      and: 'et',
      euro: '€',
      per_month: '/mois',
      language: 'Langue',
      settings: 'Paramètres'
    },
    // Admin
    admin: {
      title: 'Administration',
      users: 'Utilisateurs',
      tontines: 'Tontines',
      tickets: 'Tickets',
      stats: 'Statistiques',
      total_users: 'Total utilisateurs',
      verified_users: 'Utilisateurs vérifiés',
      total_volume: 'Volume total',
      open_tickets: 'Tickets ouverts'
    }
  },
  en: {
    // Navigation
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      marketplace: 'Marketplace',
      create: 'Create Tontine',
      wallet: 'Wallet',
      support: 'Support',
      admin: 'Admin',
      login: 'Login',
      register: 'Sign Up',
      logout: 'Logout',
      profile: 'Profile'
    },
    // Landing
    landing: {
      hero_title: 'Collective Savings Reimagined',
      hero_subtitle: 'Join secure, automated tontine groups. Save together, receive more.',
      cta_start: 'Get Started',
      cta_learn: 'Learn More',
      feature1_title: 'Secure & Reliable',
      feature1_desc: 'Mandatory KYC verification and funds protected by licensed provider.',
      feature2_title: 'Automated',
      feature2_desc: 'Automatic SEPA debits. No more delays or complications.',
      feature3_title: 'Transparent',
      feature3_desc: 'Track every payment and member status in real-time.',
      how_it_works: 'How It Works',
      step1_title: 'Create an Account',
      step1_desc: 'Sign up and complete your KYC verification.',
      step2_title: 'Join a Tontine',
      step2_desc: 'Browse the marketplace and join a group.',
      step3_title: 'Contribute Monthly',
      step3_desc: 'Payments are automatic and secure.',
      step4_title: 'Receive Your Turn',
      step4_desc: 'On your turn, receive the entire pool.',
      testimonial_title: 'What Our Members Say',
      stats_users: 'Users',
      stats_tontines: 'Active Tontines',
      stats_volume: 'Total Volume'
    },
    // Auth
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
      forgot_password: 'Forgot password?'
    },
    // KYC
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
      status_pending: 'Pending Verification',
      status_verified: 'Verified',
      status_rejected: 'Rejected'
    },
    // Dashboard
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
      members: 'members',
      due_date: 'Due Date',
      pay_now: 'Pay Now',
      view_details: 'View Details'
    },
    // Tontine
    tontine: {
      create_title: 'Create New Tontine',
      name: 'Tontine Name',
      description: 'Description',
      monthly_amount: 'Monthly Amount (€)',
      max_participants: 'Number of Participants',
      duration: 'Duration (months)',
      start_date: 'Start Date',
      attribution_mode: 'Attribution Mode',
      mode_fixed: 'Fixed Order',
      mode_random: 'Random Draw',
      mode_auction: 'Auction',
      min_trust_score: 'Minimum Trust Score',
      create_btn: 'Create Tontine',
      join_btn: 'Join',
      full: 'Full',
      spots_left: 'spots left',
      avg_score: 'Average Score',
      organizer: 'Organizer',
      status: 'Status',
      status_open: 'Open',
      status_active: 'Active',
      status_completed: 'Completed',
      participants: 'Participants',
      payment_history: 'Payment History',
      calendar: 'Calendar',
      position: 'Position',
      payments_made: 'Payments Made',
      received_payout: 'Received Payout'
    },
    // Wallet
    wallet: {
      title: 'Wallet',
      balance: 'Net Balance',
      contributed: 'Total Contributed',
      received: 'Total Received',
      fees: 'Guarantee Fees',
      recent_transactions: 'Recent Transactions',
      export: 'Export',
      no_transactions: 'No transactions'
    },
    // Support
    support: {
      title: 'Support',
      new_ticket: 'New Ticket',
      subject: 'Subject',
      message: 'Message',
      category: 'Category',
      cat_general: 'General',
      cat_payment: 'Payment',
      cat_technical: 'Technical',
      submit: 'Submit',
      your_tickets: 'Your Tickets',
      status_open: 'Open',
      status_closed: 'Closed',
      faq_title: 'Frequently Asked Questions'
    },
    // Common
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      all: 'All',
      none: 'None',
      yes: 'Yes',
      no: 'No',
      or: 'or',
      and: 'and',
      euro: '€',
      per_month: '/month',
      language: 'Language',
      settings: 'Settings'
    },
    // Admin
    admin: {
      title: 'Administration',
      users: 'Users',
      tontines: 'Tontines',
      tickets: 'Tickets',
      stats: 'Statistics',
      total_users: 'Total Users',
      verified_users: 'Verified Users',
      total_volume: 'Total Volume',
      open_tickets: 'Open Tickets'
    }
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('tontine_language');
    return saved || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('tontine_language', language);
  }, [language]);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'fr' ? 'en' : 'fr');
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
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
