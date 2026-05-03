import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';

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
  container: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontFamily: 'Fraunces_700Bold', color: colors.forestGreen, marginBottom: 8 },
  sub: { fontSize: 15, fontFamily: 'DMSans_400Regular', color: colors.textMid, textAlign: 'center', paddingHorizontal: 40 },
});