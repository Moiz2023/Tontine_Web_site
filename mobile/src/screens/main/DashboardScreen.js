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
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { tontineAPI, walletAPI, trustScoreAPI } from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const StatCard = ({ icon, title, value, subtitle, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  </View>
);

const TontineCard = ({ tontine, onPress }) => {
  const progress = (tontine.participants?.length || 0) / tontine.max_participants * 100;
  
  return (
    <TouchableOpacity style={styles.tontineCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.tontineHeader}>
        <Text style={styles.tontineName}>{tontine.name}</Text>
        <View style={[styles.statusBadge, tontine.status === 'active' && styles.statusBadgeActive]}>
          <Text style={styles.statusText}>
            {tontine.status === 'active' ? 'Actif' : 'Ouvert'}
          </Text>
        </View>
      </View>
      
      <View style={styles.tontineInfo}>
        <View style={styles.tontineInfoItem}>
          <Text style={styles.tontineInfoLabel}>Montant</Text>
          <Text style={styles.tontineInfoValue}>{tontine.monthly_amount}€/mois</Text>
        </View>
        <View style={styles.tontineInfoItem}>
          <Text style={styles.tontineInfoLabel}>Position</Text>
          <Text style={[styles.tontineInfoValue, { color: COLORS.secondary }]}>
            #{tontine.user_position || '-'}
          </Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {tontine.participant_count || tontine.participants?.length}/{tontine.max_participants}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tontines, setTontines] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [trustScore, setTrustScore] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [tontinesRes, walletRes, trustRes] = await Promise.all([
        tontineAPI.getUserTontines(),
        walletAPI.get(),
        trustScoreAPI.get(),
      ]);
      setTontines(tontinesRes.data);
      setWallet(walletRes.data);
      setTrustScore(trustRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('dashboard.welcome')},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]} !</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Support')}
          >
            <Icon name="bell" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
        </View>

        {/* Trust Score Card */}
        <View style={styles.trustScoreCard}>
          <View style={styles.trustScoreHeader}>
            <Icon name="shield" size={24} color={COLORS.primary} />
            <Text style={styles.trustScoreTitle}>{t('dashboard.trust_score')}</Text>
          </View>
          <View style={styles.trustScoreContent}>
            <Text style={styles.trustScoreValue}>{trustScore?.trust_score || 50}</Text>
            <View style={[styles.levelBadge, 
              trustScore?.level === 'Gold' && styles.levelBadgeGold,
              trustScore?.level === 'Silver' && styles.levelBadgeSilver,
            ]}>
              <Text style={styles.levelText}>{trustScore?.level || 'Bronze'}</Text>
            </View>
          </View>
          <View style={styles.trustScoreBar}>
            <View style={[styles.trustScoreFill, { width: `${trustScore?.trust_score || 50}%` }]} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="users"
            title={t('dashboard.active_tontines')}
            value={tontines.length}
            color={COLORS.primary}
          />
          <StatCard
            icon="arrow-up-right"
            title={t('dashboard.total_contributed')}
            value={`${wallet?.total_contributed?.toFixed(0) || 0}€`}
            color={COLORS.secondary}
          />
          <StatCard
            icon="arrow-down-left"
            title={t('dashboard.total_received')}
            value={`${wallet?.total_received?.toFixed(0) || 0}€`}
            color={COLORS.success}
          />
          <StatCard
            icon="credit-card"
            title="Solde net"
            value={`${wallet?.net_balance?.toFixed(0) || 0}€`}
            color={COLORS.info}
          />
        </View>

        {/* Active Tontines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.active_tontines')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Marketplace')}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {tontines.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="users" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyTitle}>{t('dashboard.no_tontines')}</Text>
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={() => navigation.navigate('Marketplace')}
              >
                <Text style={styles.joinButtonText}>{t('dashboard.join_now')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            tontines.map((tontine) => (
              <TontineCard
                key={tontine.tontine_id}
                tontine={tontine}
                onPress={() => navigation.navigate('TontineDetail', { id: tontine.tontine_id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.gray[600],
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trustScoreCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trustScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  trustScoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  trustScoreContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: SPACING.md,
  },
  trustScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#CD7F32',
    marginBottom: 8,
  },
  levelBadgeGold: {
    backgroundColor: '#FFD700',
  },
  levelBadgeSilver: {
    backgroundColor: '#C0C0C0',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  trustScoreBar: {
    height: 8,
    backgroundColor: COLORS.gray[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  trustScoreFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  statSubtitle: {
    fontSize: 11,
    color: COLORS.gray[400],
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
  },
  emptyTitle: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  joinButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  tontineCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tontineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tontineName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  tontineInfo: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  tontineInfoItem: {
    flex: 1,
  },
  tontineInfoLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  tontineInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.gray[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
});

export default DashboardScreen;
