import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, Phone, Loader2, CheckSquare } from 'lucide-react';

export default function LoginPage() {
  const { t } = useLanguage();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success(t('common.success'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/logo.png" alt="Savyn" className="w-10 h-10" />
              <h1 className="text-2xl font-bold text-[#2E5C55]">Savyn</h1>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mt-6">{t('auth.login_title')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-gray-700">{t('auth.email')}</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] focus:ring-2 focus:ring-[#2E5C55]/20"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700">{t('auth.password')}</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] focus:ring-2 focus:ring-[#2E5C55]/20"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg font-semibold btn-press"
              data-testid="login-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t('auth.login_btn')
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">{t('common.or')}</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={loginWithGoogle}
            variant="outline"
            className="w-full h-12 border-gray-300 hover:bg-gray-50 rounded-lg font-medium"
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.google_btn')}
          </Button>

          <p className="text-center text-gray-600 mt-6">
            {t('auth.no_account')}{' '}
            <Link to="/register" className="text-[#2E5C55] font-semibold hover:underline">
              {t('nav.register')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function RegisterPage() {
  const { t } = useLanguage();
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    accept_terms: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      toast.success(t('common.success'));
      navigate('/kyc');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/logo.png" alt="Savyn" className="w-10 h-10" />
              <h1 className="text-2xl font-bold text-[#2E5C55]">Savyn</h1>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mt-6">{t('auth.register_title')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-gray-700">{t('auth.name')}</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] focus:ring-2 focus:ring-[#2E5C55]/20"
                  required
                  data-testid="register-name-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700">{t('auth.email')}</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] focus:ring-2 focus:ring-[#2E5C55]/20"
                  required
                  data-testid="register-email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-700">{t('auth.phone')}</Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] focus:ring-2 focus:ring-[#2E5C55]/20"
                  data-testid="register-phone-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700">{t('auth.password')}</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] focus:ring-2 focus:ring-[#2E5C55]/20"
                  required
                  minLength={6}
                  data-testid="register-password-input"
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="accept_terms"
                checked={formData.accept_terms}
                onChange={(e) => setFormData({ ...formData, accept_terms: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#2E5C55] focus:ring-[#2E5C55]"
                data-testid="register-terms-checkbox"
              />
              <label htmlFor="accept_terms" className="text-sm text-gray-600">
                J'accepte les <a href="#" className="text-[#2E5C55] font-medium hover:underline">conditions d'utilisation</a> et la <a href="#" className="text-[#2E5C55] font-medium hover:underline">politique de confidentialité</a> de Savyn.
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.accept_terms}
              className="w-full h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg font-semibold btn-press"
              data-testid="register-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t('auth.register_btn')
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">{t('common.or')}</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={loginWithGoogle}
            variant="outline"
            className="w-full h-12 border-gray-300 hover:bg-gray-50 rounded-lg font-medium"
            data-testid="google-register-btn"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.google_btn')}
          </Button>

          <p className="text-center text-gray-600 mt-6">
            {t('auth.has_account')}{' '}
            <Link to="/login" className="text-[#2E5C55] font-semibold hover:underline">
              {t('nav.login')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
