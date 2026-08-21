import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

// Stores
import useAuthStore from '../store/useAuthStore';
import useChatStore from '../store/useChatStore';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen'; 
import VerifyEmailScreen from '../screens/VerifyEmailScreen'; 
import ChatsListScreen from '../screens/ChatsListScreen'; 
import StatusScreen from '../screens/StatusScreen'; 
import SettingsScreen from '../screens/SettingsScreen'; 
import ChatWindowScreen from '../screens/ChatWindowScreen'; 
import ScannerScreen from '../screens/ScannerScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens until we build them
const PlaceholderScreen = () => <View className="flex-1 bg-[#f2f2f7]" />;

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Status') {
            iconName = focused ? 'aperture' : 'aperture-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderTopWidth: 0,
          elevation: 0,
          position: 'absolute',
        },
        headerStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerTransparent: true,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Chats" component={ChatsListScreen} />
      <Tab.Screen name="Status" component={StatusScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isCheckingAuth } = useAuthStore();
  const { initializeSocket, disconnectSocket } = useChatStore();

  React.useEffect(() => {
    if (user) {
      // Need to retrieve token to initialize socket
      import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
        AsyncStorage.getItem('token').then(token => {
          if (token) initializeSocket(token);
        });
      });
    } else {
      disconnectSocket();
    }
  }, [user]);

  if (isCheckingAuth) {
    return (
      <View className="flex-1 justify-center items-center bg-[#f2f2f7]">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Authenticated App
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ChatWindow" component={ChatWindowScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Scanner" component={ScannerScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          // Authentication Flow
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
