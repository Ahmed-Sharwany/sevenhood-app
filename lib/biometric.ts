import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_EMAIL   = 'sevenhood_biometric_email';
const KEY_ENABLED = 'sevenhood_biometric_enabled';

/** Returns true if the device has biometric hardware AND enrolled credentials. */
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/** Returns the biometric type label for display (e.g. "Face ID", "Touch ID"). */
export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
  }
  return 'Biometrics';
}

/** Prompt the user to authenticate with biometrics. Returns true on success. */
export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage:          'Sign in to Sevenhood',
    fallbackLabel:          'Use Email Instead',
    cancelLabel:            'Cancel',
    disableDeviceFallback:  false,
  });
  return result.success;
}

/** Save the email and mark biometric as enabled. */
export async function enableBiometric(email: string): Promise<void> {
  await AsyncStorage.multiSet([
    [KEY_EMAIL,   email],
    [KEY_ENABLED, 'true'],
  ]);
}

/** Clear biometric preference. */
export async function disableBiometric(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_EMAIL, KEY_ENABLED]);
}

/** Returns true if the user has opted in to biometric sign-in. */
export async function isBiometricEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEY_ENABLED);
  return val === 'true';
}

/** Returns the stored email for biometric sign-in, or null. */
export async function getBiometricEmail(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_EMAIL);
}
