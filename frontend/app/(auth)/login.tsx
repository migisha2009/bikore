import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(phone, password);
      router.replace('/(app)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Check your phone/password and try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.brandName}>Bikore</Text>
          <Text style={styles.tagline}>Save Together, Grow Together</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+250 788 000 000"
            placeholderTextColor="#8A9B8C"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter password"
              placeholderTextColor="#8A9B8C"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#F5F0E8" />
              : <Text style={styles.loginBtnText}>Login</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => { setPhone('+250788100001'); setPassword('password123'); }}
          >
            <Text style={styles.demoBtnText}>Use Demo Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F0E8',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 48,
  },
  logo: { fontSize: 72, marginBottom: 12 },
  brandName: {
    fontSize: 40,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C4A2E',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#4A5C4C',
    textAlign: 'center',
  },
  form: { flex: 1 },
  label: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#2C4A2E',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#EDE8DC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#1C2B1E',
    borderWidth: 1,
    borderColor: '#E0D9CC',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    backgroundColor: '#EDE8DC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0D9CC',
  },
  eyeText: { fontSize: 18 },
  loginBtn: {
    backgroundColor: '#2C4A2E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  loginBtnText: {
    color: '#F5F0E8',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
  },
  demoBtn: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  demoBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#8A9B8C',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#4A5C4C',
  },
  link: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#C9922A',
    fontWeight: 'bold',
  },
});