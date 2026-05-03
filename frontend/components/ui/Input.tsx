import React from 'react';
import { TextInput, View, StyleSheet, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../../utils/colors';

interface InputProps extends TextInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  style?: TextStyle;
  containerStyle?: ViewStyle;
}

export function Input({ 
  placeholder, 
  value, 
  onChangeText, 
  secureTextEntry = false, 
  style, 
  containerStyle,
  ...props 
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, style]}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
  },
});
