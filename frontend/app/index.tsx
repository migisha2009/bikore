import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (user) {
          router.replace('/(app)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.logo}>🌱</Text>
        <Text style={styles.title}>Bikore</Text>
        <Text style={styles.sub}>Save Together, Grow Together</Text>
      </Animated.View>
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
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 90,
    marginBottom: 20,
  },
  title: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#2C4A2E',
    marginBottom: 10,
    fontFamily: 'Fraunces_700Bold',
  },
  sub: {
    fontSize: 16,
    color: '#4A5C4C',
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
  },
});