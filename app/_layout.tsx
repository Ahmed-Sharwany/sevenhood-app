import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

// ─── Auth guard (runs inside AuthProvider) ────────────────────────────────────

function AuthGuard() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Check if the user has already seen onboarding
      AsyncStorage.getItem('onboarding_seen').then((seen) => {
        if (!seen) {
          router.replace('/(auth)/onboarding');
        } else {
          router.replace('/(auth)/login');
        }
      });
    }
  }, [session, loading, segments]);

  return null;
}

// ─── Notification deep-link handler ──────────────────────────────────────────
// Tapping a push notification navigates to the correct screen based on the
// `data` payload. Expected payload shapes:
//   { screen: 'maintenance', id: '<ticket-id>' }
//   { screen: 'bookings' }
//   { screen: 'community' }
//   { screen: 'visitors' }

function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    // Fired when user taps a notification (app in background or killed)
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data) return;

      switch (data.screen) {
        case 'maintenance':
          if (data.id) {
            router.push({ pathname: '/maintenance/[id]', params: { id: data.id } });
          } else {
            router.push('/maintenance/index');
          }
          break;
        case 'bookings':
          router.push('/bookings');
          break;
        case 'community':
          router.push('/(tabs)/community');
          break;
        case 'visitors':
          router.push('/(tabs)/visitors');
          break;
        case 'property':
          router.push('/property');
          break;
        default:
          // no-op — leave user where they are
          break;
      }
    });

    return () => sub.remove();
  }, []);

  return null;
}

// ─── Deep Link Handler ────────────────────────────────────────────────────────
// Intercepts incoming URLs and routes them to the correct screen.
//
// Supported URL patterns:
//   sevenhood://join?t=<token>          — deep link from WhatsApp / SMS
//   https://join.sevenhood.app/invite/<token>  — universal link (web fallback)
//
// When the app is already open, the Linking event fires.
// When the app is cold-started from a link, useEffect catches the initial URL.

function DeepLinkHandler() {
  const router = useRouter();

  const handleUrl = (url: string | null) => {
    if (!url) return;

    try {
      const parsed = Linking.parse(url);

      // Pattern 1: sevenhood://join?t=<token>
      if (parsed.path === 'join' && parsed.queryParams?.t) {
        const token = String(parsed.queryParams.t);
        router.push({ pathname: '/(auth)/join', params: { t: token } });
        return;
      }

      // Pattern 2: https://join.sevenhood.app/invite/<token>
      // Expo Linking parses "invite/<token>" as the path
      const inviteMatch = parsed.path?.match(/^invite\/([A-Za-z0-9_-]+)$/);
      if (inviteMatch) {
        const token = inviteMatch[1];
        router.push({ pathname: '/(auth)/join', params: { t: token } });
        return;
      }
    } catch (err) {
      console.warn('[DeepLinkHandler] Failed to parse URL:', url, err);
    }
  };

  useEffect(() => {
    // Handle URL that opened the app from a cold start
    Linking.getInitialURL().then(handleUrl);

    // Handle URL when app is already foregrounded
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => subscription.remove();
  }, []);

  return null;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AuthGuard />
          <DeepLinkHandler />
          <NotificationHandler />
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)"           options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)"       options={{ animation: 'fade' }} />
            <Stack.Screen name="property"     options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ai-design"    options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="maintenance/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="maintenance/new"   options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="maintenance/[id]"  options={{ animation: 'slide_from_right' }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
