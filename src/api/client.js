import axios from 'axios';
import * as SecureStore from '../utils/secureStorage';

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://logday-api.duckdns.org';
let API_BASE = DEFAULT_API_BASE;

const client = axios.create({
    baseURL: DEFAULT_API_BASE,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auto-load custom API URL if previously saved
AsyncStorage.getItem('custom_api_url').then((savedUrl) => {
    if (savedUrl && savedUrl.trim()) {
        API_BASE = savedUrl.trim();
        client.defaults.baseURL = API_BASE;
    }
}).catch(() => {});

client.interceptors.request.use(async (config) => {
    try {
        const token = await SecureStore.getItemAsync('userToken');
        const deviceId = await SecureStore.getItemAsync('deviceId');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (deviceId) {
            config.headers['X-Device-Id'] = deviceId;
        }
    } catch (e) {
        console.warn('Request interceptor error', e);
    }
    return config;
});

export default client;
export { API_BASE };
