import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentRealLocation } from '../utils/reverseGeocode';
import client from '../api/client';
import {
    MapPin, RotateCw, ChevronLeft, Building2, Tag,
    FileText, CheckCircle2, ShieldCheck, Compass
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const CLIENT_TYPES = [
    'Retailer',
    'Distributor',
    'Corporate Client',
    'Prospect / Lead',
    'Partner',
    'Service Site',
    'Other'
];

export default function StartVisitScreen({ navigation }) {
    const [clientName, setClientName] = useState('');
    const [clientType, setClientType] = useState('Retailer');
    const [remarks, setRemarks] = useState('');

    const [locationData, setLocationData] = useState(null);
    const [fetchingLocation, setFetchingLocation] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchLocation();
    }, []);

    const fetchLocation = async () => {
        setFetchingLocation(true);
        try {
            const loc = await getCurrentRealLocation();
            setLocationData(loc);
        } catch (e) {
            Alert.alert('GPS Location Error', e.message || 'Unable to detect site address.');
        } finally {
            setFetchingLocation(false);
        }
    };

    const handleStartVisit = async () => {
        if (!clientName.trim()) {
            Alert.alert('Client Name Required', 'Please enter the name of the client, store, or facility.');
            return;
        }

        if (!locationData) {
            Alert.alert('Location Required', 'Acquiring client site address. Please wait or tap refresh.');
            return;
        }

        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            const payload = {
                client_name: clientName.trim(),
                client_type: clientType,
                address: locationData.address || 'Current location detected',
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                remarks: remarks.trim(),
            };

            const res = await client.post('/api/flyfield/visit/start', payload);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Navigate directly to Active Visit Screen with the new visit
            navigation.replace('ActiveVisit', { visit: res.data?.visit || res.data });
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (err.response?.status === 409) {
                const activeVisit = err.response?.data?.active_visit;
                Alert.alert(
                    'Active Visit In Progress',
                    'You already have an ongoing visit that must be completed first.',
                    [
                        {
                            text: 'Open Active Visit',
                            onPress: () => {
                                if (activeVisit) {
                                    navigation.replace('ActiveVisit', { visit: activeVisit });
                                } else {
                                    navigation.replace('Dashboard');
                                }
                            }
                        }
                    ]
                );
            } else {
                const rawDetail = err.response?.data?.detail || err.message;
                let msg = 'Failed to start visit.';
                if (typeof rawDetail === 'string') {
                    msg = rawDetail;
                } else if (Array.isArray(rawDetail)) {
                    msg = rawDetail.map(d => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join('\n');
                } else if (rawDetail && typeof rawDetail === 'object') {
                    msg = rawDetail.msg || JSON.stringify(rawDetail);
                }
                Alert.alert('Error Starting Visit', msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    disabled={submitting}
                >
                    <ChevronLeft size={22} color="#004B87" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Client Visit</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Location Address Card */}
                <View style={styles.addressCard}>
                    <View style={styles.addressHeader}>
                        <View style={styles.pinRow}>
                            <MapPin size={16} color="#004B87" />
                            <Text style={styles.addressLabel}>CLIENT LOCATION</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.refreshLocBtn}
                            onPress={fetchLocation}
                            disabled={fetchingLocation}
                        >
                            <RotateCw
                                size={13}
                                color="#004B87"
                                style={fetchingLocation ? { transform: [{ rotate: '45deg' }] } : {}}
                            />
                            <Text style={styles.refreshLocText}>
                                {fetchingLocation ? 'Locating...' : 'Refresh'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.addressText} numberOfLines={3}>
                        {fetchingLocation ? 'Detecting address from GPS...' : (locationData?.address || 'Location detected')}
                    </Text>
                    <View style={styles.verifiedRow}>
                        <ShieldCheck size={12} color="#16A34A" />
                        <Text style={styles.verifiedText}>Location attached to visit record</Text>
                    </View>
                </View>

                {/* Client Info Card */}
                <View style={styles.formCard}>
                    <Text style={styles.formSectionTitle}>Client Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Client or Business Name *</Text>
                        <View style={styles.inputWrapper}>
                            <Building2 size={18} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Acme Retail Store"
                                placeholderTextColor="#94A3B8"
                                value={clientName}
                                onChangeText={setClientName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Client Category</Text>
                        <View style={styles.typeGrid}>
                            {CLIENT_TYPES.map((type) => {
                                const isSelected = clientType === type;
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.typePill, isSelected && styles.typePillSelected]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setClientType(type);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.typePillText, isSelected && styles.typePillTextSelected]}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Visit Purpose / Initial Note (Optional)</Text>
                        <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                            <FileText size={18} color="#64748B" style={[styles.inputIcon, { marginTop: 2 }]} />
                            <TextInput
                                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                                placeholder="e.g. Routine restocking discussion & catalog delivery"
                                placeholderTextColor="#94A3B8"
                                value={remarks}
                                onChangeText={setRemarks}
                                multiline
                            />
                        </View>
                    </View>
                </View>

                {/* Workflow Notice */}
                <View style={styles.noticeCard}>
                    <Compass size={18} color="#004B87" />
                    <View style={styles.noticeTextCol}>
                        <Text style={styles.noticeTitle}>FlyField Sequential Rule</Text>
                        <Text style={styles.noticeDesc}>
                            Once you check in, this visit will be locked as active. You can record live camera snapshots and voice notes before checking out to unlock your next stop.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.startVisitBtn,
                        (!clientName.trim() || fetchingLocation || submitting) && styles.startVisitBtnDisabled
                    ]}
                    onPress={handleStartVisit}
                    disabled={!clientName.trim() || fetchingLocation || submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <CheckCircle2 size={20} color="#FFFFFF" />
                            <Text style={styles.startVisitBtnText}>Check In & Start Visit</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
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
    addressCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    pinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    addressLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#004B87',
        letterSpacing: 0.5,
    },
    refreshLocBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    refreshLocText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#004B87',
    },
    addressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        lineHeight: 20,
        marginBottom: 8,
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verifiedText: {
        fontSize: 11,
        color: '#16A34A',
        fontWeight: '600',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    formSectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 16,
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
        fontSize: 14,
        color: '#0F172A',
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typePill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    typePillSelected: {
        backgroundColor: '#004B87',
        borderColor: '#004B87',
    },
    typePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    typePillTextSelected: {
        color: '#FFFFFF',
    },
    noticeCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#EFF6FF',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    noticeTextCol: {
        flex: 1,
    },
    noticeTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E3A8A',
        marginBottom: 2,
    },
    noticeDesc: {
        fontSize: 12,
        color: '#3B82F6',
        lineHeight: 16,
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderColor: '#E2E8F0',
    },
    startVisitBtn: {
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
    startVisitBtnDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
    },
    startVisitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
