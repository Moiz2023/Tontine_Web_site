import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../config';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import KYCScreen from '../screens/auth/KYCScreen';

// Main Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import MarketplaceScreen from '../screens/main/MarketplaceScreen';
import CreateTontineScreen from '../screens/main/CreateTontineScreen';
import TontineDetailScreen from '../screens/main/TontineDetailScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SupportScreen from '../screens/main/SupportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'home';
          else if (route.name === 'Marketplace') iconName = 'shopping-bag';
          else if (route.name === 'Create') iconName = 'plus-circle';
          else if (route.name === 'Wallet') iconName = 'credit-card';
          else if (route.name === 'Profile') iconName = 'user';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[100],
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: t('nav.dashboard') }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} options={{ tabBarLabel: t('nav.marketplace') }} />
      <Tab.Screen name="Create" component={CreateTontineScreen} options={{ tabBarLabel: t('nav.create') }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ tabBarLabel: t('nav.wallet') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('nav.profile') }} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : user?.kyc_status !== 'verified' ? (
          // KYC Required
          <Stack.Screen name="KYC" component={KYCScreen} />
        ) : (
          // Main App
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="TontineDetail" component={TontineDetailScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
