import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Linking, Share, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';
import { formatRwf, initials } from '../../utils/format';
import api from '../../utils/api';
import { t, getCurrentLocale, setLocale, availableLanguages } from '../../utils/i18n';

interface ProfileStats {
  totalContributed: number;
  activeGroups: number;
}

interface ReferralData {
  id: string;
  code: string;
  created_at: string;
  is_active: boolean;
}

interface CreditsData {
  balance: number;
  history: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    created_at: string;
  }>;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [trustScore, setTrustScore] = useState<number>(100);
  const [currentLocale, setCurrentLocale] = useState(getCurrentLocale());
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);

  useEffect(() => { 
    fetchStats();
    fetchTrustScore();
    fetchReferralData();
    fetchCreditsData();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/contributions/my-summary');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTrustScore = async () => {
    try {
      const { data } = await api.get(`/users/trust-score/${user.id}`);
      setTrustScore(data.trustScore || 100);
    } catch (error) {
      console.error('Error fetching trust score:', error);
    }
  };

  const fetchReferralData = async () => {
    try {
      const { data } = await api.get('/referrals/my-code');
      setReferralData(data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
  };

  const fetchCreditsData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        api.get('/referrals/credits/balance'),
        api.get('/referrals/credits/history')
      ]);
      
      setCreditsData({
        balance: balanceRes.data.balance,
        history: historyRes.data
      });
    } catch (error) {
      console.error('Error fetching credits data:', error);
    }
  };

  const handleLanguageChange = (locale: string) => {
    setLocale(locale);
    setCurrentLocale(locale);
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 90) return t('excellent');
    if (score >= 70) return t('good');
    if (score >= 50) return t('fair');
    return t('poor');
  };

  const getTrustScoreEmoji = (score: number) => {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  };

  const handleInviteFriends = async () => {
    if (!referralData?.code) {
      Alert.alert('Error', 'Referral code not available');
      return;
    }

    const shareMessage = `Join me on Bikore — Rwanda's digital Ikimina! Use my code ${referralData.code} when signing up. Download: https://bikore.vercel.app`;
    
    try {
      await Share.share({
        message: shareMessage,
        url: 'https://bikore.vercel.app',
        title: 'Join Bikore',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copying to clipboard
      Alert.alert(
        'Invite Friends',
        shareMessage,
        [
          { text: 'OK', style: 'default' },
          { text: 'Copy', onPress: () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`) }
        ]
      );
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

  const userInitials = user?.name ? initials(user.name) : 'BK';

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2C4A2E" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Avatar & Name */}
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
      <View style={styles.statsRow}>
        <View style={styles.profileCard}>
          <Text style={styles.cardTitle}>Trust Score</Text>
          
          <View style={styles.trustScoreContainer}>
            <View style={styles.trustScoreBadge}>
              <Text style={styles.trustScoreText}>{trustScore}</Text>
            </View>
            <Text style={styles.trustScoreLabel}>
              {trustScore >= 90 ? '🟢 Excellent' : 
               trustScore >= 70 ? '🟡 Good' : 
               trustScore >= 50 ? '🟠 Fair' : 
               '🔴 Poor'}
            </Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="account-group" size={24} color={colors.forestGreen} />
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{stats?.activeGroups || 0}</Text>
            <Text style={styles.statLabel}>Active Groups</Text>
          </View>
        </View>
      </View>

      {/* Referral Section */}
      {referralData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referral Program</Text>
          <View style={styles.card}>
            <View style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <MaterialCommunityIcons name="gift" size={24} color={colors.forestGreen} />
                <View style={styles.referralInfo}>
                  <Text style={styles.referralTitle}>Invite Friends</Text>
                  <Text style={styles.referralSub}>Earn Rwf 1,000 for each friend who joins</Text>
                </View>
              </View>
              
              <View style={styles.referralCodeContainer}>
                <Text style={styles.referralCodeLabel}>Your Code:</Text>
                <View style={styles.referralCodeBox}>
                  <Text style={styles.referralCode}>{referralData.code}</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`Join me on Bikore — Rwanda's digital Ikimina! Use my code ${referralData.code} when signing up. Download: https://bikore.vercel.app`)}`)}>
                    <MaterialCommunityIcons name="share" size={16} color={colors.forestGreen} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity style={styles.inviteButton} onPress={handleInviteFriends}>
                <MaterialCommunityIcons name="account-plus" size={20} color={colors.white} />
                <Text style={styles.inviteButtonText}>Invite Friends</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Credits Section */}
      {creditsData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits Balance</Text>
          <View style={styles.card}>
            <View style={styles.creditsCard}>
              <View style={styles.creditsHeader}>
                <MaterialCommunityIcons name="wallet-giftcard" size={24} color={colors.mustard} />
                <View style={styles.creditsInfo}>
                  <Text style={styles.creditsBalance}>{formatRwf(creditsData.balance)}</Text>
                  <Text style={styles.creditsLabel}>Available Credits</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.viewHistoryButton} onPress={() => router.push('/credits')}>
                <Text style={styles.viewHistoryText}>View History</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMid} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings')}</Text>
          <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{t('language')}</Text>
              <Text style={styles.settingSub}>
                {availableLanguages.find(lang => lang.code === currentLocale)?.nativeName}
              </Text>
            </View>
            <View style={styles.languageSelector}>
              {availableLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    currentLocale === lang.code && styles.selectedLanguage
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={[
                    styles.languageText,
                    currentLocale === lang.code && styles.selectedLanguageText
                  ]}>
                    {lang.nativeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/notifications')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingSub}>Manage notifications</Text>
            </View>
            <MaterialCommunityIcons name="bell" size={20} color={colors.textMid} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{t('signOut')}</Text>
              <Text style={styles.settingSub}>Sign out of your account</Text>
            </View>
            <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  header: { alignItems: 'center', padding: 24, paddingTop: 60, marginBottom: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontFamily: 'Fraunces_700Bold', color: '#F5F0E8' },
  userName: { fontSize: 24, fontFamily: 'Fraunces_700Bold', color: colors.textDark, marginBottom: 4 },
  userPhone: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  profileCard: { flex: 1, backgroundColor: colors.beige, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.beigeDeep },
  trustScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.beige,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  trustScoreBadge: {
    backgroundColor: colors.forestGreen,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trustScoreText: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.white,
  },
  trustScoreLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    marginTop: 4,
    textAlign: 'center',
  },
  statInfo: { alignItems: 'center', marginLeft: 12 },
  statCard: { flex: 1, backgroundColor: colors.beige, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.beigeDeep },
  statValue: { fontSize: 20, fontFamily: 'Fraunces_700Bold', color: colors.forestGreen, marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: colors.textMid },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontFamily: 'Fraunces_700Bold', color: colors.forestGreen, marginBottom: 16 },
  card: { backgroundColor: colors.beige, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.beigeDeep },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.textDark, marginBottom: 2 },
  settingDesc: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: colors.textLight },
  divider: { height: 1, backgroundColor: colors.beigeDeep },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: colors.forestGreen, padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F5F0E8', alignSelf: 'flex-end' },
  chevron: { fontSize: 22, color: colors.textLight },
  logoutBtn: { backgroundColor: '#C0392B', borderRadius: 12, padding: 18, alignItems: 'center' },
  logoutText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', fontFamily: 'DMSans_700Bold' },
  footer: { alignItems: 'center', paddingBottom: 48, paddingTop: 8 },
  footerText: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: colors.textLight, marginBottom: 4 },
  footerSubtext: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: colors.textLight },
  // Language selector styles
  languageSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  languageOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.beige,
  },
  selectedLanguage: {
    backgroundColor: colors.forestGreen,
  },
  languageText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
  },
  selectedLanguageText: {
    color: colors.white,
  },
  // Referral styles
  referralCard: {
    padding: 16,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  referralInfo: {
    marginLeft: 12,
    flex: 1,
  },
  referralTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  referralSub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  referralCodeContainer: {
    marginBottom: 16,
  },
  referralCodeLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
    marginBottom: 8,
  },
  referralCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.beige,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  referralCode: {
    fontSize: 18,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  copyButton: {
    backgroundColor: colors.forestGreen,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.forestGreen,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inviteButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    marginLeft: 8,
  },
  // Credits styles
  creditsCard: {
    padding: 16,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsInfo: {
    marginLeft: 12,
    flex: 1,
  },
  creditsBalance: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  creditsLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.beige,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewHistoryText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
  },
  cardTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#2C4A2E', marginBottom: 8 },
  settingSub: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: '#8A9B8C' },
});
