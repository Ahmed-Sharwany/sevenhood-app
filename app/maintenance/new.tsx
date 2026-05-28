import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Camera, Mic } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  { id: 'ac', label: 'AC & Cooling', emoji: '❄️' },
  { id: 'plumbing', label: 'Plumbing', emoji: '🔧' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡' },
  { id: 'appliances', label: 'Appliances', emoji: '🍳' },
  { id: 'doors', label: 'Doors & Windows', emoji: '🚪' },
  { id: 'other', label: 'Other', emoji: '📋' },
];

const SCHEDULE_OPTIONS = [
  { id: 'asap', label: 'As Soon As Possible' },
  { id: 'morning', label: 'Morning (8AM–12PM)' },
  { id: 'afternoon', label: 'Afternoon (12PM–5PM)' },
  { id: 'evening', label: 'Evening (5PM–8PM)' },
  { id: 'weekend', label: 'Weekend Only' },
];

export default function NewMaintenanceScreen() {
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = category && description.length > 10 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);

    const { error } = await supabase.from('maintenance_tickets').insert({
      category: CATEGORIES.find((c) => c.id === category)?.label ?? category,
      description: description,
      status: 'open',
      priority: 'medium',
      unit_id: null, // will be wired to auth later
      created_at: new Date().toISOString(),
    });

    setSubmitting(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Submission failed', error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);

    // Show success briefly then navigate back
    setTimeout(() => {
      router.replace('/maintenance');
    }, 1400);
  };

  if (submitted) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <StatusBar style="dark" />
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Request Submitted</Text>
        <Text style={styles.successSub}>Your maintenance ticket has been created. Our team will be in touch shortly.</Text>
      </View>
    );
  }

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
          <Text style={styles.title}>Report Issue</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          {/* Unit (prefilled) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Unit</Text>
            <View style={[styles.inputBox, styles.inputDisabled]}>
              <Text style={styles.inputText}>Unit 12B — Sevenhood Tower</Text>
            </View>
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    setCategory(cat.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.categoryCard, category === cat.id && styles.categoryCardActive]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, category === cat.id && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.textarea}
              placeholder={'e.g. The AC in the master bedroom stopped cooling after 9PM. It makes a loud buzzing noise when turned on.'}
              placeholderTextColor={COLORS.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charHint}>{description.length} characters {description.length < 10 ? '— add more detail' : '✓'}</Text>
          </View>

          {/* Voice note — promoted above photo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Voice Note (Optional)</Text>
            <Text style={styles.fieldSub}>Faster than typing — describe the issue out loud</Text>
            <TouchableOpacity
              onPress={() => {
                setHasVoice(!hasVoice);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              style={[styles.voiceBtn, hasVoice && styles.voiceBtnActive]}
              activeOpacity={0.8}
            >
              <Mic size={20} color={hasVoice ? '#fff' : COLORS.textSecondary} strokeWidth={2} />
              <Text style={[styles.voiceBtnText, hasVoice && styles.voiceBtnTextActive]}>
                {hasVoice ? '✓ Voice note recorded' : 'Hold to record voice note'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Photo (Optional)</Text>
            <TouchableOpacity
              onPress={() => {
                setHasPhoto(!hasPhoto);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.uploadBox, hasPhoto && styles.uploadBoxActive]}
              activeOpacity={0.8}
            >
              {hasPhoto ? (
                <Text style={styles.uploadDoneText}>✓ Photo added</Text>
              ) : (
                <>
                  <Camera size={28} color={COLORS.textTertiary} strokeWidth={1.5} />
                  <Text style={styles.uploadText}>Tap to add photo</Text>
                  <Text style={styles.uploadSub}>Up to 5 photos</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Schedule */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>When is convenient?</Text>
            {SCHEDULE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => { setSchedule(opt.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.scheduleRow, schedule === opt.id && styles.scheduleRowActive]}
                activeOpacity={0.7}
              >
                <View style={[styles.scheduleRadio, schedule === opt.id && styles.scheduleRadioActive]}>
                  {schedule === opt.id && <View style={styles.scheduleRadioDot} />}
                </View>
                <Text style={[styles.scheduleText, schedule === opt.id && styles.scheduleTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canSubmit ? [COLORS.primary, COLORS.primaryLight] : ['#ccc', '#ccc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit Request</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  successIcon: { fontSize: 56 },
  successTitle: {
    color: COLORS.primary,
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    textAlign: 'center',
  },
  successSub: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
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
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    textAlign: 'center',
  },
  pad: { padding: 20 },
  fieldGroup: { marginBottom: 24 },
  fieldLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  inputBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: { opacity: 0.6 },
  inputText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textPrimary },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '30%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryCardActive: { borderColor: COLORS.accent, backgroundColor: '#FFFBF5' },
  categoryEmoji: { fontSize: 26 },
  categoryLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  categoryLabelActive: { color: COLORS.primary },
  fieldSub: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
    marginTop: -6,
  },
  charHint: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    textAlign: 'right',
  },
  textarea: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 110,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  uploadBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  uploadBoxActive: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
    borderStyle: 'solid',
  },
  uploadText: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Inter_500Medium' },
  uploadSub: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  uploadDoneText: { color: COLORS.success, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voiceBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  voiceBtnText: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Inter_500Medium' },
  voiceBtnTextActive: { color: '#fff' },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleRowActive: { borderColor: COLORS.accent, backgroundColor: '#FFFBF5' },
  scheduleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleRadioActive: { borderColor: COLORS.accent },
  scheduleRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  scheduleText: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular' },
  scheduleTextActive: { color: COLORS.primary, fontFamily: 'Inter_500Medium' },
  submitBtn: { borderRadius: 18, overflow: 'hidden', height: 58, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
});
