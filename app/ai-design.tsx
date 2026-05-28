import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Camera, Sparkles, X, Download, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

// ── Replicate config (token stored in .env, never committed to git) ───────────
const REPLICATE_API_TOKEN: string =
  (Constants.expoConfig?.extra?.replicateApiToken as string) ?? '';

// adirik/interior-design — full SHA256 version hash
const REPLICATE_MODEL_VERSION = '76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38';

const STYLE_PRESETS = [
  { id: 'minimal',      label: 'Minimal',      color: '#E8E4DF', textColor: '#6B6B6B',
    prompt: 'minimalist interior design, clean lines, neutral tones, white walls, sparse furniture, natural light, Japandi style' },
  { id: 'modern_arab',  label: 'Modern Arab',  color: '#1E5435', textColor: '#FFFFFF',
    prompt: 'modern Arabic interior design, luxury arabesque geometric patterns, dark walnut wood, deep green and gold accents, ornate ceiling, mashrabiya screens' },
  { id: 'boho',         label: 'Boho',         color: '#C4956A', textColor: '#FFFFFF',
    prompt: 'bohemian interior design, warm earthy tones, rattan furniture, macramé wall art, layered rugs, indoor plants, cozy atmosphere' },
  { id: 'warm_neutral', label: 'Warm Neutral', color: '#D4B896', textColor: '#5C4A3A',
    prompt: 'warm neutral interior, beige and cream palette, soft textures, linen fabrics, wooden accents, hygge style, cozy and inviting' },
  { id: 'scandinavian', label: 'Scandi',       color: '#B8C9D4', textColor: '#2C3E50',
    prompt: 'Scandinavian interior design, functional minimalism, white and light grey, blonde wood, clean lines, cozy hygge elements' },
  { id: 'maximalist',   label: 'Maximalist',   color: '#4A1A6B', textColor: '#FFFFFF',
    prompt: 'maximalist interior design, bold colors, layered patterns, rich jewel tones, velvet furniture, gallery walls, luxurious and eclectic' },
];

const ROOM_EMOJIS: Record<string, string> = {
  'Living Room': '🛋️', 'Bedroom': '🛏️', 'Kitchen': '🍳',
  'Bathroom': '🚿', 'Study': '📚', 'Dining': '🍽️',
};

const { width: SCREEN_W } = Dimensions.get('window');

