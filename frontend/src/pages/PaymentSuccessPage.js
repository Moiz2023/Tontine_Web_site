import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const [paymentInfo, setPaymentInfo] = useState(null);

  // FIX: use a ref to track the timeout and a mounted flag
  // so we can cancel polling if the user navigates away
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else {
      setStatus('error');
    }

    // Cleanup: cancel any pending timeout on unmount
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      if (isMountedRef.current) setStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`, {
        withCredentials: true
      });

      // Guard: don't update state if component has unmounted
      if (!isMountedRef.current) return;

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        setPaymentInfo(response.data);
        return;
      } else if (response.data.status === 'expired') {
        setStatus('expired');
        return;
      }

      // Schedule next poll, storing the timeout ref so it can be cancelled
      timeoutRef.current = setTimeout(
        () => pollPaymentStatus(sessionId, attempts + 1),
        pollInterval
      );
    } catch (error) {
      console.error('Error checking payment:', error);
      if (isMountedRef.current) setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center"
      >
        {status === 'checking' && (
          <>
            <Loader2 className="w-16 h-16 text-[#2E5C55] animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vérification du paiement...</h2>
            <p className="text-gray-600">Veuillez patienter pendant que nous confirmons votre paiement.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Paiement réussi !</h2>
            <p className="text-gray-600 mb-6">
              Votre contribution de {paymentInfo?.amount?.toFixed(2)}€ a été enregistrée avec succès.
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full"
              data-testid="payment-success-dashboard-btn"
            >
              Retour au tableau de bord
            </Button>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Session expirée</h2>
            <p className="text-gray-600 mb-6">
              La session de paiement a expiré. Veuillez réessayer.
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full"
            >
              Retour au tableau de bord
            </Button>
          </>
        )}

        {(status === 'error' || status === 'timeout') && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Erreur de paiement</h2>
            <p className="text-gray-600 mb-6">
              Une erreur est survenue lors de la vérification du paiement.
              Veuillez vérifier votre email pour confirmation.
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full"
            >
              Retour au tableau de bord
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
