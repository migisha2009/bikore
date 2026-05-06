import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { Button } from '../../../../components/ui/Button';
import { colors } from '../../../../utils/colors';
import { formatRwf, initials } from '../../../../utils/format';
import api from '../../../../utils/api';

interface Overview {
  groupName: string;
  description: string;
  rules: string;
  totalMembers: number;
  activeMembers: number;
  paidMembers: number;
  pendingPayments: number;
  totalCollected: number;
  contributionAmount: number;
  cycleNumber: number;
  nextPayoutDate: string;
  payoutUser: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

interface Member {
  id: string;
  userId: string;
  position: number;
  status: string;
  name: string;
  phone: string;
  avatarColor: string;
  paymentStatus: string;
  amount: number;
  paidAt?: string;
}

interface Transaction {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  cycleNumber: number;
  recipientName: string;
  recipientPhone: string;
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [overview, setOverview] = useState<Overview | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'cycle' | 'members' | 'history' | 'payout' | 'settings' | 'chat' | 'timeline' | 'admin' | 'penalty'>('overview');
  const [reminding, setReminding] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settings, setSettings] = useState({ name: '', description: '', rules: '' });
  const [transactionPage, setTransactionPage] = useState(1);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [id]);

  const fetchDashboardData = async () => {
    try {
      const { data } = await api.get(`/admin/dashboard/${id}`);
      setOverview(data.overview);
      setMembers(data.members);
      setTransactions(data.history);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load dashboard');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (selectedMembers.length === 0) {
      Alert.alert('No Selection', 'Please select members to send reminders');
      return;
    }

    setReminding(true);
    try {
      const memberIds = members
        .filter(m => selectedMembers.includes(m.userId))
        .map(m => m.id);

      const { data } = await api.post('/admin/send-reminder', {
        groupId: id,
        memberIds
      });

      Alert.alert(
        'Reminders Sent',
        `Sent reminders to ${data.reminders.filter(r => r.sent).length} members`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send reminders');
    } finally {
      setReminding(false);
      setSelectedMembers([]);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/remove-member/${id}/${memberId}`);
              Alert.alert('Success', 'Member removed successfully');
              fetchDashboardData();
            } catch (error: any) {
              console.error('Error removing member:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    try {
      await api.put(`/admin/group-settings/${id}`, settings);
      Alert.alert('Success', 'Group settings updated successfully');
      setEditingSettings(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update settings');
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const loadMoreTransactions = async () => {
    try {
      const nextPage = transactionPage + 1;
      const { data } = await api.get(`/admin/transactions/${id}?page=${nextPage}&limit=50`);
      setTransactions(prev => [...prev, ...data.transactions]);
      setTransactionPage(nextPage);
    } catch (error) {
      console.error('Error loading more transactions:', error);
    }
  };

  const renderOverviewCards = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.cardsGrid}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="account-group" size={24} color={colors.forestGreen} />
          <Text style={styles.cardValue}>{overview?.totalMembers || 0}</Text>
          <Text style={styles.cardLabel}>Total Members</Text>
        </View>
        
        <View style={styles.card}>
          <MaterialCommunityIcons name="cash" size={24} color={colors.success} />
          <Text style={styles.cardValue}>{formatRwf(overview?.totalCollected || 0)}</Text>
          <Text style={styles.cardLabel}>Collected This Cycle</Text>
        </View>
        
        <View style={styles.card}>
          <MaterialCommunityIcons name="clock" size={24} color={colors.mustard} />
          <Text style={styles.cardValue}>{overview?.pendingPayments || 0}</Text>
          <Text style={styles.cardLabel}>Pending Payments</Text>
        </View>
        
        <View style={styles.card}>
          <MaterialCommunityIcons name="calendar" size={24} color={colors.forestGreen} />
          <Text style={styles.cardValue}>
            {overview?.nextPayoutDate ? new Date(overview.nextPayoutDate).toLocaleDateString() : 'N/A'}
          </Text>
          <Text style={styles.cardLabel}>Next Payout Date</Text>
        </View>
      </View>
    </View>
  );

  const renderCycleProgress = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cycle Progress</Text>
      
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>
          Cycle {overview?.cycleNumber || 0} Progress
        </Text>
        <Text style={styles.progressSubtitle}>
          {overview?.paidMembers || 0}/{overview?.totalMembers || 0} members paid
        </Text>
      </View>
      
      <View style={styles.progressBar}>
        <View style={[
          styles.progressFill,
          { width: `${((overview?.paidMembers || 0) / (overview?.totalMembers || 1)) * 100}%` }
        ]} />
      </View>
      
      <View style={styles.membersList}>
        <Text style={styles.membersListTitle}>Members</Text>
        {members.map((member) => (
          <View key={member.id} style={styles.memberItem}>
            <TouchableOpacity
              style={styles.memberCheckbox}
              onPress={() => toggleMemberSelection(member.userId)}
            >
              <MaterialCommunityIcons 
                name={selectedMembers.includes(member.userId) ? "checkbox-marked" : "checkbox-blank-outline"}
                size={20} 
                color={selectedMembers.includes(member.userId) ? colors.forestGreen : colors.textLight} 
              />
            </TouchableOpacity>
            
            <View style={styles.memberInfo}>
              <View style={[styles.avatar, { backgroundColor: member.avatarColor }]}>
                <Text style={styles.avatarText}>{initials(member.name)}</Text>
              </View>
              <View style={styles.memberDetails}>
                <Text style={styles.memberName}>{member.name} (#{member.position})</Text>
                <Text style={styles.memberPhone}>{member.phone}</Text>
              </View>
            </View>
            
            <View style={styles.paymentStatus}>
              {member.paymentStatus === 'paid' ? (
                <View style={styles.paidStatus}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                  <Text style={styles.paidText}>Paid</Text>
                </View>
              ) : (
                <View style={styles.pendingStatus}>
                  <MaterialCommunityIcons name="clock" size={16} color={colors.mustard} />
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
      
      <View style={styles.reminderSection}>
        <Button
          onPress={handleSendReminder}
          disabled={selectedMembers.length === 0 || reminding}
          style={styles.reminderButton}
        >
          {reminding ? 'Sending...' : `Send Reminder${selectedMembers.length > 1 ? 's' : ''}`}
        </Button>
      </View>
    </View>
  );

  const renderPayoutManagement = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payout Management</Text>
      
      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <Text style={styles.payoutTitle}>Current Cycle Recipient</Text>
        </View>
        
        {overview?.payoutUser ? (
          <View style={styles.payoutRecipient}>
            <View style={[styles.avatar, { backgroundColor: '#E8F5E8' }]}>
              <Text style={styles.avatarText}>
                {initials(overview.payoutUser.name)}
              </Text>
            </View>
            <View style={styles.payoutRecipientInfo}>
              <Text style={styles.payoutRecipientName}>{overview.payoutUser.name}</Text>
              <Text style={styles.payoutRecipientPhone}>{overview.payoutUser.phone}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noRecipient}>No recipient assigned</Text>
        )}
        
        {overview?.paidMembers === overview?.totalMembers && (
          <Button
            onPress={() => router.push(`/groups/payout?id=${id}`)}
            style={styles.confirmPayoutButton}
          >
            Confirm Payout
          </Button>
        )}
      </View>
    </View>
  );

  const renderMemberManagement = () => {
    if (!overview) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Member Management</Text>
        
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberManagementItem}>
              <View style={styles.memberManagementInfo}>
                <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
                  <Text style={styles.avatarText}>{initials(item.name)}</Text>
                </View>
                <View style={styles.memberManagementDetails}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberPhone}>{item.phone}</Text>
                  <Text style={styles.memberPosition}>Position #{item.position}</Text>
                  <Text style={[
                    styles.memberStatus,
                    { color: item.status === 'active' ? colors.success : colors.textLight }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMember(item.id, item.name)}
              >
                <MaterialCommunityIcons name="trash-can" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.membersList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  const renderPenaltyManagement = () => {
    const [waivingPenalty, setWaivingPenalty] = useState(false);
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [waiverReason, setWaiverReason] = useState('');

    const handleWaivePenalty = async () => {
      if (!selectedMember || !waiverReason.trim()) {
        Alert.alert('Error', 'Please select a member and provide a reason');
        return;
      }

      Alert.alert(
        'Waive Penalty',
        `Are you sure you want to waive the late payment penalty for this member?\n\nReason: ${waiverReason}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Waive Penalty',
            style: 'destructive',
            onPress: async () => {
              try {
                // API call to waive penalty would go here
                Alert.alert('Success', 'Penalty waived successfully');
                setWaivingPenalty(false);
                setSelectedMember(null);
                setWaiverReason('');
              } catch (error) {
                Alert.alert('Error', 'Failed to waive penalty');
              }
            }
          }
        ]
      );
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Penalty Management</Text>
        
        <View style={styles.penaltySection}>
          <Text style={styles.penaltySubtitle}>Waive late payment penalties for members</Text>
          
          <View style={styles.memberList}>
            {members
              .filter(member => member.paymentStatus === 'pending')
              .map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberItem,
                    selectedMember === member.id && styles.selectedMember
                  ]}
                  onPress={() => setSelectedMember(member.id)}
                >
                  <View style={styles.memberInfo}>
                    <View style={[styles.avatar, { backgroundColor: member.avatarColor }]}>
                      <Text style={styles.avatarText}>{initials(member.name)}</Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberPhone}>{member.phone}</Text>
                      <Text style={styles.memberPosition}>Position #{member.position}</Text>
                      <Text style={styles.memberStatus}>
                        {member.paymentStatus === 'pending' ? 'Pending' : 'Paid'}
                      </Text>
                    </View>
                  </View>
                  {selectedMember === member.id && (
                    <TouchableOpacity
                      style={styles.waiveButton}
                      onPress={() => setWaivingPenalty(true)}
                    >
                      <MaterialCommunityIcons name="cash-remove" size={16} color={colors.mustard} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {waivingPenalty && (
          <View style={styles.waiverModal}>
            <View style={styles.waiverHeader}>
              <Text style={styles.waiverTitle}>Waive Penalty</Text>
              <TouchableOpacity onPress={() => setWaivingPenalty(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.waiverContent}>
              <Text style={styles.waiverSubtitle}>
                Waiving penalty for: {members.find(m => m.id === selectedMember)?.name}
              </Text>
              
              <View style={styles.waiverForm}>
                <Text style={styles.formLabel}>Reason for waiver:</Text>
                <TextInput
                  style={styles.reasonInput}
                  value={waiverReason}
                  onChangeText={setWaiverReason}
                  placeholder="Enter reason for waiving penalty..."
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.waiverActions}>
                <Button
                  onPress={() => setWaivingPenalty(false)}
                  variant="secondary"
                  style={styles.cancelWaiverButton}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleWaivePenalty}
                  style={styles.confirmWaiverButton}
                >
                  Waive Penalty
                </Button>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderGroupSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Group Settings</Text>
      
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Edit Group Information</Text>
          <TouchableOpacity
            onPress={() => setEditingSettings(!editingSettings)}
          >
            <MaterialCommunityIcons 
              name={editingSettings ? "close" : "pencil"} 
              size={20} 
              color={colors.forestGreen} 
            />
          </TouchableOpacity>
        </View>
        
        {editingSettings ? (
          <View style={styles.settingsForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Group Name</Text>
              <TextInput
                style={styles.input}
                value={settings.name}
                onChangeText={(text) => setSettings(prev => ({ ...prev, name: text }))}
                placeholder="Enter group name"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={settings.description}
                onChangeText={(text) => setSettings(prev => ({ ...prev, description: text }))}
                placeholder="Enter group description"
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Group Rules</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={settings.rules}
                onChangeText={(text) => setSettings(prev => ({ ...prev, rules: text }))}
                placeholder="Enter group rules"
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.settingsActions}>
              <Button
                onPress={handleSaveSettings}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
              <Button
                onPress={() => setEditingSettings(false)}
                variant="secondary"
              >
                Cancel
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.settingsDisplay}>
            <Text style={styles.settingsDisplayLabel}>Group Name:</Text>
            <Text style={styles.settingsDisplayValue}>{overview?.groupName || 'N/A'}</Text>
            
            <Text style={styles.settingsDisplayLabel}>Description:</Text>
            <Text style={styles.settingsDisplayValue}>{overview?.description || 'No description'}</Text>
            
            <Text style={styles.settingsDisplayLabel}>Rules:</Text>
            <Text style={styles.settingsDisplayValue}>{overview?.rules || 'No rules set'}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderTransactionHistory = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction History</Text>
      
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transactionItem}>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionRecipient}>{item.recipientName}</Text>
              <Text style={styles.transactionDetails}>
                Cycle {item.cycleNumber} • {formatRwf(item.amount)}
              </Text>
              <Text style={styles.transactionMethod}>{item.method}</Text>
            </View>
            <View style={styles.transactionStatus}>
              <Text style={[
                styles.statusText,
                { color: item.status === 'completed' ? colors.success : colors.textLight }
              ]}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.transactionsList}
        showsVerticalScrollIndicator={false}
        onEndReached={() => transactions.length >= 50 && loadMoreTransactions()}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      <View style={styles.tabs}>
        {(['cycle', 'members', 'chat', 'admin', 'timeline', 'penalty'] as const).map((tab) => (
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
              {tab === 'cycle' ? 'Cycle' : tab === 'members' ? 'Members' : tab === 'chat' ? 'Chat' : tab === 'admin' ? 'Admin' : tab === 'timeline' ? 'Timeline' : 'Penalty'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverviewCards()}
        {activeTab === 'cycle' && renderCycleProgress()}
        {activeTab === 'payout' && renderPayoutManagement()}
        {activeTab === 'members' && renderMemberManagement()}
        {activeTab === 'settings' && renderGroupSettings()}
        {activeTab === 'history' && renderTransactionHistory()}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.beigeDeep,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: colors.forestGreen,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
  },
  activeTabText: {
    color: colors.white,
  },
  tabMemberStatus: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textLight,
  },
  adminBadge: {
    backgroundColor: colors.forestGreen,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardValue: {
    fontSize: 18,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
  },
  progressHeader: {
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.beigeDeep,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  membersList: {
    marginBottom: 16,
  },
  membersListTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  memberCheckbox: {
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 2,
  },
  memberPosition: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mustard,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.success,
    marginLeft: 4,
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mustard,
    marginLeft: 4,
  },
  reminderSection: {
    marginTop: 16,
  },
  reminderButton: {
    backgroundColor: colors.forestGreen,
  },
  payoutCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payoutHeader: {
    marginBottom: 16,
  },
  payoutTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
  },
  payoutRecipient: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  payoutRecipientInfo: {
    marginLeft: 12,
  },
  payoutRecipientName: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 2,
  },
  payoutRecipientPhone: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  noRecipient: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    fontStyle: 'italic',
  },
  confirmPayoutButton: {
    backgroundColor: colors.mustard,
  },
  memberManagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  memberManagementInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberManagementDetails: {
    marginLeft: 12,
  },
  memberStatus: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textLight,
  },
  removeButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: colors.error + '20',
  },
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
  },
  settingsForm: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.beige,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  settingsActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
  },
  settingsDisplay: {
    marginBottom: 16,
  },
  settingsDisplayLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginBottom: 4,
  },
  settingsDisplayValue: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
    marginBottom: 12,
  },
  transactionsList: {
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionRecipient: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  transactionDetails: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 4,
  },
  transactionMethod: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textLight,
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.beige,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  // Penalty section styles
  penaltySection: { marginBottom: 16 },
  penaltySubtitle: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: '#4A5C4C', marginBottom: 12 },
  memberList: { marginBottom: 16 },
  selectedMember: { borderColor: '#2C4A2E', borderWidth: 2 },
  waiveButton: { backgroundColor: '#C9922A', borderRadius: 8, padding: 10, alignItems: 'center' as const },
  waiverModal: { backgroundColor: '#F5F0E8', borderRadius: 16, padding: 20, margin: 24 },
  waiverHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 16 },
  waiverTitle: { fontSize: 18, fontFamily: 'Fraunces_700Bold', color: '#2C4A2E' },
  waiverContent: { marginBottom: 16 },
  waiverSubtitle: { fontSize: 14, fontFamily: 'DMSans_400Regular', color: '#4A5C4C', marginBottom: 12 },
  waiverForm: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: '#2C4A2E', marginBottom: 8 },
  reasonInput: { backgroundColor: '#EDE8DC', borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular', color: '#1C2B1E', minHeight: 80, textAlignVertical: 'top' as const },
  waiverActions: { flexDirection: 'row' as const, gap: 12 },
  cancelWaiverButton: { flex: 1, backgroundColor: '#EDE8DC', borderRadius: 8, padding: 12, alignItems: 'center' as const },
  confirmWaiverButton: { flex: 1, backgroundColor: '#C9922A', borderRadius: 8, padding: 12, alignItems: 'center' as const },
});
