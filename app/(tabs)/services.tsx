import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Plus,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, IMG } from '@/constants/colors';

const SUB_TABS = ['Maintenance', 'Marketplace'];

const OPEN_TICKETS = [
  {
    id: '1',
    category: 'AC & Cooling',
    icon: '❄️',
    description: 'AC unit making loud noise and not cooling properly',
    time: '2h ago',
    status: 'open',
    priority: 'high',
  },
  {
    id: '2',
    category: 'Plumbing',
    icon: '🔧',
    description: 'Kitchen tap leaking under the sink cabinet',
    time: '1d ago',
    status: 'in_progress',
    priority: 'medium',
  },
];

const COMPLETED_TICKETS = [
  {
    id: '3',
    category: 'Electrical',
    icon: '⚡',
    description: 'Bedroom light switch not functioning',
    time: '3d ago',
    status: 'completed',
    priority: 'low',
  },
  {
    id: '4',
    category: 'Appliances',
    icon: '🍳',
    description: 'Built-in oven temperature inaccurate',
    time: '1w ago',
    status: 'completed',
    priority: 'medium',
  },
];

const MARKETPLACE_CATEGORIES = ['All', 'Cleaning', 'Moving', 'Furnishing', 'Repair', 'Beauty', 'Childcare'];

const VENDORS = [
  {
    id: '1',
    name: 'PristineClean',
    category: 'Cleaning',
    rating: 4.9,
    reviews: 328,
    priceFrom: 120,
    image: IMG.cleaning,
    verified: true,
    tags: ['Deep Clean', 'Move-out'],
  },
  {
    id: '2',
    name: 'MoveEase',
    category: 'Moving',
    rating: 4.8,
    reviews: 215,
    priceFrom: 350,
    image: IMG.livingRoom,
    verified: true,
    tags: ['Packing', 'Same-day'],
  },
  {
    id: '3',
    name: 'SpaceStylers',
    category: 'Furnishing',
    rating: 4.7,
    reviews: 89,
    priceFrom: 800,
    image: IMG.sofaWhite,
    verified: true,
    tags: ['Interior', 'Custom'],
  },
  {
    id: '4',
    name: 'QuickFix Pro',
    category: 'Repair',
    rating: 4.6,
    reviews: 412,
    priceFrom: 80,
    image: IMG.bedroom,
    verified: false,
    tags: ['Plumbing', 'Electrical'],
  },
  {
    id: '5',
    name: 'GlowUp Beauty',
    category: 'Beauty',
    rating: 4.9,
    reviews: 156,
    priceFrom: 150,
    image: IMG.bedroom,
    verified: true,
    tags: ['Hair', 'Nails', 'Massage'],
  },
];

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
  text: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});

