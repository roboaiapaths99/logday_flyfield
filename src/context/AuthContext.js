import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from '../utils/secureStorage';
import client from '../api/client';
import * as Device from 'expo-device';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [organization, setOrganization] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const storedToken = await SecureStore.getItemAsync('userToken');
            const storedUser = await SecureStore.getItemAsync('userData');
            const storedOrg = await SecureStore.getItemAsync('selected_org');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                if (storedOrg) {
                    setOrganization(JSON.parse(storedOrg));
                }
            }
        } catch (e) {
            console.warn('Failed to restore auth session:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetOrganization = async (org) => {
        setOrganization(org);
        try {
            if (org) {
                await SecureStore.setItemAsync('selected_org', JSON.stringify(org));
            } else {
                await SecureStore.deleteItemAsync('selected_org');
            }
        } catch (e) {
            console.warn('Failed to persist organization:', e);
        }
    };

    const login = async (email, password) => {
        const deviceId = Device.osBuildId || Device.modelName || 'FlyField_Device';
        await SecureStore.setItemAsync('deviceId', deviceId);

        const payload = {
            email: email.trim().toLowerCase(),
            password,
            device_id: deviceId,
            client_type: 'flyfield'
        };

        if (organization?.organization_id) {
            payload.organization_id = organization.organization_id;
        }

        const response = await client.post('/login', payload);

        const data = response.data;
        const accessToken = data.access_token;
        const profile = data.user || {};
        profile.needs_face_enrollment = Boolean(data.needs_face_enrollment);

        await SecureStore.setItemAsync('userToken', accessToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(profile));

        setToken(accessToken);
        setUser(profile);
        return data;
    };

    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync('userToken');
            await SecureStore.deleteItemAsync('userData');
        } catch (e) {
            console.warn('Logout storage error:', e);
        } finally {
            setToken(null);
            setUser(null);
        }
    };

    const updateUser = (updatedProfile) => {
        setUser(updatedProfile);
        SecureStore.setItemAsync('userData', JSON.stringify(updatedProfile));
    };

    return (
        <AuthContext.Provider value={{ user, token, organization, isLoading, login, logout, updateUser, setOrganization: handleSetOrganization }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
