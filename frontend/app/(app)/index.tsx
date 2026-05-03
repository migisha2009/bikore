import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();
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
        api.get('/groups'),
      ]);
      setSummary(summaryRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.forestGreen, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Muraho, {firstName} 👋</Text>
        <Text style={styles.subtitle}>Welcome back to your savings journey</Text>
      </View>

      {/* Summary Card */}
      {summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Savings Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatRwf(summary.totalContributed)}</Text>
              <Text style={styles.summaryLabel}>Total Saved</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.activeGroups}</Text>
              <Text style={styles.summaryLabel}>Active Groups</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.pendingPayments}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>
        </View>
      )}

      {/* Payment Due Alert */}
      {summary && summary.pendingPayments > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠️ Payment Due</Text>
          <Text style={styles.alertMessage}>
            You have {summary.pendingPayments} pending payment(s)
          </Text>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => router.push('/(app)/groups')}
          >
            <Text style={styles.alertButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* My Groups */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Groups</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/groups')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {groups.length > 0 ? (
          groups.slice(0, 3).map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => router.push(`/(app)/groups/${group.id}`)}
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
                  {group.current_cycle}/{group.total_cycles}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(group.current_cycle / group.total_cycles) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {formatRwf(group.total_saved || 0)} saved
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyMessage}>Start your first Ikimina today!</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(app)/groups/create')}
            >
              <Text style={styles.emptyButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(app)/groups/create')}
          >
            <Text style={styles.actionEmoji}>➕</Text>
            <Text style={styles.actionTitle}>Start Ikimina</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(app)/groups/join')}
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
    paddingTop: 60,
    paddingBottom: 16,
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
  summaryCard: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: colors.mustardLight,
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
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#C9922A44',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  alertCard: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: 24,
  },
  alertTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
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
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    fontWeight: 'bold',
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
    backgroundColor: colors.beige,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
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
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 2,
  },
  groupDetails: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  groupCycle: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.forestGreen,
    backgroundColor: colors.mintGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.beigeDeep,
    borderRadius: 3,
    marginBottom: 6,
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
    backgroundColor: colors.beige,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
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
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#F5F0E8',
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.beigeDeep,
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