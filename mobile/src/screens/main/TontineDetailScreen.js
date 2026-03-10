import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { tontineAPI, paymentAPI } from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const ParticipantItem = ({ participant, position, isCurrentUser }) => (
  <View style={[styles.participantItem, isCurrentUser && styles.participantItemCurrent]}>
    <View style={styles.positionBadge}>
      <Text style={styles.positionText}>{position}</Text>
    </View>
    <View style={styles.participantInfo}>
      <Text style={styles.participantName}>
        {participant.name}
        {isCurrentUser && <Text style={styles.youTag}> (Vous)</Text>}
      </Text>
      <Text style={styles.participantScore}>Score: {participant.trust_score || 50}</Text>
    </View>
    <View style={styles.participantStatus}>
      {participant.received_payout ? (
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Reçu</Text>
        </View>
      ) : (
        <Text style={styles.paymentsText}>{participant.payments_made || 0} paiements</Text>
      )}
    </View>
  </View>
);

const TontineDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tontine, setTontine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchTontine();
  }, [id]);

  const fetchTontine = async () => {
    try {
      const response = await tontineAPI.getTontine(id);
      setTontine(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Tontine non trouvée');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      // In a real app, this would open a payment sheet or WebView
      Alert.alert(
        'Paiement',
        `Voulez-vous payer ${tontine.monthly_amount}€ + 3% de frais de garantie ?`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setPaymentLoading(false) },
          { text: 'Confirmer', onPress: async () => {
            try {
              const response = await paymentAPI.createCheckout(id, 'savyn://');
              Alert.alert('Info', 'Redirection vers la page de paiement...');
              // In a real app, open response.data.url in WebView
            } catch (error) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Erreur de paiement');
            }
            setPaymentLoading(false);
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur de paiement');
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!tontine) return null;

  const isParticipant = tontine.participants?.some(p => p.user_id === user?.user_id);
  const userParticipant = tontine.participants?.find(p => p.user_id === user?.user_id);
  const totalPerTurn = tontine.monthly_amount * tontine.max_participants;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>{tontine.name}</Text>
            <View style={[styles.statusBadge, tontine.status === 'active' && styles.statusBadgeActive]}>
              <Text style={styles.statusBadgeText}>
                {tontine.status === 'active' ? 'Actif' : 'Ouvert'}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icon name="dollar-sign" size={20} color={COLORS.primary} />
              <Text style={styles.summaryLabel}>Mensuel</Text>
              <Text style={styles.summaryValue}>{tontine.monthly_amount}€</Text>
            </View>
            <View style={styles.summaryItem}>
              <Icon name="users" size={20} color={COLORS.primary} />
              <Text style={styles.summaryLabel}>Participants</Text>
              <Text style={styles.summaryValue}>{tontine.participants?.length}/{tontine.max_participants}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Icon name="calendar" size={20} color={COLORS.primary} />
              <Text style={styles.summaryLabel}>Durée</Text>
              <Text style={styles.summaryValue}>{tontine.duration_months} mois</Text>
            </View>
          </View>

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total par tour</Text>
            <Text style={styles.totalValue}>{totalPerTurn}€</Text>
          </View>

          {isParticipant && (
            <View style={styles.userPosition}>
              <Text style={styles.userPositionLabel}>Votre position</Text>
              <Text style={styles.userPositionValue}>#{userParticipant?.position}</Text>
            </View>
          )}

          {isParticipant && (
            <TouchableOpacity
              style={[styles.payButton, paymentLoading && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Icon name="credit-card" size={20} color={COLORS.white} />
                  <Text style={styles.payButtonText}>Payer {tontine.monthly_amount}€</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="trending-up" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{tontine.total_collected?.toFixed(0) || 0}€</Text>
            <Text style={styles.statLabel}>Collecté</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="shield" size={24} color={COLORS.secondary} />
            <Text style={styles.statValue}>{tontine.guarantee_fund?.toFixed(0) || 0}€</Text>
            <Text style={styles.statLabel}>Garantie</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="repeat" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{tontine.current_cycle || 0}/{tontine.duration_months}</Text>
            <Text style={styles.statLabel}>Cycle</Text>
          </View>
        </View>

        {/* Participants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tontine.participants')}</Text>
          {tontine.participants?.map((participant, index) => (
            <ParticipantItem
              key={participant.user_id}
              participant={participant}
              position={participant.position}
              isCurrentUser={participant.user_id === user?.user_id}
            />
          ))}
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
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.success,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 2,
  },
  totalSection: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  userPosition: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    marginBottom: SPACING.md,
  },
  userPositionLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  userPositionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  participantItemCurrent: {
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  youTag: {
    color: COLORS.primary,
  },
  participantScore: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  participantStatus: {},
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  paymentsText: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
});

export default TontineDetailScreen;
