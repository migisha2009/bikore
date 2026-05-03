import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';
import { initials } from '../../utils/format';

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
}

export function Avatar({ name, size = 40, color }: AvatarProps) {
  const avatarColor = color || colors.forestGreen;
  const avatarInitials = initials(name);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatarColor,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size / 2 }]}>
        {avatarInitials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: 'DMSans_600SemiBold',
  },
});