export default function AIDesignScreen() {
  const [selectedStyle, setSelectedStyle]   = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom]     = useState<string | null>(null);
  const [noDrill, setNoDrill]               = useState(false);
  const [photos, setPhotos]                 = useState<string[]>([]);   // local URIs
  const [generating, setGenerating]         = useState(false);
  const [generatedUrl, setGeneratedUrl]     = useState<string | null>(null);
  const [statusMsg, setStatusMsg]           = useState('');
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Photo picker ─────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    if (photos.length >= 1) {
      Alert.alert('One photo at a time', 'Remove the current photo before adding another.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([result.assets[0].uri]);
      setGeneratedUrl(null);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 1) {
      Alert.alert('One photo at a time', 'Remove the current photo before adding another.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in Settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([result.assets[0].uri]);
      setGeneratedUrl(null);
    }
  };

  const removePhoto = () => {
    setPhotos([]);
    setGeneratedUrl(null);
  };

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const uploadToSupabase = async (uri: string): Promise<string> => {
    setStatusMsg('Uploading photo...');
    const response = await fetch(uri);
    const blob     = await response.blob();
    const fileName = `ai-design/${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from('images')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // ── Poll Replicate until done ─────────────────────────────────────────────
  const pollPrediction = async (predictionId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const check = async () => {
        try {
          const res  = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
          });
          const data = await res.json();

          if (data.status === 'succeeded') {
            const output = Array.isArray(data.output) ? data.output[0] : data.output;
            resolve(output);
          } else if (data.status === 'failed' || data.status === 'canceled') {
            reject(new Error(data.error ?? 'Generation failed'));
          } else {
            setStatusMsg(`Generating design... (${data.status})`);
            pollRef.current = setTimeout(check, 3000);
          }
        } catch (e) {
          reject(e);
        }
      };
      check();
    });
  };

  // ── Main generate function ────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!photos[0]) {
      Alert.alert('Add a photo', 'Please upload a photo of your room first.');
      return;
    }
    if (!selectedStyle) {
      Alert.alert('Choose a style', 'Please select a design style.');
      return;
    }
    if (REPLICATE_API_TOKEN === 'YOUR_REPLICATE_TOKEN_HERE') {
      Alert.alert(
        'API Token Missing',
        'Add your Replicate API token in app/ai-design.tsx to enable AI generation.\n\nGet one free at replicate.com',
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGenerating(true);
    setGeneratedUrl(null);

    try {
      // 1. Upload photo
      const imageUrl = await uploadToSupabase(photos[0]);

      // 2. Build prompt
      const styleObj  = STYLE_PRESETS.find(s => s.id === selectedStyle)!;
      const roomStr   = selectedRoom ? `${selectedRoom.toLowerCase()}, ` : '';
      const drillStr  = noDrill ? ', no drilling, no painting, renter-friendly changes only, removable décor' : '';
      const fullPrompt = `${roomStr}${styleObj.prompt}${drillStr}, photorealistic, high quality, 8k`;

      // 3. Call Replicate with full version hash
      setStatusMsg('Sending to AI...');
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: REPLICATE_MODEL_VERSION,
          input: {
            image:               imageUrl,
            prompt:              fullPrompt,
            negative_prompt:     'ugly, blurry, low quality, deformed, text, watermark',
            guidance_scale:      15,
            num_inference_steps: 50,
            strength:            0.8,
            seed:                Math.floor(Math.random() * 1000000),
          },
        }),
      });

      const prediction = await res.json();
      if (!prediction.id) throw new Error(prediction.detail ?? 'Failed to start prediction');

      // 4. Poll for result
      const outputUrl = await pollPrediction(prediction.id);
      setGeneratedUrl(outputUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatusMsg('');
    } catch (err: any) {
      Alert.alert('Generation failed', err.message ?? 'Please try again.');
      setStatusMsg('');
    } finally {
      setGenerating(false);
    }
  };

  const resetAll = () => {
    setPhotos([]);
    setGeneratedUrl(null);
    setSelectedStyle(null);
    setSelectedRoom(null);
    setNoDrill(false);
    setStatusMsg('');
    if (pollRef.current) clearTimeout(pollRef.current);
  };

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
          <Text style={styles.title}>AI Interior Design</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <Sparkles size={32} color={COLORS.accent} strokeWidth={1.5} />
          <Text style={styles.heroTitle}>Transform Your Space</Text>
          <Text style={styles.heroSub}>
            Upload a photo of your room and let AI redesign it in your chosen style — in under a minute.
          </Text>
        </LinearGradient>

        <View style={styles.pad}>

          {/* ── Result ── */}
          {generatedUrl && (
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>✨ Your AI Design</Text>
              <View style={styles.beforeAfterRow}>
                <View style={styles.beforeAfterItem}>
                  <Text style={styles.beforeAfterCaption}>BEFORE</Text>
                  <Image source={{ uri: photos[0] }} style={styles.beforeAfterImage} />
                </View>
                <View style={styles.beforeAfterItem}>
                  <Text style={styles.beforeAfterCaption}>AFTER</Text>
                  <Image source={{ uri: generatedUrl }} style={styles.beforeAfterImage} />
                </View>
              </View>
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.resultBtn}
                  onPress={resetAll}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={16} color={COLORS.primary} strokeWidth={2} />
                  <Text style={styles.resultBtnText}>New Design</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Photo upload ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Room Photo</Text>

            {photos.length === 0 ? (
              <>
                {/* Primary: Camera */}
                <TouchableOpacity style={styles.cameraSlot} onPress={takePhoto} activeOpacity={0.85}>
                  <Camera size={36} color={COLORS.primary} strokeWidth={1.5} />
                  <Text style={styles.cameraSlotTitle}>Take a Photo</Text>
                  <Text style={styles.cameraSlotSub}>Point your camera at the room</Text>
                </TouchableOpacity>
                {/* Secondary: Library */}
                <TouchableOpacity onPress={pickPhoto} activeOpacity={0.7} style={styles.libraryLink}>
                  <Text style={styles.libraryLinkText}>Or choose from photo library</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photos[0] }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={removePhoto} activeOpacity={0.8}>
                  <X size={14} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.retakeOverlay}>
                  <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto} activeOpacity={0.8}>
                    <Camera size={14} color="#fff" strokeWidth={2} />
                    <Text style={styles.retakeBtnText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Style presets ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Design Style</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
              {STYLE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => { setSelectedStyle(preset.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.styleCard, selectedStyle === preset.id && styles.styleCardActive]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.styleSwatch, { backgroundColor: preset.color }]}>
                    {selectedStyle === preset.id && (
                      <Text style={[styles.swatchCheck, { color: preset.textColor }]}>✓</Text>
                    )}
                  </View>
                  <Text style={[styles.styleLabel, selectedStyle === preset.id && styles.styleLabelActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Room type ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Room Type</Text>
            <View style={styles.roomGrid}>
              {['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Study', 'Dining'].map((room) => (
                <TouchableOpacity
                  key={room}
                  onPress={() => { setSelectedRoom(room); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.roomChip, selectedRoom === room && styles.roomChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roomEmoji}>{ROOM_EMOJIS[room]}</Text>
                  <Text style={[styles.roomChipText, selectedRoom === room && styles.roomChipTextActive]}>{room}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Rental constraints ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Rental Constraints</Text>
            <TouchableOpacity
              onPress={() => { setNoDrill(!noDrill); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.toggleRow, noDrill && styles.toggleRowActive]}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>No drilling or painting</Text>
                <Text style={styles.toggleSub}>Limit to renter-friendly changes</Text>
              </View>
              <View style={[styles.toggleSwitch, noDrill && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, noDrill && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Generate button ── */}
          <TouchableOpacity
            onPress={handleGenerate}
            style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
            activeOpacity={0.9}
            disabled={generating}
          >
            <LinearGradient
              colors={generating ? ['#999', '#bbb'] : [COLORS.accent, COLORS.accentLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.generateGradient}
            >
              {generating ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.generateText}>{statusMsg || 'Generating...'}</Text>
                </>
              ) : (
                <>
                  <Sparkles size={20} color="#fff" strokeWidth={2} />
                  <Text style={styles.generateText}>Generate Design</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            AI designs generate in ~30–60 seconds. Results are for inspiration purposes.
          </Text>
        </View>
        <View style={{ height: 40 }} />
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
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    flex: 1, color: COLORS.primary, fontSize: 18,
    fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center',
  },
  heroBanner: { padding: 28, alignItems: 'center', gap: 12 },
  heroTitle: {
    color: '#fff', fontSize: 24,
    fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)', fontSize: 14,
    fontFamily: 'Inter_400Regular', textAlign: 'center',
    lineHeight: 22, maxWidth: 300,
  },
  pad: { padding: 20 },
  fieldGroup: { marginBottom: 28 },
  fieldLabel: {
    color: COLORS.primary, fontSize: 12,
    fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 6,
  },
  fieldSub: {
    color: COLORS.textTertiary, fontSize: 13,
    fontFamily: 'Inter_400Regular', marginBottom: 14,
  },

  // Result
  resultCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.accent + '40',
    padding: 16, marginBottom: 28,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  resultLabel: {
    color: COLORS.accent, fontSize: 14,
    fontFamily: 'Inter_600SemiBold', marginBottom: 14,
  },
  beforeAfterRow: { flexDirection: 'row', gap: 10 },
  beforeAfterItem: { flex: 1 },
  beforeAfterCaption: {
    color: COLORS.textTertiary, fontSize: 10,
    fontFamily: 'Inter_600SemiBold', letterSpacing: 1,
    marginBottom: 6, textAlign: 'center',
  },
  beforeAfterImage: {
    width: '100%', aspectRatio: 4 / 3,
    borderRadius: 12, backgroundColor: COLORS.border,
  },
  resultActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  resultBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  resultBtnText: { color: COLORS.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  // Photo
  cameraSlot: {
    alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 36, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 2,
    borderColor: COLORS.primary + '30', borderStyle: 'dashed',
  },
  cameraSlotTitle: {
    color: COLORS.primary, fontSize: 16, fontFamily: 'Inter_600SemiBold',
  },
  cameraSlotSub: {
    color: COLORS.textTertiary, fontSize: 13, fontFamily: 'Inter_400Regular',
  },
  libraryLink: {
    alignItems: 'center', paddingVertical: 12,
  },
  libraryLinkText: {
    color: COLORS.accent, fontSize: 13, fontFamily: 'Inter_500Medium',
    textDecorationLine: 'underline',
  },
  photoPreviewWrap: { position: 'relative' },
  retakeOverlay: {
    position: 'absolute', bottom: 10, left: 10,
  },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  retakeBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  photoPreview: {
    width: '100%', aspectRatio: 4 / 3,
    borderRadius: 18, backgroundColor: COLORS.border,
  },
  removePhotoBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Styles
  styleScroll: { marginHorizontal: -4 },
  styleCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 8,
    marginHorizontal: 4, width: 90,
    borderWidth: 2, borderColor: 'transparent',
  },
  styleCardActive: { borderColor: COLORS.accent },
  styleSwatch: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchCheck: { fontSize: 20, fontWeight: '700' },
  styleLabel: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  styleLabelActive: { color: COLORS.primary },

  // Rooms
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
  },
  roomChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roomEmoji: { fontSize: 14 },
  roomChipText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' },
  roomChipTextActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: COLORS.border,
  },
  toggleRowActive: { borderColor: COLORS.accent, backgroundColor: '#FFFBF5' },
  toggleLabel: { color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  toggleSub: { color: COLORS.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  toggleSwitch: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: COLORS.border, justifyContent: 'center', padding: 2,
  },
  toggleSwitchActive: { backgroundColor: COLORS.accent },
  toggleKnob: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },

  // Generate
  generateBtn: {
    borderRadius: 20, overflow: 'hidden', height: 62,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10, marginBottom: 16,
  },
  generateBtnDisabled: { shadowOpacity: 0.1 },
  generateGradient: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  generateText: { color: '#fff', fontSize: 17, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  disclaimer: {
    color: COLORS.textTertiary, fontSize: 12,
    fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18,
  },
});
