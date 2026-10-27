import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, Image, RefreshControl, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import {
    ChevronLeft, Wallet, Navigation, Camera, CheckCircle2,
    Clock, Receipt, PlusCircle, AlertCircle, RefreshCw
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const CATEGORIES = ['Travel / Fuel', 'Food / Meal', 'Lodging', 'Client Entertainment', 'Other'];

export default function ExpensesScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'history'
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Travel / Fuel');
    const [description, setDescription] = useState('');
    const [claimedKm, setClaimedKm] = useState('');
    const [autoKm, setAutoKm] = useState(0);

    const [receiptUri, setReceiptUri] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [fetchingKm, setFetchingKm] = useState(true);

    const [claimsHistory, setClaimsHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        fetchKmSuggestion();
        fetchExpensesHistory();
    }, []);

    const fetchKmSuggestion = async () => {
        setFetchingKm(true);
        try {
            const res = await client.get('/api/field/km-suggestion');
            const km = res.data?.suggested_km || 0;
            setAutoKm(km);
            setClaimedKm(String(km));
        } catch (e) {
            console.warn('KM suggestion fetch failed', e);
        } finally {
            setFetchingKm(false);
        }
    };

    const fetchExpensesHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await client.get('/api/field/expenses');
            const list = Array.isArray(res.data) ? res.data : (res.data?.claims || []);
            setClaimsHistory(list);
        } catch (e) {
            console.warn('Expenses history fetch failed', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handlePickReceipt = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.6,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setReceiptUri(result.assets[0].uri);
            }
        } catch (e) {
            Alert.alert('Camera Error', 'Could not access camera to capture receipt bill.');
        }
    };

    const handleSubmitExpense = async () => {
        if (!amount.trim() || isNaN(amount) || Number(amount) <= 0) {
            Alert.alert('Amount Required', 'Please enter a valid expense amount in INR.');
            return;
        }

        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            let receiptBase64 = '';
            if (receiptUri) {
                try {
                    const base64Data = await FileSystem.readAsStringAsync(receiptUri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    receiptBase64 = `data:image/jpeg;base64,${base64Data}`;
                } catch (b64Err) {
                    console.warn('Receipt base64 conversion warning:', b64Err);
                }
            }

            const payload = {
                amount: parseFloat(amount.trim()),
                category,
                description: description.trim(),
                claimed_km: claimedKm ? parseFloat(claimedKm.trim()) : autoKm,
                receipt_url: receiptBase64,
            };

            await client.post('/api/field/expenses', payload);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Expense Submitted', 'Your claim has been submitted to accounts for verification.');
            setAmount('');
            setDescription('');
            setReceiptUri(null);
            fetchExpensesHistory();
            setActiveTab('history');
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = err.response?.data?.detail || err.message || 'Failed to submit expense claim.';
            Alert.alert('Submission Failed', msg);
        } finally {
            setSubmitting(false);
        }
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
                <Text style={styles.headerTitle}>Field Expenses & KM</Text>
                <View style={{ width: 50 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'submit' && styles.tabItemActive]}
                    onPress={() => setActiveTab('submit')}
                >
                    <Text style={[styles.tabText, activeTab === 'submit' && styles.tabTextActive]}>
                        New Claim
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                        Claims History
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'submit' ? (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Auto-KM Card */}
                    <View style={styles.kmCard}>
                        <View style={styles.kmTop}>
                            <View style={styles.kmIconBox}>
                                <Navigation size={20} color="#D91424" />
                            </View>
                            <View style={styles.kmCol}>
                                <Text style={styles.kmLabel}>CALCULATED FIELD TRAVEL</Text>
                                <Text style={styles.kmValue}>
                                    {fetchingKm ? 'Computing...' : `${autoKm} km`}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.refreshKmBtn} onPress={fetchKmSuggestion}>
                                <RefreshCw size={14} color="#D91424" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.kmNotice}>
                            Calculated automatically from your client visit locations.
                        </Text>
                    </View>

                    {/* Expense Form */}
                    <View style={styles.formCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Claim Amount (₹) *</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor="#94A3B8"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Category</Text>
                            <View style={styles.categoryPills}>
                                {CATEGORIES.map((cat) => {
                                    const selected = category === cat;
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.catPill, selected && styles.catPillSelected]}
                                            onPress={() => setCategory(cat)}
                                        >
                                            <Text style={[styles.catPillText, selected && styles.catPillTextSelected]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {category.includes('Fuel') && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Travel Distance (KM)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. 24.5"
                                    placeholderTextColor="#94A3B8"
                                    value={claimedKm}
                                    onChangeText={setClaimedKm}
                                    keyboardType="numeric"
                                />
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Remarks / Purpose</Text>
                            <TextInput
                                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                                placeholder="e.g. Fuel expenses for client meetings"
                                placeholderTextColor="#94A3B8"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Receipt / Bill Photo</Text>
                            {receiptUri ? (
                                <View style={styles.receiptPreviewBox}>
                                    <Image source={{ uri: receiptUri }} style={styles.receiptPreviewImage} />
                                    <TouchableOpacity style={styles.retakeBillBtn} onPress={handlePickReceipt}>
                                        <Text style={styles.retakeBillText}>Retake Receipt Photo</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.uploadBillBtn} onPress={handlePickReceipt}>
                                    <Camera size={20} color="#004B87" />
                                    <Text style={styles.uploadBillText}>Take Receipt Snapshot</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitClaimBtn, submitting && styles.submitClaimBtnDisabled]}
                        onPress={handleSubmitExpense}
                        disabled={submitting}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <CheckCircle2 size={18} color="#FFFFFF" />
                                <Text style={styles.submitClaimText}>Submit Expense Claim</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={loadingHistory}
                            onRefresh={fetchExpensesHistory}
                            colors={['#004B87']}
                        />
                    }
                >
                    {claimsHistory.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Receipt size={40} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Expense Claims Yet</Text>
                            <Text style={styles.emptyDesc}>
                                Claims you submit will appear here with verification and reimbursement status.
                            </Text>
                        </View>
                    ) : (
                        claimsHistory.map((item, idx) => (
                            <View key={idx} style={styles.historyCard}>
                                <View style={styles.historyTop}>
                                    <Text style={styles.historyCat}>{item.category || 'Expense'}</Text>
                                    <Text style={styles.historyAmount}>₹{item.amount}</Text>
                                </View>
                                <Text style={styles.historyDesc}>{item.description || 'No description provided'}</Text>
                                <View style={styles.historyBottom}>
                                    <Text style={styles.historyDate}>
                                        {item.date || item.created_at ? new Date(item.date || item.created_at).toLocaleDateString() : 'Today'}
                                    </Text>
                                    <View
                                        style={[
                                            styles.statusPill,
                                            item.status === 'approved' && styles.statusApproved,
                                            item.status === 'rejected' && styles.statusRejected,
                                        ]}
                                    >
                                        <Text style={styles.statusText}>{item.status || 'Pending Review'}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: '#004B87',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#004B87',
        fontWeight: '800',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    kmCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        shadowColor: '#D91424',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    kmTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    kmIconBox: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    kmCol: {
        flex: 1,
    },
    kmLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#D91424',
        letterSpacing: 0.5,
    },
    kmValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    refreshKmBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
    },
    kmNotice: {
        fontSize: 12,
        color: '#64748B',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
    },
    amountInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 14,
        height: 52,
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
    },
    categoryPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    catPill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    catPillSelected: {
        backgroundColor: '#004B87',
        borderColor: '#004B87',
    },
    catPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    catPillTextSelected: {
        color: '#FFFFFF',
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
    uploadBillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#BAE6FD',
        borderStyle: 'dashed',
    },
    uploadBillText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#004B87',
    },
    receiptPreviewBox: {
        alignItems: 'center',
    },
    receiptPreviewImage: {
        width: '100%',
        height: 160,
        borderRadius: 12,
        marginBottom: 8,
    },
    retakeBillBtn: {
        paddingVertical: 6,
    },
    retakeBillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#004B87',
    },
    submitClaimBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#004B87',
        borderRadius: 14,
        paddingVertical: 15,
        gap: 8,
        shadowColor: '#004B87',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    submitClaimBtnDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
    },
    submitClaimText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
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
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 12,
        marginBottom: 4,
    },
    emptyDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
    },
    historyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    historyTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    historyCat: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    historyAmount: {
        fontSize: 16,
        fontWeight: '800',
        color: '#16A34A',
    },
    historyDesc: {
        fontSize: 13,
        color: '#475569',
        marginBottom: 10,
    },
    historyBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 8,
    },
    historyDate: {
        fontSize: 11,
        color: '#64748B',
    },
    statusPill: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusApproved: {
        backgroundColor: '#DCFCE7',
    },
    statusRejected: {
        backgroundColor: '#FEE2E2',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
});
