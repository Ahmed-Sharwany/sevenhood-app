import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  Download,
  FileText,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, IMG } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const TABS = ['Overview', 'Contracts', 'Payments', 'Warranties', 'Snags', 'Drawings'];

const CONTRACTS = [
  { id: '1', name: 'Sales & Purchase Agreement', version: 'v2.1', date: 'Jan 2023', size: '2.4 MB' },
  { id: '2', name: 'Service Charge Agreement', version: 'v1.0', date: 'Feb 2023', size: '890 KB' },
  { id: '3', name: 'Handover Certificate', version: 'v1.0', date: 'Mar 2023', size: '1.1 MB' },
  { id: '4', name: 'NOC Document', version: 'v1.0', date: 'Apr 2023', size: '340 KB' },
];

const PAYMENTS = [
  { id: '1', installment: '1st Installment', due: '01 Jan 2023', amount: 'AED 185,000', status: 'paid' },
  { id: '2', installment: '2nd Installment', due: '01 Apr 2023', amount: 'AED 185,000', status: 'paid' },
  { id: '3', installment: '3rd Installment', due: '01 Jul 2023', amount: 'AED 185,000', status: 'paid' },
  { id: '4', installment: '4th Installment', due: '01 Oct 2023', amount: 'AED 185,000', status: 'upcoming' },
  { id: '5', installment: '5th Installment', due: '01 Jan 2024', amount: 'AED 185,000', status: 'upcoming' },
  { id: '6', installment: 'Final Payment', due: '01 Jun 2024', amount: 'AED 225,000', status: 'upcoming' },
];

const WARRANTIES = [
  { id: '1', item: 'AC Unit', provider: 'Carrier UAE', remaining: 8, total: 24, icon: '❄️' },
  { id: '2', item: 'Built-in Oven', provider: 'Bosch Service', remaining: 14, total: 24, icon: '🍳' },
  { id: '3', item: 'Plumbing System', provider: 'Sevenhood Facilities', remaining: 24, total: 60, icon: '🔧' },
  { id: '4', item: 'Electrical Wiring', provider: 'Sevenhood Facilities', remaining: 4, total: 12, icon: '⚡' },
  { id: '5', item: 'Smart Lock System', provider: 'Gateman UAE', remaining: 10, total: 12, icon: '🔐' },
];

const SNAGS = [
  { id: '1', description: 'Bathroom tile crack near shower', date: '12 Mar 2024', status: 'resolved', photo: IMG.bedroom },
  { id: '2', description: 'Kitchen cabinet door misaligned', date: '14 Mar 2024', status: 'open', photo: IMG.livingRoom },
  { id: '3', description: 'Balcony door hard to slide', date: '18 Mar 2024', status: 'pending', photo: IMG.sofaWhite },
];

const DRAWINGS = [
  { id: '1', name: 'Floor Plan - Unit 12B', type: 'Floor Plan', image: IMG.buildingGlass },
  { id: '2', name: 'Electrical Layout', type: 'Technical', image: IMG.buildingCurved },
  { id: '3', name: 'Plumbing Schematic', type: 'Technical', image: IMG.buildingDusk },
  { id: '4', name: 'Kitchen Elevation', type: 'Elevation', image: IMG.livingRoom },
];

