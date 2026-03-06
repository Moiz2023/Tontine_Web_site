import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useLanguage } from '../../context/LanguageContext';
import { tontineAPI } from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const TontineCard = ({ tontine, onJoin, t }) => {
  const spotsLeft = tontine.spots_left || (tontine.max_participants - (tontine.participant_count || 0));
  const progress = ((tontine.participant_count || 0) / tontine.max_participants) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{tontine.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('tontine.status_open') || 'Ouvert'}</Text>
        </View>
      </View>

      {tontine.description && (
        <Text style={styles.description} numberOfLines={2}>{tontine.description}</Text>
      )}

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Icon name="dollar-sign" size={16} color={COLORS.gray[500]} />
          <Text style={styles.infoLabel}>Montant</Text>
        </View>
        <Text style={styles.infoValue}>{tontine.monthly_amount}€/mois</Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Icon name="users" size={16} color={COLORS.gray[500]} />
          <Text style={styles.infoLabel}>Participants</Text>
          <Text style={styles.progressText}>{tontine.participant_count || 0}/{tontine.max_participants}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Icon name="shield" size={16} color={COLORS.gray[500]} />
          <Text style={styles.infoLabel}>Score moyen</Text>
        </View>
        <Text style={styles.infoValue}>{tontine.avg_trust_score || 50}</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Icon name="trending-up" size={16} color={COLORS.gray[500]} />
          <Text style={styles.infoLabel}>Total par tour</Text>
        </View>
        <Text style={[styles.infoValue, { color: COLORS.secondary }]}>
          {tontine.monthly_amount * tontine.max_participants}€
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.spotsText}>
          {spotsLeft > 0 ? `${spotsLeft} places restantes` : 'Complet'}
        </Text>
        <TouchableOpacity
          style={[styles.joinButton, spotsLeft <= 0 && styles.joinButtonDisabled]}
          onPress={() => onJoin(tontine.tontine_id)}
          disabled={spotsLeft <= 0}
        >
          <Text style={styles.joinButtonText}>{t('tontine.join_btn')}</Text>
          <Icon name="arrow-right" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MarketplaceScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [tontines, setTontines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTontines();
  }, []);

  const fetchTontines = async () => {
    try {
      const response = await tontineAPI.getMarketplace();
      setTontines(response.data);
    } catch (error) {
      console.error('Error fetching marketplace:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoin = async (tontineId) => {
    try {
      await tontineAPI.join(tontineId);
      Alert.alert('Succès', 'Vous avez rejoint la tontine !');
      navigation.navigate('TontineDetail', { id: tontineId });
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Une erreur est survenue');
    }
  };

  const filteredTontines = tontines.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('nav.marketplace')}</Text>
        <Text style={styles.subtitle}>Découvrez et rejoignez des tontines</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray[400]}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredTontines}
        keyExtractor={(item) => item.tontine_id}
        renderItem={({ item }) => (
          <TontineCard tontine={item} onJoin={handleJoin} t={t} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTontines();
            }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color={COLORS.gray[300]} />
            <Text style={styles.emptyText}>Aucune tontine disponible</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('Create')}
            >
              <Text style={styles.createButtonText}>Créer une tontine</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  searchContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingLeft: 48,
    paddingRight: SPACING.md,
    fontSize: 16,
    color: COLORS.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressSection: {
    marginBottom: SPACING.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressText: {
    marginLeft: 'auto',
    fontSize: 14,
    color: COLORS.gray[700],
  },
  progressBar: {
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  spotsText: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  joinButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  joinButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default MarketplaceScreen;
