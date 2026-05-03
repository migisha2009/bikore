import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';

interface Notification {
  id: string;
  type: 'payment_due' | 'payout' | 'group_invite' | 'missed';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: '1', type: 'payment_due', title: 'Payment Due', message: "Your contribution of Rwf 50,000 for Inzu y'Umuryango is due today", time: '2 hours ago', read: false },
  { id: '2', type: 'payout', title: 'Payout Received!', message: 'You received Rwf 300,000 from Kazi Hamwe group', time: '1 day ago', read: false },
  { id: '3', type: 'group_invite', title: 'Group Invitation', message: 'Jean Niyonzima invited you to join Agateka Savings', time: '2 days ago', read: true },
  { id: '4', type: 'missed', title: 'Missed Payment', message: 'Grace Mukamana missed their contribution in your group', time: '3 days ago', read: true },
  { id: '5', type: 'payment_due', title: 'Reminder', message: 'Contribution deadline for Kazi Hamwe is tomorrow', time: '4 days ago', read: true },
];

function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'payment_due': return '💰';
    case 'payout': return '🎉';
    case 'group_invite': return '👥';
    case 'missed': return '⚠️';
    default: return '🔔';
  }
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          notifications.map(notification => (
            <View key={notification.id} style={[styles.notificationCard, !notification.read && styles.unreadCard]}>
              {!notification.read && <View style={styles.unreadDot} />}
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationIcon}>{getNotificationIcon(notification.type)}</Text>
                  <View style={styles.notificationText}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                  </View>
                </View>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C4A2E',
  },
  markAllButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#C9922A',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#8A9B8C',
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadCard: {
    borderLeftColor: '#C9922A',
    backgroundColor: '#FFFEF9',
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9922A',
  },
  notificationContent: {
    marginLeft: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    color: '#2C4A2E',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#4A5C4C',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#8A9B8C',
    marginLeft: 32,
  },
});
