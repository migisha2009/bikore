import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api/auth';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const handleSendOTP = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/forgot-password`, { phone });
      setStep(2);
      setResendCountdown(60);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/verify-otp`, { phone, otp: otpString });
      setResetToken(response.data.resetToken);
      setStep(3);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/forgot-password`, { phone });
      setResendCountdown(60);
      Alert.alert('Success', 'OTP resent successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/reset-password`, {
        resetToken,
        newPassword
      });
      Alert.alert('Success', 'Password updated successfully!', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = `otp-${index + 1}`;
      // Note: In a real implementation, you'd use refs for this
    }
  };

  const renderStep1 = () => (
    <View style={styles.form}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your phone number to receive a verification code</Text>

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

      <TouchableOpacity
        style={styles.button}
        onPress={handleSendOTP}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#F5F0E8" />
          : <Text style={styles.buttonText}>Send OTP</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.form}>
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            style={[styles.otpInput, { borderColor: digit ? '#2C4A2E' : '#E0D9CC' }]}
            value={digit}
            onChangeText={(value) => handleOTPChange(value, index)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            secureTextEntry={false}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#F5F0E8" />
          : <Text style={styles.buttonText}>Verify Code</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendLink}
        onPress={handleResendOTP}
        disabled={resendCountdown > 0 || loading}
      >
        <Text style={[styles.linkText, { opacity: resendCountdown > 0 ? 0.5 : 1 }]}>
          {resendCountdown > 0 ? `Resend Code (${resendCountdown}s)` : 'Resend Code'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.form}>
      <Text style={styles.title}>Set New Password</Text>

      <Text style={styles.label}>New Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Enter new password"
          placeholderTextColor="#8A9B8C"
          value={newPassword}
          onChangeText={setNewPassword}
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
          placeholder="Confirm new password"
          placeholderTextColor="#8A9B8C"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeBtn}
        >
          <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#F5F0E8" />
          : <Text style={styles.buttonText}>Update Password</Text>
        }
      </TouchableOpacity>
    </View>
  );

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
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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
  },
  form: { flex: 1 },
  title: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C4A2E',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#4A5C4C',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
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
  button: {
    backgroundColor: '#2C4A2E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: {
    color: '#F5F0E8',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    fontWeight: 'bold',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#C9922A',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 32,
  },
  otpInput: {
    backgroundColor: '#EDE8DC',
    borderRadius: 12,
    width: 45,
    height: 55,
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: '#1C2B1E',
    borderWidth: 2,
    textAlign: 'center',
  },
});
