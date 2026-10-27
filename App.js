import React from 'react';
import { LogBox, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

LogBox.ignoreAllLogs(true);

// Safe Alert interceptor to prevent Android NativeArray crash on FastAPI 422 arrays/objects
const originalAlert = Alert.alert;
Alert.alert = (title, message, buttons, options) => {
    let safeMessage = message;
    if (Array.isArray(message)) {
        safeMessage = message.map(m => (typeof m === 'string' ? m : m?.msg || JSON.stringify(m))).join('\n');
    } else if (message && typeof message === 'object') {
        safeMessage = message.msg || message.message || message.detail || JSON.stringify(message);
    } else if (typeof message !== 'string') {
        safeMessage = String(message || '');
    }
    return originalAlert(String(title || ''), String(safeMessage), buttons, options);
};

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <AuthProvider>
                        <NavigationContainer>
                            <StatusBar style="dark" backgroundColor="#F8FAFC" />
                            <AppNavigator />
                        </NavigationContainer>
                    </AuthProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