function StatusChip({ status }: { status: string }) {
  const configs: Record<string, { color: string; bg: string; label: string }> = {
    paid: { color: COLORS.success, bg: '#F0FDF4', label: 'Paid' },
    upcoming: { color: COLORS.warning, bg: '#FFF7ED', label: 'Upcoming' },
    overdue: { color: COLORS.error, bg: '#FEF2F2', label: 'Overdue' },
    open: { color: COLORS.warning, bg: '#FFF7ED', label: 'Open' },
    resolved: { color: COLORS.success, bg: '#F0FDF4', label: 'Resolved' },
    pending: { color: COLORS.textSecondary, bg: '#F3F4F6', label: 'Pending' },
  };
  const c = configs[status] || configs.pending;
  return (
    <View style={[chipStyles.chip, { backgroundColor: c.bg }]}>
      <Text style={[chipStyles.text, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
});

function WarrantyBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = remaining / total;
  const color = pct > 0.5 ? COLORS.success : pct > 0.25 ? COLORS.warning : COLORS.error;
  return (
    <View style={wbStyles.container}>
      <View style={[wbStyles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const wbStyles = StyleSheet.create({
  container: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default function PropertyScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { resident } = useAuth();
  const [amenities, setAmenities] = useState<string[]>([]);

  const unit     = resident?.units as any;
  const building = unit?.buildings as any;
  const project  = building?.projects as any;

  // Fetch amenities for this building
  useEffect(() => {
    if (!building?.id) return;
    supabase
      .from('amenities')
      .select('name, icon')
      .eq('building_id', building.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAmenities(data.map((a: any) => `${a.icon ?? '🏢'} ${a.name}`));
        }
      });
  }, [building?.id]);

  // Build header info from real data
  const heroImage   = building?.image_url ?? IMG.buildingDusk;
  const unitTitle   = unit ? `Unit ${unit.unit_number}` : 'My Unit';
  const unitAddress = building ? `${building.name} — ${project?.name ?? ''}` : 'Sevenhood';
  const floorStr    = unit?.floor ? `Floor ${unit.floor}` : '';
  const locationStr = project?.location ?? '';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header image */}
      <View style={styles.headerImg}>
        <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(10,22,40,0.5)', 'rgba(10,22,40,0.3)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['top']} style={styles.headerOverlay}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.unitInfo}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Resident</Text>
            </View>
            <Text style={styles.unitTitle}>{unitTitle}</Text>
            <Text style={styles.unitAddr}>{unitAddress}</Text>
            {(floorStr || locationStr) && (
              <View style={styles.unitMeta}>
                {floorStr ? <Text style={styles.metaItem}>{floorStr}</Text> : null}
                {floorStr && locationStr ? <Text style={styles.metaDot}>·</Text> : null}
                {locationStr ? <Text style={styles.metaItem}>{locationStr}</Text> : null}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              onPress={() => { setActiveTab(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.tabItem, activeTab === i && styles.tabItemActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 0 && <OverviewTab unit={unit} building={building} project={project} amenities={amenities} />}
        {activeTab === 1 && <ContractsTab />}
        {activeTab === 2 && <PaymentsTab />}
        {activeTab === 3 && <WarrantiesTab />}
        {activeTab === 4 && <SnagsTab />}
        {activeTab === 5 && <DrawingsTab />}
      </ScrollView>
    </View>
  );
}

function OverviewTab({ unit, building, project, amenities }: {
  unit: any; building: any; project: any; amenities: string[];
}) {
  const details = [
    { label: 'Unit Number',  value: unit?.unit_number ?? '—' },
    { label: 'Building',     value: building?.name ?? '—' },
    { label: 'Project',      value: project?.name ?? '—' },
    { label: 'Floor',        value: unit?.floor != null ? `${unit.floor}th Floor` : '—' },
    { label: 'Tower',        value: unit?.tower ?? '—' },
    { label: 'Location',     value: project?.location ?? '—' },
    { label: 'Total Floors', value: building?.floors != null ? `${building.floors} Floors` : '—' },
    { label: 'Total Units',  value: building?.units_count != null ? `${building.units_count} Units` : '—' },
  ].filter(d => d.value !== '—');

  const displayAmenities = amenities.length > 0
    ? amenities
    : ['🏊 Pool', '🏋️ Gym', '🧖 Spa', '🏢 Concierge', '🚗 Parking', '🌿 Gardens'];

  return (
    <View style={tabStyles.container}>
      <Text style={tabStyles.sectionTitle}>Unit Details</Text>
      {details.map(({ label, value }, i) => (
        <View key={label} style={[tabStyles.detailRow, i < details.length - 1 && tabStyles.detailBorder]}>
          <Text style={tabStyles.detailLabel}>{label}</Text>
          <Text style={tabStyles.detailValue}>{value}</Text>
        </View>
      ))}

      <Text style={[tabStyles.sectionTitle, { marginTop: 28 }]}>Building Amenities</Text>
      <View style={tabStyles.amenitiesGrid}>
        {displayAmenities.map((a) => (
          <View key={a} style={tabStyles.amenityChip}>
            <Text style={tabStyles.amenityText}>{a}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ContractsTab() {
  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.watermarkNotice}>
        <Text style={tabStyles.watermarkText}>
          🔒 Documents are watermarked with your identity for security
        </Text>
      </View>
      {CONTRACTS.map((c) => (
        <View key={c.id} style={tabStyles.contractRow}>
          <View style={tabStyles.contractIcon}>
            <FileText size={20} color={COLORS.accent} strokeWidth={2} />
          </View>
          <View style={styles.flex1}>
            <Text style={tabStyles.contractName}>{c.name}</Text>
            <Text style={tabStyles.contractMeta}>{c.date} · {c.size}</Text>
          </View>
          <View style={tabStyles.versionBadge}>
            <Text style={tabStyles.versionText}>{c.version}</Text>
          </View>
          <TouchableOpacity style={tabStyles.downloadBtn} activeOpacity={0.7}>
            <Download size={18} color={COLORS.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function PaymentsTab() {
  const total = PAYMENTS.reduce((s, p) => s + parseInt(p.amount.replace(/\D/g, '')), 0);
  const paid = PAYMENTS.filter((p) => p.status === 'paid').reduce((s, p) => s + parseInt(p.amount.replace(/\D/g, '')), 0);

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.paymentSummary}>
        <View>
          <Text style={tabStyles.summaryLabel}>Total Value</Text>
          <Text style={tabStyles.summaryValue}>AED {total.toLocaleString()}</Text>
        </View>
        <View>
          <Text style={tabStyles.summaryLabel}>Paid</Text>
          <Text style={[tabStyles.summaryValue, { color: COLORS.success }]}>AED {paid.toLocaleString()}</Text>
        </View>
        <View>
          <Text style={tabStyles.summaryLabel}>Remaining</Text>
          <Text style={[tabStyles.summaryValue, { color: COLORS.warning }]}>AED {(total - paid).toLocaleString()}</Text>
        </View>
      </View>

      {PAYMENTS.map((p) => (
        <View key={p.id} style={tabStyles.paymentRow}>
          <View style={tabStyles.paymentStatusIcon}>
            {p.status === 'paid' ? (
              <CheckCircle size={18} color={COLORS.success} />
            ) : (
              <Clock size={18} color={COLORS.warning} />
            )}
          </View>
          <View style={styles.flex1}>
            <Text style={tabStyles.paymentName}>{p.installment}</Text>
            <Text style={tabStyles.paymentDue}>Due {p.due}</Text>
          </View>
          <View style={tabStyles.paymentRight}>
            <Text style={tabStyles.paymentAmount}>{p.amount}</Text>
            <StatusChip status={p.status} />
          </View>
        </View>
      ))}
    </View>
  );
}

function WarrantiesTab() {
  return (
    <View style={tabStyles.container}>
      {WARRANTIES.map((w) => {
        const pct = w.remaining / w.total;
        const urgency = pct < 0.25 ? COLORS.error : pct < 0.5 ? COLORS.warning : COLORS.success;
        return (
          <View key={w.id} style={tabStyles.warrantyCard}>
            <View style={tabStyles.warrantyHeader}>
              <Text style={tabStyles.warrantyIcon}>{w.icon}</Text>
              <View style={styles.flex1}>
                <Text style={tabStyles.warrantyName}>{w.item}</Text>
                <Text style={tabStyles.warrantyProvider}>{w.provider}</Text>
              </View>
              <View style={[tabStyles.warrantyBadge, { backgroundColor: `${urgency}15` }]}>
                <Text style={[tabStyles.warrantyBadgeText, { color: urgency }]}>
                  {w.remaining}mo left
                </Text>
              </View>
            </View>
            <WarrantyBar remaining={w.remaining} total={w.total} />
            <Text style={tabStyles.warrantyExpiry}>
              Expires in {w.remaining} months · {w.total}mo total coverage
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SnagsTab() {
  return (
    <View style={tabStyles.container}>
      <TouchableOpacity style={tabStyles.addSnagBtn} activeOpacity={0.85}>
        <Plus size={18} color="#fff" strokeWidth={2.5} />
        <Text style={tabStyles.addSnagText}>Add Snag</Text>
      </TouchableOpacity>

      {SNAGS.map((s) => (
        <View key={s.id} style={tabStyles.snagCard}>
          <Image source={{ uri: s.photo }} style={tabStyles.snagPhoto} resizeMode="cover" />
          <View style={styles.flex1}>
            <Text style={tabStyles.snagDesc} numberOfLines={2}>{s.description}</Text>
            <Text style={tabStyles.snagDate}>{s.date}</Text>
          </View>
          <StatusChip status={s.status} />
        </View>
      ))}
    </View>
  );
}

function DrawingsTab() {
  return (
    <View style={tabStyles.container}>
      <Text style={tabStyles.drawingHint}>Tap any drawing to view fullscreen. Pinch to zoom.</Text>
      <View style={tabStyles.drawingsGrid}>
        {DRAWINGS.map((d) => (
          <TouchableOpacity key={d.id} style={tabStyles.drawingCard} activeOpacity={0.85}>
            <Image source={{ uri: d.image }} style={tabStyles.drawingThumb} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(10,22,40,0.8)']}
              style={tabStyles.drawingOverlay}
            />
            <View style={tabStyles.drawingInfo}>
              <Text style={tabStyles.drawingName} numberOfLines={1}>{d.name}</Text>
              <Text style={tabStyles.drawingType}>{d.type}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerImg: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitInfo: {
    paddingBottom: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${COLORS.success}25`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${COLORS.success}40`,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveText: {
    color: COLORS.success,
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  unitTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'CormorantGaramond_700Bold',
    marginBottom: 4,
  },
  unitAddr: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 8,
  },
  unitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    color: COLORS.accentLight,
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 4,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
  content: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
});

const tabStyles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: 'CormorantGaramond_700Bold',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  detailBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  amenityText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
  watermarkNotice: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  watermarkText: {
    color: '#92400E',
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contractIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${COLORS.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 2,
  },
  contractMeta: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  versionBadge: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  versionText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 4,
  },
  summaryValue: {
    color: COLORS.primary,
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 2,
  },
  paymentDue: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentAmount: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  warrantyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  warrantyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warrantyIcon: {
    fontSize: 24,
  },
  warrantyName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 2,
  },
  warrantyProvider: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  warrantyBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  warrantyBadgeText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  warrantyExpiry: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 8,
  },
  addSnagBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  addSnagText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
  snagCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  snagPhoto: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  snagDesc: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    marginBottom: 4,
  },
  snagDate: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  drawingHint: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 16,
    textAlign: 'center',
  },
  drawingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  drawingCard: {
    width: '47%',
    borderRadius: 18,
    overflow: 'hidden',
    height: 120,
  },
  drawingThumb: {
    width: '100%',
    height: '100%',
  },
  drawingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  drawingInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  drawingName: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  drawingType: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
  },
});
