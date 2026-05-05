import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';
import { formatRwf } from '../../utils/format';
import api from '../../utils/api';

interface Contribution {
  id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string;
  group_name: string;
  cycle_number: number;
}

interface PaymentSummary {
  totalContributed: number;
  pendingPayments: number;
  activeGroups: number;
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      const [summaryRes, contributionsRes] = await Promise.all([
        api.get('/contributions/my-summary'),
        api.get('/contributions?userId=' + user?.id)
      ]);
      
      setSummary(summaryRes.data);
      setContributions(contributionsRes.data);
    } catch (error: any) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'pending': return colors.mustard;
      default: return colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return 'check-circle';
      case 'pending': return 'clock';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSub}>Track your contributions</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        {summary && (
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.forestGreen} />
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryValue}>{formatRwf(summary.totalContributed)}</Text>
                  <Text style={styles.summaryLabel}>Total Contributed</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.smallCard]}>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="account-group" size={20} color={colors.forestGreen} />
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryValue}>{summary.activeGroups}</Text>
                    <Text style={styles.summaryLabel}>Active Groups</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.summaryCard, styles.smallCard]}>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="clock" size={20} color={colors.mustard} />
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryValue}>{summary.pendingPayments}</Text>
                    <Text style={styles.summaryLabel}>Pending</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Payment History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          
          {contributions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="receipt" size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptySub}>Your contribution history will appear here</Text>
            </View>
          ) : (
            contributions.map((contribution) => (
              <View key={contribution.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentGroup}>{contribution.group_name}</Text>
                    <Text style={styles.paymentDetails}>
                      Cycle {contribution.cycle_number} • {formatDate(contribution.paid_at)}
                    </Text>
                  </View>
                  <View style={styles.paymentAmount}>
                    <Text style={styles.amount}>{formatRwf(contribution.amount)}</Text>
                  </View>
                </View>
                
                <View style={styles.paymentFooter}>
                  <View style={styles.paymentMethod}>
                    <MaterialCommunityIcons name="phone" size={16} color={colors.textMid} />
                    <Text style={styles.methodText}>{contribution.method}</Text>
                  </View>
                  <View style={styles.paymentStatus}>
                    <MaterialCommunityIcons 
                      name={getStatusIcon(contribution.status)} 
                      size={16} 
                      color={getStatusColor(contribution.status)} 
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(contribution.status) }]}>
                      {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  summarySection: {
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  smallCard: {
    flex: 1,
    padding: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.textMid,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentGroup: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  paymentDetails: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginLeft: 4,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    marginLeft: 4,
  },
});