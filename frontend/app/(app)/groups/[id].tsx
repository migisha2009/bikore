import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import CycleTimeline from '../../../components/CycleTimeline';
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
  trust_score?: number;
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

interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  name: string;
  message: string;
  created_at: string;
  avatar_color: string;
  type?: string;
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

interface CycleData {
  id: string;
  cycleNumber: number;
  contributionAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  payoutUserId: string | null;
  payoutRecipientName: string | null;
  payoutRecipientColor: string | null;
  paidCount: number;
  totalMembers: number;
  isComplete: boolean;
}

export default function GroupDetailScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cycle' | 'members' | 'chat' | 'admin' | 'timeline'>('cycle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [allMembersPaid, setAllMembersPaid] = useState(false);
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchGroupDetail();
  }, [id]);

  useEffect(() => {
    if (group && activeTab === 'chat') {
      fetchChatMessages();
    }
  }, [group, activeTab]);

  // 5-second polling for new messages
  useEffect(() => {
    if (!group || activeTab !== 'chat') return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/groups/${id}/messages`);
        if (data.length > chatMessages.length) {
          setChatMessages(data);
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [group, activeTab, id, chatMessages.length]);

  useEffect(() => {
    if (group?.isAdmin) {
      fetchPendingRequestsCount();
    }
    
    // Check if all members have paid in current cycle
    if (group?.activeCycle) {
      const checkAllPaid = async () => {
        try {
          const { data } = await api.get(`/groups/${id}/members`);
          const allPaid = data.every((member: any) => member.status === 'paid');
          setAllMembersPaid(allPaid);
        } catch (error) {
          console.error('Error checking member payment status:', error);
        }
      };
      
      checkAllPaid();
    }
  }, [group, id]);

  const fetchGroupDetail = async () => {
    try {
      const { data } = await api.get(`/groups/${id}`);
      setGroup(data);
      
      // Fetch cycles data
      const cyclesResponse = await api.get(`/groups/${id}/cycles`);
      setCycles(cyclesResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching group detail:', error);
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

  const fetchChatMessages = async () => {
    try {
      const { data } = await api.get(`/groups/${id}/messages`);
      setChatMessages(data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  const fetchPendingRequestsCount = async () => {
    if (!group) return;
    
    try {
      const { data } = await api.get(`/groups/${group.id}/requests`);
      setPendingRequestsCount(data.length);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !group) return;

    try {
      const { data } = await api.post(`/groups/${group.id}/chat`, {
        message: newMessage.trim()
      });
      
      setChatMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send message');
    }
  };

  const handleRegenerateInviteCode = async () => {
    if (!group) return;

    Alert.alert(
      'Regenerate Invite Code',
      'This will create a new invite code and the old one will expire. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'default',
          onPress: async () => {
            try {
              const { data } = await api.post(`/groups/${group.id}/regenerate-invite`);
              Alert.alert('Success', `New invite code: ${data.inviteCode}`);
              fetchGroupDetail(); // Refresh group data
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to regenerate code');
            }
          },
        },
      ]
    );
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

  const renderCycleTab = () => {
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

  const renderChatTab = () => {
    const isOwnMessage = (userId: string) => userId === user?.id;
    
    return (
      <View style={styles.chatContainer}>
        <FlatList
          data={chatMessages}
          renderItem={({ item }) => (
            <View style={[
              styles.messageItem,
              isOwnMessage(item.user_id) ? styles.ownMessage : styles.otherMessage
            ]}>
              {!isOwnMessage(item.user_id) && (
                <View style={styles.messageAvatar}>
                  {renderMemberAvatar({
                    id: item.user_id,
                    name: item.name,
                    phone: '',
                    avatar_color: item.avatar_color,
                    position: 0,
                    status: ''
                  }, 32)}
                </View>
              )}
              <View style={[
                styles.messageBubble,
                isOwnMessage(item.user_id) ? styles.ownBubble : styles.otherBubble
              ]}>
                <Text style={[
                  styles.messageName,
                  isOwnMessage(item.user_id) && styles.ownMessageName
                ]}>
                  {item.type === 'system' ? '🔔' : item.name}
                </Text>
                <Text style={[
                  styles.messageText,
                  isOwnMessage(item.user_id) && styles.ownMessageText
                ]}>
                  {item.message}
                </Text>
                <Text style={[
                  styles.messageTime,
                  isOwnMessage(item.user_id) && styles.ownMessageTime
                ]}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {isOwnMessage(item.user_id) && (
                <View style={styles.messageAvatar}>
                  {renderMemberAvatar({
                    id: item.user_id,
                    name: item.name,
                    phone: '',
                    avatar_color: item.avatar_color,
                    position: 0,
                    status: ''
                  }, 32)}
                </View>
              )}
            </View>
          )}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted
          onContentSizeChange={() => {
            // Auto scroll to latest message
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
        />
        
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <MaterialCommunityIcons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAdminTab = () => {
    if (!group?.isAdmin) return null;

    return (
      <View style={styles.tabContent}>
        <View style={styles.adminSection}>
          <Text style={styles.adminSectionTitle}>Pending Requests</Text>
          <TouchableOpacity
            style={styles.adminActionCard}
            onPress={() => router.push('/groups/requests')}
          >
            <View style={styles.adminActionContent}>
              <MaterialCommunityIcons name="account-group" size={24} color={colors.forestGreen} />
              <View style={styles.adminActionInfo}>
                <Text style={styles.adminActionTitle}>Member Requests</Text>
                <Text style={styles.adminActionSubtitle}>
                  {pendingRequestsCount} pending request{pendingRequestsCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMid} />
            </View>
            {pendingRequestsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.adminSection}>
          <Text style={styles.adminSectionTitle}>Group Management</Text>
          
          <TouchableOpacity
            style={styles.adminActionCard}
            onPress={handleRegenerateInviteCode}
          >
            <View style={styles.adminActionContent}>
              <MaterialCommunityIcons name="refresh" size={24} color={colors.mustard} />
              <View style={styles.adminActionInfo}>
                <Text style={styles.adminActionTitle}>Regenerate Invite Code</Text>
                <Text style={styles.adminActionSubtitle}>Create new invite code</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMid} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminActionCard}
            onPress={() => Alert.alert('Edit Rules', 'Feature coming soon!')}
          >
            <View style={styles.adminActionContent}>
              <MaterialCommunityIcons name="file-document-edit" size={24} color={colors.forestGreen} />
              <View style={styles.adminActionInfo}>
                <Text style={styles.adminActionTitle}>Edit Group Rules</Text>
                <Text style={styles.adminActionSubtitle}>Update group settings</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMid} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.adminSection}>
          <Text style={styles.adminSectionTitle}>Group Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{group.member_count}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatRwf(group.total_saved || 0)}</Text>
              <Text style={styles.statLabel}>Total Saved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{group.current_cycle}/{group.total_cycles}</Text>
              <Text style={styles.statLabel}>Current Cycle</Text>
            </View>
          </View>
        </View>
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
              <View style={[styles.avatar, { backgroundColor: member.avatar_color }]}>
                <Text style={styles.avatarText}>{initials(member.name)}</Text>
              </View>
              <View style={styles.memberDetails}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberPhone}>{member.phone}</Text>
                <Text style={styles.memberPosition}>Position #{member.position}</Text>
                {member.trust_score !== undefined && (
                  <View style={styles.trustScoreBadge}>
                    <Text style={styles.trustScoreText}>{member.trust_score}</Text>
                    <Text style={styles.trustScoreLabel}>
                      {member.trust_score >= 90 ? '🟢' : 
                       member.trust_score >= 70 ? '🟡' : 
                       member.trust_score >= 50 ? '🟠' : 
                       '🔴'}
                    </Text>
                  </View>
                )}
                <Text style={[
                  styles.memberStatus,
                  { color: member.status === 'active' ? colors.success : colors.textLight }
                ]}>
                  {member.status}
                </Text>
              </View>
            </View>
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
          
          {/* Payout Banner */}
          {group.isAdmin && allMembersPaid && (
            <View style={styles.payoutBanner}>
              <MaterialCommunityIcons name="party-popper" size={24} color={colors.white} />
              <Text style={styles.payoutBannerText}>🎉 Everyone paid! Confirm Payout</Text>
              <TouchableOpacity 
                style={styles.payoutBannerButton}
                onPress={() => router.push(`/groups/payout?id=${group.id}`)}
              >
                <Text style={styles.payoutBannerButtonText}>Process Payout</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* User is next recipient banner */}
          {!group.isAdmin && group.activeCycle?.payout_user_id === user?.id && (
            <View style={styles.recipientBanner}>
              <MaterialCommunityIcons name="gift" size={24} color={colors.white} />
              <Text style={styles.recipientBannerText}>You are next to receive!</Text>
            </View>
          )}
        </View>
      </View>

      {renderPayoutOrder()}

      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          {(['cycle', 'members', 'chat', 'admin', 'timeline'] as const).map((tab) => (
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
                {tab === 'cycle' ? 'Cycle' : tab === 'members' ? 'Members' : tab === 'chat' ? 'Chat' : tab === 'admin' ? 'Admin' : 'Timeline'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.tabContainer} showsVerticalScrollIndicator={false}>
          {activeTab === 'cycle' && renderCycleTab()}
          {activeTab === 'members' && renderMembersTab()}
          {activeTab === 'chat' && renderChatTab()}
          {activeTab === 'admin' && renderAdminTab()}
          {activeTab === 'timeline' && (
            <View style={styles.tabContent}>
              <CycleTimeline 
                cycles={cycles}
                currentCycleNumber={group?.current_cycle || 0}
                onCyclePress={(cycle) => {
                  // Handle cycle press if needed
                  console.log('Cycle pressed:', cycle);
                }}
              />
            </View>
          )}
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
    fontFamily: 'DMSans_700Bold',
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
    fontFamily: 'DMSans_700Bold',
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
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
  },
  cycleAmount: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.mustard,
  },
  contributionsList: {
    marginBottom: 24,
  },
  contributionsTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
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
    fontFamily: 'DMSans_700Bold',
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
    fontFamily: 'DMSans_700Bold',
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
    color: colors.textMid,
    marginBottom: 4,
  },
  trustScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.beige,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  trustScoreText: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
    marginRight: 4,
  },
  trustScoreLabel: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  memberStatus: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginTop: 4,
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
    fontFamily: 'DMSans_700Bold',
  },
  // Chat styles
  chatContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 12,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    maxWidth: '70%',
  },
  ownBubble: {
    backgroundColor: colors.forestGreen,
  },
  otherBubble: {
    backgroundColor: colors.beige,
  },
  messageName: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: colors.textMid,
    marginBottom: 4,
  },
  ownMessageName: {
    color: colors.white,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
    lineHeight: 20,
  },
  ownMessageText: {
    color: colors.white,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.beigeDeep,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.beige,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  // Admin styles
  adminSection: {
    marginBottom: 24,
  },
  adminSectionTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  adminActionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    position: 'relative',
  },
  adminActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminActionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  adminActionTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 2,
  },
  adminActionSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.mustard,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.beige,
    borderRadius: 8,
    padding: 16,
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
    color: colors.textMid,
    textAlign: 'center',
  },
  // Payout banner styles
  payoutBanner: {
    backgroundColor: colors.mustard,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payoutBannerText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    marginRight: 12,
  },
  payoutBannerButton: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  payoutBannerButtonText: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: colors.mustard,
  },
  recipientBanner: {
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipientBannerText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    marginRight: 12,
  },
});
