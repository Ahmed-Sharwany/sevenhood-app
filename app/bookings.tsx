import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Calendar, Clock, Users, CheckCircle, XCircle, Hourglass } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Amenity {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  description: string | null;
  image_url: string | null;
  amenity_booking_rules?: {
    open_time?: string;
    close_time?: string;
    slot_duration_mins?: number;
    max_attendees?: number;
  } | null;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  attendees_count: number;
  notes: string | null;
  amenities?: { name: string; category: string } | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  fitness: '💪', social: '👥', workspace: '💼',
  entertainment: '🎬', outdoor: '🌿', sports: '⚽', other: '✨',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; Icon: any }> = {
  pending:  { color: COLORS.warning, bg: '#FFF7ED', label: 'Pending',  Icon: Hourglass  },
  approved: { color: COLORS.success, bg: '#F0FDF4', label: 'Approved', Icon: CheckCircle },
  rejected: { color: COLORS.error,   bg: '#FEF2F2', label: 'Rejected', Icon: XCircle    },
  cancelled:{ color: COLORS.textSecondary, bg: '#F3F4F6', label: 'Cancelled', Icon: XCircle },
};

// Generate time slots from open_time to close_time at slot_duration_mins intervals
function generateSlots(open = '08:00', close = '22:00', duration = 60): string[] {
  const slots: string[] = [];
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  let mins = oh * 60 + om;
  const end  = ch * 60 + cm;
  while (mins + duration <= end) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(label);
    mins += duration;
  }
  return slots;
}

