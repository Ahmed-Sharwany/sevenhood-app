import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { LogoLockup } from '@/components/SevenHoodLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getBiometricEmail,
  getBiometricLabel,
  authenticateWithBiometric,
  enableBiometric,
} from '@/lib/biometric';

// ─── OTP digit input ──────────────────────────────────────────────────────────

type DigitInputProps = {
  value: string;
  onChangeText: (val: string) => void;
  onKeyPress: (e: { nativeEvent: { key: string } }) => void;
  inputRef: React.RefObject<TextInput | null>;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
};

function DigitInput({
  value,
  onChangeText,
  onKeyPress,
  inputRef,
  focused,
  onFocus,
  onBlur,
}: DigitInputProps) {
  return (
    <View style={[styles.digitBox, focused && styles.digitBoxFocused]}>
      <TextInput
        ref={inputRef as React.RefObject<TextInput>}
        style={styles.digitInput}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="number-pad"
        maxLength={1}
        selectTextOnFocus
        caretHidden
        textAlign="center"
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { sendOTP, verifyOTP } = useAuth();

  // Step: 'email' | 'otp'
  const [step, setStep] = useState<'email' | 'otp'>('email');

  // Email step
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [sendingOTP, setSendingOTP] = useState(false);

  // OTP step
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Biometric
  const [biometricReady,  setBiometricReady]  = useState(false);
  const [biometricLabel,  setBiometricLabel]  = useState('Face ID / Touch ID');

  const digitRefs = useRef<Array<React.RefObject<TextInput | null>>>(
    Array.from({ length: 6 }, () => React.createRef<TextInput>())
  );

  const btnScale = useRef(new Animated.Value(1)).current;

  // ── Check biometric availability on mount ──────────────────────────────────
  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      const enabled   = await isBiometricEnabled();
      if (available && enabled) {
        const label = await getBiometricLabel();
        setBiometricLabel(label);
        setBiometricReady(true);
      }
    })();
  }, []);

  const animatePress = (cb?: () => void) => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(cb);
  };

  // ── Step 1: send OTP ────────────────────────────────────────────────────────

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEmailError('');
    setSendingOTP(true);

    animatePress();

    const { error } = await sendOTP(email.trim().toLowerCase());
    setSendingOTP(false);

    if (error) {
      setEmailError(error);
      return;
    }

    setStep('otp');
    // Auto-focus first digit after a short delay so the keyboard opens
    setTimeout(() => digitRefs.current[0].current?.focus(), 300);
  };

  // ── Step 2: verify OTP ─────────────────────────────────────────────────────

  const handleVerifyOTP = useCallback(
    async (digitArr: string[]) => {
      const token = digitArr.join('');
      if (token.length < 6) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setOtpError('');
      setVerifying(true);

      const { error } = await verifyOTP(email.trim().toLowerCase(), token);
      setVerifying(false);

      if (error) {
        setOtpError(error);
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => digitRefs.current[0].current?.focus(), 100);
        return;
      }

      // Offer biometric enrollment if available but not yet set up
      const available = await isBiometricAvailable();
      const enabled   = await isBiometricEnabled();
      if (available && !enabled) {
        const label = await getBiometricLabel();
        Alert.alert(
          `Enable ${label}?`,
          `Sign in faster next time using ${label} — no need to type your email.`,
          [
            { text: 'Not Now', style: 'cancel', onPress: () => router.replace('/(tabs)') },
            {
              text: 'Enable',
              onPress: async () => {
                await enableBiometric(email.trim().toLowerCase());
                router.replace('/(tabs)');
              },
            },
          ]
        );
      } else {
        router.replace('/(tabs)');
      }
    },
    [email, verifyOTP]
  );

  // ── Digit change handler ───────────────────────────────────────────────────

  const handleDigitChange = useCallback(
    (index: number, val: string) => {
      const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
      const next = [...digits];
      next[index] = cleaned;
      setDigits(next);

      if (cleaned && index < 5) {
        digitRefs.current[index + 1].current?.focus();
      }

      if (index === 5 && cleaned) {
        handleVerifyOTP(next);
      }
    },
    [digits, handleVerifyOTP]
  );

  const handleDigitKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        digitRefs.current[index - 1].current?.focus();
      }
    },
    [digits]
  );

  // ── Biometric sign-in ──────────────────────────────────────────────────────

  const handleBiometric = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!biometricReady) {
      // Biometrics not set up yet — explain how to enable
      Alert.alert(
        'Face ID / Touch ID',
        'Sign in with your email first. After logging in, you\'ll be asked if you want to enable biometric sign-in.',
        [{ text: 'OK' }]
      );
      return;
    }

    const storedEmail = await getBiometricEmail();
    if (!storedEmail) return;

    const success = await authenticateWithBiometric();
    if (!success) return;

    // Biometric passed — auto-send OTP to stored email
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEmail(storedEmail);
    setSendingOTP(true);
    const { error } = await sendOTP(storedEmail);
    setSendingOTP(false);

    if (error) {
      Alert.alert('Sign-in failed', error);
      return;
    }

    setStep('otp');
    setTimeout(() => digitRefs.current[0].current?.focus(), 300);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <LogoLockup variant="dark" size={1} />
        </View>

        {/* ── EMAIL STEP ────────────────────────────────────────────── */}
        {step === 'email' && (
          <>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>Sign in to your neighbourhood account</Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={[styles.inputBox, emailFocused && styles.inputBoxFocused]}>
                <Mail
                  size={19}
                  color={emailFocused ? COLORS.accent : '#9CA3AF'}
                  strokeWidth={2}
                />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#C4C9D4"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (emailError) setEmailError('');
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleSendOTP}
                  returnKeyType="next"
                />
              </View>
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
            </View>

            {/* Send OTP button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                onPress={handleSendOTP}
                activeOpacity={0.9}
                style={styles.signInBtn}
                disabled={sendingOTP}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInGradient}
                >
                  {sendingOTP ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signInText}>Continue with Email</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Biometric button */}
            <TouchableOpacity
              onPress={handleBiometric}
              activeOpacity={0.85}
              style={[styles.biometricBtn, biometricReady && styles.biometricBtnActive]}
            >
              <Text style={styles.biometricIcon}>{biometricReady ? '🔓' : '🔒'}</Text>
              <Text style={[styles.biometricText, biometricReady && styles.biometricTextActive]}>
                {biometricReady ? `Sign in with ${biometricLabel}` : 'Face ID / Touch ID'}
              </Text>
              {biometricReady && (
                <View style={styles.biometricBadge}>
                  <Text style={styles.biometricBadgeText}>ON</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Activation code entry point */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/activate')}
              activeOpacity={0.8}
              style={styles.activationBtn}
            >
              <KeyRound size={16} color={COLORS.accent} strokeWidth={2} />
              <Text style={styles.activationText}>I have an activation code</Text>
            </TouchableOpacity>

            {/* Create account placeholder */}
            <View style={styles.createRow}>
              <Text style={styles.createText}>New resident? </Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.createLink}>Contact your building manager</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── OTP STEP ──────────────────────────────────────────────── */}
        {step === 'otp' && (
          <>
            {/* Back button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                setStep('email');
                setDigits(['', '', '', '', '', '']);
                setOtpError('');
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.heading}>Check your inbox</Text>
            <Text style={styles.subheading}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.subheadingEmail}>{email}</Text>
            </Text>

            {/* 6-digit OTP input */}
            <View style={styles.otpRow}>
              {digits.map((digit, i) => (
                <DigitInput
                  key={i}
                  value={digit}
                  onChangeText={(val) => handleDigitChange(i, val)}
                  onKeyPress={(e) => handleDigitKeyPress(i, e.nativeEvent.key)}
                  inputRef={digitRefs.current[i]}
                  focused={focusedIndex === i}
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex(null)}
                />
              ))}
            </View>

            {otpError ? (
              <Text style={[styles.errorText, { textAlign: 'center', marginTop: 12 }]}>
                {otpError}
              </Text>
            ) : null}

            {/* Verify button */}
            <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 36 }}>
              <TouchableOpacity
                onPress={() => handleVerifyOTP(digits)}
                activeOpacity={0.9}
                style={styles.signInBtn}
                disabled={verifying || digits.join('').length < 6}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInGradient}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signInText}>Verify Code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Resend */}
            <View style={styles.createRow}>
              <Text style={styles.createText}>Didn't receive it? </Text>
              <TouchableOpacity onPress={handleSendOTP} activeOpacity={0.7} disabled={sendingOTP}>
                <Text style={styles.createLink}>
                  {sendingOTP ? 'Sending…' : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 56,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
    alignSelf: 'flex-start',
  },
  backText: {
    color: COLORS.primary,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  heading: {
    color: COLORS.primary,
    fontSize: 30,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheading: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginBottom: 40,
    lineHeight: 22,
  },
  subheadingEmail: {
    color: COLORS.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  fieldGroup: {
    marginBottom: 24,
  },
  fieldLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 58,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputBoxFocused: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFFBF5',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  // OTP digit boxes
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  digitBox: {
    width: 48,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  digitBoxFocused: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFFBF5',
  },
  digitInput: {
    width: '100%',
    height: '100%',
    fontSize: 22,
    color: COLORS.primary,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  signInBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 58,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  signInGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  biometricBtn: {
    height: 58,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  biometricBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  biometricIcon: { fontSize: 22 },
  biometricText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  biometricTextActive: {
    color: COLORS.primary,
  },
  biometricBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  biometricBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  createRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    flexWrap: 'wrap',
  },
  createText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  createLink: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  activationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(201,165,107,0.30)',
    backgroundColor: 'rgba(201,165,107,0.05)',
  },
  activationText: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
