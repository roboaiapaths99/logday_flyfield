import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const setItemAsync = async (key, value) => {
    try {
        if (Platform.OS === 'web') {
            await AsyncStorage.setItem(key, value);
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    } catch (e) {
        // Fallback to AsyncStorage if SecureStore fails
        await AsyncStorage.setItem(key, value);
    }
};

export const getItemAsync = async (key) => {
    try {
        if (Platform.OS === 'web') {
            return await AsyncStorage.getItem(key);
        }
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;
        return await AsyncStorage.getItem(key);
    } catch (e) {
        return await AsyncStorage.getItem(key);
    }
};

export const deleteItemAsync = async (key) => {
    try {
        if (Platform.OS === 'web') {
            await AsyncStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    } catch (e) {
        await AsyncStorage.removeItem(key);
    }
};
