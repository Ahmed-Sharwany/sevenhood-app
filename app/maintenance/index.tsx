import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Plus, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type Ticket = {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  unit_id: string | null;
  units?: { unit_number: string } | null;
  buildings?: { name: string } | null;
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const CATEGORY_ICONS: Record<string, string> = {
  'AC & Cooling': '❄️',
  ac: '❄️',
  Plumbing: '🔧',
  plumbing: '🔧',
  Electrical: '⚡',
  electrical: '⚡',
  Appliances: '🍳',
  appliances: '🍳',
  'Doors & Windows': '🚪',
  doors: '🚪',
  Other: '📋',
  other: '📋',
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? '🔨';
}

function formatTime(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function StatusChip({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    open: { color: COLORS.warning, bg: '#FFF7ED', label: 'Open' },
    in_progress: { color: COLORS.primary, bg: '#EFF6FF', label: 'In Progress' },
    completed: { color: COLORS.success, bg: '#F0FDF4', label: 'Completed' },
  };
  const c = cfg[status] || cfg.open;
  return (
    <View style={[chip.wrap, { backgroundColor: c.bg }]}>
      <Text style={[chip.text, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  text: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
});

export default function MaintenanceListScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('maintenance_tickets')
      .select('*, units(unit_number), buildings(name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (err) {
      setError(err.message);
    } else {
      setTickets(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filtered = activeTab === 'all'
    ? tickets
    : tickets.filter((t) => t.status === activeTab);

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
          <Text style={styles.title}>Maintenance</Text>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/maintenance/new'); }}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Plus size={20} color={COLORS.accent} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={styles.tabsScroll}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.stateText}>Loading tickets…</Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Text style={styles.errorText}>Failed to load tickets</Text>
              <Text style={styles.errorSub}>{error}</Text>
              <TouchableOpacity onPress={fetchTickets} style={styles.retryBtn} activeOpacity={0.8}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.emptyText}>No tickets yet</Text>
              <Text style={styles.stateText}>Tap + to report a new issue</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>
                {TABS.find((t) => t.key === activeTab)?.label} Tickets ({filtered.length})
              </Text>
              {filtered.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.ticketCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/maintenance/${t.id}` as any);
                  }}
                >
                  <View style={styles.ticketLeft}>
                    <Text style={styles.ticketIcon}>{getCategoryIcon(t.category)}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketCategory}>{t.category}</Text>
                      <StatusChip status={t.status} />
                    </View>
                    <Text style={styles.ticketDesc} numberOfLines={2}>{t.description}</Text>
                    <Text style={styles.ticketTime}>{formatTime(t.created_at)}</Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/maintenance/new'); }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
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
    fontSize: 20,
    fontFamily: 'CormorantGaramond_700Bold',
    textAlign: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: `${COLORS.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  pad: { padding: 20 },
  sectionLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    opacity: 0.5,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  ticketLeft: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketIcon: { fontSize: 22 },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  ticketCategory: { color: COLORS.primary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  ticketDesc: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19, marginBottom: 4 },
  ticketTime: { color: COLORS.textTertiary, fontSize: 11, fontFamily: 'DMSans_400Regular' },
  flex1: { flex: 1 },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  stateText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },
  emptyText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  errorSub: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
});
