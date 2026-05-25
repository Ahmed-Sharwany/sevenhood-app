import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { COLORS, IMG } from '@/constants/colors';

interface UnitCardProps {
  onPress: () => void;
}

export function UnitCard({ onPress }: UnitCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={styles.container}
    >
      <Image
        source={{ uri: IMG.buildingDusk }}
        style={styles.image}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(10,22,40,0.95)']}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.subtitle}>SEVENHOOD TOWER — UNIT 12B</Text>
            <Text style={styles.title}>3BR Luxury Apartment</Text>
            <View style={styles.locationRow}>
              <MapPin size={11} color={COLORS.accentLight} />
              <Text style={styles.location}>Downtown District, Tower A</Text>
            </View>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Floor 12</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: 'hidden',
    height: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    color: COLORS.accentLight,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
