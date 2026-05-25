import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, CheckCircle, Clock, MessageCircle, Phone } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, IMG } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type Ticket = {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  unit_id: string | null;
  units?: {
    unit_number: string;
    floor?: number | null;
    buildings?: { name: string } | null;
  } | null;
  service_providers?: { name: string } | null;
};

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
  wrap: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  text: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
});

const STATUS_TRANSITIONS: Record<string, { next: string; label: string }> = {
  open: { next: 'in_progress', label: 'Mark In Progress' },
  in_progress: { next: 'completed', label: 'Mark Completed' },
};

export default function MaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('maintenance_tickets')
      .select('*, units(unit_number, floor, buildings(name)), service_providers(name)')
      .eq('id', id)
      .single();

    if (err) {
      setError(err.message);
    } else {
      setTicket(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id || !ticket) return;
    setUpdatingStatus(true);

    const { error: err } = await supabase
      .from('maintenance_tickets')
      .update({ status: newStatus })
      .eq('id', id);

    setUpdatingStatus(false);

    if (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Update failed', err.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTicket((prev) => prev ? { ...prev, status: newStatus } : prev);
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.stateText}>Loading ticket…</Text>
      </View>
    );
  }

  // Error state
  if (error || !ticket) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <StatusBar style="dark" />
        <Text style={styles.errorText}>Failed to load ticket</Text>
        {error && <Text style={styles.errorSub}>{error}</Text>}
        <TouchableOpacity onPress={fetchTicket} style={styles.retryBtn} activeOpacity={0.8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn} activeOpacity={0.8}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const assignedTo = ticket.service_providers?.name ?? 'Unassigned';
  const unitLabel = ticket.units
    ? `Unit ${ticket.units.unit_number}${ticket.units.buildings ? ` — ${ticket.units.buildings.name}` : ''}`
    : null;
  const transition = STATUS_TRANSITIONS[ticket.status];

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
          <Text style={styles.title}>Ticket #{String(ticket.id).padStart(4, '0')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          {/* Ticket card */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketCardTop}>
              <View style={styles.ticketIcon}>
                <Text style={styles.ticketEmoji}>{getCategoryIcon(ticket.category)}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.ticketCategory}>{ticket.category}</Text>
                <Text style={styles.ticketTime}>{formatTime(ticket.created_at)}</Text>
              </View>
              <StatusChip status={ticket.status} />
            </View>
            <Text style={styles.ticketDesc}>{ticket.description}</Text>
            {unitLabel && (
              <Text style={styles.ticketUnit}>{unitLabel}</Text>
            )}
          </View>

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Priority</Text>
              <Text style={[styles.infoValue, { color: ticket.priority === 'high' ? COLORS.error : COLORS.warning }]}>
                {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Assigned To</Text>
              <Text style={styles.infoValue}>{assignedTo}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>
                {ticket.status === 'in_progress' ? 'In Progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Photo attachment */}
          <Image source={{ uri: IMG.bedroom }} style={styles.photoAttach} resizeMode="cover" />

          {/* Status update button */}
          {transition && (
            <TouchableOpacity
              style={[styles.statusUpdateBtn, updatingStatus && styles.statusUpdateBtnDisabled]}
              activeOpacity={0.85}
              disabled={updatingStatus}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleStatusUpdate(transition.next);
              }}
            >
              {updatingStatus ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <CheckCircle size={18} color="#fff" strokeWidth={2} />
                  <Text style={styles.statusUpdateText}>{transition.label}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.85}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <MessageCircle size={18} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              activeOpacity={0.85}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Phone size={18} color="#fff" strokeWidth={2} />
              <Text style={styles.actionTextWhite}>Call Team</Text>
            </TouchableOpacity>
          </View>

          {/* Timeline placeholder — real timeline requires a separate updates table */}
          <Text style={styles.sectionTitle}>Activity Timeline</Text>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineText}>Ticket submitted</Text>
              <Text style={styles.timelineAuthor}>System · {formatTime(ticket.created_at)}</Text>
            </View>
          </View>
          {ticket.status === 'in_progress' && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineText}>Ticket moved to In Progress</Text>
                <Text style={styles.timelineAuthor}>System</Text>
              </View>
            </View>
          )}
          {ticket.status === 'completed' && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineText}>Ticket marked as Completed</Text>
                <Text style={styles.timelineAuthor}>System</Text>
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  stateText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
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
  backLinkBtn: { marginTop: 4 },
  backLinkText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
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
    fontSize: 18,
    fontFamily: 'CormorantGaramond_700Bold',
    textAlign: 'center',
  },
  pad: { padding: 20 },
  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  ticketIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketEmoji: { fontSize: 24 },
  flex1: { flex: 1 },
  ticketCategory: { color: COLORS.primary, fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginBottom: 2 },
  ticketTime: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'DMSans_400Regular' },
  ticketDesc: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 22 },
  ticketUnit: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 8,
  },
  infoGrid: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoItem: { alignItems: 'center', flex: 1 },
  infoLabel: { color: COLORS.textTertiary, fontSize: 11, fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  infoValue: { color: COLORS.textPrimary, fontSize: 13, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' },
  infoDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  photoAttach: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  statusUpdateBtnDisabled: { opacity: 0.6 },
  statusUpdateText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionText: { color: COLORS.primary, fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  actionTextWhite: { color: '#fff', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: 'CormorantGaramond_700Bold',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 16,
    bottom: -16,
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineContent: { flex: 1 },
  timelineText: { color: COLORS.textPrimary, fontSize: 14, fontFamily: 'DMSans_500Medium', marginBottom: 2 },
  timelineAuthor: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'DMSans_400Regular' },
});
