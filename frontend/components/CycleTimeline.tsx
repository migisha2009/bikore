import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import { formatRwf, initials } from '../../utils/format';

interface Cycle {
  id: string;
  cycleNumber: number;
  contributionAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  payoutUserId: string | null;
  payoutRecipientName: string | null;
  payoutRecipientColor: string | null;
  paidCount: number;
  totalMembers: number;
  isComplete: boolean;
}

interface CycleTimelineProps {
  cycles: Cycle[];
  currentCycleNumber: number;
  onCyclePress?: (cycle: Cycle) => void;
}

export default function CycleTimeline({ cycles, currentCycleNumber, onCyclePress }: CycleTimelineProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.mustard;
      case 'completed':
        return colors.success;
      default:
        return colors.textMid;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'clock';
      case 'completed':
        return 'check-circle';
      default:
        return 'help-circle';
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

  const renderCycle = (cycle: Cycle) => {
    const isCurrent = cycle.cycleNumber === currentCycleNumber;
    const progress = cycle.totalMembers > 0 ? (cycle.paidCount / cycle.totalMembers) * 100 : 0;

    return (
      <TouchableOpacity
        key={cycle.id}
        style={[
          styles.cycleCard,
          isCurrent && styles.currentCycleCard
        ]}
        onPress={() => onCyclePress?.(cycle)}
      >
        <View style={styles.cycleHeader}>
          <View style={styles.cycleInfo}>
            <View style={styles.cycleNumber}>
              <Text style={[
                styles.cycleNumberText,
                isCurrent && styles.currentCycleNumberText
              ]}>
                Cycle {cycle.cycleNumber}
              </Text>
              <View style={styles.cycleStatus}>
                <MaterialCommunityIcons 
                  name={getStatusIcon(cycle.status)} 
                  size={16} 
                  color={getStatusColor(cycle.status)} 
                />
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(cycle.status) }
                ]}>
                  {cycle.status}
                </Text>
              </View>
            </View>
            
            <Text style={styles.cycleAmount}>
              {formatRwf(cycle.contributionAmount)}
            </Text>
          </View>
          
          {cycle.status === 'completed' && cycle.payoutRecipientName && (
            <View style={styles.payoutInfo}>
              <View style={[styles.avatar, { backgroundColor: cycle.payoutRecipientColor || colors.beige }]}>
                <Text style={styles.avatarText}>
                  {initials(cycle.payoutRecipientName)}
                </Text>
              </View>
              <View style={styles.payoutDetails}>
                <Text style={styles.payoutLabel}>Paid to:</Text>
                <Text style={styles.payoutName}>{cycle.payoutRecipientName}</Text>
              </View>
            </View>
          )}
        </View>

        {cycle.status === 'active' && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {cycle.paidCount}/{cycle.totalMembers} members paid
            </Text>
          </View>
        )}

        <View style={styles.cycleDates}>
          <Text style={styles.dateLabel}>
            {cycle.status === 'active' ? 'Started' : 'Completed'}: {formatDate(cycle.startDate)}
          </Text>
          {cycle.endDate && (
            <Text style={styles.dateLabel}>
              {cycle.status === 'active' ? 'Ends' : 'Ended'}: {formatDate(cycle.endDate)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cycle Timeline</Text>
      <ScrollView 
        style={styles.timeline} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
      >
        {cycles.map(renderCycle)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cream,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
    marginBottom: 16,
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: 20,
  },
  cycleCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.beigeDeep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentCycleCard: {
    borderColor: colors.mustard,
    borderWidth: 2,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cycleInfo: {
    flex: 1,
  },
  cycleNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cycleNumberText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
  },
  currentCycleNumberText: {
    color: colors.mustard,
  },
  cycleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    marginLeft: 4,
  },
  cycleAmount: {
    fontSize: 18,
    fontFamily: 'Fraunces_700Bold',
    color: colors.forestGreen,
  },
  payoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
  },
  payoutDetails: {
    flex: 1,
  },
  payoutLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textMid,
    marginBottom: 2,
  },
  payoutName: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: colors.textDark,
  },
  progressSection: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.beigeDeep,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.textMid,
    textAlign: 'center',
  },
  cycleDates: {
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.textLight,
  },
});
