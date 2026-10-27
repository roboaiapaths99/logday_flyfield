import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, TextInput, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import {
    ChevronLeft, ShieldCheck, CheckCircle2, Circle,
    Clock, AlertTriangle, Send, RefreshCw
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function HRMSExitClearanceScreen({ navigation }) {
    const [exitInfo, setExitInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showResignForm, setShowResignForm] = useState(false);
    const [lwd, setLwd] = useState('');
    const [reason, setReason] = useState('Career Growth');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchExitClearance();
    }, []);

    const fetchExitClearance = async () => {
        try {
            setLoading(true);
            const res = await client.get('/hrms/exit-clearance/my');
            setExitInfo(res.data);
        } catch (e) {
            if (e.response?.status !== 404) {
                console.warn('[ExitScreen] Load error:', e);
            }
            setExitInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFileResignation = async () => {
        if (!lwd.trim()) {
            Alert.alert('Date Required', 'Please enter your proposed last working day (YYYY-MM-DD).');
            return;
        }

        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const res = await client.post('/hrms/exit-clearance/resignation', {
                last_working_day: lwd.trim(),
                reason,
                handover_notes: notes.trim(),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setExitInfo(res.data);
            setShowResignForm(false);
            Alert.alert('Submitted', 'Separation clearances workflow has been initiated.');
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = err.response?.data?.detail || err.message || 'Failed to file resignation.';
            Alert.alert('Filing Error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    const clearances = exitInfo?.clearances || exitInfo?.departments || [
        { department: 'Accounts & Finance', status: exitInfo ? 'Pending' : 'Active Employee', note: 'Reimbursement audits' },
        { department: 'IT & Hardware', status: exitInfo ? 'Pending' : 'Active Employee', note: 'Field tablet & SIM allocation' },
        { department: 'HR Operations', status: exitInfo ? 'Under Review' : 'Active Employee', note: 'Notice period records' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={22} color="#004B87" />
                    <Text style={styles.backText}>Profile</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Exit & Separation</Text>
                <TouchableOpacity onPress={fetchExitClearance} style={styles.refreshBtn}>
                    <RefreshCw size={18} color="#004B87" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#004B87" />
                    <Text style={styles.loadingText}>Loading clearance status...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Status Banner */}
                    <View style={styles.activeStatusCard}>
                        <ShieldCheck size={28} color="#004B87" />
                        <View style={styles.activeCol}>
                            <Text style={styles.activeTitle}>
                                {exitInfo ? `Separation Workflow: ${exitInfo.status || 'Initiated'}` : 'Active Employment Standing'}
                            </Text>
                            <Text style={styles.activeDesc}>
                                {exitInfo
                                    ? `Proposed Last Working Day: ${exitInfo.last_working_day || 'Under Review'}`
                                    : 'You are an active LogDay Field Officer in good standing.'}
                            </Text>
                        </View>
                    </View>

                    {/* Department Clearances */}
                    <Text style={styles.sectionTitle}>Department Clearances</Text>
                    {clearances.map((item, idx) => {
                        const isCleared = (item.status || '').toLowerCase() === 'cleared';
                        return (
                            <View key={idx} style={styles.clearanceCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.deptName}>{item.department || item.name}</Text>
                                    <View style={[styles.badge, isCleared ? styles.badgeCleared : styles.badgeActive]}>
                                        <Text style={[styles.badgeText, isCleared && { color: '#15803D' }]}>
                                            {item.status || 'Active'}
                                        </Text>
                                    </View>
                                </View>
                                {item.note && <Text style={styles.note}>{item.note}</Text>}
                            </View>
                        );
                    })}

                    {/* Resignation Action / Form */}
                    {!exitInfo && (
                        <View style={styles.resignContainer}>
                            {showResignForm ? (
                                <View style={styles.formCard}>
                                    <Text style={styles.formTitle}>Initiate Resignation</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Proposed Last Working Day (YYYY-MM-DD) *</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor="#94A3B8"
                                            value={lwd}
                                            onChangeText={setLwd}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Handover Notes / Reason</Text>
                                        <TextInput
                                            style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                                            placeholder="Key handovers, projects, client contacts..."
                                            placeholderTextColor="#94A3B8"
                                            value={notes}
                                            onChangeText={setNotes}
                                            multiline
                                        />
                                    </View>

                                    <View style={styles.formActionRow}>
                                        <TouchableOpacity
                                            style={styles.cancelFormBtn}
                                            onPress={() => setShowResignForm(false)}
                                        >
                                            <Text style={styles.cancelFormText}>Cancel</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.submitFormBtn, submitting && { opacity: 0.6 }]}
                                            onPress={handleFileResignation}
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.submitFormText}>Confirm Filing</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.startResignBtn}
                                    onPress={() => setShowResignForm(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.startResignText}>Initiate Separation Clearance</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#64748B',
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
    refreshBtn: {
        padding: 4,
    },
    scrollContent: {
        padding: 20,
    },
    activeStatusCard: {
        flexDirection: 'row',
        backgroundColor: '#E0F2FE',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        gap: 12,
    },
    activeCol: {
        flex: 1,
    },
    activeTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#004B87',
        marginBottom: 2,
    },
    activeDesc: {
        fontSize: 12,
        color: '#0369A1',
        lineHeight: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    clearanceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    deptName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeCleared: {
        backgroundColor: '#DCFCE7',
    },
    badgeActive: {
        backgroundColor: '#E0F2FE',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#004B87',
    },
    note: {
        fontSize: 12,
        color: '#64748B',
    },
    resignContainer: {
        marginTop: 20,
    },
    startResignBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    startResignText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    formTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 4,
    },
    textInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: '#0F172A',
    },
    formActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 6,
    },
    cancelFormBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
    },
    cancelFormText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    submitFormBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#DC2626',
    },
    submitFormText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
