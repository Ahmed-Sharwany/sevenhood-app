import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

interface StatusBarProps {
  light?: boolean;
}

export function AppStatusBar({ light = false }: StatusBarProps) {
  return (
    <View style={[styles.container, light ? styles.light : styles.dark]}>
      <ExpoStatusBar style={light ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 0,
  },
  light: {},
  dark: {},
});
