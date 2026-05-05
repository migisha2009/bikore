import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors } from '../../utils/colors';
import { formatRwf } from '../../utils/format';
import api from '../../utils/api';

interface Contribution {
  id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string;
  group_name: string;
  cycle_number: number;
}

interface PaymentSummary {
  totalContributed: number;
  pendingPayments: number;
  activeGroups: number;
}

interface PendingPayment {
  id: string;
  group_id: string;
  group_name: string;
  amount: number;
  cycle_number: number;
  due_date: string;
  late_penalty?: number;
  total_amount?: number;
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'airtel'>('momo');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'phone' | 'pin' | 'processing' | 'success' | 'error'>('method');

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      const [summaryRes, contributionsRes, pendingRes] = await Promise.all([
        api.get('/payments/summary'),
        api.get('/payments/history'),
        api.get('/payments/pending')
      ]);
      
      setSummary(summaryRes.data);
      setContributions(contributionsRes.data);
      setPendingPayments(pendingRes.data);
    } catch (error: any) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'pending': return colors.mustard;
      default: return colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return 'check-circle';
      case 'pending': return 'clock';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handlePayNow = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setPaymentModalVisible(true);
    setPaymentStep('method');
    setPhoneNumber('');
    setPin('');
    setPaymentMethod('momo');
  };

  const handlePaymentMethod = (method: 'momo' | 'airtel') => {
    setPaymentMethod(method);
    setPaymentStep('phone');
  };

  const handlePhoneSubmit = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    setPaymentStep('pin');
  };

  const handlePinSubmit = async () => {
    if (!pin || pin.length < 4) {
      Alert.alert('Error', 'Please enter a valid PIN');
      return;
    }

    setPaymentStep('processing');
    setPaymentProcessing(true);

    try {
      // Initiate payment
      const { data: initiateData } = await api.post('/payments/initiate', {
        amount: selectedPayment!.amount,
        method: paymentMethod,
        phone_number: phoneNumber,
        pin: pin,
        group_id: selectedPayment!.group_id,
        cycle_number: selectedPayment!.cycle_number
      });

      // Check payment status
      const checkStatus = async (reference: string, attempts = 0) => {
        if (attempts >= 10) {
          setPaymentStep('error');
          setPaymentProcessing(false);
          return;
        }

        try {
          const { data } = await api.post('/payments/confirm', { reference });
          
          if (data.status === 'success') {
            setPaymentStep('success');
            setPaymentProcessing(false);
            fetchPaymentData(); // Refresh payment data
          } else if (data.status === 'pending') {
            setTimeout(() => checkStatus(reference, attempts + 1), 2000);
          } else {
            setPaymentStep('error');
            setPaymentProcessing(false);
          }
        } catch (error) {
          if (attempts >= 9) {
            setPaymentStep('error');
            setPaymentProcessing(false);
          } else {
            setTimeout(() => checkStatus(reference, attempts + 1), 2000);
          }
        }
      };

      checkStatus(initiateData.reference);
    } catch (error: any) {
      setPaymentStep('error');
      setPaymentProcessing(false);
      Alert.alert('Error', error.response?.data?.error || 'Payment failed');
    }
  };

  const handlePaymentClose = () => {
    setPaymentModalVisible(false);
    setSelectedPayment(null);
    setPaymentStep('method');
    setPhoneNumber('');
    setPin('');
    setPaymentProcessing(false);
  };

  const renderPaymentModal = () => {
    if (!selectedPayment) return null;

    return (
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handlePaymentClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handlePaymentClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Make Payment</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {paymentStep === 'method' && (
              <View style={styles.stepContent}>
                <View style={styles.paymentSummary}>
                  <Text style={styles.paymentGroup}>{selectedPayment.group_name}</Text>
                  <Text style={styles.paymentAmount}>{formatRwf(selectedPayment.amount)}</Text>
                  <Text style={styles.paymentDetails}>Cycle {selectedPayment.cycle_number}</Text>
                </View>

                <Text style={styles.stepTitle}>Select Payment Method</Text>
                
                <TouchableOpacity
                  style={[styles.methodCard, paymentMethod === 'momo' && styles.methodCardSelected]}
                  onPress={() => handlePaymentMethod('momo')}
                >
                  <View style={styles.methodContent}>
                    <MaterialCommunityIcons name="cellphone" size={32} color={colors.mustard} />
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodName}>MTN MoMo</Text>
                      <Text style={styles.methodDescription}>Pay with Mobile Money</Text>
                    </View>
                    <MaterialCommunityIcons 
                      name={paymentMethod === 'momo' ? 'check-circle' : 'circle-outline'} 
                      size={24} 
                      color={paymentMethod === 'momo' ? colors.forestGreen : colors.textLight} 
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodCard, paymentMethod === 'airtel' && styles.methodCardSelected]}
                  onPress={() => handlePaymentMethod('airtel')}
                >
                  <View style={styles.methodContent}>
                    <MaterialCommunityIcons name="cellphone" size={32} color={colors.mustard} />
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodName}>Airtel Money</Text>
                      <Text style={styles.methodDescription}>Pay with Mobile Money</Text>
                    </View>
                    <MaterialCommunityIcons 
                      name={paymentMethod === 'airtel' ? 'check-circle' : 'circle-outline'} 
                      size={24} 
                      color={paymentMethod === 'airtel' ? colors.forestGreen : colors.textLight} 
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {paymentStep === 'phone' && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Enter Phone Number</Text>
                <Text style={styles.stepSubtitle}>
                  Enter your {paymentMethod === 'momo' ? 'MTN MoMo' : 'Airtel Money'} phone number
                </Text>

                <Input
                  placeholder="0788123456"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.phoneInput}
                />

                <Button onPress={handlePhoneSubmit} style={styles.continueButton}>
                  Continue
                </Button>
              </View>
            )}

            {paymentStep === 'pin' && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Enter PIN</Text>
                <Text style={styles.stepSubtitle}>
                  Enter your {paymentMethod === 'momo' ? 'MTN MoMo' : 'Airtel Money'} PIN
                </Text>

                <Input
                  placeholder="****"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  style={styles.pinInput}
                />

                <Button onPress={handlePinSubmit} disabled={paymentProcessing} style={styles.continueButton}>
                  {paymentProcessing ? 'Processing...' : `Pay ${formatRwf(selectedPayment.amount)}`}
                </Button>
              </View>
            )}

            {paymentStep === 'processing' && (
              <View style={styles.stepContent}>
                <View style={styles.processingAnimation}>
                  <MaterialCommunityIcons name="cellphone" size={64} color={colors.forestGreen} />
                  <Text style={styles.processingText}>Processing Payment...</Text>
                  <Text style={styles.processingSubtext}>
                    Please wait while we process your {paymentMethod === 'momo' ? 'MTN MoMo' : 'Airtel Money'} payment
                  </Text>
                </View>
              </View>
            )}

            {paymentStep === 'success' && (
              <View style={styles.stepContent}>
                <View style={styles.successAnimation}>
                  <MaterialCommunityIcons name="check-circle" size={64} color={colors.success} />
                  <Text style={styles.successText}>Payment Successful!</Text>
                  <Text style={styles.successSubtext}>
                    Your payment of {formatRwf(selectedPayment.amount)} has been processed successfully
                  </Text>
                </View>
                <Button onPress={handlePaymentClose} style={styles.doneButton}>
                  Done
                </Button>
              </View>
            )}

            {paymentStep === 'error' && (
              <View style={styles.stepContent}>
                <View style={styles.errorAnimation}>
                  <MaterialCommunityIcons name="close-circle" size={64} color={colors.error} />
                  <Text style={styles.errorText}>Payment Failed</Text>
                  <Text style={styles.errorSubtext}>
                    We couldn't process your payment. Please try again.
                  </Text>
                </View>
                <View style={styles.errorActions}>
                  <Button onPress={() => setPaymentStep('method')} variant="secondary" style={styles.retryButton}>
                    Try Again
                  </Button>
                  <Button onPress={handlePaymentClose} style={styles.cancelButton}>
                    Cancel
                  </Button>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSub}>Track your contributions</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        {summary && (
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.forestGreen} />
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryValue}>{formatRwf(summary.totalContributed)}</Text>
                  <Text style={styles.summaryLabel}>Total Contributed</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.smallCard]}>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="account-group" size={20} color={colors.forestGreen} />
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryValue}>{summary.activeGroups}</Text>
                    <Text style={styles.summaryLabel}>Active Groups</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.summaryCard, styles.smallCard]}>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="clock" size={20} color={colors.mustard} />
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryValue}>{summary.pendingPayments}</Text>
                    <Text style={styles.summaryLabel}>Pending</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Pending Payments</Text>
            
            {pendingPayments.map((payment) => (
              <View key={payment.id} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingGroup}>{payment.group_name}</Text>
                    <Text style={styles.pendingDetails}>
                      Cycle {payment.cycle_number} • Due {formatDate(payment.due_date)}
                    </Text>
                    {payment.late_penalty && payment.late_penalty > 0 && (
                      <View style={styles.penaltyBadge}>
                        <Text style={styles.penaltyText}>+Rwf {formatRwf(payment.late_penalty)} penalty</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.pendingAmount}>
                    <View style={styles.amountSection}>
                      <Text style={styles.amount}>{formatRwf(payment.amount)}</Text>
                      {payment.late_penalty && payment.late_penalty > 0 && (
                        <Text style={styles.penaltySubtext}>+ Rwf {formatRwf(payment.late_penalty)} penalty</Text>
                      )}
                    </View>
                    <Button onPress={() => handlePayNow(payment)} style={styles.payNowButton}>
                      Pay Now
                    </Button>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Payment History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          
          {contributions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="receipt" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptySub}>Your contribution history will appear here</Text>
            </View>
          ) : (
            contributions.map((contribution) => (
              <View key={contribution.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentGroup}>{contribution.group_name}</Text>
                    <Text style={styles.paymentDetails}>
                      Cycle {contribution.cycle_number} • {formatDate(contribution.paid_at)}
                    </Text>
                  </View>
                  <View style={styles.paymentAmount}>
                    <Text style={styles.amount}>{formatRwf(contribution.amount)}</Text>
                  </View>
                </View>
                
                <View style={styles.paymentFooter}>
                  <View style={styles.paymentMethod}>
                    <MaterialCommunityIcons name="phone" size={16} color={colors.textMid} />
                    <Text style={styles.methodText}>{contribution.method}</Text>
                  </View>
                  <View style={styles.paymentStatus}>
                    <MaterialCommunityIcons 
                      name={getStatusIcon(contribution.status)} 
                      size={16} 
                      color={getStatusColor(contribution.status)} 
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(contribution.status) }]}>
                      {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      
      {renderPaymentModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  summarySection: {
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  smallCard: {
    flex: 1,
    padding: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.textMid,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  paymentCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentGroup: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  paymentDetails: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginLeft: 4,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    marginLeft: 4,
  },
  // Pending payments styles
  pendingSection: {
    marginBottom: 32,
  },
  pendingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.mustard,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingGroup: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  pendingDetails: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  pendingAmount: {
    alignItems: 'flex-end',
  },
  payNowButton: {
    marginTop: 8,
  },
  // Payment modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.beigeDeep,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    paddingVertical: 24,
  },
  paymentSummary: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
    stepTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 24,
  },
  methodCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.beigeDeep,
  },
  methodCardSelected: {
    borderColor: colors.forestGreen,
    backgroundColor: colors.forestGreen + '10',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
    marginLeft: 16,
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
  phoneInput: {
    marginBottom: 24,
  },
  pinInput: {
    marginBottom: 24,
  },
  continueButton: {
    marginBottom: 16,
  },
  processingAnimation: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginTop: 16,
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  successAnimation: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successText: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.success,
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  doneButton: {
    marginTop: 24,
  },
  errorAnimation: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  retryButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  // Penalty styles
  penaltyBadge: {
    backgroundColor: colors.error,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  penaltyText: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
  },
  penaltySubtext: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginTop: 2,
  },
  amountSection: {
    alignItems: 'flex-end',
  },
});