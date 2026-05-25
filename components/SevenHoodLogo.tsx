import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Text as SvgText } from 'react-native-svg';
import { COLORS } from '@/constants/colors';

// Compute heptagon points
function heptPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 7 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 7 - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

interface LogoMarkProps {
  size?: number;
  variant?: 'dark' | 'light' | 'gold';
}

export function LogoMark({ size = 64, variant = 'dark' }: LogoMarkProps) {
  const r = size / 2;
  const outerPts = heptPoints(r, r, r - 2);
  const innerPts = heptPoints(r, r, r * 0.68);

  const bg   = variant === 'gold' ? COLORS.accent : variant === 'light' ? COLORS.mist : COLORS.primary;
  const fg   = variant === 'light' ? COLORS.primary : '#FFFFFF';
  const ring = variant === 'light' ? COLORS.sage : 'rgba(255,255,255,0.15)';
  const dotColor = variant === 'light' ? COLORS.sage : fg;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={outerPts} fill={bg} />
      <Polygon points={innerPts} fill="none" stroke={ring} strokeWidth="1" />
      <SvgText
        x={r}
        y={r * 1.22}
        textAnchor="middle"
        fontFamily="CormorantGaramond_700Bold"
        fontSize={size * 0.44}
        fontWeight="700"
        fill={fg}
      >
        7
      </SvgText>
      {[-1, 0, 1].map((offset) => (
        <Circle
          key={offset}
          cx={r + offset * size * 0.115}
          cy={r * 1.64}
          r={size * 0.038}
          fill={dotColor}
          opacity={0.7}
        />
      ))}
    </Svg>
  );
}

interface WordmarkProps {
  color?: string;
  size?: number;
}

export function Wordmark({ color = COLORS.primary, size = 1 }: WordmarkProps) {
  return (
    <View style={styles.wordmarkRow}>
      <Text style={[styles.wordmarkSeven, { color, fontSize: 26 * size }]}>Seven</Text>
      <Text style={[styles.wordmarkHood, { color, fontSize: 18 * size, opacity: 0.65 }]}>hood</Text>
    </View>
  );
}

interface LogoLockupProps {
  variant?: 'dark' | 'light' | 'white';
  size?: number;
}

export function LogoLockup({ variant = 'dark', size = 1 }: LogoLockupProps) {
  const textColor = variant === 'white' ? '#FFFFFF' : COLORS.primary;
  const markVariant: LogoMarkProps['variant'] = variant === 'white' ? 'dark' : 'dark';

  return (
    <View style={styles.lockupRow}>
      <LogoMark size={44 * size} variant={markVariant} />
      <Wordmark color={textColor} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmarkSeven: {
    fontFamily: 'CormorantGaramond_700Bold',
    letterSpacing: 0.5,
  },
  wordmarkHood: {
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 3,
  },
  lockupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
