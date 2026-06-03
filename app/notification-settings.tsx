import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Bell, Wrench, Calendar, Users, CreditCard, Info } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { COLORS } from '@/constants/colors';

type NotifPref = {
  id: string;
  label: string;
  desc: string;
  icon: any;
  enabled: boolean;
};

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<NotifPref[]>([
    { id: 'maintenance', label: 'Maintenance Updates',  desc: 'Ticket status changes & technician updates',  icon: Wrench,     enabled: true  },
    { id: 'bookings',    label: 'Booking Confirmations', desc: 'Amenity booking approvals & reminders',       icon: Calendar,   enabled: true  },
    { id: 'community',   label: 'Community',             desc: 'Announcements, events & community posts',     icon: Users,      enabled: true  },
    { id: 'billing',     label: 'Billing & Payments',    desc: 'Invoice due dates & payment confirmations',   icon: CreditCard, enabled: true  },
    { id: 'visitors',    label: 'Visitor Alerts',        desc: 'Visitor pass activity & gate arrivals',       icon: Bell,       enabled: false },
  ]);

  const togglePref = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrefs(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const openSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
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
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* System permission banner */}
        <TouchableOpacity style={styles.permissionBanner} onPress={openSystemSettings} activeOpacity={0.8}>
          <Info size={18} color={COLORS.accent} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.permissionTitle}>Manage System Permissions</Text>
            <Text style={styles.permissionDesc}>Tap to open device notification settings for Sevenhood</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Notification Types</Text>

        <View style={styles.card}>
          {prefs.map((pref, i) => (
            <View
              key={pref.id}
              style={[styles.prefRow, i < prefs.length - 1 && styles.prefBorder]}
            >
              <View style={styles.prefIcon}>
                <pref.icon size={18} color={COLORS.textSecondary} strokeWidth={2} />
              </View>
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>{pref.label}</Text>
                <Text style={styles.prefDesc}>{pref.desc}</Text>
              </View>
              <Switch
                value={pref.enabled}
                onValueChange={() => togglePref(pref.id)}
                trackColor={{ false: COLORS.border, true: `${COLORS.accent}60` }}
                thumbColor={pref.enabled ? COLORS.accent : '#fff'}
                ios_backgroundColor={COLORS.border}
              />
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          In-app notifications are always shown. To stop all notifications, disable them in your device settings above.
        </Text>
      </ScrollView>
    </View>
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
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  permissionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: `${COLORS.accent}10`, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: `${COLORS.accent}25`,
  },
  permissionTitle: { color: COLORS.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  permissionDesc:  { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  sectionLabel: {
    color: COLORS.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.5,
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  prefRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  prefBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  prefIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  prefText: { flex: 1 },
  prefLabel: { color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  prefDesc:  { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  note: {
    color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular',
    textAlign: 'center', lineHeight: 18,
  },
});
