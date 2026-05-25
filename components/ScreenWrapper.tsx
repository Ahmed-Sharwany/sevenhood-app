import React from 'react';
import { ScrollView, View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenWrapper({
  children,
  scrollable = true,
  style,
  backgroundColor = COLORS.background,
  edges = ['top', 'left', 'right'],
}: ScreenWrapperProps) {
  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
        <ScrollView
          style={[styles.scroll, { backgroundColor }]}
          contentContainerStyle={[styles.content, style]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      <View style={[styles.fill, { backgroundColor }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  fill: {
    flex: 1,
  },
});
