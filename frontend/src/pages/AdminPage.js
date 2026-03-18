import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
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
  DollarSign,
  Loader2
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

  // FIX: read role from auth context BEFORE making any API calls.
  // This prevents non-admin users from triggering up to 6 requests.
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tontines, setTontines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // FIX: only fetch admin data when we know the user is an admin
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') return; // guard — no API calls for non-admins
    fetchAdminData();
  }, [authLoading, user]);

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
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // FIX: optimistic state update — close ticket locally without re-fetching everything
  const updateTicketStatus = async (ticketId, status, response = '') => {
    try {
      await axios.put(`${API}/admin/tickets/${ticketId}`, { status, response }, { withCredentials: true });
      toast.success('Ticket mis à jour');
      // Update only the affected ticket in local state
      setTickets(prev =>
        prev.map(t => t.ticket_id === ticketId ? { ...t, status, admin_response: response } : t)
      );
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // FIX: optimistic update for suspend/unsuspend
  const handleSuspend = async (userId, suspend) => {
    try {
      await axios.post(
        `${API}/admin/suspend/${userId}`,
        { suspend, reason: suspend ? 'Suspendu par admin' : '' },
        { withCredentials: true }
      );
      toast.success(suspend ? 'Compte suspendu' : 'Compte réactivé');
      // Update only the affected user in local state
      setUsers(prev =>
        prev.map(u => u.user_id === userId ? { ...u, is_suspended: suspend } : u)
      );
    } catch (error) {
      toast.error('Erreur : ' + (error.response?.data?.detail || 'Erreur inconnue'));
    }
  };

  // FIX: optimistic update for KYC status
  const handleKycUpdate = async (userId, status) => {
    try {
      await axios.put(`${API}/admin/kyc/${userId}`, { status }, { withCredentials: true });
      toast.success(`KYC ${status === 'verified' ? 'approuvé' : 'rejeté'}`);
      setUsers(prev =>
        prev.map(u => u.user_id === userId ? { ...u, kyc_status: status } : u)
      );
    } catch (error) {
      toast.error('Erreur : ' + (error.response?.data?.detail || 'Erreur inconnue'));
    }
  };

  const handleTriggerPayout = async (tontineId) => {
    try {
      const res = await axios.post(`${API}/admin/trigger-payout/${tontineId}`, {}, { withCredentials: true });
      toast.success(res.data.message);
      // Only refresh tontines list after a payout trigger (state changes are significant)
      const tontinesRes = await axios.get(`${API}/admin/tontines`, { withCredentials: true });
      setTontines(tontinesRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur payout');
    }
  };

  // -------------------------------------------------------------------------
  // FIX: access-denied screen rendered BEFORE any API calls, based on
  // the role from the auth context — not a 403 discovered after the fact
  // -------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#2E5C55] animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
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
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl h-32"></div>)}
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
    <div className="min-h-screen bg-[#F9FAFB] p-6" data-testid="admin-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Administration</h1>
            <p className="text-gray-600">Tableau de bord administrateur Savyn</p>
          </div>
          <Badge className="bg-red-100 text-red-700 px-4 py-2">
            <Shield className="w-4 h-4 mr-2 inline" />
            Admin
          </Badge>
        </motion.div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Users} title="Utilisateurs" value={stats.total_users || 0} color="bg-[#2E5C55]" />
            <StatCard icon={BarChart3} title="Tontines actives" value={stats.active_tontines || 0} color="bg-[#D4A373]" />
            <StatCard icon={CreditCard} title="Volume total" value={`${(stats.total_volume || 0).toFixed(0)}€`} color="bg-blue-600" />
            <StatCard icon={MessageSquare} title="Tickets ouverts" value={stats.open_tickets || 0} color="bg-orange-500" />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" data-testid="admin-tab-users">
              <Users className="w-4 h-4 mr-2" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="tontines" data-testid="admin-tab-tontines">
              <BarChart3 className="w-4 h-4 mr-2" />
              Tontines
            </TabsTrigger>
            <TabsTrigger value="tickets" data-testid="admin-tab-tickets">
              <MessageSquare className="w-4 h-4 mr-2" />
              Support
            </TabsTrigger>
            <TabsTrigger value="fraud" data-testid="admin-tab-fraud">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Fraude
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="admin-tab-analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytique
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-[#F9FAFB]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Gestion des utilisateurs</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher..."
                      className="pl-9 h-9 w-64"
                      data-testid="admin-user-search"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>KYC</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            u.kyc_status === 'verified' ? 'bg-green-100 text-green-700' :
                            u.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {u.kyc_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.trust_score || 50}</TableCell>
                        <TableCell>
                          <Badge className={u.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                            {u.is_suspended ? 'Suspendu' : 'Actif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {u.created_at ? format(new Date(u.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {u.kyc_status !== 'verified' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleKycUpdate(u.user_id, 'verified')}
                                className="text-green-600 hover:text-green-700"
                                data-testid={`admin-kyc-approve-${u.user_id}`}
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSuspend(u.user_id, !u.is_suspended)}
                              className={u.is_suspended ? 'text-green-600' : 'text-red-600 hover:text-red-700'}
                              data-testid={`admin-suspend-${u.user_id}`}
                            >
                              {u.is_suspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
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
              <CardHeader className="border-b border-gray-100 bg-[#F9FAFB]">
                <CardTitle className="text-lg font-semibold">Gestion des tontines</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Créateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tontines.map((tontine) => (
                      <TableRow key={tontine.tontine_id}>
                        <TableCell className="font-medium">{tontine.name}</TableCell>
                        <TableCell className="text-gray-600">{tontine.creator_email || '-'}</TableCell>
                        <TableCell>{tontine.monthly_amount}€</TableCell>
                        <TableCell>
                          {tontine.participants?.length || 0}/{tontine.max_participants}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            tontine.status === 'active' ? 'bg-green-100 text-green-700' :
                            tontine.status === 'open' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {tontine.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tontine.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerPayout(tontine.tontine_id)}
                              className="text-[#2E5C55]"
                              data-testid={`admin-payout-${tontine.tontine_id}`}
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

          {/* Support Tickets Tab */}
          <TabsContent value="tickets">
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-[#F9FAFB]">
                <CardTitle className="text-lg font-semibold">Tickets de support</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Catégorie</TableHead>
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
                          <Badge className={
                            ticket.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }>
                            {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {ticket.created_at ? format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell>
                          {ticket.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTicketStatus(ticket.ticket_id, 'closed', 'Ticket résolu')}
                              className="text-green-600 hover:text-green-700"
                              data-testid={`admin-close-ticket-${ticket.ticket_id}`}
                            >
                              <CheckCircle className="w-4 h-4" />
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

          {/* Fraud Detection Tab */}
          <TabsContent value="fraud">
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-[#F9FAFB]">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Détection de fraude
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {fraudAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Aucune alerte détectée</p>
                    <p className="text-sm text-gray-400">Le système surveille en permanence les activités suspectes</p>
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
                              Type : {alert.type} | Sévérité : {alert.severity}
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
                  <CardTitle className="text-base">Distribution des tontines</CardTitle>
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
                              }`} style={{ width: `${Math.min((count / Math.max(...Object.values(analytics.tontine_distribution))) * 100, 100)}%` }} />
                            </div>
                            <span className="font-semibold text-sm w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">Aucune donnée</p>}
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
                              }`} style={{ width: `${Math.min((count / Math.max(...Object.values(analytics.kyc_distribution))) * 100, 100)}%` }} />
                            </div>
                            <span className="font-semibold text-sm w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">Aucune donnée</p>}
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#2E5C55]" />
                    Lemon Way — Statut intégration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                    <div>
                      <p className="font-medium text-gray-900">Mode Sandbox (simulé)</p>
                      <p className="text-sm text-gray-600">
                        Les paiements et versements sont simulés. Pour activer le mode réel,
                        configurez les clés API Lemon Way dans les paramètres.
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
