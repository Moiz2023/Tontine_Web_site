import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Users, 
  Euro, 
  Calendar,
  Shield,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  TrendingUp,
  Loader2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ParticipantRow = ({ participant, index, currentUserId }) => {
  const isCurrentUser = participant.user_id === currentUserId;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center justify-between p-4 rounded-xl ${
        isCurrentUser ? 'bg-[#2E5C55]/5 border border-[#2E5C55]/20' : 'bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#2E5C55] text-white flex items-center justify-center font-bold">
          {participant.position}
        </div>
        <Avatar className="h-10 w-10">
          <AvatarImage src={participant.picture} />
          <AvatarFallback className="bg-[#D4A373] text-white">
            {participant.name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-gray-900">
            {participant.name}
            {isCurrentUser && <span className="text-[#2E5C55] ml-2">(Vous)</span>}
          </p>
          <p className="text-sm text-gray-500">Score: {participant.trust_score || 50}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-gray-500">Paiements</p>
          <p className="font-medium text-gray-900">{participant.payments_made || 0}</p>
        </div>
        {participant.received_payout ? (
          <Badge className="bg-green-100 text-green-700">Reçu</Badge>
        ) : (
          <Badge variant="outline">En attente</Badge>
        )}
      </div>
    </motion.div>
  );
};

export default function TontineDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tontine, setTontine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchTontine();
  }, [id]);

  const fetchTontine = async () => {
    try {
      const response = await axios.get(`${API}/tontines/${id}`, { withCredentials: true });
      setTontine(response.data);
    } catch (error) {
      toast.error('Tontine non trouvée');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const response = await axios.post(`${API}/payments/checkout`, {
        tontine_id: id,
        origin_url: window.location.origin
      }, { withCredentials: true });
      
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
      setPaymentLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      await axios.post(`${API}/tontines/join`, { tontine_id: id }, { withCredentials: true });
      toast.success('Vous avez rejoint la tontine !');
      fetchTontine();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#2E5C55] animate-spin" />
      </div>
    );
  }

  if (!tontine) return null;

  const isParticipant = tontine.participants?.some(p => p.user_id === user?.user_id);
  const userParticipant = tontine.participants?.find(p => p.user_id === user?.user_id);
  const progress = (tontine.participants?.length || 0) / tontine.max_participants * 100;
  const totalPerTurn = tontine.monthly_amount * tontine.max_participants;

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4" data-testid="tontine-detail-page">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-600 hover:text-gray-900"
          data-testid="tontine-back-btn"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{tontine.name}</h1>
                <Badge className={
                  tontine.status === 'active' ? 'bg-green-600' :
                  tontine.status === 'completed' ? 'bg-gray-500' : 'bg-[#2E5C55]'
                }>
                  {tontine.status === 'active' ? t('tontine.status_active') :
                   tontine.status === 'completed' ? t('tontine.status_completed') : t('tontine.status_open')}
                </Badge>
              </div>
              {tontine.description && (
                <p className="text-gray-600 mb-4">{tontine.description}</p>
              )}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-[#2E5C55]" />
                  <span className="text-gray-600">{tontine.monthly_amount}€/mois</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#2E5C55]" />
                  <span className="text-gray-600">{tontine.participants?.length}/{tontine.max_participants} participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#2E5C55]" />
                  <span className="text-gray-600">{tontine.duration_months} mois</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#2E5C55]" />
                  <span className="text-gray-600">Score min: {tontine.min_trust_score}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F9FAFB] rounded-xl p-6 min-w-[280px]">
              <p className="text-sm text-gray-500 mb-2">Total par tour</p>
              <p className="text-3xl font-bold text-[#2E5C55] mb-4">{totalPerTurn}€</p>
              
              {!isParticipant && tontine.status === 'open' && (
                <Button
                  onClick={handleJoin}
                  className="w-full bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full"
                  disabled={tontine.participants?.length >= tontine.max_participants}
                  data-testid="tontine-join-btn"
                >
                  {t('tontine.join_btn')}
                </Button>
              )}

              {isParticipant && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Votre position</span>
                    <span className="font-bold text-[#D4A373]">#{userParticipant?.position}</span>
                  </div>
                  <Button
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    className="w-full bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full"
                    data-testid="tontine-pay-btn"
                  >
                    {paymentLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Payer {tontine.monthly_amount}€
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Progression du groupe</span>
              <span className="text-sm font-medium text-gray-700">
                {tontine.participants?.length}/{tontine.max_participants} membres
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList className="bg-white border border-gray-100 rounded-xl p-1">
            <TabsTrigger value="participants" className="rounded-lg" data-testid="tab-participants">
              {t('tontine.participants')}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-lg" data-testid="tab-calendar">
              {t('tontine.calendar')}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg" data-testid="tab-history">
              {t('tontine.payment_history')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {tontine.participants?.map((participant, index) => (
                <ParticipantRow
                  key={participant.user_id}
                  participant={participant}
                  index={index}
                  currentUserId={user?.user_id}
                />
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="calendar">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendrier des versements</h3>
              <div className="space-y-4">
                {tontine.participants?.map((participant, index) => {
                  const payoutDate = new Date(tontine.start_date);
                  payoutDate.setMonth(payoutDate.getMonth() + index);
                  const isPast = payoutDate < new Date();
                  const isCurrentUser = participant.user_id === user?.user_id;
                  
                  return (
                    <div
                      key={participant.user_id}
                      className={`flex items-center justify-between p-4 rounded-xl ${
                        isCurrentUser ? 'bg-[#2E5C55]/5 border border-[#2E5C55]/20' :
                        isPast ? 'bg-gray-50' : 'bg-white border border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isPast ? <CheckCircle className="w-5 h-5" /> : index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {participant.name}
                            {isCurrentUser && <span className="text-[#2E5C55] ml-2">(Vous)</span>}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(payoutDate, 'MMMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#2E5C55]">{totalPerTurn}€</p>
                        <p className="text-sm text-gray-500">
                          {isPast ? 'Versé' : 'À venir'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="history">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              {tontine.payment_history?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Membre</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tontine.payment_history.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {payment.created_at ? format(new Date(payment.created_at), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>{payment.user_id?.slice(-8) || '-'}</TableCell>
                        <TableCell>{payment.amount}€</TableCell>
                        <TableCell>
                          <Badge variant={payment.payment_status === 'paid' ? 'default' : 'secondary'}
                            className={payment.payment_status === 'paid' ? 'bg-green-100 text-green-700' : ''}>
                            {payment.payment_status === 'paid' ? 'Payé' : payment.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun paiement pour le moment</p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
        >
          <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2E5C55]/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#2E5C55]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total collecté</p>
                  <p className="text-2xl font-bold text-gray-900">{tontine.total_collected?.toFixed(2) || '0.00'}€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#D4A373]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fonds de garantie</p>
                  <p className="text-2xl font-bold text-gray-900">{tontine.guarantee_fund?.toFixed(2) || '0.00'}€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cycle actuel</p>
                  <p className="text-2xl font-bold text-gray-900">{tontine.current_cycle || 0}/{tontine.duration_months}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
