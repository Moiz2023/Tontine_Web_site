import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import axios from 'axios';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  ArrowRight,
  Plus,
  ShieldCheck,
  AlertCircle,
  Wallet,
  Star,
  Loader2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ icon: Icon, title, value, subtitle, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const TontineCard = ({ tontine, t }) => {
  const progress = (tontine.participants?.length || 0) / tontine.max_participants * 100;
  const navigate = useNavigate();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 cursor-pointer"
      onClick={() => navigate(`/tontines/${tontine.tontine_id}`)}
      data-testid={`tontine-card-${tontine.tontine_id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{tontine.name}</h3>
          <p className="text-sm text-gray-500">{tontine.duration_months} mois</p>
        </div>
        <Badge variant={tontine.status === 'active' ? 'default' : 'secondary'} className="bg-[#2E5C55]">
          {tontine.status === 'active' ? t('tontine.status_active') : t('tontine.status_open')}
        </Badge>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{t('tontine.monthly_amount')}</span>
          <span className="font-semibold text-[#2E5C55]">{tontine.monthly_amount}€</span>
        </div>
        
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">{t('tontine.participants')}</span>
            <span className="text-gray-700">{tontine.participants?.length || 0}/{tontine.max_participants}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {tontine.user_position && (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-500">{t('dashboard.your_position')}</span>
            <span className="font-semibold text-[#D4A373]">#{tontine.user_position}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [tontines, setTontines] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [trustScore, setTrustScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tontinesRes, walletRes, trustRes] = await Promise.all([
          axios.get(`${API}/tontines/user/active`, { withCredentials: true }),
          axios.get(`${API}/wallet`, { withCredentials: true }),
          axios.get(`${API}/trust-score`, { withCredentials: true })
        ]);
        setTontines(tontinesRes.data);
        setWallet(walletRes.data);
        setTrustScore(trustRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Wait for auth to fully load
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#2E5C55] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // KYC Warning - only show after auth is fully loaded
  if (user?.kyc_status !== 'verified') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6" data-testid="dashboard-kyc-required">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-orange-200 p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vérification requise</h2>
            <p className="text-gray-600 mb-6">
              Vous devez compléter la vérification KYC pour accéder à toutes les fonctionnalités.
            </p>
            <Button
              onClick={() => navigate('/kyc')}
              className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full px-8"
              data-testid="dashboard-kyc-btn"
            >
              Compléter la vérification
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6" data-testid="dashboard-main">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('dashboard.welcome')}, {user?.name?.split(' ')[0]} !
          </h1>
          <p className="text-gray-600">Voici un aperçu de vos tontines et de votre activité.</p>
        </motion.div>

        {/* Stats Grid - Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            title={t('dashboard.active_tontines')}
            value={tontines.length}
            color="bg-[#2E5C55]"
            delay={0}
          />
          <StatCard
            icon={CreditCard}
            title={t('dashboard.total_contributed')}
            value={`${wallet?.total_contributed?.toFixed(2) || '0.00'}€`}
            color="bg-[#D4A373]"
            delay={0.1}
          />
          <StatCard
            icon={TrendingUp}
            title={t('dashboard.total_received')}
            value={`${wallet?.total_received?.toFixed(2) || '0.00'}€`}
            color="bg-green-600"
            delay={0.2}
          />
          <StatCard
            icon={Star}
            title={t('dashboard.trust_score')}
            value={trustScore?.trust_score || 50}
            subtitle={trustScore?.level}
            color="bg-blue-600"
            delay={0.3}
          />
        </div>

        {/* Trust Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="w-6 h-6 text-[#2E5C55]" />
                    <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.trust_score')}</h2>
                  </div>
                  <div className="flex items-end gap-4 mb-4">
                    <span className="text-5xl font-bold text-[#2E5C55]">{trustScore?.trust_score || 50}</span>
                    <Badge className={`mb-2 ${
                      trustScore?.level === 'Gold' ? 'bg-yellow-500' :
                      trustScore?.level === 'Silver' ? 'bg-gray-400' : 'bg-orange-600'
                    }`}>
                      {trustScore?.level || 'Bronze'}
                    </Badge>
                  </div>
                  <Progress value={trustScore?.trust_score || 50} className="h-3 mb-4" />
                  <p className="text-sm text-gray-500">
                    Un score élevé vous donne accès à plus de tontines et vous place en priorité.
                  </p>
                </div>
                <div className="flex-1 bg-[#F9FAFB] p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-gray-100">
                  <h3 className="font-medium text-gray-900 mb-4">Détail du score</h3>
                  <div className="space-y-3">
                    {trustScore?.breakdown && Object.entries(trustScore.breakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                        <span className="font-medium text-gray-900">+{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Tontines */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.active_tontines')}</h2>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/marketplace')}
                className="rounded-full"
                data-testid="dashboard-marketplace-btn"
              >
                Voir le marketplace
              </Button>
              <Button
                onClick={() => navigate('/create')}
                className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full"
                data-testid="dashboard-create-btn"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('nav.create')}
              </Button>
            </div>
          </div>

          {tontines.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
            >
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('dashboard.no_tontines')}</h3>
              <p className="text-gray-500 mb-6">Rejoignez une tontine existante ou créez la vôtre.</p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/marketplace')}
                  className="rounded-full"
                  data-testid="dashboard-join-btn"
                >
                  {t('dashboard.join_now')}
                </Button>
                <Button
                  onClick={() => navigate('/create')}
                  className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Créer une tontine
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tontines.map((tontine) => (
                <TontineCard key={tontine.tontine_id} tontine={tontine} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card 
              className="bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer card-hover"
              onClick={() => navigate('/wallet')}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2E5C55]/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-[#2E5C55]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('nav.wallet')}</h3>
                  <p className="text-sm text-gray-500">Voir l'historique</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>

            <Card 
              className="bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer card-hover"
              onClick={() => navigate('/marketplace')}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#D4A373]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('nav.marketplace')}</h3>
                  <p className="text-sm text-gray-500">Rejoindre une tontine</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>

            <Card 
              className="bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer card-hover"
              onClick={() => navigate('/support')}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('nav.support')}</h3>
                  <p className="text-sm text-gray-500">Besoin d'aide ?</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
