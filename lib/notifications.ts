import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// ── Configure how notifications appear while the app is in the foreground ────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/**
 * Register for push notifications and store the Expo push token
 * in the residents table so the server can target this device.
 *
 * Returns the token string, or null if not available (simulator / denied).
 */
export async function registerForPushNotifications(residentId: string): Promise<string | null> {
  // Push notifications don't work on simulators
  if (!Device.isDevice) return null;

  // Android: create a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A56B',
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'sevenhood-app', // matches app.json slug
  });
  const token = tokenData.data;

  // Persist to Supabase so admin panel / backend can send targeted notifications
  if (token && residentId) {
    await supabase
      .from('residents')
      .update({ push_token: token })
      .eq('id', residentId);
  }

  return token;
}

/**
 * Schedule a local notification immediately (for in-app events).
 */
export async function scheduleLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: null, // fire immediately
  });
}

/**
 * Clear the badge count (call when user opens the app or reads notifications).
 */
export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
