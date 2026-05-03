import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name, phone, password);
      router.replace('/(app)');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.error || 'Something went wrong');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Bikore community</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Amina Uwimana"
            placeholderTextColor="#8A9B8C"
            value={name}
            onChangeText={setName}
          />

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
              placeholder="At least 6 characters"
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

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Repeat your password"
              placeholderTextColor="#8A9B8C"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#F5F0E8" />
              : <Text style={styles.registerBtnText}>Create Account</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.privacyText}>
          🔒 Your data is BNR regulated and encrypted
        </Text>
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
    marginTop: 48,
    marginBottom: 32,
  },
  logo: { fontSize: 56, marginBottom: 12 },
  title: {
    fontSize: 32,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C4A2E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#4A5C4C',
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
  registerBtn: {
    backgroundColor: '#2C4A2E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  registerBtnText: {
    color: '#F5F0E8',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'DMSans_700Bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#4A5C4C',
  },
  link: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C9922A',
  },
  privacyText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#8A9B8C',
    textAlign: 'center',
    marginBottom: 24,
  },
});