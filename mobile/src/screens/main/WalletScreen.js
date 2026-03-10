import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { walletAPI, paymentAPI } from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const TransactionItem = ({ transaction }) => {
  const isPayment = transaction.type === 'contribution' || transaction.payment_status;
  return (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, { backgroundColor: isPayment ? `${COLORS.error}15` : `${COLORS.success}15` }]}>
        <Icon name={isPayment ? 'arrow-up-right' : 'arrow-down-left'} size={20} color={isPayment ? COLORS.error : COLORS.success} />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>{isPayment ? 'Contribution' : 'Versement recu'}</Text>
        <Text style={styles.transactionDate}>{transaction.created_at?.split('T')[0] || '-'}</Text>
      </View>
      <Text style={[styles.transactionAmount, { color: isPayment ? COLORS.error : COLORS.success }]}>
        {isPayment ? '-' : '+'}{transaction.amount?.toFixed(2) || '0.00'}EUR
      </Text>
    </View>
  );
};

const WalletScreen = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, historyRes] = await Promise.all([
        walletAPI.get(),
        paymentAPI.getHistory(),
      ]);
      setWallet(walletRes.data);
      setTransactions(historyRes.data || []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    Alert.alert('Export', 'La fonctionnalite d\'export CSV est disponible sur la version web.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('wallet.title')}</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Icon name="download" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
          <Text style={styles.balanceValue}>{wallet?.net_balance?.toFixed(2) || '0.00'}EUR</Text>
          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <Icon name="arrow-up-right" size={16} color={COLORS.error} />
              <Text style={styles.balanceItemLabel}>{t('wallet.contributed')}</Text>
              <Text style={styles.balanceItemValue}>{wallet?.total_contributed?.toFixed(0) || 0}EUR</Text>
            </View>
            <View style={styles.balanceItem}>
              <Icon name="arrow-down-left" size={16} color={COLORS.success} />
              <Text style={styles.balanceItemLabel}>{t('wallet.received')}</Text>
              <Text style={styles.balanceItemValue}>{wallet?.total_received?.toFixed(0) || 0}EUR</Text>
            </View>
            <View style={styles.balanceItem}>
              <Icon name="shield" size={16} color={COLORS.secondary} />
              <Text style={styles.balanceItemLabel}>{t('wallet.fees')}</Text>
              <Text style={styles.balanceItemValue}>{wallet?.guarantee_fees?.toFixed(0) || 0}EUR</Text>
            </View>
          </View>
        </View>

        {/* Lemon Way Info */}
        <View style={styles.lemonwayCard}>
          <Icon name="lock" size={20} color={COLORS.info} />
          <Text style={styles.lemonwayText}>
            Vos fonds sont detenus de maniere securisee par Lemon Way, prestataire de paiement agree.
          </Text>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('wallet.recent_transactions')}</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>{t('wallet.no_transactions')}</Text>
            </View>
          ) : (
            transactions.map((t, i) => <TransactionItem key={i} transaction={t} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.black },
  exportButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  balanceCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  balanceLabel: { fontSize: 14, color: COLORS.gray[500], marginBottom: 4 },
  balanceValue: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary, marginBottom: SPACING.lg },
  balanceDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceItem: { alignItems: 'center', flex: 1 },
  balanceItemLabel: { fontSize: 11, color: COLORS.gray[500], marginTop: 4 },
  balanceItemValue: { fontSize: 16, fontWeight: '600', color: COLORS.black, marginTop: 2 },
  lemonwayCard: { flexDirection: 'row', backgroundColor: `${COLORS.info}10`, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg, gap: 12, alignItems: 'flex-start' },
  lemonwayText: { flex: 1, fontSize: 13, color: COLORS.info, lineHeight: 18 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.black, marginBottom: SPACING.md },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: 14, color: COLORS.gray[400], marginTop: SPACING.sm },
  transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  transactionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  transactionInfo: { flex: 1, marginLeft: SPACING.md },
  transactionTitle: { fontSize: 15, fontWeight: '500', color: COLORS.black },
  transactionDate: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: '600' },
});

export default WalletScreen;
