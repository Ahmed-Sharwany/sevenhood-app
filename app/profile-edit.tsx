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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Save, User, Mail, Phone } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ProfileEditScreen() {
  const { resident } = useAuth();

  const [fullName, setFullName] = useState(resident?.full_name ?? '');
  const [phone,    setPhone]    = useState(resident?.phone ?? '');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    if (!resident?.id) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase
      .from('residents')
      .update({
        full_name: fullName.trim(),
        phone:     phone.trim() || null,
      })
      .eq('id', resident.id);

    setSaving(false);

    if (error) {
      Alert.alert('Save failed', error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved', 'Your profile has been updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
            <Text style={styles.title}>Profile & Privacy</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Avatar placeholder */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')}
              </Text>
            </View>
            <Text style={styles.avatarHint}>Photo upload coming soon</Text>
          </View>

          {/* Fields */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabel}>
                <User size={14} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={styles.fieldLabelText}>Full Name</Text>
              </View>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={[styles.fieldGroup, { borderBottomWidth: 0 }]}>
              <View style={styles.fieldLabel}>
                <Phone size={14} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={styles.fieldLabelText}>Phone Number</Text>
              </View>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+966 5X XXX XXXX"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Read-only fields */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Details</Text>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabel}>
                <Mail size={14} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={styles.fieldLabelText}>Email</Text>
              </View>
              <Text style={styles.readOnlyValue}>{resident?.email ?? '—'}</Text>
              <Text style={styles.readOnlyHint}>Email cannot be changed</Text>
            </View>

            <View style={[styles.fieldGroup, { borderBottomWidth: 0 }]}>
              <View style={styles.fieldLabel}>
                <User size={14} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={styles.fieldLabelText}>Member Since</Text>
              </View>
              <Text style={styles.readOnlyValue}>
                {resident?.activated_at
                  ? new Date(resident.activated_at).toLocaleDateString('en-SA', { month: 'long', year: 'numeric' })
                  : '—'}
              </Text>
            </View>
          </View>

          {/* Privacy notice */}
          <View style={styles.privacyBox}>
            <Text style={styles.privacyText}>
              🔒 Your personal data is stored securely and never shared with third parties without your consent.
              For data deletion requests, contact support@sevenhood.app
            </Text>
          </View>
        </ScrollView>

        {/* Save button */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" strokeWidth={2.5} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  title: {
    flex: 1, color: COLORS.primary, fontSize: 18,
    fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center',
  },
  content: { padding: 20, gap: 16, paddingBottom: 20 },
  avatarSection: { alignItems: 'center', paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 26, fontFamily: 'PlayfairDisplay_600SemiBold' },
  avatarHint: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  cardTitle: {
    color: COLORS.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.5,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4,
  },
  fieldGroup: {
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  fieldLabelText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  input: {
    color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular',
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  readOnlyValue: { color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  readOnlyHint: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  privacyBox: {
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  privacyText: { color: '#15803D', fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  footer: { backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
