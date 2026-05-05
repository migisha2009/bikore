import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../utils/colors';
import api from '../../../utils/api';

interface MemberRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: string;
  message: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  name: string;
  phone: string;
  avatar_color: string;
  user_created_at: string;
}

interface GroupInfo {
  id: string;
  name: string;
  emoji: string;
}

export default function RequestsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchRequests(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      // Filter groups where user is admin
      const adminGroups = data.filter((group: any) => group.admin_id === user?.id);
      setGroups(adminGroups);
      
      if (adminGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(adminGroups[0].id);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchRequests = async (groupId: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/groups/${groupId}/requests`);
      setRequests(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!selectedGroupId) return;

    try {
      const { data } = await api.post(`/groups/${selectedGroupId}/requests/${requestId}/approve`);
      
      // Update the requests list with the new member list
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      Alert.alert(
        'Request Approved',
        'The member has been successfully added to the group.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this join request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            if (!selectedGroupId) return;

            try {
              await api.post(`/groups/${selectedGroupId}/requests/${requestId}/reject`);
              
              // Remove the rejected request from the list
              setRequests(prev => prev.filter(req => req.id !== requestId));
              
              Alert.alert('Request Rejected', 'The join request has been rejected.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedGroupId) {
      await fetchRequests(selectedGroupId);
    }
    setRefreshing(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  const renderRequestItem = ({ item }: { item: MemberRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: item.avatar_color }]}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userPhone}>{item.phone}</Text>
            <Text style={styles.requestTime}>Requested {formatTimeAgo(item.requested_at)}</Text>
          </View>
        </View>
      </View>

      {item.message && (
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <Button
          onPress={() => handleApprove(item.id)}
          style={styles.approveButton}
        >
          Approve
        </Button>
        <Button
          onPress={() => handleReject(item.id)}
          variant="secondary"
          style={styles.rejectButton}
        >
          Reject
        </Button>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>📋</Text>
      <Text style={styles.emptyTitle}>No pending requests</Text>
      <Text style={styles.emptyMessage}>
        {selectedGroupId 
          ? "There are no pending join requests for this group."
          : "Select a group to view pending requests."
        }
      </Text>
    </View>
  );

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Member Requests</Text>
      </View>

      {groups.length > 0 && (
        <View style={styles.groupSelector}>
          <Text style={styles.selectorLabel}>Select Group:</Text>
          <View style={styles.groupTabs}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupTab,
                  selectedGroupId === group.id && styles.groupTabActive,
                ]}
                onPress={() => setSelectedGroupId(group.id)}
              >
                <Text style={styles.groupTabEmoji}>{group.emoji}</Text>
                <Text style={[
                  styles.groupTabText,
                  selectedGroupId === group.id && styles.groupTabTextActive,
                ]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {selectedGroup && (
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            {selectedGroup.emoji} {selectedGroup.name} • {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </Text>
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
  groupSelector: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginBottom: 8,
  },
  groupTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  groupTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  groupTabActive: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  groupTabEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  groupTabText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
  },
  groupTabTextActive: {
    color: colors.white,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  requestCard: {
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
  requestHeader: {
    marginBottom: 12,
  },
  userInfo: {
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
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
  messageSection: {
    backgroundColor: colors.beige,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: colors.textMid,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textDark,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.success,
  },
  rejectButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
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
  footerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.beigeDeep,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    textAlign: 'center',
  },
});
