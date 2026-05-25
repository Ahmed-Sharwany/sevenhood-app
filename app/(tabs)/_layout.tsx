import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Users, ShoppingBag, Shield, User, LucideIcon } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

function TabBarIcon({
  icon: Icon,
  focused,
  label,
}: {
  icon: LucideIcon;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
        <Icon
          size={20}
          color={focused ? '#fff' : COLORS.textTertiary}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Home} focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Users} focused={focused} label="Community" />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={ShoppingBag} focused={focused} label="Services" />
          ),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Shield} focused={focused} label="Visitors" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={User} focused={focused} label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
    width: 64,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    color: COLORS.textTertiary,
    letterSpacing: 0,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
});
