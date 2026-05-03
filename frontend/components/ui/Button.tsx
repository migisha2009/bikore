import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../utils/colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ children, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  const buttonStyles = [styles.button, styles[variant], disabled && styles.disabled, style];
  const textStyles = [styles.text, styles[`${variant}Text`], disabled && styles.disabledText];

  return (
    <TouchableOpacity 
      style={buttonStyles} 
      onPress={onPress} 
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={textStyles}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.forestGreen,
  },
  secondary: {
    backgroundColor: colors.beige,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: colors.beigeDeep,
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.forestGreen,
  },
  ghostText: {
    color: colors.forestGreen,
  },
  disabledText: {
    color: colors.textLight,
  },
});
