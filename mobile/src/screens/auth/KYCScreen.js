import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { kycAPI } from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const KYCScreen = () => {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    id_type: 'id_card',
    id_number: '',
    iban: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'FR',
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await kycAPI.submit(formData);
      await updateUser({ kyc_status: 'verified' });
      Alert.alert('Succès', 'Vérification KYC réussie !');
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Icon name="file-text" size={24} color={COLORS.primary} />
        <Text style={styles.stepTitle}>Document d'identité</Text>
      </View>

      <View style={styles.selectContainer}>
        <TouchableOpacity
          style={[styles.selectOption, formData.id_type === 'id_card' && styles.selectOptionActive]}
          onPress={() => setFormData({ ...formData, id_type: 'id_card' })}
        >
          <Text style={[styles.selectText, formData.id_type === 'id_card' && styles.selectTextActive]}>
            {t('kyc.id_card')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectOption, formData.id_type === 'passport' && styles.selectOptionActive]}
          onPress={() => setFormData({ ...formData, id_type: 'passport' })}
        >
          <Text style={[styles.selectText, formData.id_type === 'passport' && styles.selectTextActive]}>
            {t('kyc.passport')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('kyc.id_number')}</Text>
        <TextInput
          style={styles.input}
          placeholder="123456789"
          value={formData.id_number}
          onChangeText={(text) => setFormData({ ...formData, id_number: text })}
          placeholderTextColor={COLORS.gray[400]}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, !formData.id_number && styles.buttonDisabled]}
        onPress={() => setStep(2)}
        disabled={!formData.id_number}
      >
        <Text style={styles.buttonText}>{t('common.next')}</Text>
        <Icon name="arrow-right" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Icon name="credit-card" size={24} color={COLORS.primary} />
        <Text style={styles.stepTitle}>Coordonnées bancaires</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('kyc.iban')}</Text>
        <TextInput
          style={styles.input}
          placeholder="FR76 1234 5678 9012 3456 7890 123"
          value={formData.iban}
          onChangeText={(text) => setFormData({ ...formData, iban: text.toUpperCase() })}
          placeholderTextColor={COLORS.gray[400]}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.infoBox}>
        <Icon name="shield" size={20} color={COLORS.info} />
        <Text style={styles.infoText}>
          Votre IBAN est utilisé uniquement pour les prélèvements SEPA automatiques.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Icon name="arrow-left" size={20} color={COLORS.gray[600]} />
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !formData.iban && styles.buttonDisabled]}
          onPress={() => setStep(3)}
          disabled={!formData.iban}
        >
          <Text style={styles.buttonText}>{t('common.next')}</Text>
          <Icon name="arrow-right" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Icon name="map-pin" size={24} color={COLORS.primary} />
        <Text style={styles.stepTitle}>Adresse</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t('kyc.address')}</Text>
        <TextInput
          style={styles.input}
          placeholder="123 Rue de la Paix"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          placeholderTextColor={COLORS.gray[400]}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: SPACING.sm }]}>
          <Text style={styles.label}>{t('kyc.city')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Paris"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholderTextColor={COLORS.gray[400]}
          />
        </View>
        <View style={[styles.inputContainer, { flex: 1 }]}>
          <Text style={styles.label}>{t('kyc.postal_code')}</Text>
          <TextInput
            style={styles.input}
            placeholder="75001"
            value={formData.postal_code}
            onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
            keyboardType="numeric"
            placeholderTextColor={COLORS.gray[400]}
          />
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Icon name="arrow-left" size={20} color={COLORS.gray[600]} />
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, (!formData.address || !formData.city || !formData.postal_code) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!formData.address || !formData.city || !formData.postal_code || loading}
        >
          {loading ? (
            <Text style={styles.buttonText}>...</Text>
          ) : (
            <>
              <Icon name="check" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>{t('kyc.submit')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Icon name="shield" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{t('kyc.title')}</Text>
          <Text style={styles.subtitle}>{t('kyc.subtitle')}</Text>
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.progressItem}>
              <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
                <Text style={[styles.progressNumber, step >= s && styles.progressNumberActive]}>{s}</Text>
              </View>
              {s < 3 && <View style={[styles.progressLine, step > s && styles.progressLineActive]} />}
            </View>
          ))}
        </View>

        {/* Step Content */}
        <View style={styles.card}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
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
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  progressNumberActive: {
    color: COLORS.white,
  },
  progressLine: {
    width: 48,
    height: 4,
    backgroundColor: COLORS.gray[200],
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  stepContent: {},
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 12,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },
  selectContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  selectOption: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
  },
  selectOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  selectText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  selectTextActive: {
    color: COLORS.primary,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
    marginBottom: SPACING.xs,
  },
  input: {
    height: 52,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: COLORS.black,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.info}10`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  backButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    gap: 8,
  },
  backButtonText: {
    color: COLORS.gray[600],
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
  },
});

export default KYCScreen;
