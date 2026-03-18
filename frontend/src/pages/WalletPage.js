import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  Download,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WalletPage() {
  const { t } = useLanguage();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await axios.get(`${API}/wallet`, { withCredentials: true });
      setWallet(response.data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
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
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{trend >= 0 ? '+' : ''}{trend.toFixed(2)}€</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // FIX: use try/finally to guarantee the temporary <a> element is always
  // removed from the DOM even if URL creation or click throws an error.
  const handleExport = async () => {
    let url = null;
    let link = null;
    try {
      const response = await axios.get(`${API}/wallet/export`, {
        withCredentials: true,
        responseType: 'blob'
      });
      url = window.URL.createObjectURL(new Blob([response.data]));
      link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'savyn_releve.csv');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export — veuillez réessayer');
    } finally {
      // Always clean up, whether the export succeeded or failed
      if (link && link.parentNode) link.parentNode.removeChild(link);
      if (url) window.URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <div className="max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4" data-testid="wallet-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('wallet.title')}</h1>
            <p className="text-gray-600">Suivez vos contributions et vos gains.</p>
          </div>
          <Button variant="outline" className="rounded-full" data-testid="wallet-export-btn" onClick={handleExport}>
            <Download className="w-5 h-5 mr-2" />
            {t('wallet.export')}
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <StatCard icon={WalletIcon} title={t('wallet.balance')} value={`${wallet?.net_balance?.toFixed(2) || '0.00'}€`} color={wallet?.net_balance >= 0 ? 'bg-green-600' : 'bg-red-600'} trend={wallet?.net_balance} />
          <StatCard icon={ArrowUpRight} title={t('wallet.contributed')} value={`${wallet?.total_contributed?.toFixed(2) || '0.00'}€`} color="bg-[#D4A373]" />
          <StatCard icon={ArrowDownLeft} title={t('wallet.received')} value={`${wallet?.total_received?.toFixed(2) || '0.00'}€`} color="bg-green-600" />
          <StatCard icon={CreditCard} title={t('wallet.fees')} value={`${wallet?.total_fees_paid?.toFixed(2) || '0.00'}€`} subtitle="Frais de garantie" color="bg-gray-600" />
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-[#F9FAFB]">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {t('wallet.recent_transactions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {wallet?.recent_transactions?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tontine</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Frais</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wallet.recent_transactions.map((tx, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {tx.created_at ? format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.type === 'contribution' ? (
                              <><ArrowUpRight className="w-4 h-4 text-[#D4A373]" /><span>Contribution</span></>
                            ) : (
                              <><ArrowDownLeft className="w-4 h-4 text-green-600" /><span>Paiement reçu</span></>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {tx.tontine_id?.slice(-8) || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {tx.base_amount?.toFixed(2) || tx.amount?.toFixed(2)}€
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {tx.guarantee_fee?.toFixed(2) || '0.00'}€
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            tx.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                            tx.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {tx.payment_status === 'paid' ? 'Payé' :
                             tx.payment_status === 'pending' ? 'En attente' :
                             tx.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('wallet.no_transactions')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payouts Section */}
        {wallet?.recent_payouts?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-green-50">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  Versements reçus
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tontine</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wallet.recent_payouts.map((payout, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {payout.created_at ? format(new Date(payout.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell>{payout.tontine_id?.slice(-8) || '-'}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          +{payout.amount?.toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700">
                            {payout.status === 'completed' ? 'Reçu' : payout.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
