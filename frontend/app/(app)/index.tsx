import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { colors } from '../../utils/colors';
import { formatRwf } from '../../utils/format';
import api from '../../utils/api';

interface Summary {
  totalContributed: number;
  pendingPayments: number;
  activeGroups: number;
}

interface Group {
  id: string;
  name: string;
  emoji: string;
  contribution_amount: number;
  member_count: number;
  total_saved: number;
  current_cycle: number;
  total_cycles: number;
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, groupsRes] = await Promise.all([
        api.get('/contributions/my-summary'),
        api.get('/groups')
      ]);
      setSummary(summaryRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Muraho, {firstName} 👋</Text>
            <Text style={styles.subtitle}>Welcome back to your savings journey</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {summary && (
        <View style={[styles.summaryCard, { backgroundColor: colors.mustardLight }]}>
          <Text style={styles.summaryTitle}>Your Savings Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatRwf(summary.totalContributed)}</Text>
              <Text style={styles.summaryLabel}>Total Saved</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.activeGroups}</Text>
              <Text style={styles.summaryLabel}>Active Groups</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.pendingPayments}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>
        </View>
      )}

      {summary && summary.pendingPayments > 0 && (
        <View style={[styles.alertCard, { borderColor: colors.error }]}>
          <Text style={styles.alertTitle}>Payment Due</Text>
          <Text style={styles.alertMessage}>You have {summary.pendingPayments} pending payment(s)</Text>
          <Button onPress={() => router.push('/groups')} style={styles.alertButton}>
            Pay Now
          </Button>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Groups</Text>
          <TouchableOpacity onPress={() => router.push('/groups')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {groups.length > 0 ? (
          groups.slice(0, 3).map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => router.push(`/groups/${group.id}`)}
            >
              <View style={styles.groupHeader}>
                <Text style={styles.groupEmoji}>{group.emoji}</Text>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupDetails}>
                    {group.member_count} members • {formatRwf(group.contribution_amount)}
                  </Text>
                </View>
                <Text style={styles.groupCycle}>
                  Cycle {group.current_cycle}/{group.total_cycles}
                </Text>
              </View>
              <View style={styles.groupProgress}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(group.current_cycle / group.total_cycles) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {formatRwf(group.total_saved)} saved
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyMessage}>Start your first Ikimina today!</Text>
            <Button onPress={() => router.push('/groups/create')} style={styles.emptyButton}>
              Create Group
            </Button>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/groups/create')}
          >
            <Text style={styles.actionEmoji}>➕</Text>
            <Text style={styles.actionTitle}>Start Ikimina</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/groups/join')}
          >
            <Text style={styles.actionEmoji}>🔗</Text>
            <Text style={styles.actionTitle}>Join Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textLight,
  },
  summaryCard: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  alertCard: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    marginBottom: 24,
  },
  alertTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.error,
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 12,
  },
  alertButton: {
    backgroundColor: colors.error,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.mustard,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 2,
  },
  groupDetails: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  groupCycle: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textLight,
    backgroundColor: colors.beige,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  groupProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.beige,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.forestGreen,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: colors.forestGreen,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
    textAlign: 'center',
  },
});
