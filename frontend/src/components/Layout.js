import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { 
  Home, 
  LayoutDashboard, 
  Store, 
  Plus, 
  Wallet, 
  MessageCircle, 
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Globe,
  Shield
} from 'lucide-react';

export const Navbar = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = isAuthenticated ? [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/marketplace', label: t('nav.marketplace'), icon: Store },
    { to: '/create', label: t('nav.create'), icon: Plus },
    { to: '/wallet', label: t('nav.wallet'), icon: Wallet },
    { to: '/support', label: t('nav.support'), icon: MessageCircle },
  ] : [];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#2E5C55] flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">Savyn</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to) 
                    ? 'bg-[#2E5C55]/10 text-[#2E5C55]' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-gray-900"
              data-testid="language-toggle"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </Button>

            {isAuthenticated ? (
              <>
                {/* Admin Link - only visible for admins */}
                {user?.is_admin && (
                  <Link
                    to="/admin"
                    className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    data-testid="admin-nav-link"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="user-menu-trigger">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.picture} />
                        <AvatarFallback className="bg-[#2E5C55] text-white">
                          {user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="px-3 py-2">
                      <p className="font-medium text-gray-900">{user?.name}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {t('nav.dashboard')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/wallet')}>
                      <Wallet className="w-4 h-4 mr-2" />
                      {t('nav.wallet')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" className="hidden sm:inline-flex" data-testid="nav-login-btn">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full px-6" data-testid="nav-register-btn">
                    {t('nav.register')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-gray-100"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive(link.to) 
                      ? 'bg-[#2E5C55]/10 text-[#2E5C55]' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && user?.is_admin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
                  data-testid="admin-nav-link-mobile"
                >
                  <Shield className="w-5 h-5" />
                  Admin
                </Link>
              )}
              <div className="pt-2 border-t border-gray-100">
                <Button
                  variant="ghost"
                  onClick={toggleLanguage}
                  className="w-full justify-start gap-3 px-4 py-3"
                >
                  <Globe className="w-5 h-5" />
                  {language === 'fr' ? 'English' : 'Français'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#2E5C55] flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Savyn</span>
            </div>
            <p className="text-gray-600 text-sm">
              L'épargne collective sécurisée et automatisée par Savyn.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Produit</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/marketplace" className="hover:text-[#2E5C55]">Marketplace</Link></li>
              <li><Link to="/create" className="hover:text-[#2E5C55]">Créer une tontine</Link></li>
              <li><Link to="/support" className="hover:text-[#2E5C55]">Support</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-[#2E5C55]">Conditions d'utilisation</a></li>
              <li><a href="#" className="hover:text-[#2E5C55]">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-[#2E5C55]">Mentions légales</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>support@savyn.com</li>
              <li>+33 1 23 45 67 89</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-100 text-center text-sm text-gray-500">
          <p>© 2025 Savyn. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export const Layout = ({ children, showFooter = true }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};
