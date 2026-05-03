import { View, Text, StyleSheet } from 'react-native';

export default function PaymentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💳</Text>
      <Text style={styles.title}>Payments</Text>
      <Text style={styles.sub}>Your payment history will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C4A2E',
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#4A5C4C',
  },
});