export default function ServicesScreen() {
  const [subTab, setSubTab] = useState(0);
  const [marketCategory, setMarketCategory] = useState(0);

  const filteredVendors = marketCategory === 0
    ? VENDORS
    : VENDORS.filter((v) => v.category === MARKETPLACE_CATEGORIES[marketCategory]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
        <View style={styles.subTabRow}>
          {SUB_TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              onPress={() => { setSubTab(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.subTab, subTab === i && styles.subTabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.subTabText, subTab === i && styles.subTabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {subTab === 0 && (
        <View style={styles.flex1}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.pad}>
              {/* Open tickets */}
              <Text style={styles.sectionTitle}>Open Tickets ({OPEN_TICKETS.length})</Text>
              {OPEN_TICKETS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.ticketCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/maintenance/${t.id}` as any)}
                >
                  <View style={styles.ticketLeft}>
                    <Text style={styles.ticketIcon}>{t.icon}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketCategory}>{t.category}</Text>
                      <StatusChip status={t.status} />
                    </View>
                    <Text style={styles.ticketDesc} numberOfLines={2}>{t.description}</Text>
                    <Text style={styles.ticketTime}>{t.time}</Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              ))}

              {/* Completed */}
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Completed</Text>
              {COMPLETED_TICKETS.map((t) => (
                <View key={t.id} style={[styles.ticketCard, styles.ticketCardDone]}>
                  <View style={[styles.ticketLeft, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={styles.ticketIcon}>{t.icon}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketCategory}>{t.category}</Text>
                      <StatusChip status={t.status} />
                    </View>
                    <Text style={styles.ticketDesc} numberOfLines={2}>{t.description}</Text>
                    <Text style={styles.ticketTime}>{t.time}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/maintenance/new'); }}
          >
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {subTab === 1 && (
        <View style={styles.flex1}>
          {/* AI Design CTA — top of marketplace */}
          <TouchableOpacity
            style={styles.aiCard}
            activeOpacity={0.9}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/ai-design'); }}
          >
            <View>
              <Text style={styles.aiTitle}>AI Interior Design ✨</Text>
              <Text style={styles.aiSub}>Transform your space with AI</Text>
            </View>
            <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Category scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={styles.catContent}
          >
            {MARKETPLACE_CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={cat}
                onPress={() => { setMarketCategory(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.catPill, marketCategory === i && styles.catPillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.catText, marketCategory === i && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.vendorList}>
              {filteredVendors.map((vendor) => (
                <TouchableOpacity key={vendor.id} style={styles.vendorCard} activeOpacity={0.9}>
                  <Image source={{ uri: vendor.image }} style={styles.vendorImage} resizeMode="cover" />
                  <View style={styles.vendorBody}>
                    <View style={styles.vendorHeader}>
                      <Text style={styles.vendorName}>{vendor.name}</Text>
                      {vendor.verified && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>✓ Verified</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.vendorRating}>
                      <Star size={13} color={COLORS.warning} fill={COLORS.warning} strokeWidth={0} />
                      <Text style={styles.ratingText}>{vendor.rating}</Text>
                      <Text style={styles.reviewsText}>({vendor.reviews} reviews)</Text>
                    </View>
                    <View style={styles.vendorTags}>
                      {vendor.tags.map((tag) => (
                        <View key={tag} style={styles.vendorTag}>
                          <Text style={styles.vendorTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.vendorFooter}>
                      <Text style={styles.priceText}>From <Text style={styles.priceValue}>AED {vendor.priceFrom}</Text></Text>
                      <TouchableOpacity
                        style={styles.bookBtn}
                        activeOpacity={0.85}
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                      >
                        <Text style={styles.bookBtnText}>View & Book</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex1: { flex: 1 },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    paddingTop: 12,
    paddingBottom: 16,
  },
  subTabRow: {
    flexDirection: 'row',
  },
  subTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: { borderBottomColor: COLORS.accent },
  subTabText: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Inter_500Medium' },
  subTabTextActive: { color: COLORS.primary, fontFamily: 'Inter_600SemiBold' },
  pad: { padding: 20 },
  aiCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  aiTitle: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  aiSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_400Regular' },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: 14,
    opacity: 0.6,
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
  ticketCardDone: {
    opacity: 0.75,
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
  ticketCategory: { color: COLORS.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  ticketDesc: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 4 },
  ticketTime: { color: COLORS.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  catScroll: { flexGrow: 0, paddingTop: 12 },
  catContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' },
  catTextActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  vendorList: { padding: 16, gap: 16 },
  vendorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  vendorImage: { width: '100%', height: 140 },
  vendorBody: { padding: 16 },
  vendorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  vendorName: { color: COLORS.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  verifiedBadge: {
    backgroundColor: `${COLORS.success}15`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
  },
  verifiedText: { color: COLORS.success, fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  vendorRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  ratingText: { color: COLORS.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  reviewsText: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  vendorTags: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  vendorTag: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vendorTagText: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'Inter_500Medium' },
  vendorFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' },
  priceValue: { color: COLORS.textPrimary, fontFamily: 'Inter_600SemiBold' },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bookBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
