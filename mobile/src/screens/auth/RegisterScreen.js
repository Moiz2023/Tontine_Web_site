import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>TF</Text>
            </View>
            <Text style={styles.appName}>TrustFundy</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('auth.register_title')}</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Icon name="user" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.name')}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="mail" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.email')}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="phone" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.phone')}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="lock" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.password')}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                placeholderTextColor={COLORS.gray[400]}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.gray[400]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.buttonText}>...</Text>
              ) : (
                <Text style={styles.buttonText}>{t('auth.register_btn')}</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity style={styles.googleButton}>
              <Icon name="chrome" size={20} color={COLORS.gray[700]} />
              <Text style={styles.googleButtonText}>{t('auth.google_btn')}</Text>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.has_account')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}> {t('auth.login_btn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  logoText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: SPACING.md,
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
  },
  input: {
    height: 52,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 48,
    fontSize: 16,
    color: COLORS.black,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: COLORS.gray[500],
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.gray[200],
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray[700],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.gray[600],
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default RegisterScreen;
