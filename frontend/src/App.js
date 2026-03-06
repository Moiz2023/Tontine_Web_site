import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage, { RegisterPage } from './pages/AuthPages';
import AuthCallback from './pages/AuthCallback';
import KYCPage from './pages/KYCPage';
import DashboardPage from './pages/DashboardPage';
import CreateTontinePage from './pages/CreateTontinePage';
import MarketplacePage from './pages/MarketplacePage';
import TontineDetailPage from './pages/TontineDetailPage';
import WalletPage from './pages/WalletPage';
import SupportPage from './pages/SupportPage';
import AdminPage from './pages/AdminPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

import './App.css';

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment (not query params) for session_id
  // This synchronous check prevents race conditions by processing new session_id FIRST
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout><LandingPage /></Layout>} />
      <Route path="/login" element={<Layout showFooter={false}><LoginPage /></Layout>} />
      <Route path="/register" element={<Layout showFooter={false}><RegisterPage /></Layout>} />
      <Route path="/marketplace" element={<Layout><MarketplacePage /></Layout>} />
      
      {/* Protected Routes */}
      <Route path="/kyc" element={
        <Layout showFooter={false}>
          <ProtectedRoute>
            <KYCPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/dashboard" element={
        <Layout showFooter={false}>
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/create" element={
        <Layout showFooter={false}>
          <ProtectedRoute>
            <CreateTontinePage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/tontines/:id" element={
        <Layout showFooter={false}>
          <ProtectedRoute>
            <TontineDetailPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/wallet" element={
        <Layout showFooter={false}>
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/support" element={
        <Layout showFooter={false}>
          <ProtectedRoute>
            <SupportPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/admin" element={
        <Layout showFooter={false}>
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/payment/success" element={
        <Layout showFooter={false}>
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        </Layout>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Layout><LandingPage /></Layout>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster 
            position="top-right" 
            richColors 
            toastOptions={{
              style: {
                fontFamily: 'Public Sans, sans-serif'
              }
            }}
          />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
