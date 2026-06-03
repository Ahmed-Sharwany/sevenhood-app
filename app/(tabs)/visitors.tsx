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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X, ChevronRight, User, Truck, RotateCcw, Car } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type VisitorPass = {
  id: string;
  visitor_name: string;
  unit_id: string;
  pass_type: 'one_time' | 'recurring' | string;
  valid_until: string | null;
  status: 'active' | 'cancelled' | 'expired' | string;
  detail: string | null;
  created_at: string;
  units: { unit_number: string } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PASS_TYPES = [
  { id: 'one_time', label: 'One-off Visitor', icon: User, emoji: '👤' },
  { id: 'delivery', label: 'Delivery', icon: Truck, emoji: '📦' },
  { id: 'recurring', label: 'Recurring', icon: RotateCcw, emoji: '🔄' },
  { id: 'vehicle', label: 'Vehicle / Driver', icon: Car, emoji: '🚗' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function passEmoji(type: string): string {
  const map: Record<string, string> = {
    one_time: '👤',
    delivery: '📦',
    recurring: '🔄',
    vehicle: '🚗',
  };
  return map[type] ?? '🔑';
}

function passTypeLabel(type: string): string {
  const map: Record<string, string> = {
    one_time: 'One-off',
    delivery: 'Delivery',
    recurring: 'Recurring',
    vehicle: 'Vehicle',
  };
  return map[type] ?? type;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    active: { color: COLORS.success, bg: '#F0FDF4', label: 'Active' },
    recurring: { color: COLORS.primary, bg: '#EFF6FF', label: 'Recurring' },
    pending: { color: COLORS.warning, bg: '#FFF7ED', label: 'Pending' },
    cancelled: { color: COLORS.error, bg: '#FEF2F2', label: 'Cancelled' },
    expired: { color: COLORS.textTertiary, bg: COLORS.background, label: 'Expired' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <View style={[badge.wrap, { backgroundColor: c.bg }]}>
      <Text style={[badge.text, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  text: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VisitorsScreen() {
  const { resident } = useAuth();

  // List state
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Unit resolution — derived from AuthContext
  const unitId    = (resident?.units as any)?.id ?? null;
  const unitLabel = resident?.units
    ? `Unit ${(resident.units as any).unit_number} — ${(resident.units as any).buildings?.name ?? 'Sevenhood'}`
    : 'Sevenhood';

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [passType, setPassType] = useState<string | null>(null);
  const [step, setStep] = useState<'type' | 'details' | 'generated'>('type');
  const [generatedPassId, setGeneratedPassId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Form fields
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [plateNumber, setPlateNumber] = useState('');
  const [endDate, setEndDate] = useState('');

  // ── Fetch passes ───────────────────────────────────────────────────────────
  const fetchPasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('visitor_passes')
      .select('*, units(unit_number)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setPasses((data as unknown as VisitorPass[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openModal = () => {
    setShowModal(true);
    setStep('type');
    setPassType(null);
    setVisitorName('');
    setPhone('');
    setDate('');
    setTimeWindow('');
    setSelectedDays(new Set());
    setPlateNumber('');
    setEndDate('');
    setGeneratedPassId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeModal = () => {
    setShowModal(false);
    setStep('type');
    setPassType(null);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  // ── Generate / insert pass ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!unitId) {
      Alert.alert('Error', 'Could not determine your unit. Please try again.');
      return;
    }

    setGenerating(true);

    const detail =
      passType === 'recurring'
        ? `Days: ${Array.from(selectedDays).join(', ')}${timeWindow ? ` | ${timeWindow}` : ''}${plateNumber ? ` | Plate: ${plateNumber}` : ''}`
        : timeWindow
        ? `${date ? date + ' ' : ''}${timeWindow}`
        : date || null;

    const { data, error: insertErr } = await supabase
      .from('visitor_passes')
      .insert({
        visitor_name: visitorName.trim() || 'Visitor',
        unit_id: unitId,
        pass_type: passType === 'delivery' ? 'one_time' : passType ?? 'one_time',
        valid_until: endDate || date || null,
        status: passType === 'recurring' ? 'recurring' : 'active',
        detail: detail,
      })
      .select()
      .single();

    setGenerating(false);

    if (insertErr) {
      Alert.alert('Error', insertErr.message);
      return;
    }

    setGeneratedPassId(data?.id ?? null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('generated');
    fetchPasses();
  };

  // ── Cancel pass ────────────────────────────────────────────────────────────
  const cancelPass = async (pass: VisitorPass) => {
    Alert.alert('Cancel Pass', `Cancel the pass for "${pass.visitor_name}"?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Pass',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(pass.id);
          const { error: updateErr } = await supabase
            .from('visitor_passes')
            .update({ status: 'cancelled' })
            .eq('id', pass.id);
          setCancellingId(null);
          if (updateErr) {
            Alert.alert('Error', updateErr.message);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            fetchPasses();
          }
        },
      },
    ]);
  };

  // ── Derived: active passes only ─────────────────────────────────────────────
  const activePasses = passes.filter((p) => p.status !== 'cancelled' && p.status !== 'expired');
  const pastPasses = passes.filter((p) => p.status === 'cancelled' || p.status === 'expired');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.headerTitle}>Visitors</Text>
        <Text style={styles.headerSub}>Manage access passes for your unit</Text>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* New Pass CTA */}
        <View style={styles.newPassWrap}>
          <TouchableOpacity onPress={openModal} activeOpacity={0.9} style={styles.newPassBtn}>
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newPassGradient}
            >
              <Text style={styles.newPassIcon}>＋</Text>
              <Text style={styles.newPassText}>New Pass</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Active Passes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Passes</Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
          ) : error ? (
            <Text style={styles.errorText}>Could not load passes. {error}</Text>
          ) : activePasses.length === 0 ? (
            <Text style={styles.emptyText}>No active passes. Tap "New Pass" to create one.</Text>
          ) : (
            activePasses.map((pass) => (
              <TouchableOpacity
                key={pass.id}
                style={styles.passCard}
                activeOpacity={0.85}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                onLongPress={() => cancelPass(pass)}
              >
                <View style={styles.passIcon}>
                  <Text style={styles.passEmoji}>{passEmoji(pass.pass_type)}</Text>
                </View>
                <View style={styles.passInfo}>
                  <Text style={styles.passName}>{pass.visitor_name}</Text>
                  <Text style={styles.passDetail}>
                    {pass.detail ?? passTypeLabel(pass.pass_type)}
                  </Text>
                </View>
                <StatusBadge status={pass.status} />
                {cancellingId === pass.id ? (
                  <ActivityIndicator size="small" color={COLORS.textTertiary} style={{ marginLeft: 4 }} />
                ) : (
                  <ChevronRight size={16} color={COLORS.textTertiary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Past / Cancelled Passes */}
        {pastPasses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Passes</Text>
            {pastPasses.map((pass) => (
              <View key={pass.id} style={[styles.passCard, styles.passCardDim]}>
                <View style={styles.passIcon}>
                  <Text style={styles.passEmoji}>{passEmoji(pass.pass_type)}</Text>
                </View>
                <View style={styles.passInfo}>
                  <Text style={styles.passName}>{pass.visitor_name}</Text>
                  <Text style={styles.passDetail}>
                    {pass.detail ?? passTypeLabel(pass.pass_type)}
                  </Text>
                </View>
                <StatusBadge status={pass.status} />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={modal.overlay}>
          <TouchableOpacity style={modal.dismiss} onPress={closeModal} activeOpacity={1} />
          <View style={modal.sheet}>
            {/* Handle */}
            <View style={modal.handle} />

            {/* Header */}
            <View style={modal.sheetHeader}>
              <Text style={modal.sheetTitle}>
                {step === 'type'
                  ? 'New Access Pass'
                  : step === 'details'
                  ? 'Pass Details'
                  : 'Pass Generated!'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={modal.closeBtn} activeOpacity={0.7}>
                <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Step: Type */}
            {step === 'type' && (
              <View style={modal.body}>
                <Text style={modal.stepLabel}>Select pass type</Text>
                <View style={modal.typeGrid}>
                  {PASS_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => {
                        setPassType(type.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[modal.typeCard, passType === type.id && modal.typeCardActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={modal.typeEmoji}>{type.emoji}</Text>
                      <Text style={[modal.typeLabel, passType === type.id && modal.typeLabelActive]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => passType && setStep('details')}
                  style={[modal.nextBtn, !passType && modal.nextBtnDisabled]}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[COLORS.accent, COLORS.accentLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={modal.nextGradient}
                  >
                    <Text style={modal.nextBtnText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Step: Details */}
            {step === 'details' && (
              <ScrollView style={modal.body}>
                <View style={modal.fieldRow}>
                  <Text style={modal.fieldLabel}>Unit</Text>
                  <View style={[modal.inputBox, modal.inputDisabled]}>
                    <Text style={modal.inputText}>{unitLabel}</Text>
                  </View>
                </View>

                {(passType === 'one_time' || passType === 'delivery') && (
                  <>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Visitor Name (Optional)</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. John Smith"
                        placeholderTextColor={COLORS.textTertiary}
                        value={visitorName}
                        onChangeText={setVisitorName}
                      />
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Phone (Optional)</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="+971 50 XXX XXXX"
                        placeholderTextColor={COLORS.textTertiary}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Date</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. Today, 15 Jul 2024"
                        placeholderTextColor={COLORS.textTertiary}
                        value={date}
                        onChangeText={setDate}
                      />
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Time Window</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. 2:00 PM – 4:00 PM"
                        placeholderTextColor={COLORS.textTertiary}
                        value={timeWindow}
                        onChangeText={setTimeWindow}
                      />
                    </View>
                  </>
                )}

                {passType === 'recurring' && (
                  <>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Days of Week</Text>
                      <View style={modal.daysRow}>
                        {DAYS.map((d) => (
                          <TouchableOpacity
                            key={d}
                            onPress={() => toggleDay(d)}
                            style={[modal.dayChip, selectedDays.has(d) && modal.dayChipActive]}
                            activeOpacity={0.7}
                          >
                            <Text style={[modal.dayText, selectedDays.has(d) && modal.dayTextActive]}>
                              {d}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Time Window</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. 06:25 – 06:35"
                        placeholderTextColor={COLORS.textTertiary}
                        value={timeWindow}
                        onChangeText={setTimeWindow}
                      />
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Plate Number</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. Dubai A 12345"
                        placeholderTextColor={COLORS.textTertiary}
                        value={plateNumber}
                        onChangeText={setPlateNumber}
                      />
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>End Date</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. 31 Dec 2024"
                        placeholderTextColor={COLORS.textTertiary}
                        value={endDate}
                        onChangeText={setEndDate}
                      />
                    </View>
                  </>
                )}

                {passType === 'vehicle' && (
                  <>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Driver Name (Optional)</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. Mohammed"
                        placeholderTextColor={COLORS.textTertiary}
                        value={visitorName}
                        onChangeText={setVisitorName}
                      />
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Plate Number</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. Riyadh A 12345"
                        placeholderTextColor={COLORS.textTertiary}
                        value={plateNumber}
                        onChangeText={setPlateNumber}
                      />
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Date</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. Today, 15 Jul 2024"
                        placeholderTextColor={COLORS.textTertiary}
                        value={date}
                        onChangeText={setDate}
                      />
                    </View>
                    <View style={modal.fieldRow}>
                      <Text style={modal.fieldLabel}>Time Window</Text>
                      <TextInput
                        style={modal.input}
                        placeholder="e.g. 2:00 PM – 4:00 PM"
                        placeholderTextColor={COLORS.textTertiary}
                        value={timeWindow}
                        onChangeText={setTimeWindow}
                      />
                    </View>
                  </>
                )}

                <TouchableOpacity
                  onPress={handleGenerate}
                  style={[modal.nextBtn, generating && modal.nextBtnDisabled]}
                  activeOpacity={0.85}
                  disabled={generating}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={modal.nextGradient}
                  >
                    {generating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={modal.nextBtnText}>Generate Pass</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            )}

            {/* Step: Generated */}
            {step === 'generated' && (
              <View style={modal.body}>
                <View style={modal.successIcon}>
                  <Text style={modal.successEmoji}>✅</Text>
                </View>
                <Text style={modal.successTitle}>Pass Ready!</Text>
                <Text style={modal.successSub}>Share this code with your visitor</Text>

                {/* Real QR Code */}
                <View style={modal.qrBox}>
                  <View style={modal.qrFrame}>
                    <QRCode
                      value={`sevenhood://pass/${generatedPassId ?? 'unknown'}`}
                      size={160}
                      color={COLORS.primary}
                      backgroundColor="#fff"
                    />
                  </View>
                </View>

                {/* 6-digit code derived from pass id */}
                <View style={modal.codeRow}>
                  {(generatedPassId
                    ? generatedPassId.replace(/-/g, '').slice(0, 6).toUpperCase()
                    : '------'
                  )
                    .split('')
                    .map((char, i) => (
                      <View key={i} style={modal.codeBox}>
                        <Text style={modal.codeText}>{char}</Text>
                      </View>
                    ))}
                </View>
                <Text style={modal.codeHint}>6-character fallback code</Text>

                {/* Share buttons */}
                <View style={modal.shareRow}>
                  <TouchableOpacity
                    style={modal.shareBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      const code = generatedPassId
                        ? generatedPassId.replace(/-/g, '').slice(0, 6).toUpperCase()
                        : '------';
                      const msg = encodeURIComponent(
                        `Your Sevenhood access pass is ready!\nCode: ${code}\nLink: sevenhood://pass/${generatedPassId}`
                      );
                      Linking.openURL(`whatsapp://send?text=${msg}`).catch(() =>
                        Alert.alert('WhatsApp not installed', 'Please install WhatsApp to share.')
                      );
                    }}
                  >
                    <Text style={modal.shareBtnText}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modal.shareBtn, modal.shareBtnSms]}
                    activeOpacity={0.85}
                    onPress={() => {
                      const code = generatedPassId
                        ? generatedPassId.replace(/-/g, '').slice(0, 6).toUpperCase()
                        : '------';
                      const msg = encodeURIComponent(
                        `Your Sevenhood access pass code: ${code}`
                      );
                      Linking.openURL(`sms:?body=${msg}`).catch(() =>
                        Alert.alert('SMS unavailable', 'Cannot open Messages on this device.')
                      );
                    }}
                  >
                    <Text style={modal.shareBtnTextSms}>📱 SMS</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={closeModal} style={modal.doneBtn} activeOpacity={0.85}>
                  <Text style={modal.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    paddingTop: 12,
    marginBottom: 4,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  newPassWrap: { padding: 20, paddingBottom: 8 },
  newPassBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 62,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  newPassGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newPassIcon: { color: '#fff', fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  newPassText: { color: '#fff', fontSize: 17, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  section: { paddingHorizontal: 20, paddingTop: 12 },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    opacity: 0.5,
    marginBottom: 12,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  passCard: {
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
  passCardDim: {
    opacity: 0.55,
  },
  passIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passEmoji: { fontSize: 22 },
  passInfo: { flex: 1 },
  passName: { color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  passDetail: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,22,40,0.5)',
    justifyContent: 'flex-end',
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: { color: COLORS.primary, fontSize: 18, fontFamily: 'PlayfairDisplay_600SemiBold' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 24, paddingTop: 20 },
  stepLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFFBF5',
  },
  typeEmoji: { fontSize: 28 },
  typeLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  typeLabelActive: { color: COLORS.primary },
  nextBtn: { borderRadius: 18, overflow: 'hidden', height: 56, marginBottom: 8 },
  nextBtnDisabled: { opacity: 0.4 },
  nextGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  fieldRow: { marginBottom: 18 },
  fieldLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputBox: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: { opacity: 0.6 },
  inputText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textPrimary },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dayTextActive: { color: '#fff' },
  successIcon: { alignItems: 'center', marginBottom: 8 },
  successEmoji: { fontSize: 56 },
  successTitle: {
    color: COLORS.primary,
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrBox: { alignItems: 'center', marginBottom: 24 },
  qrFrame: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { color: COLORS.primary, fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  codeHint: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  shareBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnSms: { backgroundColor: COLORS.primary },
  shareBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  shareBtnTextSms: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  doneBtn: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doneBtnText: { color: COLORS.textSecondary, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
