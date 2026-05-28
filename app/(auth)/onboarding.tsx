import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, IMG } from '@/constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Manage Your\nProperty',
    subtitle:
      'Access contracts, floor plans, and payment history — all in one beautifully designed platform.',
    image: IMG.buildingCurved,
    icon: '🏢',
  },
  {
    title: 'Connect with\nYour Community',
    subtitle:
      'Meet neighbors, join exclusive events, and stay informed about your premium development.',
    image: IMG.plaza,
    icon: '🤝',
  },
  {
    title: 'Access Premium\nServices',
    subtitle:
      'Book cleaning, moving, and AI-powered interior design with just a tap.',
    image: IMG.sofaWhite,
    icon: '✨',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideY = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  const slide = SLIDES[step];

  const navigate = (nextStep: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: -20, duration: 250, useNativeDriver: true }),
      Animated.timing(imageScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideY.setValue(30);
      iconScale.setValue(0.8);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.spring(imageScale, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (step < 2) {
      navigate(step + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background image with fade */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: imageScale }] }]}>
        <Image source={{ uri: slide.image }} style={styles.bgImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(10,22,40,0.25)', COLORS.primary]}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Skip button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideY }] },
        ]}
      >
        {/* Icon badge */}
        <Animated.View style={[styles.iconBadge, { transform: [{ scale: iconScale }] }]}>
          <Text style={styles.iconText}>{slide.icon}</Text>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>{slide.title}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i === step ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Next / Done button */}
        <TouchableOpacity
          onPress={handleNext}
          style={styles.nextBtn}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.accent, COLORS.accentLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextGradient}
          >
            {step < 2 ? (
              <ChevronRight size={26} color="#fff" strokeWidth={2.5} />
            ) : (
              <Check size={24} color="#fff" strokeWidth={3} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  bgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.25,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 32,
    alignItems: 'flex-end',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    lineHeight: 44,
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 26,
    marginBottom: 40,
    maxWidth: 320,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 3,
    borderRadius: 2,
  },
  dotActive: {
    width: 28,
    backgroundColor: COLORS.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  nextBtn: {
    width: 64,
    height: 64,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  nextGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
