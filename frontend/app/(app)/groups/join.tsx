import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors } from '../../../utils/colors';
import { formatRwf } from '../../../utils/format';
import api from '../../../utils/api';

interface GroupPreview {
  id: string;
  name: string;
  emoji: string;
  description: string;
  contribution_amount: number;
  cycle_duration: string;
  total_cycles: number;
  max_members: number;
  member_count: number;
  rules?: string;
  requires_approval?: boolean;
  admin_name?: string;
}

export default function JoinGroupScreen() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupPreview, setGroupPreview] = useState<GroupPreview | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [messageToAdmin, setMessageToAdmin] = useState('');

  const formatInviteCode = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return cleaned.slice(0, 8);
  };

  const handleSearch = async () => {
    if (inviteCode.length !== 8) {
      Alert.alert('Error', 'Please enter a valid 8-character invite code');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/groups/preview/${inviteCode}`);
      setGroupPreview(data);
      setStep(2); // Move to group preview step
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to find group');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!groupPreview) return;
    
    if (!agreedToRules) {
      Alert.alert('Error', 'You must agree to the group rules to continue');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/groups/request-join', { 
        inviteCode: inviteCode,
        message: messageToAdmin,
        agreedToRules: true
      });
      setStep(3); // Move to request sent step
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Join a Group</Text>
      <Text style={styles.stepSubtitle}>
        Enter the invite code shared by the group admin
      </Text>

      <View style={styles.inputSection}>
        <Input
          placeholder="XXXXXXXX"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(formatInviteCode(text))}
          style={styles.inviteInput}
          textAlign="center"
          autoCapitalize="characters"
          maxLength={8}
        />
        
        <Text style={styles.inputHint}>
          Invite codes are 8 characters long
        </Text>
      </View>

      <Button
        onPress={handleSearch}
        disabled={loading || inviteCode.length < 8}
        style={styles.searchButton}
      >
        {loading ? 'Finding...' : 'Find Group'}
      </Button>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Group Preview & Rules Agreement</Text>
      
      {groupPreview && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewEmoji}>{groupPreview.emoji}</Text>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{groupPreview.name}</Text>
              <Text style={styles.previewDetails}>
                Admin: {groupPreview.admin_name}
              </Text>
            </View>
          </View>

          {groupPreview.description && (
            <Text style={styles.previewDescription}>
              {groupPreview.description}
            </Text>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: colors.mustard }]}>
                {formatRwf(groupPreview.contribution_amount)}
              </Text>
              <Text style={styles.infoLabel}>Per cycle</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{groupPreview.member_count}</Text>
              <Text style={styles.infoLabel}>Members</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{groupPreview.cycle_duration}</Text>
              <Text style={styles.infoLabel}>Cycle duration</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{groupPreview.total_cycles}</Text>
              <Text style={styles.infoLabel}>Total cycles</Text>
            </View>
          </View>

          {groupPreview.rules && (
            <View style={styles.rulesSection}>
              <Text style={styles.rulesTitle}>Group Rules</Text>
              <Text style={styles.rulesText}>{groupPreview.rules}</Text>
            </View>
          )}

          <View style={styles.agreementSection}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToRules(!agreedToRules)}
            >
              <View style={[styles.checkbox, agreedToRules && styles.checkboxChecked]}>
                {agreedToRules && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read and agree to the group rules
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Introduce yourself to the admin (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Tell the admin why you'd like to join..."
              value={messageToAdmin}
              onChangeText={setMessageToAdmin}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your request will be reviewed by the group admin
            </Text>
          </View>
        </View>
      )}

      <View style={styles.previewActions}>
        <Button
          onPress={() => setStep(1)}
          variant="secondary"
          style={styles.backButton}
        >
          Back
        </Button>
        <Button
          onPress={handleSendRequest}
          disabled={loading || !agreedToRules}
          style={styles.joinButton}
        >
          {loading ? 'Sending...' : 'Send Join Request'}
        </Button>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.successContent}>
        <Text style={styles.successEmoji}>⏳</Text>
        <Text style={styles.successTitle}>Request Sent!</Text>
        <Text style={styles.successMessage}>
          Your request to join {groupPreview?.name} has been sent to the admin. You will receive an SMS when approved.
        </Text>
        
        <View style={styles.successActions}>
          <Button
            onPress={() => router.back()}
            style={styles.backToGroupsButton}
          >
            Back to Groups
          </Button>
          <Button
            onPress={() => router.push('/groups/requests')}
            variant="secondary"
            style={styles.viewRequestsButton}
          >
            View My Requests
          </Button>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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
    padding: 24,
    paddingBottom: 16,
  },
  headerBackButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    color: colors.forestGreen,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 24,
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
    marginBottom: 32,
  },
  inputSection: {
    marginBottom: 32,
  },
  inviteInput: {
    backgroundColor: colors.beige,
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 8,
    textAlign: 'center',
    height: 60,
  },
  inputHint: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
    textAlign: 'center',
  },
  searchButton: {
    marginBottom: 24,
  },
  demoSection: {
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginBottom: 8,
  },
  demoCode: {
    backgroundColor: colors.beige,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  demoCodeText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    letterSpacing: 1,
  },
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  previewDetails: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  previewDescription: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 16,
    lineHeight: 20,
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
  confirmationBox: {
    backgroundColor: colors.beige,
    borderRadius: 8,
    padding: 12,
  },
  confirmationTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    lineHeight: 18,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  joinButton: {
    flex: 2,
  },
  successContent: {
    alignItems: 'center',
    padding: 40,
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 16,
  },
  redirectText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
    textAlign: 'center',
  },
  // New styles for secure join flow
  rulesSection: {
    marginBottom: 16,
  },
  rulesTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    lineHeight: 20,
  },
  agreementSection: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: colors.beige,
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.beigeDeep,
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
    lineHeight: 20,
  },
  messageSection: {
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    padding: 12,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
    height: 80,
    textAlignVertical: 'top',
  },
  backToGroupsButton: {
    marginTop: 24,
  },
  // Additional new styles for secure join flow
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 18,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.forestGreen + '10',
    borderRadius: 8,
    marginTop: 16,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.forestGreen,
  },
  successActions: {
    gap: 12,
    width: '100%',
  },
  viewRequestsButton: {
    marginTop: 8,
  },
});
