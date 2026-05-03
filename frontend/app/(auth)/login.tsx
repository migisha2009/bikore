import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors } from '../../utils/colors';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setPhone('+250788100001');
    setPassword('password123');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🍃</Text>
        <Text style={styles.brandName}>Bikore</Text>
        <Text style={styles.tagline}>Save Together, Grow Together</Text>
      </View>

      <View style={styles.form}>
        <Input
          placeholder="Phone number (+250...)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          onPress={handleLogin}
          disabled={loading}
          style={styles.loginButton}
        >
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <TouchableOpacity onPress={handleDemoLogin} style={styles.demoButton}>
          <Text style={styles.demoText}>Use Demo Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 60,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 36,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  loginButton: {
    marginTop: 24,
  },
  demoButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  demoText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  link: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.mustard,
  },
});
