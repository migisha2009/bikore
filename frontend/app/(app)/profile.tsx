import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Linking
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';
import { formatRwf, initials } from '../../utils/format';
import api from '../../utils/api';

interface ProfileStats {
  groupsJoined: number;
  totalContributed: number;
  totalReceived: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/contributions/my-summary');
      const groupsData = await api.get('/groups');
      setStats({
        groupsJoined: groupsData.data.length,
        totalContributed: data.totalContributed,
        totalReceived: 0,
      });
    } catch (error) {
      console.error('Error fetching profile stats:', error);
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
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('https://wa.me/250782722112');
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.forestGreen, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  const userInitials = user?.name ? initials(user.name) : 'BK';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: user?.avatar_color || colors.forestGreen }]}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userPhone}>{user?.phone}</Text>
        <Text style={styles.memberSince}>
          Member since {new Date(user?.created_at || '').getFullYear()}
        </Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Impact</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.groupsJoined}</Text>
              <Text style={styles.statLabel}>Groups Joined</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatRwf(stats.totalContributed)}</Text>
              <Text style={styles.statLabel}>Contributed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatRwf(stats.totalReceived)}</Text>
              <Text style={styles.statLabel}>Received</Text>
            </View>
          </View>
        </View>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>🔔 Notifications</Text>
              <Text style={styles.settingDesc}>Reminders for contributions</Text>
            </View>
            <View style={styles.toggle}>
              <View style={styles.toggleThumbActive} />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>🌐 Language</Text>
              <Text style={styles.settingDesc}>English</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={handleContactSupport}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>💬 Contact Support</Text>
              <Text style={styles.settingDesc}>Chat via WhatsApp</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Bikore v1.0.0</Text>
        <Text style={styles.footerSubtext}>Save Together, Grow Together 🇷🇼</Text>
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
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    marginBottom: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Fraunces_700Bold',
    color: '#F5F0E8',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
  statsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.beige,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: colors.beigeDeep,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.forestGreen,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumbActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5F0E8',
    alignSelf: 'flex-end',
  },
  chevron: {
    fontSize: 22,
    color: colors.textLight,
  },
  logoutBtn: {
    backgroundColor: '#C0392B',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'DMSans_700Bold',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 48,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
});