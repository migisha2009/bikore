import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../utils/colors';
import { formatRwf } from '../../../utils/format';
import api from '../../../utils/api';

interface Group {
  id: string;
  name: string;
  emoji: string;
  contribution_amount: number;
  member_count: number;
  total_saved: number;
  current_cycle: number;
  total_cycles: number;
  position?: number;
  joined_at?: string;
}

export default function GroupsScreen() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    router.push('/groups/create');
  };

  const handleJoinGroup = () => {
    router.push('/groups/join');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        <Text style={styles.subtitle}>
          {groups.length} {groups.length === 1 ? 'group' : 'groups'}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {groups.length > 0 ? (
          groups.map((group) => (
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
                  {group.position && (
                    <Text style={styles.position}>
                      Your position: #{group.position}
                    </Text>
                  )}
                </View>
                <View style={styles.groupStatus}>
                  <Text style={styles.groupCycle}>
                    {group.current_cycle}/{group.total_cycles}
                  </Text>
                  <Text style={styles.cycleLabel}>cycles</Text>
                </View>
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
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {formatRwf(group.total_saved)} saved
                  </Text>
                  <Text style={styles.progressLabel}>
                    {Math.round((group.current_cycle / group.total_cycles) * 100)}% complete
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyMessage}>
              Start your first Ikimina or join an existing group to begin saving together.
            </Text>
            <View style={styles.emptyActions}>
              <Button onPress={handleCreateGroup} style={styles.actionButton}>
                Create Group
              </Button>
              <Button onPress={handleJoinGroup} variant="secondary" style={styles.actionButton}>
                Join Group
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleCreateGroup}>
        <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
      </TouchableOpacity>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontSize: 18,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 4,
  },
  groupDetails: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 4,
  },
  position: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mustard,
  },
  groupStatus: {
    alignItems: 'center',
  },
  groupCycle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.forestGreen,
  },
  cycleLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
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
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.textDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyActions: {
    gap: 12,
    width: '100%',
  },
  actionButton: {
    width: '100%',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
