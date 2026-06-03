import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Heart, MessageCircle, Send, Plus, Search, Calendar, MapPin, Users, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const SUB_TABS = ['Feed', 'Events', 'Directory'];
const FEED_FILTERS = ['Building', 'Compound', 'My Groups'];

// ─── Types ───────────────────────────────────────────────────────────────────

type Post = {
  id: string;
  author_name: string;
  content: string;
  is_operator: boolean;
  likes: number;
  comments: number;
  created_at: string;
};

type Event = {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  rsvp: number;
  capacity: number;
  emoji: string;
};

type Member = {
  id: string;
  full_name: string;
  unit_id: string | null;
  units: { unit_number: string } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#DC2626', '#059669', '#D97706', '#1D4ED8', '#BE185D'];
function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Loading / Empty placeholders ────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <View style={shared.center}>
      <ActivityIndicator size="large" color={COLORS.accent} />
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={shared.center}>
      <Text style={shared.emptyText}>{message}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const { resident } = useAuth();
  const [subTab, setSubTab] = useState(0);
  const [feedFilter, setFeedFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set());
  const [rsvpLoading, setRsvpLoading] = useState<Set<string>>(new Set());

  // Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Events
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Members
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  // New post modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);

  // ── Fetch posts ─────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      setPostsError(error.message);
    } else {
      setPosts(data ?? []);
    }
    setPostsLoading(false);
  }, []);

  // ── Fetch events ────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .limit(10);
    if (error) {
      setEventsError(error.message);
    } else {
      setEvents(data ?? []);
    }
    setEventsLoading(false);
  }, []);

  // ── Fetch members ───────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    const { data, error } = await supabase
      .from('residents')
      .select('id, full_name, unit_id, units(unit_number)')
      .order('full_name')
      .limit(50);
    if (error) {
      setMembersError(error.message);
    } else {
      setPosts((prev) => prev); // no-op to avoid lint warning
      setMembers((data as unknown as Member[]) ?? []);
    }
    setMembersLoading(false);
  }, []);

  // ── Load existing RSVPs for this resident ───────────────────────────────────
  useEffect(() => {
    if (!resident?.id) return;
    supabase
      .from('event_attendees')
      .select('event_id')
      .eq('resident_id', resident.id)
      .then(({ data }) => {
        if (data) {
          setRsvpd(new Set(data.map((r: any) => r.event_id)));
        }
      });
  }, [resident?.id]);

  useEffect(() => {
    fetchPosts();
    fetchEvents();
    fetchMembers();
  }, [fetchPosts, fetchEvents, fetchMembers]);

  // ── RSVP toggle — persisted to event_attendees ───────────────────────────────
  const toggleRsvp = async (id: string) => {
    if (!resident?.id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistic update
    const wasRsvpd = rsvpd.has(id);
    setRsvpd((prev) => {
      const next = new Set(prev);
      wasRsvpd ? next.delete(id) : next.add(id);
      return next;
    });
    setRsvpLoading((prev) => new Set(prev).add(id));

    try {
      if (wasRsvpd) {
        // Remove RSVP
        await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', id)
          .eq('resident_id', resident.id);
      } else {
        // Add RSVP
        await supabase
          .from('event_attendees')
          .upsert({ event_id: id, resident_id: resident.id }, { onConflict: 'event_id,resident_id' });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Revert optimistic update on error
      setRsvpd((prev) => {
        const next = new Set(prev);
        wasRsvpd ? next.add(id) : next.delete(id);
        return next;
      });
    } finally {
      setRsvpLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ── Submit new post ─────────────────────────────────────────────────────────
  const submitPost = async () => {
    if (!newPostContent.trim()) return;
    setPostSubmitting(true);
    const { error } = await supabase.from('posts').insert({
      content: newPostContent.trim(),
      author_name: 'Resident',
      is_operator: false,
      likes: 0,
      comments: 0,
    });
    setPostSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewPostContent('');
      setShowPostModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchPosts();
    }
  };

  // ── Filtered members ────────────────────────────────────────────────────────
  const filteredMembers = members.filter(
    (m) => search === '' || m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={styles.subTabRow}>
          {SUB_TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setSubTab(i);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.subTab, subTab === i && styles.subTabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.subTabText, subTab === i && styles.subTabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* ── FEED TAB ─────────────────────────────────────────────────────────── */}
      {subTab === 0 && (
        <View style={styles.flex1}>
          {/* Feed filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {FEED_FILTERS.map((f, i) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFeedFilter(i)}
                style={[styles.filterPill, feedFilter === i && styles.filterPillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, feedFilter === i && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {postsLoading ? (
            <LoadingSpinner />
          ) : postsError ? (
            <EmptyState message={`Could not load posts.\n${postsError}`} />
          ) : posts.length === 0 ? (
            <EmptyState message="No posts yet. Be the first to share something!" />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.feedScroll}>
              {posts.map((post) => (
                <View
                  key={post.id}
                  style={[styles.postCard, post.is_operator && styles.postCardOperator]}
                >
                  <View style={styles.postHeader}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: post.is_operator ? COLORS.primary : avatarColor(post.id) },
                      ]}
                    >
                      <Text style={styles.avatarText}>{getInitials(post.author_name)}</Text>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.postAuthor}>{post.author_name}</Text>
                      <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
                    </View>
                    {post.is_operator && (
                      <View style={styles.operatorBadge}>
                        <Text style={styles.operatorBadgeText}>Official</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.postContent}>{post.content}</Text>
                  <View style={styles.reactionRow}>
                    <TouchableOpacity
                      style={styles.reactionBtn}
                      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      activeOpacity={0.7}
                    >
                      <Heart size={16} color={COLORS.error} strokeWidth={2} />
                      <Text style={styles.reactionCount}>{post.likes ?? 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reactionBtn} activeOpacity={0.7}>
                      <MessageCircle size={16} color={COLORS.textSecondary} strokeWidth={2} />
                      <Text style={styles.reactionCount}>{post.comments ?? 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reactionBtn} activeOpacity={0.7}>
                      <Send size={16} color={COLORS.textSecondary} strokeWidth={2} />
                      <Text style={styles.reactionCount}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {/* FAB */}
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.85}
            onPress={() => {
              setShowPostModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── EVENTS TAB ───────────────────────────────────────────────────────── */}
      {subTab === 1 && (
        <>
          {eventsLoading ? (
            <LoadingSpinner />
          ) : eventsError ? (
            <EmptyState message={`Could not load events.\n${eventsError}`} />
          ) : events.length === 0 ? (
            <EmptyState message="No upcoming events." />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.eventsList}>
                {events.map((event) => {
                  const isRsvpd = rsvpd.has(event.id);
                  return (
                    <View key={event.id} style={styles.eventCard}>
                      <View style={styles.eventLeft}>
                        <Text style={styles.eventEmoji}>{event.emoji ?? '📅'}</Text>
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.eventName}>{event.name}</Text>
                        <View style={styles.eventMeta}>
                          <Calendar size={12} color={COLORS.textTertiary} strokeWidth={2} />
                          <Text style={styles.eventMetaText}>
                            {event.date}
                            {event.time ? ` · ${event.time}` : ''}
                          </Text>
                        </View>
                        {event.location ? (
                          <View style={styles.eventMeta}>
                            <MapPin size={12} color={COLORS.textTertiary} strokeWidth={2} />
                            <Text style={styles.eventMetaText}>{event.location}</Text>
                          </View>
                        ) : null}
                        <View style={styles.eventFooter}>
                          <View style={styles.rsvpCount}>
                            <Users size={12} color={COLORS.textSecondary} strokeWidth={2} />
                            <Text style={styles.rsvpText}>
                              {event.rsvp ?? 0} / {event.capacity ?? '?'} RSVP'd
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleRsvp(event.id)}
                            style={[styles.rsvpBtn, isRsvpd && styles.rsvpBtnActive]}
                            activeOpacity={0.85}
                            disabled={rsvpLoading.has(event.id)}
                          >
                            {rsvpLoading.has(event.id) ? (
                              <ActivityIndicator size="small" color={isRsvpd ? '#fff' : COLORS.primary} />
                            ) : (
                              <Text style={[styles.rsvpBtnText, isRsvpd && styles.rsvpBtnTextActive]}>
                                {isRsvpd ? '✓ Going' : 'RSVP'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </>
      )}

      {/* ── DIRECTORY TAB ────────────────────────────────────────────────────── */}
      {subTab === 2 && (
        <>
          {membersLoading ? (
            <LoadingSpinner />
          ) : membersError ? (
            <EmptyState message={`Could not load directory.\n${membersError}`} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.directoryPad}>
                {/* Search */}
                <View style={styles.searchBox}>
                  <Search size={18} color={COLORS.textTertiary} strokeWidth={2} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search residents..."
                    placeholderTextColor={COLORS.textTertiary}
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>

                <Text style={styles.dirSectionTitle}>Members in your building</Text>
                <Text style={styles.privacyNote}>🔒 Only opted-in residents are visible</Text>

                {filteredMembers.length === 0 ? (
                  <EmptyState message="No residents found." />
                ) : (
                  filteredMembers.map((member) => (
                    <View key={member.id} style={styles.memberCard}>
                      <View style={[styles.memberAvatar, { backgroundColor: avatarColor(member.id) }]}>
                        <Text style={styles.memberAvatarText}>{getInitials(member.full_name)}</Text>
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.memberName}>{member.full_name}</Text>
                        <Text style={styles.memberUnit}>
                          {member.units?.unit_number
                            ? `Unit ${member.units.unit_number} · Sevenhood Tower`
                            : 'Sevenhood Tower'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </>
      )}

      {/* ── New Post Modal ────────────────────────────────────────────────────── */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPostModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={newPostModal.overlay}
        >
          <TouchableOpacity
            style={newPostModal.dismiss}
            onPress={() => setShowPostModal(false)}
            activeOpacity={1}
          />
          <View style={newPostModal.sheet}>
            <View style={newPostModal.handle} />
            <View style={newPostModal.sheetHeader}>
              <Text style={newPostModal.sheetTitle}>New Post</Text>
              <TouchableOpacity
                onPress={() => setShowPostModal(false)}
                style={newPostModal.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={newPostModal.body}>
              <TextInput
                style={newPostModal.textArea}
                placeholder="Share something with your community..."
                placeholderTextColor={COLORS.textTertiary}
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity
                onPress={submitPost}
                style={[newPostModal.submitBtn, (!newPostContent.trim() || postSubmitting) && newPostModal.submitBtnDisabled]}
                activeOpacity={0.85}
                disabled={!newPostContent.trim() || postSubmitting}
              >
                {postSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={newPostModal.submitBtnText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const shared = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex1: {
    flex: 1,
  },
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
    gap: 0,
  },
  subTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: COLORS.accent,
  },
  subTabText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  subTabTextActive: {
    color: COLORS.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  filterScroll: {
    flexGrow: 0,
    paddingTop: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  filterTextActive: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  feedScroll: {
    flex: 1,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  postCardOperator: {
    borderColor: COLORS.accent,
    borderWidth: 1.5,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  postAuthor: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  postTime: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  operatorBadge: {
    backgroundColor: `${COLORS.accent}20`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  operatorBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  postContent: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 16,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionCount: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
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
  eventsList: {
    padding: 16,
    gap: 12,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  eventLeft: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventEmoji: {
    fontSize: 24,
  },
  eventName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  eventMetaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  rsvpCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rsvpText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  rsvpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  rsvpBtnActive: {
    backgroundColor: COLORS.success,
  },
  rsvpBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  rsvpBtnTextActive: {
    color: '#fff',
  },
  directoryPad: {
    padding: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: COLORS.textPrimary,
  },
  dirSectionTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  privacyNote: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  memberName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  memberUnit: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  interestRow: {
    flexDirection: 'row',
    gap: 6,
  },
  interestChip: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  interestText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
});

const newPostModal = StyleSheet.create({
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
  sheetTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 120,
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