// Next 7 days as selectable dates
function getNext7Days() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d.getDate(),
    });
  }
  return days;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const { resident } = useAuth();
  const [amenities,   setAmenities]   = useState<Amenity[]>([]);
  const [myBookings,  setMyBookings]  = useState<Booking[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<'amenities' | 'mybookings'>('amenities');

  // Modal state
  const [selected,    setSelected]    = useState<Amenity | null>(null);
  const [selDate,     setSelDate]     = useState(getNext7Days()[0].date);
  const [selTime,     setSelTime]     = useState<string | null>(null);
  const [attendees,   setAttendees]   = useState('1');
  const [notes,       setNotes]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [takenSlots,  setTakenSlots]  = useState<string[]>([]);

  const buildingId = (resident?.units as any)?.building_id;
  const residentId = resident?.id;
  const unitId     = (resident?.units as any)?.id;

  const load = useCallback(async () => {
    if (!buildingId || !residentId) return;

    const [amenRes, bookRes] = await Promise.all([
      supabase
        .from('amenities')
        .select('*, amenity_booking_rules(*)')
        .eq('building_id', buildingId)
        .eq('requires_booking', true)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('amenity_bookings')
        .select('*, amenities(name, category)')
        .eq('resident_id', residentId)
        .order('booking_date', { ascending: false })
        .limit(20),
    ]);

    setAmenities((amenRes.data ?? []) as Amenity[]);
    setMyBookings((bookRes.data ?? []) as Booking[]);
    setLoading(false);
    setRefreshing(false);
  }, [buildingId, residentId]);

  useEffect(() => { load(); }, [load]);

  // Fetch taken slots when amenity + date changes
  useEffect(() => {
    if (!selected || !selDate) return;
    supabase
      .from('amenity_bookings')
      .select('start_time')
      .eq('amenity_id', selected.id)
      .eq('booking_date', selDate)
      .in('status', ['pending', 'approved'])
      .then(({ data }) => setTakenSlots((data ?? []).map((b: any) => b.start_time.slice(0, 5))));
  }, [selected?.id, selDate]);

  const openModal = (amenity: Amenity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(amenity);
    setSelDate(getNext7Days()[0].date);
    setSelTime(null);
    setAttendees('1');
    setNotes('');
  };

  const submitBooking = async () => {
    if (!selTime || !selected || !residentId || !unitId) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const rules    = selected.amenity_booking_rules;
    const duration = rules?.slot_duration_mins ?? 60;
    const [h, m]   = selTime.split(':').map(Number);
    const endMins  = h * 60 + m + duration;
    const endTime  = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;

    const { error } = await supabase.from('amenity_bookings').insert({
      amenity_id:      selected.id,
      resident_id:     residentId,
      unit_id:         unitId,
      booking_date:    selDate,
      start_time:      selTime,
      end_time:        endTime,
      duration_mins:   duration,
      attendees_count: parseInt(attendees) || 1,
      notes:           notes || null,
      status:          'pending',
    });

    setSubmitting(false);
    if (error) {
      Alert.alert('Booking failed', error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelected(null);
      load();
      setActiveTab('mybookings');
    }
  };

  const cancelBooking = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('amenity_bookings').update({ status: 'cancelled' }).eq('id', id);
          load();
        },
      },
    ]);
  };

  const days  = getNext7Days();
  const rules = selected?.amenity_booking_rules;
  const slots = selected
    ? generateSlots(rules?.open_time ?? '08:00', rules?.close_time ?? '22:00', rules?.slot_duration_mins ?? 60)
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
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
          <Text style={styles.title}>Amenity Bookings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['amenities', 'mybookings'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => { setActiveTab(tab); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab === 'amenities' ? 'Amenities' : 'My Bookings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          <View style={styles.pad}>

            {/* ── Amenities tab ── */}
            {activeTab === 'amenities' && (
              <>
                {amenities.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyIcon}>🏢</Text>
                    <Text style={styles.emptyTitle}>No bookable amenities</Text>
                    <Text style={styles.emptySub}>Your building has no amenities set up for booking yet.</Text>
                  </View>
                ) : (
                  amenities.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={styles.amenityCard}
                      onPress={() => openModal(a)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.amenityIconWrap}>
                        <Text style={styles.amenityIcon}>
                          {a.icon ?? CATEGORY_ICONS[a.category] ?? '✨'}
                        </Text>
                      </View>
                      <View style={styles.amenityInfo}>
                        <Text style={styles.amenityName}>{a.name}</Text>
                        {a.description && (
                          <Text style={styles.amenityDesc} numberOfLines={1}>{a.description}</Text>
                        )}
                        <View style={styles.amenityMeta}>
                          <Text style={styles.amenityMetaText}>
                            {rules?.open_time ?? '08:00'} – {rules?.close_time ?? '22:00'}
                          </Text>
                          {rules?.max_attendees && (
                            <Text style={styles.amenityMetaText}>· Max {rules.max_attendees} guests</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.bookBadge}>
                        <Text style={styles.bookBadgeText}>Book</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}

            {/* ── My Bookings tab ── */}
            {activeTab === 'mybookings' && (
              <>
                {myBookings.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyIcon}>📅</Text>
                    <Text style={styles.emptyTitle}>No bookings yet</Text>
                    <Text style={styles.emptySub}>Book an amenity from the Amenities tab.</Text>
                  </View>
                ) : (
                  myBookings.map(b => {
                    const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                    return (
                      <View key={b.id} style={styles.bookingCard}>
                        <View style={styles.bookingTop}>
                          <Text style={styles.bookingAmenityName}>{b.amenities?.name ?? 'Amenity'}</Text>
                          <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
                            <cfg.Icon size={12} color={cfg.color} strokeWidth={2.5} />
                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                        </View>
                        <View style={styles.bookingDetails}>
                          <View style={styles.bookingDetail}>
                            <Calendar size={14} color={COLORS.textTertiary} strokeWidth={2} />
                            <Text style={styles.bookingDetailText}>{b.booking_date}</Text>
                          </View>
                          <View style={styles.bookingDetail}>
                            <Clock size={14} color={COLORS.textTertiary} strokeWidth={2} />
                            <Text style={styles.bookingDetailText}>{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</Text>
                          </View>
                          <View style={styles.bookingDetail}>
                            <Users size={14} color={COLORS.textTertiary} strokeWidth={2} />
                            <Text style={styles.bookingDetailText}>{b.attendees_count} guest{b.attendees_count > 1 ? 's' : ''}</Text>
                          </View>
                        </View>
                        {b.status === 'pending' && (
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => cancelBooking(b.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Booking Modal ── */}
      {selected && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
          <View style={modal.container}>
            {/* Modal header */}
            <View style={modal.header}>
              <View>
                <Text style={modal.title}>{selected.name}</Text>
                <Text style={modal.subtitle}>Select date & time</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={modal.closeBtn} activeOpacity={0.8}>
                <Text style={modal.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modal.pad}>

                {/* Date selector */}
                <Text style={modal.sectionLabel}>Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.dayScroll}>
                  {days.map(d => (
                    <TouchableOpacity
                      key={d.date}
                      style={[modal.dayChip, selDate === d.date && modal.dayChipActive]}
                      onPress={() => { setSelDate(d.date); setSelTime(null); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[modal.dayLabel, selDate === d.date && modal.dayLabelActive]}>{d.label}</Text>
                      <Text style={[modal.dayNum, selDate === d.date && modal.dayNumActive]}>{d.day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Time slots */}
                <Text style={[modal.sectionLabel, { marginTop: 20 }]}>Time Slot</Text>
                <View style={modal.slotsGrid}>
                  {slots.map(slot => {
                    const taken = takenSlots.includes(slot);
                    return (
                      <TouchableOpacity
                        key={slot}
                        disabled={taken}
                        onPress={() => { setSelTime(slot); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[
                          modal.slotChip,
                          selTime === slot && modal.slotChipActive,
                          taken && modal.slotChipTaken,
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          modal.slotText,
                          selTime === slot && modal.slotTextActive,
                          taken && modal.slotTextTaken,
                        ]}>
                          {slot}
                        </Text>
                        {taken && <Text style={modal.takenLabel}>Taken</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Attendees */}
                <Text style={[modal.sectionLabel, { marginTop: 20 }]}>Number of Guests</Text>
                <TextInput
                  value={attendees}
                  onChangeText={setAttendees}
                  keyboardType="number-pad"
                  style={modal.input}
                  placeholder="1"
                  placeholderTextColor={COLORS.textTertiary}
                  maxLength={2}
                />

                {/* Notes */}
                <Text style={[modal.sectionLabel, { marginTop: 16 }]}>Notes (optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  style={[modal.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Any special requirements..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                />

                {/* Submit */}
                <TouchableOpacity
                  style={[modal.submitBtn, (!selTime || submitting) && modal.submitBtnDisabled]}
                  onPress={submitBooking}
                  disabled={!selTime || submitting}
                  activeOpacity={0.9}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={modal.submitText}>
                      {selTime ? `Confirm Booking · ${selTime}` : 'Select a time slot'}
                    </Text>
                  )}
                </TouchableOpacity>

                <Text style={modal.notice}>Bookings are subject to approval by building management.</Text>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
    fontFamily: 'CormorantGaramond_700Bold', textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    paddingHorizontal: 20, paddingBottom: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 12,
    backgroundColor: COLORS.background, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabBtnText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  tabBtnTextActive: { color: '#fff' },
  pad: { padding: 20 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: COLORS.primary, fontSize: 18, fontFamily: 'CormorantGaramond_700Bold', marginBottom: 8 },
  emptySub: { color: COLORS.textTertiary, fontSize: 14, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  amenityCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 16, marginBottom: 12, flexDirection: 'row',
    alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  amenityIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  amenityIcon: { fontSize: 26 },
  amenityInfo: { flex: 1 },
  amenityName: { color: COLORS.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold', marginBottom: 2 },
  amenityDesc: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  amenityMeta: { flexDirection: 'row', gap: 4 },
  amenityMetaText: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'DMSans_500Medium' },
  bookBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  bookBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  bookingCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bookingAmenityName: { color: COLORS.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  bookingDetails: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  bookingDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingDetailText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'DMSans_400Regular' },
  cancelBtn: {
    marginTop: 8, borderWidth: 1, borderColor: `${COLORS.error}40`,
    borderRadius: 12, paddingVertical: 8, alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.error, fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 24, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.primary, fontSize: 20, fontFamily: 'CormorantGaramond_700Bold' },
  subtitle: { color: COLORS.textTertiary, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  pad: { padding: 20 },
  sectionLabel: {
    color: COLORS.primary, fontSize: 12, fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  dayScroll: { marginHorizontal: -4 },
  dayChip: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14, backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.border, marginHorizontal: 4,
    minWidth: 60,
  },
  dayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayLabel: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'DMSans_500Medium' },
  dayLabelActive: { color: '#fff' },
  dayNum: { color: COLORS.textPrimary, fontSize: 18, fontFamily: 'DMSans_600SemiBold', marginTop: 2 },
  dayNumActive: { color: '#fff' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center',
  },
  slotChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  slotChipTaken: { backgroundColor: COLORS.background, borderColor: COLORS.border, opacity: 0.5 },
  slotText: { color: COLORS.textPrimary, fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  slotTextActive: { color: '#fff' },
  slotTextTaken: { color: COLORS.textTertiary },
  takenLabel: { color: COLORS.textTertiary, fontSize: 9, fontFamily: 'DMSans_400Regular', marginTop: 1 },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, fontFamily: 'DMSans_400Regular', color: COLORS.textPrimary,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center', marginTop: 24,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  submitBtnDisabled: { backgroundColor: COLORS.textTertiary, shadowOpacity: 0 },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  notice: {
    color: COLORS.textTertiary, fontSize: 12, fontFamily: 'DMSans_400Regular',
    textAlign: 'center', marginTop: 12, lineHeight: 18,
  },
});
