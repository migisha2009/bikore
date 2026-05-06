import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../utils/colors';
import { formatRwf, initials } from '../../../utils/format';
import api from '../../../utils/api';

interface ReadyCycle {
  id: string;
  groupId: string;
  groupName: string;
  groupEmoji: string;
  cycleNumber: number;
  contributionAmount: number;
  memberCount: number;
  paidCount: number;
  totalAmount: number;
  startDate: string;
  endDate: string;
}

interface Member {
  id: string;
  name: string;
  phone: string;
  avatar_color: string;
  position: number;
  status: string;
}

interface Payout {
  id: string;
  recipientPhone: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  cycleNumber: number;
  groupName: string;
}

export default function PayoutScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [readyCycles, setReadyCycles] = useState<ReadyCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<ReadyCycle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'momo' | 'airtel'>('momo');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [success, setSuccess] = useState(false);
  const [payoutData, setPayoutData] = useState<Payout | null>(null);

  useEffect(() => {
    fetchReadyCycles();
  }, []);

  useEffect(() => {
    if (selectedCycle) {
      fetchMembers();
    }
  }, [selectedCycle]);

  const fetchReadyCycles = async () => {
    try {
      const { data } = await api.get('/payouts/ready');
      const cycles = data.filter((cycle: ReadyCycle) => cycle.groupId === id);
      setReadyCycles(cycles);
    } catch (error) {
      console.error('Error fetching ready cycles:', error);
    }
  };

  const fetchMembers = async () => {
    if (!selectedCycle) return;
    
    try {
      const { data } = await api.get(`/groups/${id}/members`);
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleConfirmPayout = async () => {
    if (!selectedCycle || !recipientPhone) {
      Alert.alert('Error', 'Please select a cycle and enter recipient phone number');
      return;
    }

    setConfirming(true);
    try {
      const { data } = await api.post('/payouts/confirm', {
        cycleId: selectedCycle.id,
        groupId: selectedCycle.groupId,
        method: payoutMethod,
        phone: recipientPhone
      });

      setPayoutData(data.payout);
      setSuccess(true);
      
      // Refresh ready cycles
      await fetchReadyCycles();
      setSelectedCycle(null);
      setMembers([]);
      setRecipientPhone('');
      
    } catch (error: any) {
      console.error('Error confirming payout:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to confirm payout');
    } finally {
      setConfirming(false);
    }
  };

  const renderReadyCycles = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ready for Payout</Text>
      <Text style={styles.sectionSubtitle}>
        Cycles where all members have completed their contributions
      </Text>
      
      {readyCycles.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="clock" size={48} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No cycles ready for payout</Text>
          <Text style={styles.emptyMessage}>
            All cycles are still in progress or some members haven't completed their contributions.
          </Text>
        </View>
      ) : (
        readyCycles.map((cycle) => (
          <TouchableOpacity
            key={cycle.id}
            style={[
              styles.cycleCard,
              selectedCycle?.id === cycle.id && styles.cycleCardSelected
            ]}
            onPress={() => setSelectedCycle(cycle)}
          >
            <View style={styles.cycleHeader}>
              <Text style={styles.cycleEmoji}>{cycle.groupEmoji}</Text>
              <View style={styles.cycleInfo}>
                <Text style={styles.cycleName}>{cycle.groupName}</Text>
                <Text style={styles.cycleDetails}>
                  Cycle #{cycle.cycleNumber} • {cycle.memberCount} members
                </Text>
                <Text style={styles.cycleAmount}>
                  Total: {formatRwf(cycle.totalAmount)}
                </Text>
              </View>
              <View style={styles.cycleStatus}>
                <Text style={styles.paidCount}>
                  {cycle.paidCount}/{cycle.memberCount} paid
                </Text>
                <MaterialCommunityIcons 
                  name={cycle.paidCount === cycle.memberCount ? "check-circle" : "clock"} 
                  size={20} 
                  color={cycle.paidCount === cycle.memberCount ? colors.success : colors.mustard} 
                />
              </View>
            </View>
            
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${(cycle.paidCount / cycle.memberCount) * 100}%` }
              ]} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderPayoutForm = () => {
    if (!selectedCycle) return null;

    const paidMembers = members.filter(m => m.status === 'active');
    const recipient = paidMembers.find(m => m.position === 1); // Next in rotation

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confirm Payout</Text>
        <Text style={styles.sectionSubtitle}>
          Send {formatRwf(selectedCycle.totalAmount)} to the next recipient in rotation
        </Text>

        <View style={styles.recipientCard}>
          <Text style={styles.recipientTitle}>Next Recipient</Text>
          {recipient ? (
            <View style={styles.recipientInfo}>
              <View style={[styles.avatar, { backgroundColor: recipient.avatar_color }]}>
                <Text style={styles.avatarText}>
                  {initials(recipient.name)}
                </Text>
              </View>
              <View style={styles.recipientDetails}>
                <Text style={styles.recipientName}>{recipient.name}</Text>
                <Text style={styles.recipientPhone}>{recipient.phone}</Text>
                <Text style={styles.recipientPosition}>Position #{recipient.position}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noRecipient}>No recipient available</Text>
          )}
        </View>

        <View style={styles.methodSection}>
          <Text style={styles.methodTitle}>Payment Method</Text>
          <View style={styles.methodButtons}>
            <TouchableOpacity
              style={[styles.methodButton, payoutMethod === 'momo' && styles.methodButtonActive]}
              onPress={() => setPayoutMethod('momo')}
            >
              <MaterialCommunityIcons name="cellphone" size={20} color={payoutMethod === 'momo' ? colors.white : colors.textMid} />
              <Text style={[
                styles.methodText,
                payoutMethod === 'momo' && styles.methodTextActive
              ]}>
                MTN MoMo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.methodButton, payoutMethod === 'airtel' && styles.methodButtonActive]}
              onPress={() => setPayoutMethod('airtel')}
            >
              <MaterialCommunityIcons name="cellphone" size={20} color={payoutMethod === 'airtel' ? colors.white : colors.textMid} />
              <Text style={[
                styles.methodText,
                payoutMethod === 'airtel' && styles.methodTextActive
              ]}>
                Airtel Money
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.phoneSection}>
          <Text style={styles.phoneLabel}>Recipient Phone</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="+250 7XX XXX XXX"
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            keyboardType="phone-pad"
            editable={!!recipient}
          />
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Members Paid:</Text>
            <Text style={styles.summaryValue}>{selectedCycle.paidCount}/{selectedCycle.memberCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryValue}>{formatRwf(selectedCycle.totalAmount)}</Text>
          </View>
        </View>

        <Button
          onPress={handleConfirmPayout}
          disabled={confirming || !recipient || !recipientPhone}
          style={styles.confirmButton}
        >
          {confirming ? 'Processing...' : 'Confirm Payout'}
        </Button>
      </View>
    );
  };

  const renderSuccess = () => {
    if (!payoutData) return null;

    return (
      <View style={styles.section}>
        <View style={styles.successCard}>
          <MaterialCommunityIcons name="check-circle" size={64} color={colors.success} />
          <Text style={styles.successTitle}>Payout Confirmed!</Text>
          <Text style={styles.successMessage}>
            {formatRwf(payoutData.amount)} sent to {payoutData.recipientPhone}
          </Text>
          <Button
            onPress={() => router.back()}
            variant="secondary"
            style={styles.backButton}
          >
            Back to Payouts
          </Button>
        </View>
      </View>
    );
  };

  if (success) {
    return renderSuccess();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payout Management</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderReadyCycles()}
        {selectedCycle && renderPayoutForm()}
      </ScrollView>
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
    padding: 24,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
    marginTop: 16,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    color: colors.forestGreen,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    lineHeight: 20,
  },
  cycleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cycleCardSelected: {
    borderColor: colors.forestGreen,
    borderWidth: 2,
  },
  cycleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cycleEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  cycleInfo: {
    flex: 1,
  },
  cycleName: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  cycleDetails: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 4,
  },
  cycleAmount: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.forestGreen,
  },
  cycleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidCount: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginRight: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.beigeDeep,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  recipientCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  recipientTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginBottom: 16,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 2,
  },
  recipientPhone: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 2,
  },
  recipientPosition: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mustard,
  },
  noRecipient: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    fontStyle: 'italic',
  },
  methodSection: {
    marginBottom: 24,
  },
  methodTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    backgroundColor: colors.white,
  },
  methodButtonActive: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  methodText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginLeft: 8,
  },
  methodTextActive: {
    color: colors.white,
  },
  phoneSection: {
    marginBottom: 24,
  },
  phoneLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  phoneInput: {
    backgroundColor: colors.beige,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  summarySection: {
    backgroundColor: colors.beige,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
  },
  confirmButton: {
    backgroundColor: colors.mustard,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.success,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 18,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 24,
  },
});
