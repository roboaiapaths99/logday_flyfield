import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Platform, Linking, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import {
    ChevronLeft, CheckCircle2, Clock, Upload,
    ClipboardCheck, FileText, ShieldCheck, RefreshCw,
    ExternalLink, AlertCircle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function HRMSOnboardingScreen({ navigation }) {
    const [onboarding, setOnboarding] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadingDoc, setUploadingDoc] = useState('');

    useEffect(() => {
        fetchOnboarding();
    }, []);

    const fetchOnboarding = async () => {
        try {
            setLoading(true);
            const res = await client.get('/api/employee/onboarding');
            setOnboarding(res.data);
        } catch (e) {
            console.warn('[OnboardingScreen] Error fetching status:', e);
            Alert.alert('Onboarding Status', e.response?.data?.detail || 'No active onboarding workflow found for this account.');
        } finally {
            setLoading(false);
        }
    };

    const handleDigiLocker = async (docType) => {
        try {
            setUploadingDoc(docType);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const authRes = await client.get('/api/employee/onboarding/digilocker/auth-url');
            if (authRes.data?.mode === 'production' && authRes.data?.auth_url) {
                await Linking.openURL(authRes.data.auth_url);
            } else {
                const res = await client.post('/api/employee/onboarding/digilocker/pull-sandbox', { doc_type: docType });
                setOnboarding(res.data.onboarding);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('DigiLocker Verified', `Government verified ${docType.toUpperCase().replace('_', ' ')} linked successfully!`);
            }
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('DigiLocker Error', err.response?.data?.detail || 'Failed to connect to DigiLocker sandbox.');
        } finally {
            setUploadingDoc('');
        }
    };

    const handlePickAndUpload = async (docType) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery access is required to upload documents.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return;
        }

        const selectedAsset = result.assets[0];
        setUploadingDoc(docType);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const formData = new FormData();
            formData.append('doc_type', docType);
            formData.append('file', {
                uri: selectedAsset.uri,
                name: selectedAsset.fileName || `${docType}.jpg`,
                type: selectedAsset.mimeType || 'image/jpeg'
            });

            const res = await client.post('/api/employee/onboarding/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setOnboarding(res.data.onboarding);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Document Submitted', `${docType.toUpperCase().replace('_', ' ')} uploaded! Sent to HR for verification.`);
        } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('[OnboardingScreen] Upload fail', e);
            Alert.alert('Upload Failed', e.response?.data?.detail || 'Failed to upload document.');
        } finally {
            setUploadingDoc('');
        }
    };

    const handleCheckTask = async (taskId) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const res = await client.put(`/api/employee/onboarding/tasks/${taskId}/complete`, {});
            setOnboarding(res.data.onboarding || res.data);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Task Completed', 'Onboarding task has been verified.');
            fetchOnboarding();
        } catch (e) {
            Alert.alert('Task Update', e.response?.data?.detail || 'Failed to update task.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#004B87" />
                <Text style={styles.loadingText}>Syncing onboarding files...</Text>
            </SafeAreaView>
        );
    }

    const requiredDocs = onboarding?.documents_required || ['aadhaar', 'pan', 'bank', 'driving_license'];
    const submittedDocs = onboarding?.documents_submitted || [];
    const tasks = onboarding?.tasks || [];

    const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
    const verifiedDocsCount = submittedDocs.filter(d => d.verified && requiredDocs.includes(d.type)).length;
    const overallProgress = onboarding?.progress ?? Math.round(
        ((completedTasksCount + verifiedDocsCount) / Math.max(1, tasks.length + requiredDocs.length)) * 100
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                    <ChevronLeft size={22} color="#004B87" />
                    <Text style={styles.backText}>Profile</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Onboarding Verification</Text>
                <TouchableOpacity onPress={fetchOnboarding} style={styles.refreshBtn} activeOpacity={0.7}>
                    <RefreshCw size={18} color="#004B87" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Progress Overview Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <View style={styles.progressTitleRow}>
                            <ShieldCheck size={20} color="#004B87" />
                            <Text style={styles.progressLabel}>HRMS Compliance Setup</Text>
                        </View>
                        <Text style={styles.progressValue}>{overallProgress}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${overallProgress}%` }]} />
                    </View>
                    <View style={styles.progressDetails}>
                        <Text style={styles.detailsText}>{completedTasksCount}/{tasks.length} Tasks verified</Text>
                        <Text style={styles.detailsText}>{verifiedDocsCount}/{requiredDocs.length} Docs approved</Text>
                    </View>
                </View>

                {/* Real Documents Section */}
                <Text style={styles.sectionTitle}>Required Credentials & Verification</Text>
                <View style={styles.card}>
                    {requiredDocs.map((docType) => {
                        const submission = submittedDocs.find(d => d.type === docType);
                        const isVerified = submission?.verified;
                        const isUploaded = !!submission;
                        const isProcessing = uploadingDoc === docType;

                        return (
                            <View key={docType} style={styles.docRow}>
                                <View style={styles.docInfo}>
                                    <View style={styles.docLabelRow}>
                                        <FileText size={16} color="#004B87" />
                                        <Text style={styles.docLabel}>
                                            {docType.toUpperCase().replace('_', ' ')}
                                        </Text>
                                    </View>
                                    <Text style={styles.docSublabel}>
                                        {isVerified ? 'Verified by HR' : isUploaded ? 'Awaiting HR verification' : 'Original document required'}
                                    </Text>
                                </View>

                                <View style={styles.actionContainer}>
                                    {isVerified ? (
                                        <View style={[styles.statusBadge, styles.badgeSuccess]}>
                                            <CheckCircle2 size={13} color="#16A34A" />
                                            <Text style={styles.badgeSuccessText}>Verified</Text>
                                        </View>
                                    ) : isUploaded ? (
                                        <View style={[styles.statusBadge, styles.badgePending]}>
                                            <Clock size={13} color="#D97706" />
                                            <Text style={styles.badgePendingText}>Reviewing</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.btnRow}>
                                            {['aadhaar', 'pan', 'driving_license'].includes(docType) && (
                                                <TouchableOpacity
                                                    style={[styles.uploadButton, styles.digilockerBtn]}
                                                    onPress={() => handleDigiLocker(docType)}
                                                    disabled={isProcessing}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.digilockerBtnText}>DigiLocker</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={styles.uploadButton}
                                                onPress={() => handlePickAndUpload(docType)}
                                                disabled={isProcessing}
                                                activeOpacity={0.8}
                                            >
                                                {isProcessing ? (
                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                ) : (
                                                    <>
                                                        <Upload size={13} color="#FFFFFF" />
                                                        <Text style={styles.uploadBtnText}>Upload</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Tasks & Checklists Section */}
                <Text style={styles.sectionTitle}>Checklists & Handovers</Text>
                <View style={styles.card}>
                    {tasks.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <ClipboardCheck size={32} color="#94A3B8" />
                            <Text style={styles.emptyText}>No onboarding tasks assigned to you.</Text>
                        </View>
                    ) : (
                        tasks.map((task) => {
                            const isCompleted = task.status === 'completed';
                            return (
                                <View key={task.task_id || task.id} style={styles.taskRow}>
                                    <TouchableOpacity
                                        style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
                                        onPress={() => !isCompleted && handleCheckTask(task.task_id || task.id)}
                                        disabled={isCompleted}
                                        activeOpacity={0.7}
                                    >
                                        {isCompleted && <CheckCircle2 size={16} color="#FFFFFF" />}
                                    </TouchableOpacity>

                                    <View style={styles.taskInfo}>
                                        <Text style={[styles.taskTitle, isCompleted && styles.taskCompletedText]}>
                                            {task.title || task.name}
                                        </Text>
                                        <View style={styles.taskMeta}>
                                            {task.category && (
                                                <Text style={styles.taskCategory}>{task.category}</Text>
                                            )}
                                            {task.due_date && (
                                                <Text style={styles.taskDueDate}>Due: {task.due_date}</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        color: '#64748B',
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
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
        padding: 6,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    progressCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressLabel: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '800',
    },
    progressValue: {
        color: '#004B87',
        fontSize: 22,
        fontWeight: '900',
    },
    progressTrack: {
        height: 10,
        backgroundColor: '#E2E8F0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#004B87',
        borderRadius: 5,
    },
    progressDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    detailsText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
    },
    sectionTitle: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    docRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    docInfo: {
        flex: 1,
        marginRight: 12,
    },
    docLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    docLabel: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '700',
    },
    docSublabel: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 3,
        marginLeft: 22,
    },
    actionContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    btnRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    uploadButton: {
        flexDirection: 'row',
        backgroundColor: '#004B87',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        alignItems: 'center',
        gap: 5,
    },
    uploadBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    digilockerBtn: {
        backgroundColor: '#0284C7',
    },
    digilockerBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 4,
        borderWidth: 1,
    },
    badgeSuccess: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    badgeSuccessText: {
        color: '#16A34A',
        fontSize: 11,
        fontWeight: '800',
    },
    badgePending: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    badgePendingText: {
        color: '#D97706',
        fontSize: 11,
        fontWeight: '800',
    },
    taskRow: {
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        marginRight: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    checkboxChecked: {
        backgroundColor: '#16A34A',
        borderColor: '#16A34A',
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '600',
    },
    taskCompletedText: {
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    taskMeta: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        alignItems: 'center',
    },
    taskCategory: {
        fontSize: 10,
        color: '#004B87',
        fontWeight: '700',
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    taskDueDate: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    emptyBox: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    emptyText: {
        color: '#64748B',
        fontSize: 13,
        textAlign: 'center',
    },
});
