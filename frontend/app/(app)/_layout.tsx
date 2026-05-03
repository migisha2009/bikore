import { Tabs } from 'expo-router';
import { colors } from '../../utils/colors';
import { View, Text, StyleSheet, Platform } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.forestGreen,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 90 : 80,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" label="Groups" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💳" label="Pay" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 60,
  },
  tabItemActive: {
    backgroundColor: 'rgba(245, 240, 232, 0.15)',
  },
  tabEmoji: {
    fontSize: 22,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(245, 240, 232, 0.5)',
  },
  tabLabelActive: {
    color: '#F5F0E8',
  },
});