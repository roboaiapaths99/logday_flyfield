import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, RefreshControl, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import {
    ChevronLeft, Calendar, CheckCircle2, Clock,
    AlertCircle, FileText, Send
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function LeaveScreen({ navigation }) {
    const [balanceData, setBalanceData] = useState(null);
    const [leaveType, setLeaveType] = useState('sick_leave');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadLeaveData();
    }, []);

    const loadLeaveData = async () => {
        try {
            const [balRes, histRes] = await Promise.allSettled([
                client.get('/api/leave/my-balance'),
                client.get('/api/leave/my-requests')
            ]);

            if (balRes.status === 'fulfilled' && balRes.value?.data) {
                setBalanceData(balRes.value.data);
            }
            if (histRes.status === 'fulfilled' && histRes.value?.data) {
                const list = Array.isArray(histRes.value.data) ? histRes.value.data : (histRes.value.data.requests || []);
                setRequests(list);
            }
        } catch (e) {
            console.warn('Leave fetch error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleApplyLeave = async () => {
        if (!startDate.trim() || !endDate.trim() || !reason.trim()) {
            Alert.alert('Required Fields', 'Please specify start date (YYYY-MM-DD), end date, and reason.');
            return;
        }

        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await client.post('/api/leave/request', {
                leave_type: leaveType,
                start_date: startDate.trim(),
                end_date: endDate.trim(),
                duration_type: 'full_day',
                reason: reason.trim(),
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Leave Submitted', 'Your leave request has been submitted to HR for approval.');
            setStartDate('');
            setEndDate('');
            setReason('');
            loadLeaveData();
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = err.response?.data?.detail || err.message || 'Failed to submit leave.';
            Alert.alert('Application Failed', msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Extract live computed remaining balances from backend
    const sickRemaining = balanceData?.sick_leave?.remaining ?? balanceData?.sick_leave?.available ?? 0;
    const casualRemaining = balanceData?.casual_leave?.remaining ?? balanceData?.casual_leave?.available ?? 0;
    const totalRemaining = balanceData?.total_leave?.remaining ?? balanceData?.total_leave?.available ?? (sickRemaining + casualRemaining);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={22} color="#004B87" />
                    <Text style={styles.backText}>Dashboard</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Leave Management</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadLeaveData();
                        }}
                        colors={['#004B87']}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Real Live Leave Balances */}
                <View style={styles.balanceRow}>
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceNumber}>{sickRemaining}</Text>
                        <Text style={styles.balanceLabel}>Sick Leave</Text>
                    </View>
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceNumber}>{casualRemaining}</Text>
                        <Text style={styles.balanceLabel}>Casual Leave</Text>
                    </View>
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceNumber}>{totalRemaining}</Text>
                        <Text style={styles.balanceLabel}>Total Remaining</Text>
                    </View>
                </View>

                {/* Apply Form */}
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Apply For Leave</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Leave Type</Text>
                        <View style={styles.typeRow}>
                            {[
                                { key: 'sick_leave', label: 'Sick' },
                                { key: 'casual_leave', label: 'Casual' },
                                { key: 'paid_leave', label: 'Paid / Earned' },
                            ].map((t) => {
                                const selected = leaveType === t.key;
                                return (
                                    <TouchableOpacity
                                        key={t.key}
                                        style={[styles.typeBtn, selected && styles.typeBtnActive]}
                                        onPress={() => setLeaveType(t.key)}
                                    >
                                        <Text style={[styles.typeBtnText, selected && styles.typeBtnTextActive]}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.dateRow}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>Start Date</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94A3B8"
                                value={startDate}
                                onChangeText={setStartDate}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.inputLabel}>End Date</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94A3B8"
                                value={endDate}
                                onChangeText={setEndDate}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Reason / Remarks</Text>
                        <TextInput
                            style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                            placeholder="Reason for taking leave..."
                            placeholderTextColor="#94A3B8"
                            value={reason}
                            onChangeText={setReason}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                        onPress={handleApplyLeave}
                        disabled={submitting}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Send size={16} color="#FFFFFF" />
                                <Text style={styles.submitBtnText}>Submit Leave Request</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Real Live History */}
                <Text style={styles.historySectionTitle}>My Leave Requests</Text>
                {requests.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Calendar size={36} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No Leave Applications</Text>
                        <Text style={styles.emptyDesc}>Your applied leaves and approval status will appear here.</Text>
                    </View>
                ) : (
                    requests.map((req, idx) => {
                        const status = (req.status || 'pending').toLowerCase();
                        return (
                            <View key={req._id || req.id || idx} style={styles.reqCard}>
                                <View style={styles.reqTop}>
                                    <Text style={styles.reqType}>
                                        {(req.leave_type || 'LEAVE').replace(/_/g, ' ').toUpperCase()}
                                    </Text>
                                    <View
                                        style={[
                                            styles.reqStatusBadge,
                                            status === 'approved' && styles.reqStatusApproved,
                                            status === 'rejected' && styles.reqStatusRejected,
                                        ]}
                                    >
                                        <Text style={styles.reqStatusText}>{req.status || 'Pending'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.reqDates}>
                                    {req.start_date} to {req.end_date}
                                </Text>
                                {req.reason && <Text style={styles.reqReason}>{req.reason}</Text>}
                            </View>
                        );
                    })
                )}
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
    balanceRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    balanceCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    balanceNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: '#004B87',
        marginBottom: 2,
    },
    balanceLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 14,
    },
    inputGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    typeBtnActive: {
        backgroundColor: '#004B87',
        borderColor: '#004B87',
    },
    typeBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    typeBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    textInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0F172A',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#004B87',
        borderRadius: 14,
        paddingVertical: 14,
        gap: 8,
        marginTop: 6,
    },
    submitBtnDisabled: {
        backgroundColor: '#94A3B8',
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    historySectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 10,
        marginBottom: 4,
    },
    emptyDesc: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    reqCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    reqTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    reqType: {
        fontSize: 13,
        fontWeight: '800',
        color: '#004B87',
    },
    reqStatusBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    reqStatusApproved: {
        backgroundColor: '#DCFCE7',
    },
    reqStatusRejected: {
        backgroundColor: '#FEE2E2',
    },
    reqStatusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    reqDates: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    reqReason: {
        fontSize: 12,
        color: '#64748B',
    },
});
