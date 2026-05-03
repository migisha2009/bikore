import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
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
}

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        <Text style={styles.subtitle}>{groups.length} {groups.length === 1 ? 'group' : 'groups'}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {groups.length > 0 ? (
          groups.map((group) => (
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
                  {group.position && (
                    <Text style={styles.position}>Position #{group.position}</Text>
                  )}
                </View>
                <View style={styles.cycleBox}>
                  <Text style={styles.cycleNum}>{group.current_cycle}/{group.total_cycles}</Text>
                  <Text style={styles.cycleLabel}>cycles</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(group.current_cycle / group.total_cycles) * 100}%` }]} />
              </View>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>{formatRwf(group.total_saved || 0)} saved</Text>
                <Text style={styles.progressPct}>{Math.round((group.current_cycle / group.total_cycles) * 100)}% complete</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyMessage}>Start your first Ikimina or join an existing group.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(app)/groups/create')}>
              <Text style={styles.emptyBtnText}>Create Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emptyBtnOutline} onPress={() => router.push('/(app)/groups/join')}>
              <Text style={styles.emptyBtnOutlineText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/groups/create')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: 'Fraunces_700Bold', color: colors.forestGreen, marginBottom: 4 },
  subtitle: { fontSize: 16, fontFamily: 'DMSans_400Regular', color: colors.textMid },
  content: { flex: 1, paddingHorizontal: 24 },
  groupCard: { backgroundColor: colors.beige, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.beigeDeep },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  groupEmoji: { fontSize: 32, marginRight: 12 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 17, fontFamily: 'DMSans_700Bold', color: colors.textDark, marginBottom: 3 },
  groupDetails: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: colors.textMid, marginBottom: 3 },
  position: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: colors.mustard },
  cycleBox: { alignItems: 'center' },
  cycleNum: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: colors.forestGreen },
  cycleLabel: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: colors.textLight },
  progressBar: { height: 6, backgroundColor: colors.beigeDeep, borderRadius: 3, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: colors.forestGreen, borderRadius: 3 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.textDark },
  progressPct: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: colors.textLight },
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: colors.beige, borderRadius: 16, marginTop: 20, borderWidth: 1, borderColor: colors.beigeDeep },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontFamily: 'Fraunces_700Bold', color: colors.textDark, marginBottom: 10 },
  emptyMessage: { fontSize: 15, fontFamily: 'DMSans_400Regular', color: colors.textMid, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  emptyBtn: { backgroundColor: colors.forestGreen, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginBottom: 12, width: '100%', alignItems: 'center' },
  emptyBtnText: { color: '#F5F0E8', fontFamily: 'DMSans_700Bold', fontSize: 16, fontWeight: 'bold' },
  emptyBtnOutline: { borderWidth: 1.5, borderColor: colors.forestGreen, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, width: '100%', alignItems: 'center' },
  emptyBtnOutlineText: { color: colors.forestGreen, fontFamily: 'DMSans_700Bold', fontSize: 16, fontWeight: 'bold' },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.mustard, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabText: { fontSize: 32, color: '#F5F0E8', fontWeight: 'bold', lineHeight: 36 },
});