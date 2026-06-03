import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  User,
  Users,
  Smartphone,
  Bell,
  Globe,
  Moon,
  Home,
  CreditCard,
  FileText,
  HelpCircle,
  MessageSquare,
  Phone,
  Shield,
  BookOpen,
  Database,
  LogOut,
  CheckCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { resident, signOut } = useAuth();
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [eventCount,  setEventCount]  = useState<number>(0);

  // ── Real stats ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resident?.id) return;

    // Count maintenance tickets
    supabase
      .from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('resident_id', resident.id)
      .then(({ count }) => setTicketCount(count ?? 0));

    // Count events attended / RSVPs
    supabase
      .from('event_attendees')
      .select('id', { count: 'exact', head: true })
      .eq('resident_id', resident.id)
      .then(({ count }) => setEventCount(count ?? 0));
  }, [resident?.id]);

  // Months since activation
  const monthsResident = React.useMemo(() => {
    if (!resident?.activated_at) return 0;
    const ms = Date.now() - new Date(resident.activated_at).getTime();
    return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24 * 30)));
  }, [resident?.activated_at]);

  const displayName = resident?.full_name ?? 'Resident';
  const initials    = displayName.split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');
  const unitLabel   = resident?.units
    ? `Unit ${(resident.units as any).unit_number} — ${(resident.units as any).buildings?.name ?? 'Sevenhood'}`
    : 'Unit — Sevenhood';

  // ── Navigation helpers ──────────────────────────────────────────────────────
  function comingSoon(label: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(label, 'This feature is coming soon. Stay tuned for the next update!', [{ text: 'OK' }]);
  }

  const handleSignOut = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await signOut();
    router.replace('/(auth)/login');
  };

  // ── Menu definition ─────────────────────────────────────────────────────────
  const MENU_SECTIONS = [
    {
      title: 'Account',
      items: [
        {
          label: 'Profile & Privacy',
          icon: User,
          chevron: true,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/profile-edit'); },
        },
        {
          label: 'Family Members',
          icon: Users,
          chevron: true,
          onPress: () => comingSoon('Family Members'),
        },
        {
          label: 'Linked Devices',
          icon: Smartphone,
          chevron: true,
          onPress: () => comingSoon('Linked Devices'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          label: 'Notifications',
          icon: Bell,
          chevron: true,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/notification-settings'); },
        },
        {
          label: 'Language & Region (AR/EN)',
          icon: Globe,
          chevron: true,
          onPress: () => comingSoon('Language & Region'),
        },
        {
          label: 'Prayer Time Quiet Hours',
          icon: Moon,
          chevron: true,
          onPress: () => comingSoon('Prayer Time Quiet Hours'),
        },
      ],
    },
    {
      title: 'Property',
      items: [
        {
          label: 'My Unit',
          icon: Home,
          chevron: true,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/property'); },
        },
        {
          label: 'Payment History',
          icon: CreditCard,
          chevron: true,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/property', params: { tab: '2' } }); },
        },
        {
          label: 'Documents',
          icon: FileText,
          chevron: true,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/property', params: { tab: '1' } }); },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          label: 'Help & Support',
          icon: HelpCircle,
          chevron: true,
          onPress: () => Linking.openURL('mailto:support@sevenhood.app'),
        },
        {
          label: 'FAQ',
          icon: MessageSquare,
          chevron: true,
          onPress: () => comingSoon('FAQ'),
        },
        {
          label: 'Contact Customer Service',
          icon: Phone,
          chevron: true,
          onPress: () => Linking.openURL('tel:+966800000000'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          label: 'Privacy Policy',
          icon: Shield,
          chevron: true,
          onPress: () => Linking.openURL('https://sevenhood.app/privacy'),
        },
        {
          label: 'Terms of Service',
          icon: BookOpen,
          chevron: true,
          onPress: () => Linking.openURL('https://sevenhood.app/terms'),
        },
        {
          label: 'Data Rights (GDPR)',
          icon: Database,
          chevron: true,
          onPress: () => comingSoon('Data Rights'),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <CheckCircle size={16} color="#fff" fill={COLORS.success} strokeWidth={0} />
              </View>
            </View>

            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.unit}>{unitLabel}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthsResident}</Text>
                <Text style={styles.statLabel}>Months</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{ticketCount}</Text>
                <Text style={styles.statLabel}>Tickets</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{eventCount}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* Menu sections */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, i < section.items.length - 1 && styles.menuItemBorder]}
                  activeOpacity={0.7}
                  onPress={item.onPress}
                >
                  <View style={styles.menuIconBox}>
                    <item.icon size={18} color={COLORS.textSecondary} strokeWidth={2} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.chevron && (
                    <ChevronRight size={16} color={COLORS.textTertiary} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        <View style={styles.signOutWrap}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
            <LogOut size={18} color={COLORS.error} strokeWidth={2} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Sevenhood v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarOuter: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 88, height: 88, borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  avatarText: { color: '#fff', fontSize: 28, fontFamily: 'PlayfairDisplay_600SemiBold' },
  verifiedBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  name: { color: COLORS.primary, fontSize: 22, fontFamily: 'PlayfairDisplay_600SemiBold', marginBottom: 4 },
  unit: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  statItem: { alignItems: 'center' },
  statValue: { color: COLORS.primary, fontSize: 20, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  statLabel: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: {
    color: COLORS.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1, textTransform: 'uppercase', opacity: 0.4, marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Inter_500Medium' },
  signOutWrap: { paddingHorizontal: 20, paddingTop: 24 },
  signOutBtn: {
    backgroundColor: COLORS.surface, borderRadius: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: `${COLORS.error}30`,
  },
  signOutText: { color: COLORS.error, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  version: {
    color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular',
    textAlign: 'center', marginTop: 20,
  },
});
