import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from '../utils/secureStorage';

const ThemeContext = createContext();

export const defaultTheme = {
    primaryColor: '#004B87',
    secondaryColor: '#D91424',
    backgroundColor: '#F8FAFC',
    logoUrl: null,
    orgName: 'LogDay',
    orgId: null,
    orgSlug: null
};

export const themeStyles = {
    light: {
        background: '#F8FAFC',
        card: '#FFFFFF',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        border: '#E2E8F0',
        cardShadow: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
        }
    },
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(defaultTheme);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const storedOrg = await SecureStore.getItemAsync('selected_org');
            if (storedOrg) {
                const orgData = JSON.parse(storedOrg);
                updateTheme(orgData);
            }
        } catch (error) {
            console.warn("Failed to load theme:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateTheme = (orgData) => {
        const newTheme = {
            ...defaultTheme,
            primaryColor: orgData.primary_color || defaultTheme.primaryColor,
            logoUrl: orgData.logo_url,
            orgName: orgData.name || defaultTheme.orgName,
            orgId: orgData.id || orgData.organization_id,
            orgSlug: orgData.slug
        };
        setTheme(newTheme);
    };

    const selectOrganization = async (orgData) => {
        updateTheme(orgData);
        await SecureStore.setItemAsync('selected_org', JSON.stringify(orgData));
    };

    const resetTheme = async () => {
        setTheme(defaultTheme);
        await SecureStore.deleteItemAsync('selected_org');
    };

    const colors = themeStyles.light;

    return (
        <ThemeContext.Provider value={{ theme, colors, isLoading, selectOrganization, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
