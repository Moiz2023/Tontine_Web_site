import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Search, 
  Users, 
  Euro, 
  Shield,
  Filter,
  TrendingUp,
  Clock,
  ArrowRight,
  FileText,
  Loader2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TontineMarketCard = ({ tontine, onJoin, t, isJoined }) => {
  const spotsLeft = tontine.spots_left || (tontine.max_participants - (tontine.participant_count || 0));
  const progress = ((tontine.participant_count || 0) / tontine.max_participants) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      data-testid={`marketplace-card-${tontine.tontine_id}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{tontine.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{tontine.duration_months} mois</p>
          </div>
          <Badge className="bg-[#2E5C55]">{t('tontine.status_open')}</Badge>
        </div>

        {tontine.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{tontine.description}</p>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Euro className="w-4 h-4" />
              <span className="text-sm">{t('tontine.monthly_amount')}</span>
            </div>
            <span className="font-semibold text-[#2E5C55] text-lg">{tontine.monthly_amount}€</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-2 text-gray-500">
                <Users className="w-4 h-4" />
                <span>{t('tontine.participants')}</span>
              </div>
              <span className="text-gray-700">
                {tontine.participant_count || 0}/{tontine.max_participants}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Shield className="w-4 h-4" />
              <span>{t('tontine.avg_score')}</span>
            </div>
            <span className="font-medium text-gray-700">{tontine.avg_trust_score || 50}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>Total par tour</span>
            </div>
            <span className="font-semibold text-[#D4A373]">
              {tontine.monthly_amount * tontine.max_participants}€
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-[#F9FAFB] border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {isJoined ? 'Deja inscrit' : spotsLeft > 0 ? `${spotsLeft} ${t('tontine.spots_left')}` : t('tontine.full')}
          </span>
          <Button
            onClick={() => onJoin(tontine.tontine_id)}
            disabled={spotsLeft <= 0 || isJoined}
            className={isJoined ? "bg-gray-400 text-white rounded-full px-6 cursor-not-allowed" : "bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full px-6"}
            data-testid={`join-btn-${tontine.tontine_id}`}
          >
            {isJoined ? 'Inscrit' : t('tontine.join_btn')}
            {!isJoined && <ArrowRight className="ml-2 w-4 h-4" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default function MarketplacePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tontines, setTontines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterAmount, setFilterAmount] = useState('all');
  const [contractDialog, setContractDialog] = useState({ open: false, tontine: null });
  const [contractAccepted, setContractAccepted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [userTontineIds, setUserTontineIds] = useState([]);

  useEffect(() => {
    fetchTontines();
    if (user) fetchUserTontines();
  }, [user]);

  const fetchTontines = async () => {
    try {
      const response = await axios.get(`${API}/tontines/marketplace`);
      setTontines(response.data);
    } catch (error) {
      console.error('Error fetching tontines:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTontines = async () => {
    try {
      const response = await axios.get(`${API}/tontines/user/active`, { withCredentials: true });
      setUserTontineIds(response.data.map(t => t.tontine_id));
    } catch (error) {
      console.error('Error fetching user tontines:', error);
    }
  };

  const handleJoin = async (tontineId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.kyc_status !== 'verified') {
      toast.error('Vous devez completer la verification KYC pour rejoindre une tontine.');
      navigate('/kyc');
      return;
    }

    // Open contract dialog
    const tontine = tontines.find(t => t.tontine_id === tontineId);
    setContractDialog({ open: true, tontine });
    setContractAccepted(false);
  };

  const confirmJoin = async () => {
    if (!contractAccepted || !contractDialog.tontine) return;
    setJoining(true);
    try {
      await axios.post(`${API}/tontines/join`, { 
        tontine_id: contractDialog.tontine.tontine_id,
        accept_contract: true 
      }, { withCredentials: true });
      toast.success('Vous avez rejoint la tontine !');
      setContractDialog({ open: false, tontine: null });
      navigate(`/tontines/${contractDialog.tontine.tontine_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setJoining(false);
    }
  };

  // Filter and sort tontines
  let filteredTontines = [...tontines];
  
  if (searchQuery) {
    filteredTontines = filteredTontines.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (filterAmount !== 'all') {
    const [min, max] = filterAmount.split('-').map(Number);
    filteredTontines = filteredTontines.filter(t => 
      t.monthly_amount >= min && (!max || t.monthly_amount <= max)
    );
  }

  filteredTontines.sort((a, b) => {
    switch (sortBy) {
      case 'amount_low':
        return a.monthly_amount - b.monthly_amount;
      case 'amount_high':
        return b.monthly_amount - a.monthly_amount;
      case 'spots':
        return (b.spots_left || 0) - (a.spots_left || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-12 px-4" data-testid="marketplace-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('nav.marketplace')}</h1>
          <p className="text-gray-600">Découvrez et rejoignez des tontines qui correspondent à vos objectifs.</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55]"
                data-testid="marketplace-search"
              />
            </div>
            
            <div className="flex gap-4">
              <Select value={filterAmount} onValueChange={setFilterAmount}>
                <SelectTrigger className="w-[180px] h-12" data-testid="marketplace-filter-amount">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Montant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les montants</SelectItem>
                  <SelectItem value="50-100">50€ - 100€</SelectItem>
                  <SelectItem value="100-200">100€ - 200€</SelectItem>
                  <SelectItem value="200-500">200€ - 500€</SelectItem>
                  <SelectItem value="500-1000">500€+</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-12" data-testid="marketplace-sort">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récents</SelectItem>
                  <SelectItem value="amount_low">Montant croissant</SelectItem>
                  <SelectItem value="amount_high">Montant décroissant</SelectItem>
                  <SelectItem value="spots">Places disponibles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-80 animate-pulse">
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTontines.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
          >
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune tontine disponible</h3>
            <p className="text-gray-500 mb-6">Soyez le premier à créer une tontine !</p>
            <Button
              onClick={() => navigate('/create')}
              className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full px-8"
              data-testid="marketplace-create-btn"
            >
              Créer une tontine
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTontines.map((tontine, i) => (
              <motion.div
                key={tontine.tontine_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <TontineMarketCard 
                  tontine={tontine} 
                  onJoin={handleJoin}
                  t={t}
                  isJoined={userTontineIds.includes(tontine.tontine_id)}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Digital Contract Dialog */}
        <Dialog open={contractDialog.open} onOpenChange={(open) => setContractDialog({ ...contractDialog, open })}>
          <DialogContent className="max-w-lg" data-testid="contract-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2E5C55]" />
                Contrat Digital de Participation
              </DialogTitle>
            </DialogHeader>
            {contractDialog.tontine && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 max-h-60 overflow-y-auto">
                  <p className="font-semibold text-gray-900">Tontine : {contractDialog.tontine.name}</p>
                  <p>Montant mensuel : <strong>{contractDialog.tontine.monthly_amount}EUR</strong></p>
                  <p>Nombre de participants : <strong>{contractDialog.tontine.max_participants}</strong></p>
                  <hr className="my-3" />
                  <p className="font-semibold">En rejoignant cette tontine, vous vous engagez a :</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Effectuer tous les paiements mensuels a la date prevue</li>
                    <li>Autoriser le prelevement SEPA automatique sur votre compte</li>
                    <li>Respecter les regles du groupe et le calendrier de distribution</li>
                    <li>Accepter la procedure de recouvrement legal en cas de defaut de paiement</li>
                    <li>Contribuer au fonds de garantie (3% de chaque contribution)</li>
                    <li>Accepter les frais de service Savyn (2% preleves sur chaque versement recu)</li>
                  </ul>
                  <hr className="my-3" />
                  <p className="text-xs text-gray-500">
                    Les fonds sont detenus par un prestataire de paiement agree (Lemon Way). 
                    Savyn n'a jamais acces direct a votre argent.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="accept_contract"
                    checked={contractAccepted}
                    onChange={(e) => setContractAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#2E5C55] focus:ring-[#2E5C55]"
                    data-testid="contract-accept-checkbox"
                  />
                  <label htmlFor="accept_contract" className="text-sm text-gray-700">
                    J'ai lu et j'accepte les conditions du contrat digital de participation
                  </label>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setContractDialog({ open: false, tontine: null })}
                data-testid="contract-cancel-btn"
              >
                Annuler
              </Button>
              <Button
                onClick={confirmJoin}
                disabled={!contractAccepted || joining}
                className="bg-[#2E5C55] hover:bg-[#254a44] text-white"
                data-testid="contract-confirm-btn"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Signer et Rejoindre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
