import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  MessageSquare,
  Search,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Lock,
  AlertTriangle,
  Ban,
  UserCheck,
  BarChart3,
  DollarSign
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tontines, setTontines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, tontinesRes, ticketsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/users`, { withCredentials: true }),
        axios.get(`${API}/admin/tontines`, { withCredentials: true }),
        axios.get(`${API}/admin/tickets`, { withCredentials: true })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setTontines(tontinesRes.data);
      setTickets(ticketsRes.data);

      // Fetch fraud alerts and analytics (non-blocking)
      try {
        const [fraudRes, analyticsRes] = await Promise.all([
          axios.get(`${API}/admin/fraud-alerts`, { withCredentials: true }),
          axios.get(`${API}/admin/analytics`, { withCredentials: true })
        ]);
        setFraudAlerts(fraudRes.data?.alerts || []);
        setAnalytics(analyticsRes.data);
      } catch (e) {
        console.error('Error fetching fraud/analytics:', e);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        toast.error('Erreur lors du chargement des donnees');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, status, response = '') => {
    try {
      await axios.put(`${API}/admin/tickets/${ticketId}`, { status, response }, { withCredentials: true });
      toast.success('Ticket mis a jour');
      fetchAdminData();
    } catch (error) {
      toast.error('Erreur lors de la mise a jour');
    }
  };

  const handleSuspend = async (userId, suspend) => {
    try {
      await axios.post(`${API}/admin/suspend/${userId}`, 
        { suspend, reason: suspend ? 'Suspendu par admin' : '' },
        { withCredentials: true }
      );
      toast.success(suspend ? 'Compte suspendu' : 'Compte reactif');
      fetchAdminData();
    } catch (error) {
      toast.error('Erreur: ' + (error.response?.data?.detail || 'Erreur inconnue'));
    }
  };

  const handleKycUpdate = async (userId, status) => {
    try {
      await axios.put(`${API}/admin/kyc/${userId}`, 
        { status },
        { withCredentials: true }
      );
      toast.success(`KYC ${status === 'verified' ? 'approuve' : 'rejete'}`);
      fetchAdminData();
    } catch (error) {
      toast.error('Erreur: ' + (error.response?.data?.detail || 'Erreur inconnue'));
    }
  };

  const handleTriggerPayout = async (tontineId) => {
    try {
      const res = await axios.post(`${API}/admin/trigger-payout/${tontineId}`, {}, { withCredentials: true });
      toast.success(res.data.message);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur payout');
    }
  };

  // Access denied screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h2>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder au panneau d'administration.
          </p>
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full px-8"
          >
            Retour au tableau de bord
          </Button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4" data-testid="admin-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.title')}</h1>
          <p className="text-gray-600">Gérez les utilisateurs, tontines et tickets.</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            icon={Users}
            title={t('admin.total_users')}
            value={stats?.users?.total || 0}
            subtitle={`${stats?.users?.verified || 0} vérifiés`}
            color="bg-[#2E5C55]"
          />
          <StatCard
            icon={TrendingUp}
            title="Tontines"
            value={stats?.tontines?.total || 0}
            subtitle={`${stats?.tontines?.active || 0} actives`}
            color="bg-[#D4A373]"
          />
          <StatCard
            icon={CreditCard}
            title={t('admin.total_volume')}
            value={`${stats?.payments?.volume?.toFixed(2) || '0.00'}€`}
            subtitle={`${stats?.payments?.total || 0} transactions`}
            color="bg-green-600"
          />
          <StatCard
            icon={MessageSquare}
            title={t('admin.open_tickets')}
            value={stats?.open_tickets || 0}
            color="bg-blue-600"
          />
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white border border-gray-100 rounded-xl p-1">
            <TabsTrigger value="users" className="rounded-lg" data-testid="admin-tab-users">
              {t('admin.users')} ({users.length})
            </TabsTrigger>
            <TabsTrigger value="tontines" className="rounded-lg" data-testid="admin-tab-tontines">
              {t('admin.tontines')} ({tontines.length})
            </TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-lg" data-testid="admin-tab-tickets">
              {t('admin.tickets')} ({tickets.length})
            </TabsTrigger>
            <TabsTrigger value="fraud" className="rounded-lg" data-testid="admin-tab-fraud">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Fraude ({fraudAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg" data-testid="admin-tab-analytics">
              <BarChart3 className="w-4 h-4 mr-1" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-[#F9FAFB]">
                <div className="flex items-center justify-between">
                  <CardTitle>{t('admin.users')}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10"
                      data-testid="admin-users-search"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>KYC</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.user_id} className={u.is_suspended ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-gray-600">{u.email}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.kyc_status === 'verified' ? 'bg-green-100 text-green-700' :
                              u.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }
                          >
                            {u.kyc_status === 'verified' ? 'Verifie' :
                             u.kyc_status === 'pending' ? 'En attente' : 'Rejete'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#2E5C55]" />
                            <span>{u.trust_score || 50}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.is_suspended ? (
                            <Badge className="bg-red-100 text-red-700">Suspendu</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">Actif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {u.created_at ? format(new Date(u.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {u.kyc_status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" className="text-green-600 h-8 px-2"
                                  onClick={() => handleKycUpdate(u.user_id, 'verified')}
                                  data-testid={`kyc-approve-${u.user_id}`}
                                  title="Approuver KYC"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 h-8 px-2"
                                  onClick={() => handleKycUpdate(u.user_id, 'rejected')}
                                  data-testid={`kyc-reject-${u.user_id}`}
                                  title="Rejeter KYC"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline" 
                              className={u.is_suspended ? "text-green-600 h-8 px-2" : "text-red-600 h-8 px-2"}
                              onClick={() => handleSuspend(u.user_id, !u.is_suspended)}
                              data-testid={`suspend-${u.user_id}`}
                              title={u.is_suspended ? "Reactiver" : "Suspendre"}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tontines Tab */}
          <TabsContent value="tontines">
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Collecte</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tontines.map((tontine) => (
                      <TableRow key={tontine.tontine_id}>
                        <TableCell className="font-medium">{tontine.name}</TableCell>
                        <TableCell>{tontine.monthly_amount}EUR/mois</TableCell>
                        <TableCell>
                          {tontine.participants?.length || 0}/{tontine.max_participants}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tontine.status === 'active' ? 'bg-green-100 text-green-700' :
                              tontine.status === 'open' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }
                          >
                            {tontine.status === 'active' ? 'Actif' :
                             tontine.status === 'open' ? 'Ouvert' : 'Termine'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tontine.current_cycle || '-'}/{tontine.participants?.length || tontine.max_participants}
                        </TableCell>
                        <TableCell className="font-medium text-[#2E5C55]">
                          {tontine.total_collected?.toFixed(2) || '0.00'}EUR
                        </TableCell>
                        <TableCell>
                          {tontine.status === 'active' && (
                            <Button size="sm" variant="outline" className="text-[#2E5C55] h-8"
                              onClick={() => handleTriggerPayout(tontine.tontine_id)}
                              data-testid={`payout-${tontine.tontine_id}`}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Payout
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets">
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.ticket_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{ticket.message}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{ticket.user_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              ticket.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }
                          >
                            {ticket.status === 'open' ? 'Ouvert' : 'Ferme'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {ticket.created_at ? format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {ticket.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTicketStatus(ticket.ticket_id, 'closed', 'Ticket resolu')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fraud Detection Tab */}
          <TabsContent value="fraud">
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-[#F9FAFB]">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Detection de Fraude
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {fraudAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Aucune alerte detectee</p>
                    <p className="text-sm text-gray-400">Le systeme surveille en permanence les activites suspectes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fraudAlerts.map((alert, i) => (
                      <div key={i} className={`p-4 rounded-lg border ${
                        alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                        alert.severity === 'medium' ? 'border-orange-200 bg-orange-50' :
                        'border-blue-200 bg-blue-50'
                      }`} data-testid={`fraud-alert-${i}`}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                            alert.severity === 'high' ? 'text-red-500' :
                            alert.severity === 'medium' ? 'text-orange-500' :
                            'text-blue-500'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">{alert.message}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Type: {alert.type} | Severite: {alert.severity}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Distribution des Tontines</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.tontine_distribution ? (
                    <div className="space-y-3">
                      {Object.entries(analytics.tontine_distribution).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 capitalize">{status}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${
                                status === 'active' ? 'bg-green-500' :
                                status === 'open' ? 'bg-blue-500' : 'bg-gray-400'
                              }`} style={{width: `${Math.min((count / Math.max(...Object.values(analytics.tontine_distribution))) * 100, 100)}%`}} />
                            </div>
                            <span className="font-semibold text-sm w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">Aucune donnee</p>}
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Distribution KYC</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.kyc_distribution ? (
                    <div className="space-y-3">
                      {Object.entries(analytics.kyc_distribution).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 capitalize">{status}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${
                                status === 'verified' ? 'bg-green-500' :
                                status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} style={{width: `${Math.min((count / Math.max(...Object.values(analytics.kyc_distribution))) * 100, 100)}%`}} />
                            </div>
                            <span className="font-semibold text-sm w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">Aucune donnee</p>}
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#2E5C55]" />
                    Lemon Way - Statut Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                    <div>
                      <p className="font-medium text-gray-900">Mode Sandbox (Simule)</p>
                      <p className="text-sm text-gray-600">
                        Les paiements et versements sont simules. Pour activer le mode reel, 
                        configurez les cles API Lemon Way dans les parametres.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
