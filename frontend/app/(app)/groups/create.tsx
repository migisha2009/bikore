import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, Share } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors } from '../../../utils/colors';
import { formatRwf } from '../../../utils/format';
import api from '../../../utils/api';

interface GroupData {
  name: string;
  description: string;
  emoji: string;
  contribution_amount: string;
  cycle_duration: 'monthly' | 'bi-weekly' | 'weekly';
  total_cycles: string;
  max_members: string;
  is_private: boolean;
  requires_approval: boolean;
  rules: string;
  late_penalty: string;
  payout_method: 'order' | 'random' | 'bidding';
}

const EMOJI_OPTIONS = ['🏠', '💼', '🌱', '🎓', '🏥', '🚗', '�‍👩‍👧', '🤝', '💪', '🏆'];
const CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
];
const PAYOUT_OPTIONS = [
  { value: 'order', label: 'In Order' },
  { value: 'random', label: 'Random' },
  { value: 'bidding', label: 'Bidding' },
];

export default function CreateGroupScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState<GroupData>({
    name: '',
    description: '',
    emoji: '🌱',
    contribution_amount: '',
    cycle_duration: 'monthly',
    total_cycles: '',
    max_members: '',
    is_private: false,
    requires_approval: true,
    rules: '',
    late_penalty: '',
    payout_method: 'order',
  });

  const updateField = (field: keyof GroupData, value: string) => {
    setGroupData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!groupData.name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!groupData.contribution_amount || parseInt(groupData.contribution_amount) < 1000) {
      Alert.alert('Error', 'Contribution amount must be at least Rwf 1,000');
      return false;
    }
    if (!groupData.total_cycles || parseInt(groupData.total_cycles) < 2 || parseInt(groupData.total_cycles) > 50) {
      Alert.alert('Error', 'Total cycles must be between 2 and 50');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    // Step 3 is rules & security, no required validation
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      // Auto-set max_members to equal total_cycles
      updateField('max_members', groupData.total_cycles);
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreateGroup = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/groups', {
        name: groupData.name,
        description: groupData.description,
        emoji: groupData.emoji,
        contribution_amount: parseInt(groupData.contribution_amount),
        cycle_duration: groupData.cycle_duration,
        total_cycles: parseInt(groupData.total_cycles),
        max_members: parseInt(groupData.max_members) || parseInt(groupData.total_cycles),
        is_private: groupData.is_private,
        requires_approval: groupData.requires_approval,
        rules: groupData.rules,
        late_penalty: parseInt(groupData.late_penalty) || 0,
        payout_method: groupData.payout_method,
      });

      const shareMessage = `Join my Ikimina group on Bikore! Use invite code: ${data.invite_code}. Download Bikore: https://bikore.vercel.app`;

      Alert.alert(
        'Group Created!',
        `Your Ikimina "${data.name}" has been created successfully!\n\nInvite code: ${data.invite_code}`,
        [
          {
            text: 'Share Code',
            onPress: async () => {
              try {
                await Share.share({
                  message: shareMessage,
                  title: `Join ${data.name} on Bikore`,
                });
              } catch (error) {
                Alert.alert('Share', `Invite code: ${data.invite_code}`);
              }
            },
          },
          {
            text: 'Copy Code',
            onPress: () => {
              // Copy to clipboard would go here
              Alert.alert('Copied', `Invite code: ${data.invite_code}`);
            },
          },
          {
            text: 'View Group',
            onPress: () => router.replace(`/groups/${data.id}`),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Group Details</Text>
      
      <Input
        placeholder="Group name (e.g., Family Savings)"
        value={groupData.name}
        onChangeText={(value) => updateField('name', value)}
      />

      <Input
        placeholder="Description (optional)"
        value={groupData.description}
        onChangeText={(value) => updateField('description', value)}
        multiline
        style={styles.textArea}
      />

      <View style={styles.emojiSection}>
        <Text style={styles.emojiLabel}>Choose an emoji</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiOption,
                groupData.emoji === emoji && styles.emojiOptionSelected,
              ]}
              onPress={() => updateField('emoji', emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Financial Settings</Text>
      
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Contribution amount (Rwf)</Text>
        <Input
          placeholder="Enter amount"
          value={groupData.contribution_amount}
          onChangeText={(value) => updateField('contribution_amount', value)}
          keyboardType="numeric"
        />
        {groupData.contribution_amount && (
          <Text style={styles.formattedAmount}>
            {formatRwf(parseInt(groupData.contribution_amount))}
          </Text>
        )}
      </View>

      <View style={styles.cycleSection}>
        <Text style={styles.cycleLabel}>Cycle duration</Text>
        <View style={styles.cycleOptions}>
          {CYCLE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.cycleOption,
                groupData.cycle_duration === option.value && styles.cycleOptionSelected,
              ]}
              onPress={() => updateField('cycle_duration', option.value as any)}
            >
              <Text style={[
                styles.cycleOptionText,
                groupData.cycle_duration === option.value && styles.cycleOptionTextSelected,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.stepperSection}>
        <Text style={styles.stepperLabel}>Total cycles (= number of members)</Text>
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => {
              const current = parseInt(groupData.total_cycles) || 0;
              if (current > 2) updateField('total_cycles', (current - 1).toString());
            }}
          >
            <Text style={styles.stepperButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{groupData.total_cycles || '2'}</Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => {
              const current = parseInt(groupData.total_cycles) || 0;
              if (current < 50) updateField('total_cycles', (current + 1).toString());
            }}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.maxMembersSection}>
        <Text style={styles.maxMembersLabel}>Max members (auto-set to equal total cycles)</Text>
        <Text style={styles.maxMembersValue}>
          {groupData.max_members || groupData.total_cycles || '2'} members
        </Text>
      </View>

      <View style={styles.penaltySection}>
        <Text style={styles.penaltyLabel}>Late payment penalty (Rwf) - optional</Text>
        <Input
          placeholder="0"
          value={groupData.late_penalty}
          onChangeText={(value) => updateField('late_penalty', value)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Text style={styles.summaryText}>
          Each member contributes {formatRwf(parseInt(groupData.contribution_amount) || 0)}{' '}
          {groupData.cycle_duration} for {groupData.total_cycles || 0} cycles
        </Text>
        <Text style={styles.summaryTotal}>
          Total per member: {formatRwf((parseInt(groupData.contribution_amount) || 0) * (parseInt(groupData.total_cycles) || 0))}
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Rules & Security</Text>
      
      <View style={styles.toggleSection}>
        <Text style={styles.toggleLabel}>Requires admin approval</Text>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            groupData.requires_approval && styles.toggleButtonActive,
          ]}
          onPress={() => updateField('requires_approval', (!groupData.requires_approval).toString())}
        >
          <Text style={[
            styles.toggleButtonText,
            groupData.requires_approval && styles.toggleButtonTextActive,
          ]}>
            {groupData.requires_approval ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleSection}>
        <Text style={styles.toggleLabel}>Private group</Text>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            groupData.is_private && styles.toggleButtonActive,
          ]}
          onPress={() => updateField('is_private', (!groupData.is_private).toString())}
        >
          <Text style={[
            styles.toggleButtonText,
            groupData.is_private && styles.toggleButtonTextActive,
          ]}>
            {groupData.is_private ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.payoutSection}>
        <Text style={styles.payoutLabel}>Payout order</Text>
        <View style={styles.payoutOptions}>
          {PAYOUT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.payoutOption,
                groupData.payout_method === option.value && styles.payoutOptionSelected,
              ]}
              onPress={() => updateField('payout_method', option.value as any)}
            >
              <Text style={[
                styles.payoutOptionText,
                groupData.payout_method === option.value && styles.payoutOptionTextSelected,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.rulesSection}>
        <Text style={styles.rulesLabel}>Group rules</Text>
        <TextInput
          style={styles.rulesInput}
          placeholder="e.g. Members must pay by the 5th of each month. Late payments incur a Rwf 5,000 penalty..."
          value={groupData.rules}
          onChangeText={(value) => updateField('rules', value)}
          multiline
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Create</Text>
      
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewEmoji}>{groupData.emoji}</Text>
          <Text style={styles.reviewName}>{groupData.name}</Text>
        </View>
        
        <View style={styles.reviewDetails}>
          <Text style={styles.reviewLabel}>Contribution:</Text>
          <Text style={styles.reviewValue}>
            {formatRwf(parseInt(groupData.contribution_amount) || 0)} {groupData.cycle_duration}
          </Text>
        </View>
        
        <View style={styles.reviewDetails}>
          <Text style={styles.reviewLabel}>Cycles:</Text>
          <Text style={styles.reviewValue}>{groupData.total_cycles} cycles</Text>
        </View>
        
        <View style={styles.reviewDetails}>
          <Text style={styles.reviewLabel}>Members:</Text>
          <Text style={styles.reviewValue}>{groupData.max_members || groupData.total_cycles} max</Text>
        </View>
        
        <View style={styles.reviewDetails}>
          <Text style={styles.reviewLabel}>Approval:</Text>
          <Text style={styles.reviewValue}>{groupData.requires_approval ? 'Required' : 'Not required'}</Text>
        </View>
        
        <View style={styles.reviewDetails}>
          <Text style={styles.reviewLabel}>Privacy:</Text>
          <Text style={styles.reviewValue}>{groupData.is_private ? 'Private' : 'Public'}</Text>
        </View>

        {groupData.late_penalty && parseInt(groupData.late_penalty) > 0 && (
          <View style={styles.reviewDetails}>
            <Text style={styles.reviewLabel}>Late penalty:</Text>
            <Text style={styles.reviewValue}>{formatRwf(parseInt(groupData.late_penalty))}</Text>
          </View>
        )}

        {groupData.description ? (
          <View style={styles.reviewDescription}>
            <Text style={styles.reviewLabel}>Description:</Text>
            <Text style={styles.reviewDescriptionText}>{groupData.description}</Text>
          </View>
        ) : null}

        {groupData.rules ? (
          <View style={styles.reviewDescription}>
            <Text style={styles.reviewLabel}>Rules:</Text>
            <Text style={styles.reviewDescriptionText}>{groupData.rules}</Text>
          </View>
        ) : null}
        
        <View style={styles.reviewDetails}>
          <Text style={styles.reviewLabel}>Admin:</Text>
          <Text style={styles.reviewValue}>{user?.name}</Text>
        </View>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Important</Text>
        <Text style={styles.warningText}>
          • You will be the group admin{'\n'}
          • Your position will be #1 (first payout){'\n'}
          • An invite code will be generated for others to join{'\n'}
          • Contribution amounts and member limits cannot be changed after creation
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Ikimina</Text>
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          {step > 1 && (
            <Button onPress={handleBack} variant="ghost" style={styles.backButton}>
              Back
            </Button>
          )}
          <Button
            onPress={step === 3 ? handleCreateGroup : handleNext}
            disabled={loading}
            style={styles.nextButton}
          >
            {loading ? 'Creating...' : step === 3 ? 'Create Ikimina' : 'Next'}
          </Button>
        </View>
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
  title: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 16,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.beigeDeep,
  },
  progressDotActive: {
    backgroundColor: colors.forestGreen,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 24,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  emojiSection: {
    marginBottom: 24,
  },
  emojiLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emojiOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.beigeDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionSelected: {
    borderColor: colors.forestGreen,
    backgroundColor: colors.beige,
  },
  emojiText: {
    fontSize: 24,
  },
  cycleSection: {
    marginBottom: 24,
  },
  cycleLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  cycleOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    alignItems: 'center',
  },
  cycleOptionSelected: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  cycleOptionText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
  },
  cycleOptionTextSelected: {
    color: colors.white,
  },
  summaryBox: {
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 4,
  },
  summaryTotal: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  reviewName: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
  },
  reviewDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  reviewValue: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
  },
  reviewDescription: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.beigeDeep,
  },
  reviewDescriptionText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: colors.mustardLight,
    borderRadius: 12,
    padding: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: colors.cream,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  // New styles for step 2
  amountSection: {
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  formattedAmount: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginTop: 4,
  },
  stepperSection: {
    marginBottom: 24,
  },
  stepperLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.beigeDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
  },
  stepperValue: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    minWidth: 40,
    textAlign: 'center',
  },
  maxMembersSection: {
    marginBottom: 24,
  },
  maxMembersLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  maxMembersValue: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
  },
  penaltySection: {
    marginBottom: 24,
  },
  penaltyLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  // New styles for step 3
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.beigeDeep,
    borderWidth: 2,
    borderColor: colors.beigeDeep,
  },
  toggleButtonActive: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  toggleButtonText: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: colors.textMid,
  },
  toggleButtonTextActive: {
    color: colors.white,
  },
  payoutSection: {
    marginBottom: 24,
  },
  payoutLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  payoutOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  payoutOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    alignItems: 'center',
  },
  payoutOptionSelected: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  payoutOptionText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
  },
  payoutOptionTextSelected: {
    color: colors.white,
  },
  rulesSection: {
    marginBottom: 24,
  },
  rulesLabel: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  rulesInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    padding: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
    height: 100,
    textAlignVertical: 'top',
  },
});
