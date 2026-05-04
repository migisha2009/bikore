import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
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
  member_count: number;
  total_cycles: number;
  current_cycle: number;
  invite_code: string;
}

export default function JoinGroupScreen() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupPreview, setGroupPreview] = useState<GroupPreview | null>(null);
  const [step, setStep] = useState<'input' | 'preview' | 'success'>('input');

  const formatInviteCode = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return cleaned.slice(0, 8);
  };

  const handleSearch = async () => {
    if (inviteCode.length < 4) {
      Alert.alert('Error', 'Please enter a valid invite code');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/groups/search?code=${inviteCode}`);
      setGroupPreview(data);
      setStep('preview');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to find group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupPreview) return;

    setLoading(true);
    try {
      const { data } = await api.post('/groups/join', { inviteCode: groupPreview.invite_code });
      setStep('success');
      
      setTimeout(() => {
        router.replace(`/groups/${data.id}`);
      }, 2000);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const renderInputStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Join Ikimina</Text>
      <Text style={styles.stepSubtitle}>
        Enter the invite code shared by the group admin
      </Text>

      <View style={styles.inputSection}>
        <Input
          placeholder="Enter invite code"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(formatInviteCode(text))}
          style={styles.inviteInput}
          textAlign="center"
          autoCapitalize="characters"
        />
        
        <Text style={styles.inputHint}>
          Invite codes are 4-8 characters long
        </Text>
      </View>

      <Button
        onPress={handleSearch}
        disabled={loading || inviteCode.length < 4}
        style={styles.searchButton}
      >
        {loading ? 'Searching...' : 'Find Group'}
      </Button>

      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>Try Demo Code</Text>
        <TouchableOpacity
          style={styles.demoCode}
          onPress={() => setInviteCode('TEST1234')}
        >
          <Text style={styles.demoCodeText}>TEST1234</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreviewStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Group Found!</Text>
      
      {groupPreview && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewEmoji}>{groupPreview.emoji}</Text>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{groupPreview.name}</Text>
              <Text style={styles.previewDetails}>
                {groupPreview.member_count} members • Cycle {groupPreview.current_cycle}/{groupPreview.total_cycles}
              </Text>
            </View>
          </View>

          {groupPreview.description && (
            <Text style={styles.previewDescription}>
              {groupPreview.description}
            </Text>
          )}

          <View style={styles.previewStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatRwf(groupPreview.contribution_amount)}</Text>
              <Text style={styles.statLabel}>Per cycle</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{groupPreview.total_cycles}</Text>
              <Text style={styles.statLabel}>Total cycles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{groupPreview.current_cycle}</Text>
              <Text style={styles.statLabel}>Current cycle</Text>
            </View>
          </View>

          <View style={styles.confirmationBox}>
            <Text style={styles.confirmationTitle}>Before you join:</Text>
            <Text style={styles.confirmationText}>
              • You'll need to contribute {formatRwf(groupPreview.contribution_amount)} each cycle{'\n'}
              • Your payout position will be determined by when you join{'\n'}
              • You can leave the group anytime, but contributions are non-refundable
            </Text>
          </View>
        </View>
      )}

      <View style={styles.previewActions}>
        <Button
          onPress={() => setStep('input')}
          variant="secondary"
          style={styles.backButton}
        >
          Back
        </Button>
        <Button
          onPress={handleJoinGroup}
          disabled={loading}
          style={styles.joinButton}
        >
          {loading ? 'Joining...' : 'Join Group'}
        </Button>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.successContent}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Successfully Joined!</Text>
        <Text style={styles.successMessage}>
          You're now a member of {groupPreview?.name}
        </Text>
        <Text style={styles.redirectText}>Redirecting to group...</Text>
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
        {step === 'input' && renderInputStep()}
        {step === 'preview' && renderPreviewStep()}
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
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputSection: {
    marginBottom: 32,
  },
  inviteInput: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 2,
    marginBottom: 12,
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
});
