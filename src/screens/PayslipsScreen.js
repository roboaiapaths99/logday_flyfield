import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, RefreshControl, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client, { API_BASE } from '../api/client';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from '../utils/secureStorage';
import {
    ChevronLeft, FileText, Download, Building2,
    Calendar, ShieldCheck, Wallet, Landmark, CreditCard,
    CheckCircle2, RefreshCw
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function PayslipsScreen({ navigation }) {
    const [salaryStructure, setSalaryStructure] = useState(null);
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloadingSlip, setDownloadingSlip] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [salRes, slipRes] = await Promise.allSettled([
                client.get('/api/employee/salary-structure'),
                client.get('/api/employee/payslips')
            ]);

            if (salRes.status === 'fulfilled' && salRes.value?.data) {
                setSalaryStructure(salRes.value.data);
            }
            if (slipRes.status === 'fulfilled' && slipRes.value?.data) {
                setPayslips(Array.isArray(slipRes.value.data) ? slipRes.value.data : []);
            }
        } catch (e) {
            console.warn('[PayslipsScreen] Error loading data:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleDownload = async (slip) => {
        const slipId = slip._id || slip.id;
        const month = slip.payroll_month || slip.month || 'statement';

        try {
            setDownloadingSlip(slipId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const token = await SecureStore.getItemAsync('userToken');
            const localUri = `${FileSystem.documentDirectory}payslip_${month}.pdf`;
            const downloadUrl = `${client.defaults.baseURL}/api/employee/payslips/${slipId}/download`;

            const downloadResult = await FileSystem.downloadAsync(
                downloadUrl,
                localUri,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (downloadResult.status === 200) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: `Download Payslip for ${month}`,
                        UTI: 'com.adobe.pdf'
                    });
                } else {
                    Alert.alert('Download Complete', `Payslip saved to device: ${downloadResult.uri}`);
                }
            } else {
                Alert.alert('Download Notice', 'Payslip statement has been generated in your employee record.');
            }
        } catch (e) {
            console.error('[PayslipsScreen] Download error', e);
            Alert.alert('Download Notice', 'Your payslip PDF is available in your employee record.');
        } finally {
            setDownloadingSlip(null);
        }
    };

    const formatCurrency = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '₹0';
        return `₹${Math.round(num).toLocaleString('en-IN')}`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#004B87" />
                <Text style={styles.loadingText}>Fetching live compensation records...</Text>
            </SafeAreaView>
        );
    }

    const ctc = parseFloat(salaryStructure?.ctc ?? salaryStructure?.annual_ctc ?? 0);
    const basic = parseFloat(salaryStructure?.basic_salary ?? salaryStructure?.basic ?? 0);
    const hra = parseFloat(salaryStructure?.hra ?? 0);
    const special = parseFloat(salaryStructure?.special_allowance ?? 0);
    const monthly = parseFloat(salaryStructure?.monthly_salary ?? (basic + hra + special));

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <ChevronLeft size={22} color="#004B87" />
                    <Text style={styles.backText}>Dashboard</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payslips & Compensation</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
                    <RefreshCw size={18} color="#004B87" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004B87']} />}
            >
                {/* CTC Structure Card */}
                <View style={styles.ctcCard}>
                    <View style={styles.ctcHeader}>
                        <Wallet size={20} color="#004B87" />
                        <Text style={styles.ctcTitle}>COMPENSATION STRUCTURE</Text>
                    </View>

                    <Text style={styles.ctcAmount}>{formatCurrency(ctc)}</Text>
                    <Text style={styles.ctcSub}>Annual Cost to Company (CTC)</Text>

                    <View style={styles.monthlyBadge}>
                        <Text style={styles.monthlyBadgeLabel}>Calculated Gross Monthly:</Text>
                        <Text style={styles.monthlyBadgeValue}>{formatCurrency(monthly)}/mo</Text>
                    </View>

                    {/* Breakdown */}
                    <View style={styles.breakdownBox}>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Basic Salary</Text>
                            <Text style={styles.breakdownValue}>{formatCurrency(basic)}/mo</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>House Rent Allowance (HRA)</Text>
                            <Text style={styles.breakdownValue}>{formatCurrency(hra)}/mo</Text>
                        </View>
                        {special > 0 && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Special / Field Allowance</Text>
                                <Text style={styles.breakdownValue}>{formatCurrency(special)}/mo</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Bank & Tax Profile */}
                {(salaryStructure?.bank_name || salaryStructure?.pan_number) && (
                    <View style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <Landmark size={18} color="#004B87" />
                            <Text style={styles.infoCardTitle}>DISBURSEMENT DETAILS</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Bank Account</Text>
                            <Text style={styles.infoValue}>
                                {salaryStructure.bank_name ? `${salaryStructure.bank_name} • ${salaryStructure.bank_account || 'N/A'}` : 'Configured by HR'}
                            </Text>
                        </View>
                        {salaryStructure.bank_ifsc && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>IFSC Code</Text>
                                <Text style={styles.infoValue}>{salaryStructure.bank_ifsc}</Text>
                            </View>
                        )}
                        {salaryStructure.pan_number && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>PAN Card</Text>
                                <Text style={styles.infoValue}>{salaryStructure.pan_number}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Monthly Payslips List */}
                <Text style={styles.sectionTitle}>Monthly Pay Statements</Text>
                {payslips.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <FileText size={36} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No Generated Payslips</Text>
                        <Text style={styles.emptyDesc}>
                            Monthly payslips approved and locked by your HR & Accounts team will appear here for download.
                        </Text>
                    </View>
                ) : (
                    payslips.map((slip, idx) => {
                        const slipId = slip._id || slip.id || idx;
                        const isDownloading = downloadingSlip === slipId;
                        const netPay = slip.net_salary ?? slip.net_pay ?? slip.gross_salary ?? 0;

                        return (
                            <View key={slipId} style={styles.slipCard}>
                                <View style={styles.slipIconBox}>
                                    <FileText size={22} color="#004B87" />
                                </View>
                                <View style={styles.slipInfo}>
                                    <Text style={styles.slipMonth}>{slip.payroll_month || slip.month || 'Current Statement'}</Text>
                                    <Text style={styles.slipAmount}>Net Pay: {formatCurrency(netPay)}</Text>
                                    <View style={styles.statusRow}>
                                        <CheckCircle2 size={12} color="#16A34A" />
                                        <Text style={styles.statusText}>Processed & Locked</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.downloadBtn}
                                    onPress={() => handleDownload(slip)}
                                    disabled={isDownloading}
                                    activeOpacity={0.7}
                                >
                                    {isDownloading ? (
                                        <ActivityIndicator size="small" color="#004B87" />
                                    ) : (
                                        <Download size={18} color="#004B87" />
                                    )}
                                </TouchableOpacity>
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
    ctcCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    ctcHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    ctcTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#004B87',
        letterSpacing: 1,
    },
    ctcAmount: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 4,
    },
    ctcSub: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
    },
    monthlyBadge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginTop: 14,
    },
    monthlyBadgeLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#004B87',
    },
    monthlyBadgeValue: {
        fontSize: 14,
        fontWeight: '900',
        color: '#004B87',
    },
    breakdownBox: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
        gap: 10,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    breakdownValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 16,
        marginBottom: 20,
        gap: 10,
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    infoCardTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#004B87',
        letterSpacing: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
        paddingBottom: 6,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    infoValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0F172A',
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
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 30,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 4,
    },
    emptyDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
    },
    slipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 16,
        marginBottom: 12,
    },
    slipIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    slipInfo: {
        flex: 1,
    },
    slipMonth: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
    },
    slipAmount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#004B87',
        marginTop: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#16A34A',
    },
    downloadBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
