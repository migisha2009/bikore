import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../utils/colors';
import { formatRwf, initials } from '../../../utils/format';
import api from '../../../utils/api';

interface Member {
  id: string;
  name: string;
  phone: string;
  avatar_color: string;
  position: number;
  status: string;
}

interface Cycle {
  id: string;
  cycle_number: number;
  start_date: string;
  end_date: string;
  payout_user_id: string;
  status: string;
}

interface Contribution {
  id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string;
  user_id: string;
  user_name: string;
  user_avatar_color: string;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string;
  emoji: string;
  contribution_amount: number;
  cycle_duration: string;
  total_cycles: number;
  current_cycle: number;
  status: string;
  admin_id: string;
  invite_code: string;
  created_at: string;
  members: Member[];
  cycles: Cycle[];
  activeCycle: Cycle | null;
  myContribution: Contribution | null;
  isAdmin: boolean;
  member_count: number;
  total_saved: number;
}

export default function GroupDetailScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'this-cycle' | 'history' | 'members'>('this-cycle');

  useEffect(() => {
    fetchGroupDetail();
  }, [id]);

  const fetchGroupDetail = async () => {
    try {
      const { data } = await api.get(`/groups/${id}`);
      setGroup(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load group');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePayContribution = () => {
    if (group) {
      router.push(`/contribute/${group.id}`);
    }
  };

  const handleCopyInviteCode = () => {
    if (group?.invite_code) {
      Alert.alert('Invite Code', `Share this code with others: ${group.invite_code}`);
    }
  };

  const handleShareInviteCode = () => {
    if (group?.invite_code) {
      Alert.alert(
        'Share Invite Code',
        `Join my Ikimina "${group.name}" with code: ${group.invite_code}`,
        [
          { text: 'Cancel' },
          {
            text: 'Share',
            onPress: () => {
              // In a real app, this would use the share API
              Alert.alert('Shared', 'Invite code ready to share!');
            },
          },
        ]
      );
    }
  };

  const renderMemberAvatar = (member: Member, size: number = 32) => (
    <View
      key={member.id}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: member.avatar_color },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size / 2 }]}>
        {initials(member.name)}
      </Text>
    </View>
  );

  const renderPayoutOrder = () => {
    if (!group) return null;
    
    const currentPayoutUser = group.activeCycle?.payout_user_id;
    
    return (
      <View style={styles.payoutOrderSection}>
        <Text style={styles.sectionTitle}>Payout Order</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.payoutOrderList}>
            {group.members.map((member, index) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.payoutOrderItem,
                  member.id === currentPayoutUser && styles.currentPayout,
                ]}
              >
                {renderMemberAvatar(member, 48)}
                <Text style={styles.payoutPosition}>#{member.position}</Text>
                {member.id === currentPayoutUser && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderThisCycleTab = () => {
    if (!group?.activeCycle) return null;

    return (
      <View style={styles.tabContent}>
        <View style={styles.cycleHeader}>
          <Text style={styles.cycleTitle}>
            Cycle {group.activeCycle.cycle_number} of {group.total_cycles}
          </Text>
          <Text style={styles.cycleAmount}>
            {formatRwf(group.contribution_amount)} due
          </Text>
        </View>

        <View style={styles.contributionsList}>
          <Text style={styles.contributionsTitle}>Contributions</Text>
          {group.members.map((member) => {
            const contribution = group.activeCycle && 
              group.members.find(m => m.id === member.id);
            const isPaid = member.id === group.myContribution?.user_id && group.myContribution?.status === 'paid';
            
            return (
              <View key={member.id} style={styles.contributionItem}>
                <View style={styles.contributionMember}>
                  {renderMemberAvatar(member)}
                  <View style={styles.contributionInfo}>
                    <Text style={styles.contributionName}>{member.name}</Text>
                    <Text style={styles.contributionPosition}>Position #{member.position}</Text>
                  </View>
                </View>
                <View style={styles.contributionStatus}>
                  {isPaid ? (
                    <View style={styles.paidStatus}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                      <Text style={styles.paidText}>Paid</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingStatus}>
                      <MaterialCommunityIcons name="clock" size={20} color={colors.mustard} />
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {group.myContribution?.status !== 'paid' && (
          <View style={styles.paySection}>
            <Button onPress={handlePayContribution} style={styles.payButton}>
              Pay {formatRwf(group.contribution_amount)}
            </Button>
          </View>
        )}
      </View>
    );
  };

  const renderHistoryTab = () => {
    if (!group) return null;

    const completedCycles = group.cycles.filter(cycle => cycle.status === 'completed');
    
    return (
      <View style={styles.tabContent}>
        {completedCycles.length > 0 ? (
          completedCycles.map((cycle) => {
            const payoutMember = group.members.find(m => m.id === cycle.payout_user_id);
            return (
              <View key={cycle.id} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>Cycle {cycle.cycle_number}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(cycle.end_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyPayout}>
                  <Text style={styles.historyPayoutLabel}>Payout to:</Text>
                  <Text style={styles.historyPayoutName}>{payoutMember?.name}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryText}>No completed cycles yet</Text>
          </View>
        )}
      </View>
    );
  };

  const renderMembersTab = () => {
    if (!group) return null;

    return (
      <View style={styles.tabContent}>
        {group.members.map((member) => (
          <View key={member.id} style={styles.memberItem}>
            <View style={styles.memberInfo}>
              {renderMemberAvatar(member)}
              <View style={styles.memberDetails}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberPhone}>{member.phone}</Text>
                <Text style={styles.memberPosition}>Position #{member.position}</Text>
              </View>
            </View>
            {member.id === group.admin_id && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.container}>
        <Text>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.forestGreen} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopyInviteCode} style={styles.inviteButton}>
            <Text style={styles.inviteCode}>{group.invite_code}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.groupInfo}>
          <Text style={styles.groupEmoji}>{group.emoji}</Text>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
        </View>
      </View>

      {renderPayoutOrder()}

      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          {(['this-cycle', 'history', 'members'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}>
                {tab === 'this-cycle' ? 'This Cycle' : tab === 'history' ? 'History' : 'Members'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.tabContainer} showsVerticalScrollIndicator={false}>
          {activeTab === 'this-cycle' && renderThisCycleTab()}
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'members' && renderMembersTab()}
        </ScrollView>
      </View>

      {group.isAdmin && (
        <View style={styles.adminActions}>
          <Button onPress={handleShareInviteCode} variant="secondary" style={styles.shareButton}>
            Share Invite Code
          </Button>
        </View>
      )}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  inviteButton: {
    backgroundColor: colors.beige,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteCode: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.forestGreen,
    letterSpacing: 1,
  },
  groupInfo: {
    alignItems: 'center',
  },
  groupEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
  },
  payoutOrderSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 12,
  },
  payoutOrderList: {
    flexDirection: 'row',
    gap: 12,
  },
  payoutOrderItem: {
    alignItems: 'center',
    position: 'relative',
  },
  currentPayout: {
    transform: [{ scale: 1.1 }],
  },
  payoutPosition: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginTop: 4,
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.mustard,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    color: colors.white,
  },
  tabsContainer: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.beige,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
  },
  activeTabText: {
    color: colors.forestGreen,
  },
  tabContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  tabContent: {
    paddingBottom: 24,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cycleTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
  },
  cycleAmount: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.mustard,
  },
  contributionsList: {
    marginBottom: 24,
  },
  contributionsTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 12,
  },
  contributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  contributionMember: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contributionInfo: {
    marginLeft: 12,
  },
  contributionName: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
  },
  contributionPosition: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  contributionStatus: {
    alignItems: 'center',
  },
  paidStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paidText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.success,
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mustard,
  },
  paySection: {
    marginTop: 20,
  },
  payButton: {
    backgroundColor: colors.forestGreen,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  historyPayout: {
    alignItems: 'flex-end',
  },
  historyPayoutLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 2,
  },
  historyPayoutName: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.forestGreen,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 2,
  },
  memberPosition: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
  adminBadge: {
    backgroundColor: colors.forestGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.white,
  },
  adminActions: {
    padding: 24,
    paddingTop: 0,
  },
  shareButton: {
    width: '100%',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: 'DMSans_600SemiBold',
  },
});
