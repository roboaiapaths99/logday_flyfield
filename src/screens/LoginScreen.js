import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
    StatusBar, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, Lock, LogIn, ChevronLeft, Building2, Compass, ShieldCheck, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const { organization, setOrganization, login } = useAuth();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Required Fields', 'Please enter your work email and password.');
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await login(email, password);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = e.response?.data?.detail || e.message || 'Invalid email or password.';
            Alert.alert('Sign In Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchOrg = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setOrganization(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleSwitchOrg}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={18} color="#004B87" />
                        <Text style={styles.backText}>Change Workspace</Text>
                    </TouchableOpacity>

                    <View style={styles.brandHeader}>
                        <Image
                            source={require('../../assets/logday_logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <View style={styles.pillContainer}>
                            <Compass size={13} color="#004B87" />
                            <Text style={styles.pillText}>Field Operations</Text>
                        </View>
                    </View>

                    <View style={styles.orgBanner}>
                        <View style={styles.orgIconBox}>
                            {organization?.logo_url ? (
                                <Image source={{ uri: organization.logo_url }} style={styles.orgLogo} />
                            ) : (
                                <Building2 size={20} color="#004B87" />
                            )}
                        </View>
                        <View style={styles.orgTextCol}>
                            <Text style={styles.orgLabel}>CURRENT WORKSPACE</Text>
                            <Text style={styles.orgName}>{organization?.name || 'LogDay Global'}</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.formTitle}>Employee Sign In</Text>
                        <Text style={styles.formSubtitle}>
                            Sign in with your organization credentials to manage your field schedule and client visits.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Work Email</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="agent@company.com"
                                    placeholderTextColor="#94A3B8"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={18} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.textInput, { flex: 1 }]}
                                    placeholder="••••••••••••"
                                    placeholderTextColor="#94A3B8"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} color="#64748B" />
                                    ) : (
                                        <Eye size={18} color="#64748B" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.submitButtonText}>Authorize & Start Shift</Text>
                                    <LogIn size={18} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                </ScrollView>
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
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 20,
    },
    backText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#004B87',
    },
    brandHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 170,
        height: 50,
        marginBottom: 8,
    },
    pillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    pillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#004B87',
    },
    orgBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    orgIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    orgLogo: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    orgTextCol: {
        flex: 1,
    },
    orgLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    orgName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    formSubtitle: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 12,
        height: 48,
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: '#0F172A',
    },
    eyeButton: {
        padding: 6,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#004B87',
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 10,
        gap: 8,
        shadowColor: '#004B87',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    featureBox: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        gap: 12,
        alignItems: 'flex-start',
    },
    featureTextWrapper: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E3A8A',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 12,
        color: '#3B82F6',
        lineHeight: 16,
    },
});
