import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, TYPOGRAPHY } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { TarotScreen } from '../screens/TarotScreen';
import { AstrologyScreen } from '../screens/AstrologyScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ConstellationScreen } from '../screens/ConstellationScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { t } from '../i18n';

// ── Param lists ───────────────────────────────────────────────
export type RootStackParamList = {
  MainTabs: undefined;
  Auth: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  TarotTab: undefined;
  AstrologyTab: undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
};

export type TarotStackParamList = {
  Tarot: undefined;
  TarotReading: { spreadType: string };
};

export type AstrologyStackParamList = {
  Astrology: undefined;
};

export type ChatStackParamList = {
  Chat: undefined;
  Constellation: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TarotStack = createNativeStackNavigator<TarotStackParamList>();
const AstrologyStack = createNativeStackNavigator<AstrologyStackParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// ── Tab icon helper ───────────────────────────────────────────
type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: TabIconName; inactive: TabIconName }> = {
  HomeTab:       { active: 'home',          inactive: 'home-outline' },
  TarotTab:      { active: 'sparkles',      inactive: 'sparkles-outline' },
  AstrologyTab:  { active: 'planet',        inactive: 'planet-outline' },
  ChatTab:       { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  ProfileTab:    { active: 'person-circle', inactive: 'person-circle-outline' },
};

// ── Stack navigators ──────────────────────────────────────────
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: t('nav.home') }} />
    </HomeStack.Navigator>
  );
}

function TarotStackNavigator() {
  return (
    <TarotStack.Navigator screenOptions={stackScreenOptions}>
      <TarotStack.Screen name="Tarot" component={TarotScreen} options={{ title: t('nav.tarot') }} />
    </TarotStack.Navigator>
  );
}

function AstrologyStackNavigator() {
  return (
    <AstrologyStack.Navigator screenOptions={stackScreenOptions}>
      <AstrologyStack.Screen
        name="Astrology"
        component={AstrologyScreen}
        options={{ title: t('nav.astrology') }}
      />
    </AstrologyStack.Navigator>
  );
}

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator screenOptions={stackScreenOptions}>
      <ChatStack.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.chat') }} />
      <ChatStack.Screen
        name="Constellation"
        component={ConstellationScreen}
        options={{ title: t('nav.constellation') }}
      />
    </ChatStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
      />
    </ProfileStack.Navigator>
  );
}

// ── Main Tab Navigator ────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: t('nav.home') }} />
      <Tab.Screen name="TarotTab" component={TarotStackNavigator} options={{ title: t('nav.tarot') }} />
      <Tab.Screen
        name="AstrologyTab"
        component={AstrologyStackNavigator}
        options={{ title: t('nav.astrology') }}
      />
      <Tab.Screen name="ChatTab" component={ChatStackNavigator} options={{ title: t('nav.chat') }} />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: t('nav.profile') }}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────
interface RootNavigatorProps {
  session: Session | null;
}

export function RootNavigator({ session }: RootNavigatorProps) {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <RootStack.Screen name="MainTabs" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthScreen} />
      )}
    </RootStack.Navigator>
  );
}

// ── Auth Placeholder ──────────────────────────────────────────
function AuthScreen() {
  return (
    <View style={styles.authContainer}>
      <Text style={styles.authTitle}>ANIMA</Text>
      <Text style={styles.authTagline}>Your inner universe, illuminated.</Text>
      <TouchableOpacity style={styles.authButton}>
        <Text style={styles.authButtonText}>Begin Your Journey</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Shared screen options ─────────────────────────────────────
const stackScreenOptions = {
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: {
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textPrimary,
  },
  contentStyle: { backgroundColor: COLORS.background },
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.primary,
    borderTopWidth: 1,
    paddingTop: 4,
    paddingBottom: 4,
    height: 60,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  authContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    letterSpacing: 8,
    marginBottom: 12,
  },
  authTagline: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginBottom: 48,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  authButtonText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 1,
  },
});
