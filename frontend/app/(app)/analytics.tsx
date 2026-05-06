import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../utils/colors';
import { formatRwf } from '../../utils/format';
import api from '../../utils/api';

const screenWidth = Dimensions.get('window').width - 40;

interface AnalyticsData {
  total_saved: number;
  average_monthly_savings: number;
  on_time_payment_rate: number;
  groups_completed: number;
  payment_streak: number;
  monthly_breakdown: Array<{ month: string; amount: number }>;
}

interface ChartData {
  monthlySavings: Array<{ month: string; amount: number }>;
  groupContributions: Array<{ name: string; emoji: string; value: number }>;
  savingsProgress: Array<{ month: string; savings: number }>;
  paymentStreak: {
    current_streak: number;
    recent_payments: Array<{
      month: string;
      amount: number;
      on_time: boolean;
      days_late: number;
    }>;
  };
}

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [overviewRes, monthlyRes, groupRes, progressRes, streakRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/monthly-savings'),
        api.get('/analytics/group-contributions'),
        api.get('/analytics/savings-progress'),
        api.get('/analytics/payment-streak')
      ]);

      setAnalyticsData(overviewRes.data);
      setChartData({
        monthlySavings: monthlyRes.data,
        groupContributions: groupRes.data,
        savingsProgress: progressRes.data,
        paymentStreak: streakRes.data
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const barChartConfig = {
    backgroundGradientFrom: colors.forestGreen,
    backgroundGradientTo: colors.forestGreen,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    useShadowColorFromBackdrop: false,
    propsForLabels: {
      fontSize: 10,
      fontFamily: 'DMSans_400Regular',
    },
    formatYLabel: (value: string) => formatRwf(parseInt(value)),
  };

  const lineChartConfig = {
    backgroundGradientFrom: colors.forestGreen,
    backgroundGradientTo: colors.forestGreen,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    useShadowColorFromBackdrop: false,
    propsForLabels: {
      fontSize: 10,
      fontFamily: 'DMSans_400Regular',
    },
    formatYLabel: (value: string) => formatRwf(parseInt(value)),
  };

  const pieChartConfig = {
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    propsForLabels: {
      fontSize: 10,
      fontFamily: 'DMSans_400Regular',
    },
  };

  const pieColors = [
    colors.forestGreen,
    colors.mustard,
    colors.error,
    colors.textMid,
    colors.beige,
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.forestGreen} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analyticsData || !chartData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load analytics data</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Stats Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name="piggy-bank" size={24} color={colors.forestGreen} />
            </View>
            <Text style={styles.statValue}>{formatRwf(analyticsData.total_saved)}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name="calendar-month" size={24} color={colors.mustard} />
            </View>
            <Text style={styles.statValue}>{formatRwf(analyticsData.average_monthly_savings)}</Text>
            <Text style={styles.statLabel}>Avg Monthly</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name="clock-check" size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{analyticsData.on_time_payment_rate}%</Text>
            <Text style={styles.statLabel}>On-Time Rate</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name="trophy" size={24} color={colors.textMid} />
            </View>
            <Text style={styles.statValue}>{analyticsData.groups_completed}</Text>
            <Text style={styles.statLabel}>Groups Completed</Text>
          </View>
        </View>
      </View>

      {/* Payment Streak */}
      <View style={styles.streakSection}>
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <MaterialCommunityIcons name="fire" size={32} color={colors.error} />
            <View style={styles.streakInfo}>
              <Text style={styles.streakValue}>{analyticsData.payment_streak}</Text>
              <Text style={styles.streakLabel}>Month Streak</Text>
            </View>
          </View>
          <Text style={styles.streakSubtext}>Consecutive on-time payments</Text>
        </View>
      </View>

      {/* Monthly Savings Bar Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Monthly Savings (Last 6 Months)</Text>
        <View style={styles.chartContainer}>
          {chartData.monthlySavings.length > 0 ? (
            <BarChart
              data={{
                labels: chartData.monthlySavings.map(item => item.month),
                datasets: [{
                  data: chartData.monthlySavings.map(item => item.amount)
                }]
              }}
              width={screenWidth}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={barChartConfig}
              style={styles.chart}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No savings data available</Text>
            </View>
          )}
        </View>
      </View>

      {/* Group Contributions Pie Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Contributions by Group</Text>
        <View style={styles.chartContainer}>
          {chartData.groupContributions.length > 0 ? (
            <PieChart
              data={chartData.groupContributions.map((item, index) => ({
                name: `${item.emoji} ${item.name}`,
                value: item.value,
                color: pieColors[index % pieColors.length]
              }))}
              width={screenWidth}
              height={220}
              paddingLeft="15"
              chartConfig={pieChartConfig}
              accessor="value"
              backgroundColor="transparent"
              style={styles.chart}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No contribution data available</Text>
            </View>
          )}
        </View>
      </View>

      {/* Savings Progress Line Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Savings Progress Over Time</Text>
        <View style={styles.chartContainer}>
          {chartData.savingsProgress.length > 0 ? (
            <LineChart
              data={{
                labels: chartData.savingsProgress.map(item => item.month),
                datasets: [{
                  data: chartData.savingsProgress.map(item => item.savings)
                }]
              }}
              width={screenWidth}
              height={220}
              chartConfig={lineChartConfig}
              style={styles.chart}
              bezier
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No progress data available</Text>
            </View>
          )}
        </View>
      </View>

      {/* Recent Payment History */}
      <View style={styles.historySection}>
        <Text style={styles.chartTitle}>Recent Payment History</Text>
        <View style={styles.historyList}>
          {chartData.paymentStreak.recent_payments.slice(0, 5).map((payment, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyMonth}>{payment.month}</Text>
                <Text style={styles.historyAmount}>{formatRwf(payment.amount)}</Text>
              </View>
              <View style={styles.historyRight}>
                <MaterialCommunityIcons
                  name={payment.on_time ? "check-circle" : "clock-alert"}
                  size={20}
                  color={payment.on_time ? colors.success : colors.error}
                />
                {!payment.on_time && (
                  <Text style={styles.daysLate}>{payment.days_late} days late</Text>
                )}
              </View>
            </View>
          ))}
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
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginTop: 16,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: colors.error,
    marginTop: 100,
  },
  // Stats Cards
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.beige,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Fraunces_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
  },
  // Streak Section
  streakSection: {
    marginBottom: 24,
  },
  streakCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakInfo: {
    marginLeft: 16,
  },
  streakValue: {
    fontSize: 32,
    fontFamily: 'Fraunces_700Bold',
    color: colors.textDark,
  },
  streakLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
  },
  streakSubtext: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
  },
  // Chart Sections
  chartSection: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    textAlign: 'center',
  },
  // History Section
  historySection: {
    marginBottom: 32,
  },
  historyList: {
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.beige,
  },
  historyLeft: {
    flex: 1,
  },
  historyMonth: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.textDark,
    marginBottom: 4,
  },
  historyAmount: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.forestGreen,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  daysLate: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.error,
    marginTop: 4,
  },
});
