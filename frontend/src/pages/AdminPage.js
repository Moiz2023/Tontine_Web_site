import React, { useState, useEffect } from 'react';
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
  XCircle
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
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tontines, setTontines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, status, response = '') => {
    try {
      await axios.put(`${API}/admin/tickets/${ticketId}`, { status, response }, { withCredentials: true });
      toast.success('Ticket mis à jour');
      fetchAdminData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

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
                      <TableHead>Inscrit le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-gray-600">{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.kyc_status === 'verified' ? 'bg-green-100 text-green-700' :
                              user.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }
                          >
                            {user.kyc_status === 'verified' ? 'Vérifié' :
                             user.kyc_status === 'pending' ? 'En attente' : 'Rejeté'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#2E5C55]" />
                            <span>{user.trust_score || 50}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
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
                      <TableHead>Collecté</TableHead>
                      <TableHead>Créé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tontines.map((tontine) => (
                      <TableRow key={tontine.tontine_id}>
                        <TableCell className="font-medium">{tontine.name}</TableCell>
                        <TableCell>{tontine.monthly_amount}€/mois</TableCell>
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
                             tontine.status === 'open' ? 'Ouvert' : 'Terminé'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-[#2E5C55]">
                          {tontine.total_collected?.toFixed(2) || '0.00'}€
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {tontine.created_at ? format(new Date(tontine.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
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
                          <Badge
                            className={
                              ticket.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }
                          >
                            {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
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
                                onClick={() => updateTicketStatus(ticket.ticket_id, 'closed', 'Ticket résolu')}
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
        </Tabs>
      </div>
    </div>
  );
}
