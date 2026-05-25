import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Camera, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';

const STYLE_PRESETS = [
  { id: 'minimal',       label: 'Minimal',      color: '#E8E4DF', textColor: '#6B6B6B' },
  { id: 'modern_arab',   label: 'Modern Arab',  color: '#1E5435', textColor: '#FFFFFF' },
  { id: 'boho',          label: 'Boho',         color: '#C4956A', textColor: '#FFFFFF' },
  { id: 'warm_neutral',  label: 'Warm Neutral', color: '#D4B896', textColor: '#5C4A3A' },
  { id: 'scandinavian',  label: 'Scandi',       color: '#B8C9D4', textColor: '#2C3E50' },
  { id: 'maximalist',    label: 'Maximalist',   color: '#4A1A6B', textColor: '#FFFFFF' },
];

const BUDGET_MIN = 5000;
const BUDGET_MAX = 50000;

export default function AIDesignScreen() {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [budgetPct, setBudgetPct] = useState(0.3);
  const [noDrill, setNoDrill] = useState(false);
  const [photoSlots, setPhotoSlots] = useState<boolean[]>([false, false, false, false]);
  const [isGenerating, setIsGenerating] = useState(false);

  const budget = Math.round(BUDGET_MIN + (BUDGET_MAX - BUDGET_MIN) * budgetPct);
  const budgetFormatted = `AED ${budget.toLocaleString()}`;

  const addPhoto = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSlots = [...photoSlots];
    newSlots[idx] = !newSlots[idx];
    setPhotoSlots(newSlots);
  };

  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2500);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={COLORS.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.title}>AI Interior Design</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero banner */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <Sparkles size={32} color={COLORS.accent} strokeWidth={1.5} />
          <Text style={styles.heroTitle}>Transform Your Space</Text>
          <Text style={styles.heroSub}>
            Upload photos of your rooms and let our AI generate personalized interior designs tailored to your style and budget.
          </Text>
        </LinearGradient>

        <View style={styles.pad}>
          {/* Photo upload */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Upload Room Photos</Text>
            <Text style={styles.fieldSub}>Add up to 4 photos of the room you want to redesign</Text>
            <View style={styles.photoGrid}>
              {photoSlots.map((filled, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => addPhoto(idx)}
                  style={[styles.photoSlot, filled && styles.photoSlotFilled]}
                  activeOpacity={0.8}
                >
                  {filled ? (
                    <View style={styles.photoFilled}>
                      <Text style={styles.photoFilledIcon}>🖼️</Text>
                      <Text style={styles.photoFilledText}>Tap to remove</Text>
                    </View>
                  ) : (
                    <>
                      <Camera size={24} color={COLORS.textTertiary} strokeWidth={1.5} />
                      <Text style={styles.photoAddText}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Style presets */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Design Style</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
              {STYLE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => { setSelectedStyle(preset.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.styleCard, selectedStyle === preset.id && styles.styleCardActive]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.styleSwatch, { backgroundColor: preset.color }]}>
                    {selectedStyle === preset.id && (
                      <Text style={[styles.swatchCheck, { color: preset.textColor }]}>✓</Text>
                    )}
                  </View>
                  <Text style={[styles.styleLabel, selectedStyle === preset.id && styles.styleLabelActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Budget slider */}
          <View style={styles.fieldGroup}>
            <View style={styles.budgetHeader}>
              <Text style={styles.fieldLabel}>Budget Range</Text>
              <Text style={styles.budgetValue}>{budgetFormatted}</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${budgetPct * 100}%` }]} />
              <TouchableOpacity
                style={[styles.sliderThumb, { left: `${Math.max(0, budgetPct * 100 - 3)}%` as any }]}
                onPress={() => {}}
              />
            </View>
            <View style={styles.budgetRange}>
              <Text style={styles.budgetMin}>AED 5,000</Text>
              <Text style={styles.budgetMax}>AED 50,000</Text>
            </View>
          </View>

          {/* Rental constraints toggle */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Rental Constraints</Text>
            <TouchableOpacity
              onPress={() => { setNoDrill(!noDrill); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.toggleRow, noDrill && styles.toggleRowActive]}
              activeOpacity={0.8}
            >
              <View>
                <Text style={styles.toggleLabel}>No drilling or painting</Text>
                <Text style={styles.toggleSub}>Limit suggestions to renter-friendly changes</Text>
              </View>
              <View style={[styles.toggleSwitch, noDrill && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, noDrill && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Additional options */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Room Type</Text>
            <View style={styles.roomGrid}>
              {['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Study', 'Dining'].map((room) => (
                <TouchableOpacity
                  key={room}
                  onPress={() => { setSelectedRoom(room); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.roomChip, selectedRoom === room && styles.roomChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roomChipText, selectedRoom === room && styles.roomChipTextActive]}>{room}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Generate button */}
          <TouchableOpacity
            onPress={handleGenerate}
            style={styles.generateBtn}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generateGradient}
            >
              {isGenerating ? (
                <Text style={styles.generateText}>✨ Generating your design...</Text>
              ) : (
                <>
                  <Sparkles size={20} color="#fff" strokeWidth={2} />
                  <Text style={styles.generateText}>Generate Design</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            AI designs are generated in approximately 30–60 seconds. Results are for inspiration purposes.
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 18,
    fontFamily: 'CormorantGaramond_700Bold',
    textAlign: 'center',
  },
  heroBanner: {
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'CormorantGaramond_700Bold',
    textAlign: 'center',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  pad: { padding: 20 },
  fieldGroup: { marginBottom: 28 },
  fieldLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldSub: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoSlot: {
    width: '47%',
    aspectRatio: 1.5,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  photoSlotFilled: {
    borderColor: COLORS.accent,
    borderStyle: 'solid',
    backgroundColor: '#FFFBF5',
  },
  photoFilled: { alignItems: 'center', gap: 4 },
  photoFilledIcon: { fontSize: 28 },
  photoFilledText: { color: COLORS.accent, fontSize: 11, fontFamily: 'DMSans_500Medium' },
  photoAddText: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'DMSans_400Regular' },
  styleScroll: { marginHorizontal: -4 },
  styleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 4,
    width: 90,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  styleCardActive: { borderColor: COLORS.accent },
  styleSwatch: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: {
    fontSize: 20,
    fontWeight: '700',
  },
  styleLabel: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' },
  styleLabelActive: { color: COLORS.primary },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  budgetValue: {
    color: COLORS.accent,
    fontSize: 18,
    fontFamily: 'DMSans_600SemiBold',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'visible',
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  budgetRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetMin: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'DMSans_400Regular' },
  budgetMax: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'DMSans_400Regular' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleRowActive: { borderColor: COLORS.accent, backgroundColor: '#FFFBF5' },
  toggleLabel: { color: COLORS.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold', marginBottom: 2 },
  toggleSub: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'DMSans_400Regular' },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: { backgroundColor: COLORS.accent },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  roomChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roomChipText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'DMSans_500Medium' },
  roomChipTextActive: { color: '#fff', fontFamily: 'DMSans_600SemiBold' },
  generateBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 62,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 16,
  },
  generateGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  generateText: { color: '#fff', fontSize: 17, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.3 },
  disclaimer: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
