import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const { exchangeSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const user = await exchangeSession(sessionId);
          // Clear the hash from URL
          window.history.replaceState(null, '', location.pathname);
          
          // Navigate based on KYC status
          if (user.kyc_status === 'verified') {
            navigate('/dashboard', { replace: true, state: { user } });
          } else {
            navigate('/kyc', { replace: true, state: { user } });
          }
        } catch (error) {
          console.error('Session exchange failed:', error);
          navigate('/login', { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    };

    processSession();
  }, [exchangeSession, navigate, location]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#2E5C55] animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Authentification en cours...</p>
      </div>
    </div>
  );
}
