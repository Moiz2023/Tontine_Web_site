import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const MenuItem = ({ icon, title, subtitle, onPress, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, danger && { backgroundColor: `${COLORS.error}15` }]}>
      <Icon name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
    </View>
    <View style={styles.menuInfo}>
      <Text style={[styles.menuTitle, danger && { color: COLORS.error }]}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <Icon name="chevron-right" size={20} color={COLORS.gray[400]} />
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Voulez-vous vraiment vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Deconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.kycBadge}>
            <Icon name={user?.kyc_status === 'verified' ? 'check-circle' : 'alert-circle'} size={14} color={user?.kyc_status === 'verified' ? COLORS.success : COLORS.warning} />
            <Text style={styles.kycText}>{user?.kyc_status === 'verified' ? 'Identite verifiee' : 'KYC en attente'}</Text>
          </View>
          <View style={styles.trustScoreRow}>
            <Icon name="shield" size={16} color={COLORS.primary} />
            <Text style={styles.trustScoreLabel}>Score de confiance:</Text>
            <Text style={styles.trustScoreValue}>{user?.trust_score || 50}/100</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <MenuItem icon="globe" title="Langue" subtitle={language === 'fr' ? 'Francais' : 'English'} onPress={toggleLanguage} />
          <MenuItem icon="help-circle" title="Support" subtitle="FAQ & Assistance" onPress={() => navigation.navigate('Support')} />
          <MenuItem icon="file-text" title="Contrats" subtitle="Vos contrats digitaux" onPress={() => Alert.alert('Contrats', 'Consultez vos contrats sur la version web.')} />
          <MenuItem icon="info" title="A propos" subtitle="Savyn v1.0.0" onPress={() => Alert.alert('Savyn', 'Savyn v1.0.0\nL\'epargne collective securisee.')} />
        </View>

        <View style={styles.menuSection}>
          <MenuItem icon="log-out" title="Deconnexion" danger onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md },
  header: { marginBottom: SPACING.lg },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.black },
  userCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: COLORS.white },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.black, marginBottom: 4 },
  userEmail: { fontSize: 14, color: COLORS.gray[500], marginBottom: SPACING.md },
  kycBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.gray[50], paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.sm },
  kycText: { fontSize: 13, color: COLORS.gray[700], fontWeight: '500' },
  trustScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  trustScoreLabel: { fontSize: 13, color: COLORS.gray[600] },
  trustScoreValue: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  menuSection: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray[50] },
  menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1, marginLeft: SPACING.md },
  menuTitle: { fontSize: 15, fontWeight: '600', color: COLORS.black },
  menuSubtitle: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
});

export default ProfileScreen;
