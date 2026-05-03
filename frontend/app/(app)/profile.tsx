import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
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
        totalReceived: 0, // This would be calculated from payouts in a real implementation
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
          onPress: logout,
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('https://wa.me/250782722112');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const userInitials = user?.name ? initials(user.name) : 'U';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.statLabel}>Total Contributed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatRwf(stats.totalReceived)}</Text>
              <Text style={styles.statLabel}>Total Received</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingDescription}>
              Get reminders for contributions and payouts
            </Text>
          </View>
          <TouchableOpacity style={styles.toggle}>
            <View style={[styles.toggleThumb, styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Language</Text>
            <Text style={styles.settingDescription}>English</Text>
          </View>
          <TouchableOpacity style={styles.chevron}>
            <Text style={styles.chevronText}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.settingItem} onPress={handleContactSupport}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Contact Support</Text>
            <Text style={styles.settingDescription}>Get help via WhatsApp</Text>
          </View>
          <TouchableOpacity style={styles.chevron}>
            <Text style={styles.chevronText}>›</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsSection}>
        <Button onPress={handleLogout} style={styles.logoutButton}>
          Logout
        </Button>
      </View>

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
    paddingTop: 40,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Fraunces_700Bold',
    color: colors.white,
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
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
  statsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
  },
  settingsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: colors.textDark,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.beige,
    padding: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.beigeDeep,
  },
  toggleThumbActive: {
    backgroundColor: colors.forestGreen,
    alignSelf: 'flex-end',
  },
  chevron: {
    padding: 4,
  },
  chevronText: {
    fontSize: 20,
    color: colors.textLight,
    fontFamily: 'DMSans_400Regular',
  },
  actionsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
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
