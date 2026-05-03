import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../utils/colors';
import { formatRwf } from '../../../utils/format';
import api from '../../../utils/api';

interface Group {
  id: string;
  name: string;
  emoji: string;
  contribution_amount: number;
  current_cycle: number;
  total_cycles: number;
}

interface Cycle {
  id: string;
  cycle_number: number;
  status: string;
}

export default function ContributeScreen() {
  const { user } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'momo' | 'airtel'>('momo');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'payment' | 'processing' | 'success'>('payment');

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}`);
      setGroup({
        id: data.id,
        name: data.name,
        emoji: data.emoji,
        contribution_amount: data.contribution_amount,
        current_cycle: data.current_cycle,
        total_cycles: data.total_cycles,
      });
      setActiveCycle(data.activeCycle);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load group');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!group || !activeCycle) return;

    setProcessing(true);
    setStep('processing');

    // Simulate payment processing
    setTimeout(async () => {
      try {
        const { data } = await api.post('/contributions/pay', {
          groupId: group.id,
          cycleId: activeCycle.id,
          method: selectedMethod === 'momo' ? 'MTN MoMo' : 'Airtel Money',
        });

        setStep('success');
        
        setTimeout(() => {
          Alert.alert(
            'Payment Successful!',
            `Your contribution of ${formatRwf(data.amount)} has been received.`,
            [
              {
                text: 'View Group',
                onPress: () => router.replace(`/groups/${group.id}`),
              },
            ]
          );
        }, 2000);
      } catch (error: any) {
        setStep('payment');
        Alert.alert('Payment Failed', error.response?.data?.error || 'Payment could not be processed');
      } finally {
        setProcessing(false);
      }
    }, 3000);
  };

  const renderPaymentStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.paymentHeader}>
        <Text style={styles.groupEmoji}>{group?.emoji}</Text>
        <Text style={styles.groupName}>{group?.name}</Text>
        <Text style={styles.cycleInfo}>
          Cycle {activeCycle?.cycle_number} of {group?.total_cycles}
        </Text>
      </View>

      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Amount Due</Text>
        <Text style={styles.amountValue}>
          {formatRwf(group?.contribution_amount || 0)}
        </Text>
        <Text style={styles.amountDescription}>
          Your contribution for this cycle
        </Text>
      </View>

      <View style={styles.methodSection}>
        <Text style={styles.methodTitle}>Payment Method</Text>
        
        <TouchableOpacity
          style={[
            styles.methodOption,
            selectedMethod === 'momo' && styles.methodOptionSelected,
          ]}
          onPress={() => setSelectedMethod('momo')}
        >
          <View style={styles.methodInfo}>
            <View style={[styles.methodIcon, { backgroundColor: '#FF6600' }]}>
              <MaterialCommunityIcons name="phone" size={24} color={colors.white} />
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodName}>MTN MoMo</Text>
              <Text style={styles.methodDescription}>Pay with Mobile Money</Text>
            </View>
          </View>
          <View style={[
            styles.methodRadio,
            selectedMethod === 'momo' && styles.methodRadioSelected,
          ]}>
            {selectedMethod === 'momo' && (
              <View style={styles.methodRadioInner} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodOption,
            selectedMethod === 'airtel' && styles.methodOptionSelected,
          ]}
          onPress={() => setSelectedMethod('airtel')}
        >
          <View style={styles.methodInfo}>
            <View style={[styles.methodIcon, { backgroundColor: '#ED1C24' }]}>
              <MaterialCommunityIcons name="phone" size={24} color={colors.white} />
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodName}>Airtel Money</Text>
              <Text style={styles.methodDescription}>Pay with Mobile Money</Text>
            </View>
          </View>
          <View style={[
            styles.methodRadio,
            selectedMethod === 'airtel' && styles.methodRadioSelected,
          ]}>
            {selectedMethod === 'airtel' && (
              <View style={styles.methodRadioInner} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.paymentInfo}>
        <Text style={styles.paymentInfoTitle}>Payment Information</Text>
        <Text style={styles.paymentInfoText}>
          • Your phone number: {user?.phone}{'\n'}
          • Payment will be processed immediately{'\n'}
          • You'll receive a confirmation SMS{'\n'}
          • This is a demo - no actual charges
        </Text>
      </View>

      <Button
        onPress={handlePayment}
        disabled={processing}
        style={styles.payButton}
      >
        Confirm & Pay {formatRwf(group?.contribution_amount || 0)}
      </Button>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.processingContent}>
        <View style={styles.processingAnimation}>
          <MaterialCommunityIcons name="cellphone" size={64} color={colors.forestGreen} />
          <View style={styles.processingDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
        
        <Text style={styles.processingTitle}>Processing Payment</Text>
        <Text style={styles.processingMessage}>
          Connecting to {selectedMethod === 'momo' ? 'MTN MoMo' : 'Airtel Money'}...
        </Text>
        <Text style={styles.processingAmount}>
          {formatRwf(group?.contribution_amount || 0)}
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.successContent}>
        <View style={styles.successAnimation}>
          <MaterialCommunityIcons name="check-circle" size={80} color={colors.success} />
        </View>
        
        <Text style={styles.successTitle}>Payment Confirmed!</Text>
        <Text style={styles.successMessage}>
          Your contribution of {formatRwf(group?.contribution_amount || 0)} has been received
        </Text>
        <Text style={styles.successSubtext}>
          Thank you for supporting your Ikimina
        </Text>
        
        <View style={styles.successDetails}>
          <Text style={styles.successDetail}>
            Transaction ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}
          </Text>
          <Text style={styles.successDetail}>
            Method: {selectedMethod === 'momo' ? 'MTN MoMo' : 'Airtel Money'}
          </Text>
          <Text style={styles.successDetail}>
            Time: {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!group || !activeCycle) {
    return (
      <View style={styles.container}>
        <Text>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.forestGreen} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay Contribution</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {step === 'payment' && renderPaymentStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'success' && renderSuccessStep()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  paymentHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  groupEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  cycleInfo: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  amountCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  amountDescription: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  methodSection: {
    marginBottom: 32,
  },
  methodTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 16,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.beigeDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodOptionSelected: {
    borderColor: colors.forestGreen,
    backgroundColor: colors.beige,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.beigeDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadioSelected: {
    borderColor: colors.forestGreen,
  },
  methodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.forestGreen,
  },
  paymentInfo: {
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  paymentInfoText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: colors.forestGreen,
  },
  processingContent: {
    alignItems: 'center',
    padding: 40,
  },
  processingAnimation: {
    alignItems: 'center',
    marginBottom: 32,
  },
  processingDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.forestGreen,
  },
  processingTitle: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  processingMessage: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 16,
  },
  processingAmount: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  successContent: {
    alignItems: 'center',
    padding: 40,
  },
  successAnimation: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.success,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  successDetails: {
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  successDetail: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 4,
  },
});
