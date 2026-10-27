import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
    StatusBar, Image, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import client from '../api/client';
import { Search, ChevronRight, Building2, Compass, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function OrganizationSelectionScreen() {
    const { colors } = useTheme();
    const { setOrganization } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 400);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        handleSearch(debouncedQuery);
    }, [debouncedQuery]);

    const handleSearch = async (text) => {
        setLoading(true);
        try {
            const queryParam = text ? `?q=${encodeURIComponent(text)}` : '';
            const response = await client.get(`/organizations/search${queryParam}`);
            const orgList = Array.isArray(response.data)
                ? response.data
                : (response.data?.results || []);
            setResults(orgList);
        } catch (e) {
            console.error('[Search] Failed:', e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (org) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setOrganization({
            organization_id: org.id || org._id,
            name: org.name,
            logo_url: org.logo_url,
            primary_color: org.primary_color || '#004B87',
            slug: org.slug
        });
    };

    const handleSkip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await setOrganization({
            organization_id: null,
            name: 'LogDay',
            logo_url: null,
            primary_color: '#004B87',
            slug: null
        });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => handleSelect(item)}
            style={styles.orgCard}
            activeOpacity={0.7}
        >
            <View style={[styles.logoContainer, { borderColor: `${item.primary_color || '#004B87'}30` }]}>
                {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.orgLogo} resizeMode="contain" />
                ) : (
                    <Building2 size={24} color={item.primary_color || "#004B87"} />
                )}
            </View>
            <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{item.name}</Text>
                <Text style={styles.orgSlug}>{item.slug ? `@${item.slug}` : 'Standard Workspace'}</Text>
            </View>
            <View style={styles.arrowCircle}>
                <ChevronRight size={18} color="#004B87" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <View style={styles.header}>
                    <View style={styles.brandingRow}>
                        <Image
                            source={require('../../assets/logday_logo.png')}
                            style={styles.brandLogo}
                            resizeMode="contain"
                        />
                        <View style={styles.flyfieldBadge}>
                            <Compass size={14} color="#004B87" />
                            <Text style={styles.flyfieldBadgeText}>FLYFIELD</Text>
                        </View>
                    </View>
                    <Text style={styles.title}>Select Workspace</Text>
                    <Text style={styles.subtitle}>
                        Search your company or organization to sign in to your field operations portal.
                    </Text>

                    <View style={styles.searchBar}>
                        <Search size={20} color="#64748B" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search company name or ID..."
                            placeholderTextColor="#94A3B8"
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#004B87" />
                        <Text style={styles.loadingText}>Locating workspaces...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => String(item.id || item._id || item.slug || Math.random())}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Building2 size={48} color="#CBD5E1" />
                                <Text style={styles.emptyTitle}>No Organizations Found</Text>
                                <Text style={styles.emptyText}>
                                    Check your spelling or continue to default LogDay corporate login.
                                </Text>
                            </View>
                        }
                    />
                )}

                <View style={styles.footer}>
                    <View style={styles.secureRow}>
                        <ShieldCheck size={14} color="#004B87" />
                        <Text style={styles.secureText}>Enterprise Workforce & Location Management</Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
    },
    brandingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    brandLogo: {
        width: 140,
        height: 40,
    },
    flyfieldBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    flyfieldBadgeText: {
        color: '#004B87',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        marginBottom: 18,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 50,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0F172A',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    orgCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    logoContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    orgLogo: {
        width: 36,
        height: 36,
    },
    orgInfo: {
        flex: 1,
    },
    orgName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 3,
    },
    orgSlug: {
        fontSize: 13,
        color: '#64748B',
    },
    arrowCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
        marginTop: 12,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        paddingHorizontal: 30,
        lineHeight: 18,
    },
    footer: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    skipButton: {
        backgroundColor: '#004B87',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 10,
    },
    skipButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    secureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    secureText: {
        fontSize: 11,
        color: '#64748B',
    },
});
