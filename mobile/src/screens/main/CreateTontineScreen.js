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
import Icon from 'react-native-vector-icons/Feather';
import { useLanguage } from '../../context/LanguageContext';
import { tontineAPI } from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const CreateTontineScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthly_amount: 100,
    max_participants: 6,
    duration_months: 6,
    start_date: new Date().toISOString().split('T')[0],
    attribution_mode: 'fixed',
    min_trust_score: 30,
  });

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await tontineAPI.create(formData);
      Alert.alert('Succès', 'Tontine créée avec succès !');
      navigation.navigate('TontineDetail', { id: response.data.tontine_id });
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const amounts = [50, 100, 150, 200, 300, 500];
  const participants = [4, 5, 6, 8, 10, 12];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('tontine.create_title')}</Text>
          <Text style={styles.subtitle}>Étape {step} sur 3</Text>
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.progressItem}>
              <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
                {step > s ? (
                  <Icon name="check" size={16} color={COLORS.white} />
                ) : (
                  <Text style={[styles.progressNumber, step >= s && styles.progressNumberActive]}>{s}</Text>
                )}
              </View>
              {s < 3 && <View style={[styles.progressLine, step > s && styles.progressLineActive]} />}
            </View>
          ))}
        </View>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('tontine.name')}</Text>
              <TextInput
                style={styles.input}
                placeholder="Ma Tontine 2025"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('tontine.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optionnel)"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, !formData.name && styles.buttonDisabled]}
              onPress={() => setStep(2)}
              disabled={!formData.name}
            >
              <Text style={styles.buttonText}>{t('common.next')}</Text>
              <Icon name="arrow-right" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Financial */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('tontine.monthly_amount')}</Text>
              <View style={styles.optionsGrid}>
                {amounts.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.option, formData.monthly_amount === amount && styles.optionActive]}
                    onPress={() => setFormData({ ...formData, monthly_amount: amount })}
                  >
                    <Text style={[styles.optionText, formData.monthly_amount === amount && styles.optionTextActive]}>
                      {amount}€
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('tontine.max_participants')}</Text>
              <View style={styles.optionsGrid}>
                {participants.map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[styles.option, formData.max_participants === num && styles.optionActive]}
                    onPress={() => setFormData({ ...formData, max_participants: num, duration_months: num })}
                  >
                    <Text style={[styles.optionText, formData.max_participants === num && styles.optionTextActive]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total par tour</Text>
              <Text style={styles.summaryValue}>
                {formData.monthly_amount * formData.max_participants}€
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                <Icon name="arrow-left" size={20} color={COLORS.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
                <Text style={styles.buttonText}>{t('common.next')}</Text>
                <Icon name="arrow-right" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Mode & Confirm */}
        {step === 3 && (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mode d'attribution</Text>
              {[
                { value: 'fixed', label: t('tontine.mode_fixed'), icon: 'list' },
                { value: 'random', label: t('tontine.mode_random'), icon: 'shuffle' },
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[styles.modeOption, formData.attribution_mode === mode.value && styles.modeOptionActive]}
                  onPress={() => setFormData({ ...formData, attribution_mode: mode.value })}
                >
                  <Icon 
                    name={mode.icon} 
                    size={24} 
                    color={formData.attribution_mode === mode.value ? COLORS.primary : COLORS.gray[500]} 
                  />
                  <Text style={[styles.modeText, formData.attribution_mode === mode.value && styles.modeTextActive]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary */}
            <View style={styles.finalSummary}>
              <Text style={styles.summaryTitle}>Récapitulatif</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Nom</Text>
                <Text style={styles.summaryValue}>{formData.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Montant</Text>
                <Text style={styles.summaryValue}>{formData.monthly_amount}€/mois</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Participants</Text>
                <Text style={styles.summaryValue}>{formData.max_participants}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total par tour</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primary, fontSize: 20 }]}>
                  {formData.monthly_amount * formData.max_participants}€
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
                <Icon name="arrow-left" size={20} color={COLORS.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, loading && styles.buttonDisabled]}
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.buttonText}>...</Text>
                ) : (
                  <>
                    <Icon name="check" size={20} color={COLORS.white} />
                    <Text style={styles.buttonText}>{t('tontine.create_btn')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginTop: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  progressNumberActive: {
    color: COLORS.white,
  },
  progressLine: {
    width: 40,
    height: 3,
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
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.sm,
  },
  input: {
    height: 52,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: COLORS.black,
  },
  textArea: {
    height: 100,
    paddingTop: SPACING.md,
    textAlignVertical: 'top',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  option: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  optionActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  optionTextActive: {
    color: COLORS.primary,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    marginBottom: SPACING.sm,
    gap: 12,
  },
  modeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  modeText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  modeTextActive: {
    color: COLORS.primary,
  },
  summaryBox: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  finalSummary: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
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
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
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
  createButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default CreateTontineScreen;
