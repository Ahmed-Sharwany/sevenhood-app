import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Text as SvgText, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/constants/colors';

const { width, height } = Dimensions.get('window');

function heptPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 7 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 7 - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

// Background heptagon grid pattern
function HeptPattern() {
  const shapes = [];
  const s = 56;
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 9; col++) {
      const cx = col * s + (row % 2) * (s / 2) - 20;
      const cy = row * s * 0.87 - 20;
      shapes.push(
        <Polygon
          key={`${row}-${col}`}
          points={heptPoints(cx, cy, 20)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      );
    }
  }
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
    >
      {shapes}
    </Svg>
  );
}

// The main app icon used on splash
function SplashIcon({ size = 88 }: { size?: number }) {
  const r = size / 2;
  const outerPts = heptPoints(r, r, r - 3);
  const innerPts = heptPoints(r, r, r * 0.66);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={outerPts} fill={COLORS.primary} />
      <Polygon points={innerPts} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <SvgText
        x={r}
        y={r * 1.24}
        textAnchor="middle"
        fontFamily="PlayfairDisplay_600SemiBold"
        fontSize={size * 0.44}
        fontWeight="700"
        fill="#FFFFFF"
      >
        7
      </SvgText>
      {[-1, 0, 1].map((offset) => (
        <Circle
          key={offset}
          cx={r + offset * size * 0.115}
          cy={r * 1.65}
          r={size * 0.038}
          fill="#FFFFFF"
          opacity={0.55}
        />
      ))}
    </Svg>
  );
}

export default function SplashScreen() {
  const iconScale   = useRef(new Animated.Value(0.7)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY      = useRef(new Animated.Value(12)).current;
  const subOpacity  = useRef(new Animated.Value(0)).current;
  const dotOpacity  = useRef(new Animated.Value(0)).current;
  const ringScales  = Array.from({ length: 5 }, () => useRef(new Animated.Value(0)).current);
  const ringOpacities = Array.from({ length: 5 }, () => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    // Rings expand outward from centre
    const ringAnims = ringScales.map((scale, i) =>
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 1400, delay: i * 120, useNativeDriver: true }),
        Animated.timing(ringOpacities[i], { toValue: 1, duration: 1000, delay: i * 120, useNativeDriver: true }),
      ])
    );

    Animated.sequence([
      Animated.parallel(ringAnims),
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 90, friction: 7, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    const timer = setTimeout(() => router.replace('/(auth)/onboarding'), 3200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight, '#0A2015']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* Heptagon grid background */}
      <HeptPattern />

      {/* Expanding rings */}
      {ringScales.map((scale, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: 120 + i * 90,
              height: 120 + i * 90,
              borderRadius: (120 + i * 90) / 2,
              opacity: ringOpacities[i],
              transform: [{ scale }],
            },
          ]}
        />
      ))}

      {/* Logo mark */}
      <Animated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }], marginBottom: 24 }}>
        <View style={styles.iconWrapper}>
          <SplashIcon size={88} />
        </View>
      </Animated.View>

      {/* Wordmark */}
      <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }], alignItems: 'center' }}>
        <Text style={styles.title}>Sevenhood</Text>
        <Text style={styles.arabic}>سابع جار</Text>
      </Animated.View>

      {/* Progress dots */}
      <Animated.View style={[styles.dots, { opacity: dotOpacity }]}>
        {[true, false, false].map((active, i) => (
          <View
            key={i}
            style={[styles.dot, active ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  iconWrapper: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 44,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 6,
  },
  arabic: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 4,
  },
  dots: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
