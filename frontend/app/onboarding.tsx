import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🌱',
    title: 'Welcome to Bikore',
    subtitle: "Rwanda's digital Ikimina platform. Save together with family, friends and colleagues.",
    backgroundColor: '#2C4A2E',
    textColor: 'white',
    subtitleColor: 'rgba(255,255,255,0.85)',
  },
  {
    id: '2',
    emoji: '👥',
    title: 'Create or Join Groups',
    subtitle: 'Start your own Ikimina group or join one with an invite code. Set contribution amounts and cycles.',
    backgroundColor: '#F5F0E8',
    textColor: '#2C4A2E',
    subtitleColor: '#4A5C4C',
  },
  {
    id: '3',
    emoji: '💰',
    title: 'Contribute & Track',
    subtitle: 'Pay your contributions via MTN MoMo or Airtel Money. Track who has paid and who is next to receive.',
    backgroundColor: '#1A3320',
    textColor: 'white',
    subtitleColor: 'rgba(255,255,255,0.85)',
  },
  {
    id: '4',
    emoji: '🔒',
    title: 'Safe & Trusted',
    subtitle: 'Your savings are protected. Bikore is BNR regulated and all transactions are encrypted and secure.',
    backgroundColor: '#F5F0E8',
    textColor: '#2C4A2E',
    subtitleColor: '#4A5C4C',
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const renderSlide = ({ item }: { item: typeof slides[0] }) => (
    <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipText, { color: item.backgroundColor === '#F5F0E8' ? '#2C4A2E' : 'white' }]}>
          Skip
        </Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={[styles.title, { color: item.textColor }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: item.subtitleColor }]}>{item.subtitle}</Text>
      </View>

      {currentIndex === slides.length - 1 ? (
        <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDotIndicator = () => {
    return (
      <View style={styles.dotContainer}>
        {slides.map((_, index) => {
          const dotWidth = scrollX.interpolate({
            inputRange: [
              (index - 1) * screenWidth,
              index * screenWidth,
              (index + 1) * screenWidth,
            ],
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange: [
              (index - 1) * screenWidth,
              index * screenWidth,
              (index + 1) * screenWidth,
            ],
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: index === currentIndex ? '#C9922A' : 'rgba(255,255,255,0.4)',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />
      {renderDotIndicator()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C4A2E',
  },
  slide: {
    width: screenWidth,
    height: screenHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Fraunces_700Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 26,
  },
  nextButton: {
    position: 'absolute',
    bottom: 48,
    right: 32,
    backgroundColor: '#C9922A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 50,
  },
  nextText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
  },
  getStartedButton: {
    position: 'absolute',
    bottom: 48,
    left: 32,
    right: 32,
    backgroundColor: '#2C4A2E',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  getStartedText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
  },
  dotContainer: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
