import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Alert, Image, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    ChevronLeft, User, Mail, Building2, Smartphone,
    Compass, ShieldCheck, LogOut, RefreshCw, Award,
    ClipboardCheck, AlertTriangle, ChevronRight, FileText, Camera
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen({ navigation }) {
    const { user, organization, logout, setOrganization } = useAuth();
    const { theme } = useTheme();

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out of LogDay FlyField on this device?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        await logout();
                    }
                }
            ]
        );
    };

    const handleSwitchOrg = () => {
        Alert.alert(
            'Switch Workspace',
            'Do you want to switch to a different organization workspace?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Switch',
                    onPress: async () => {
                        await logout();
                        await setOrganization(null);
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={22} color="#004B87" />
                    <Text style={styles.backText}>Dashboard</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Officer Profile</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.avatarCard}>
                    <View style={styles.avatarBox}>
                        <User size={40} color="#004B87" />
                    </View>
                    <Text style={styles.name}>{user?.name || user?.full_name || 'Field Officer'}</Text>
                    <Text style={styles.email}>{user?.email || 'agent@logday.com'}</Text>

                    <View style={styles.modeBadge}>
                        <Compass size={14} color="#004B87" />
                        <Text style={styles.modeBadgeText}>FIELD OPERATIONS</Text>
                    </View>
                </View>

                {/* Organization Details */}
                <View style={styles.infoCard}>
                    <Text style={styles.cardSectionTitle}>Workspace Details</Text>
                    <View style={styles.infoRow}>
                        <Building2 size={18} color="#64748B" />
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Organization</Text>
                            <Text style={styles.infoValue}>{organization?.name || 'LogDay Global'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Mail size={18} color="#64748B" />
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Department</Text>
                            <Text style={styles.infoValue}>{user?.department || 'Field Sales & Operations'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Smartphone size={18} color="#64748B" />
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Device Status</Text>
                            <Text style={styles.infoValue}>Device Registered</Text>
                        </View>
                    </View>
                </View>

                {/* HRMS Compliance & Clearances */}
                <View style={styles.infoCard}>
                    <Text style={styles.cardSectionTitle}>Employee Services & Records</Text>
                    
                    <TouchableOpacity
                        style={styles.menuNavRow}
                        onPress={() => navigation.navigate('HRMSOnboarding')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuNavLeft}>
                            <ClipboardCheck size={18} color="#004B87" />
                            <Text style={styles.menuNavText}>Onboarding & Document Verification</Text>
                        </View>
                        <ChevronRight size={16} color="#94A3B8" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.menuNavRow}
                        onPress={() => navigation.navigate('HRMSExitClearance')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuNavLeft}>
                            <AlertTriangle size={18} color="#004B87" />
                            <Text style={styles.menuNavText}>Exit Clearance & Separation</Text>
                        </View>
                        <ChevronRight size={16} color="#94A3B8" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.menuNavRow}
                        onPress={() => navigation.navigate('HRMSPayslips')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuNavLeft}>
                            <FileText size={18} color="#004B87" />
                            <Text style={styles.menuNavText}>CTC Breakdown & Payslips</Text>
                        </View>
                        <ChevronRight size={16} color="#94A3B8" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.menuNavRow}
                        onPress={() => navigation.navigate('FaceEnrollment', { isReEnrollment: true })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuNavLeft}>
                            <Camera size={18} color="#004B87" />
                            <Text style={styles.menuNavText}>Update Face Registration</Text>
                        </View>
                        <ChevronRight size={16} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                {/* Account Actions */}
                <View style={styles.actionsCard}>
                    <TouchableOpacity style={styles.actionRow} onPress={handleSwitchOrg}>
                        <RefreshCw size={18} color="#004B87" />
                        <Text style={styles.actionText}>Switch Organization Workspace</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
                        <LogOut size={18} color="#DC2626" />
                        <Text style={[styles.actionText, { color: '#DC2626' }]}>Sign Out of FlyField</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerNote}>
                    <ShieldCheck size={14} color="#16A34A" />
                    <Text style={styles.footerNoteText}>
                        LogDay FlyField v1.0.0 • Enterprise Field Operations
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    backText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#004B87',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    avatarCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    avatarBox: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#BAE6FD',
    },
    name: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    email: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 12,
    },
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    modeBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#004B87',
        letterSpacing: 0.5,
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardSectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 14,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 14,
    },
    infoCol: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 2,
    },
    menuNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    menuNavLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    menuNavText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    actionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 6,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#004B87',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginHorizontal: 14,
    },
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
    },
    footerNoteText: {
        fontSize: 11,
        color: '#64748B',
    },
});
