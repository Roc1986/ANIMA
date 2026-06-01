import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import TarotScreen from '../screens/TarotScreen';
import AstrologyScreen from '../screens/AstrologyScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0A1E',
          borderTopColor: '#2D1B69',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#C4B5FD',
        tabBarInactiveTintColor: '#6D6D8A',
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Home: focused ? 'home' : 'home-outline',
            Tarot: focused ? 'albums' : 'albums-outline',
            Astrology: focused ? 'planet' : 'planet-outline',
            Chat: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Tarot" component={TarotScreen} options={{ tabBarLabel: 'Tarot' }} />
      <Tab.Screen name="Astrology" component={AstrologyScreen} options={{ tabBarLabel: 'Astros' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
