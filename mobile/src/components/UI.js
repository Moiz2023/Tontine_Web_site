import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../config';

export const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.gray[300];
    switch (variant) {
      case 'primary': return COLORS.primary;
      case 'secondary': return COLORS.secondary;
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      default: return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.gray[500];
    switch (variant) {
      case 'primary': return COLORS.white;
      case 'secondary': return COLORS.white;
      case 'outline': return COLORS.primary;
      case 'ghost': return COLORS.gray[700];
      default: return COLORS.white;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 8, paddingHorizontal: 16 };
      case 'md': return { paddingVertical: 14, paddingHorizontal: 24 };
      case 'lg': return { paddingVertical: 18, paddingHorizontal: 32 };
      default: return { paddingVertical: 14, paddingHorizontal: 24 };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getPadding(),
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && { borderWidth: 1.5, borderColor: COLORS.primary },
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const Input = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  style,
  leftIcon,
  error,
}) => {
  return (
    <View style={styles.inputContainer}>
      {leftIcon && <View style={styles.inputIcon}>{leftIcon}</View>}
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={COLORS.gray[400]}
        style={[
          styles.input,
          leftIcon && { paddingLeft: 48 },
          error && { borderColor: COLORS.error },
          style,
        ]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

export const Card = ({ children, style, onPress }) => {
  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {children}
    </Component>
  );
};

import { View, TextInput } from 'react-native';

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  input: {
    height: 52,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: COLORS.black,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
