import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  MapPin,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Home,
  Wrench,
  Users,
  Sparkles,
  CalendarDays,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, IMG } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const QUICK_ACTIONS = [
  { label: 'My Unit',     Icon: Home,          color: COLORS.garden,  route: '/property' as const },
  { label: 'Maintenance', Icon: Wrench,         color: COLORS.primary, route: '/maintenance' as const },
  { label: 'Bookings',    Icon: CalendarDays,   color: COLORS.accent,  route: '/bookings' as const },
  { label: 'Community',   Icon: Users,          color: COLORS.sage,    route: '/(tabs)/community' as const },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const [resident, setResident] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [pendingVisitors, setPendingVisitors] = useState(0);

  useEffect(() => {
    async function loadData() {
      const [{ data: residents }, { data: ticketData }, { data: postData }, { count }] =
        await Promise.all([
          supabase.from('residents').select('*, units(unit_number, floor, tower, buildings(name))').limit(1).single(),
          supabase.from('maintenance_tickets').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(2),
          supabase.from('visitor_passes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);
      if (residents) setResident(residents);
      if (ticketData) setTickets(ticketData);
      if (postData) setPosts(postData);
      setPendingVisitors(count ?? 0);
    }
    loadData();
  }, []);

  const residentName = resident?.full_name ?? 'Welcome';
  const unit = resident?.units;
  const unitLabel = unit ? `Unit ${unit.unit_number}` : 'No unit assigned';
  const buildingLabel = unit?.buildings?.name ?? unit?.tower ?? 'Sevenhood Tower';
  const floorLabel = unit ? `Floor ${unit.floor}` : '';

  const activities = [
    ...tickets.map(t => ({
      Icon: CheckCircle,
      color: t.status === 'completed' ? COLORS.success : COLORS.primary,
      bg: t.status === 'completed' ? '#F0FDF4' : COLORS.mist + '55',
      text: t.status === 'completed' ? 'Maintenance completed' : 'Maintenance in progress',
      time: new Date(t.created_at).toLocaleDateString(),
      sub: t.description?.slice(0, 40) ?? t.category,
    })),
    ...posts.map(p => ({
      Icon: MessageCircle,
      color: COLORS.primary,
      bg: COLORS.mist + '55',
      text: 'New community post',
      time: new Date(p.created_at).toLocaleDateString(),
      sub: p.content?.slice(0, 40) ?? '',
    })),
    ...(pendingVisitors > 0 ? [{
      Icon: Bell,
      color: COLORS.warning,
      bg: '#FFF7ED',
      text: 'Visitor approval needed',
      time: 'Pending',
      sub: `${pendingVisitors} guest${pendingVisitors > 1 ? 's' : ''} requested entry`,
    }] : []),
  ].slice(0, 3);

  const displayActivities = activities.length > 0 ? activities : [
    { Icon: CheckCircle, color: COLORS.success, bg: '#F0FDF4', text: 'No recent activity', time: '', sub: 'Activity will appear here' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── Sticky header ── */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.garden]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.greetingLabel}>{getGreeting()}</Text>
              <Text style={styles.greetingName}>{residentName}</Text>
            </View>
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.8}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Bell size={20} color="#fff" strokeWidth={2} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card — sits inside a green bleed so it looks attached to the header */}
        <LinearGradient
          colors={[COLORS.garden, COLORS.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroBg}
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/property');
            }}
            activeOpacity={0.92}
            style={styles.heroCard}
          >
            <Image source={{ uri: IMG.buildingDusk }} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(8,18,12,0.95)']}
              style={styles.heroGradient}
            />
            <View style={styles.heroContent}>
              <View style={styles.heroRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroSubtitle}>{buildingLabel.toUpperCase()} — {unitLabel.toUpperCase()}</Text>
                  <Text style={styles.heroTitle}>{unit ? `${unit.bedrooms ?? 3}BR Luxury Apartment` : 'Sevenhood Residences'}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={11} color={COLORS.accentLight} strokeWidth={2} />
                    <Text style={styles.locationText}>{buildingLabel}</Text>
                  </View>
                </View>
                <View style={styles.floorBadge}>
                  <Text style={styles.floorText}>{floorLabel ? `Floor\n${unit.floor}` : 'Floor\n—'}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick Access</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map(({ label, Icon, color, route }) => (
              <TouchableOpacity
                key={label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(route as any);
                }}
                activeOpacity={0.8}
                style={styles.quickItem}
              >
                <View style={[styles.quickIconBox, { backgroundColor: color + '15' }]}>
                  <Icon size={22} color={color} strokeWidth={2} />
                </View>
                <Text style={styles.quickLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment reminder — NO pay button, just a reminder */}
        <View style={styles.padH}>
          <View style={styles.reminderCard}>
            <View style={styles.reminderLeft}>
              <View style={styles.reminderIconBox}>
                <AlertCircle size={20} color={COLORS.accent} strokeWidth={2} />
              </View>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTitle}>Service Charge Reminder</Text>
                <Text style={styles.reminderSub}>AED 3,200 due in 5 days — please pay via your building portal</Text>
              </View>
            </View>
            <View style={styles.dueBadge}>
              <Text style={styles.dueBadgeText}>5 days</Text>
            </View>
          </View>
        </View>

        {/* Recent activity */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.sectionLabel}>Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {displayActivities.map(({ Icon, color, bg, text, time, sub }) => (
            <TouchableOpacity
              key={text}
              activeOpacity={0.85}
              style={styles.activityCard}
            >
              <View style={[styles.activityIconBox, { backgroundColor: bg }]}>
                <Icon size={19} color={color} strokeWidth={2} />
              </View>
              <View style={styles.activityText}>
                <Text style={styles.activityTitle} numberOfLines={1}>{text}</Text>
                <Text style={styles.activitySub} numberOfLines={1}>{sub}</Text>
              </View>
              <Text style={styles.activityTime}>{time}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  greetingLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  greetingName: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'CormorantGaramond_700Bold',
    letterSpacing: 0.3,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  // ── Hero card ────────────────────────────────────────────────────────────────
  heroBg: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 196,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroLeft: { flex: 1, marginRight: 12 },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'CormorantGaramond_700Bold',
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  floorBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  floorText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── Sections ─────────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  padH: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.45,
    marginBottom: 14,
  },

  // ── Quick actions ─────────────────────────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickIconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
  },

  // ── Reminder card (NO pay button) ─────────────────────────────────────────────
  reminderCard: {
    backgroundColor: '#FFFBF0',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: `${COLORS.accent}30`,
    gap: 12,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  reminderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: `${COLORS.accent}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  reminderInfo: { flex: 1 },
  reminderTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 3,
  },
  reminderSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 17,
  },
  dueBadge: {
    backgroundColor: `${COLORS.accent}20`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dueBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
  },

  // ── Activity ──────────────────────────────────────────────────────────────────
  activitySection: {
    paddingHorizontal: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  viewAll: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: { flex: 1 },
  activityTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 2,
  },
  activitySub: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  activityTime: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
  },
});
