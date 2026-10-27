import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    RefreshControl, ActivityIndicator, Alert, Image, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import client from '../api/client';
import { getCurrentRealLocation } from '../utils/reverseGeocode';
import {
    MapPin, RotateCw, Play, CheckCircle2, Clock, Navigation,
    FileText, Calendar, Wallet, User, Compass, ChevronRight,
    AlertCircle, PhoneCall, Camera, Mic, LogOut, ShieldCheck
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen({ navigation }) {
    const { user, organization } = useAuth();
    const { colors } = useTheme();

    const [todayData, setTodayData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [currentAddress, setCurrentAddress] = useState('Detecting current address...');
    const [refreshingLocation, setRefreshingLocation] = useState(false);

    useEffect(() => {
        loadDashboardData();
        fetchCurrentLocation();
    }, []);

    const fetchCurrentLocation = async () => {
        setRefreshingLocation(true);
        try {
            const loc = await getCurrentRealLocation();
            setCurrentAddress(loc.address || 'Address detected');
            if (loc?.latitude && loc?.longitude) {
                client.post('/api/field/ping', {
                    lat: parseFloat(loc.latitude),
                    lng: parseFloat(loc.longitude),
                    accuracy: parseFloat(loc.accuracy || 10),
                    source: 'dashboard_active'
                }).catch(() => {});
            }
        } catch (e) {
            console.warn('GPS location fetch error:', e);
            setCurrentAddress('Unable to fetch address. Tap refresh to retry.');
        } finally {
            setRefreshingLocation(false);
        }
    };

    const loadDashboardData = async () => {
        try {
            const res = await client.get('/api/flyfield/today');
            setTodayData(res.data);
        } catch (e) {
            console.log('[Dashboard] Status fetch info:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadDashboardData();
        fetchCurrentLocation();
    }, []);

    const handleEndDay = () => {
        if (todayData?.active_visit) {
            Alert.alert(
                'Active Visit In Progress',
                `Please complete checkout at "${todayData.active_visit.client_name}" before ending your day.`
            );
            return;
        }

        Alert.alert(
            'Clock Out / End Shift',
            'Are you sure you want to end your workday? Your total visits and distance will be submitted to HRMS.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Shift',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            const loc = await getCurrentRealLocation();
                            await client.post('/smart-attendance', {
                                email: user?.email || '',
                                intended_type: 'check-out',
                                punch_type: 'out',
                                lat: parseFloat(loc.latitude),
                                long: parseFloat(loc.longitude),
                                latitude: parseFloat(loc.latitude),
                                longitude: parseFloat(loc.longitude),
                                address: loc.address || currentAddress || '',
                                accuracy: parseFloat(loc.accuracy || 10),
                                client_type: 'flyfield'
                            });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('Shift Completed', 'Good job today! Your checkout has been recorded.');
                            loadDashboardData();
                        } catch (err) {
                            Alert.alert('Error', err.response?.data?.detail || 'Failed to record checkout.');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#004B87" />
                <Text style={styles.loadingText}>Loading FlyField Workspace...</Text>
            </SafeAreaView>
        );
    }

    const dayActive = todayData?.day_active ?? false;
    const dayEnded = todayData?.day_ended ?? false;
    const dayStarted = todayData?.day_started ?? false;
    const activeVisit = todayData?.active_visit || null;
    const stats = todayData?.stats || {
        completed_visits: todayData?.visits_completed_count || 0,
        total_time_minutes: Math.round((todayData?.worked_hours || 0) * 60),
        approx_km: todayData?.total_km || 0
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#004B87']} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <View style={styles.appNameRow}>
                            <Image
                                source={require('../../assets/logday_logo.png')}
                                style={styles.headerLogo}
                                resizeMode="contain"
                            />
                            <View style={styles.badge}>
                                <Compass size={12} color="#004B87" />
                                <Text style={styles.badgeText}>FLYFIELD</Text>
                            </View>
                        </View>
                        <Text style={styles.greeting}>
                            Hello, {user?.name || user?.full_name || 'Field Officer'}
                        </Text>
                        <Text style={styles.orgSubtitle}>{organization?.name || 'LogDay Workspace'}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.profileBtn}
                        onPress={() => navigation.navigate('Profile')}
                        activeOpacity={0.7}
                    >
                        <User size={20} color="#004B87" />
                    </TouchableOpacity>
                </View>

                {/* Location Address Card */}
                <View style={styles.addressCard}>
                    <View style={styles.addressHeader}>
                        <View style={styles.addressTitleRow}>
                            <MapPin size={16} color="#004B87" />
                            <Text style={styles.addressLabel}>CURRENT LOCATION</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.refreshLocBtn}
                            onPress={fetchCurrentLocation}
                            disabled={refreshingLocation}
                        >
                            <RotateCw
                                size={14}
                                color="#004B87"
                                style={refreshingLocation ? { transform: [{ rotate: '45deg' }] } : {}}
                            />
                            <Text style={styles.refreshLocText}>
                                {refreshingLocation ? 'Updating...' : 'Refresh'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>
                        {currentAddress}
                    </Text>
                    <View style={styles.verifiedRow}>
                        <ShieldCheck size={12} color="#16A34A" />
                        <Text style={styles.verifiedText}>Location Active</Text>
                    </View>
                </View>

                {/* Main Action Banner */}
                {!dayStarted ? (
                    <View style={styles.actionCardStart}>
                        <View style={styles.actionCardHeader}>
                            <View style={styles.clockIconBox}>
                                <Clock size={24} color="#004B87" />
                            </View>
                            <View style={styles.actionTextCol}>
                                <Text style={styles.actionTitle}>Start Work Day</Text>
                                <Text style={styles.actionDesc}>
                                    Capture a live selfie to verify attendance and begin your daily visits.
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() => navigation.navigate('StartDay')}
                            activeOpacity={0.8}
                        >
                            <Play size={18} color="#FFFFFF" />
                            <Text style={styles.primaryBtnText}>Check In & Start Shift</Text>
                        </TouchableOpacity>
                    </View>
                ) : activeVisit ? (
                    <View style={styles.actionCardActive}>
                        <View style={styles.activeTopRow}>
                            <View style={styles.liveIndicatorRow}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>ACTIVE CLIENT VISIT</Text>
                            </View>
                            <Text style={styles.activeTime}>
                                {new Date(activeVisit.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        <Text style={styles.clientName}>{activeVisit.client_name}</Text>
                        <View style={styles.clientAddressRow}>
                            <MapPin size={14} color="#64748B" />
                            <Text style={styles.clientAddressText} numberOfLines={1}>
                                {activeVisit.address || 'Client site'}
                            </Text>
                        </View>
                        <Text style={styles.lockNotice}>
                            Complete photo or audio summary to finish this visit.
                        </Text>
                        <TouchableOpacity
                            style={styles.resumeVisitBtn}
                            onPress={() => navigation.navigate('ActiveVisit', { visit: activeVisit })}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.resumeVisitText}>Resume Active Visit</Text>
                            <ChevronRight size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                ) : (dayEnded || !dayActive) ? (
                    <View style={[styles.actionCardStart, { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }]}>
                        <View style={styles.actionCardHeader}>
                            <View style={[styles.clockIconBox, { backgroundColor: '#DCFCE7' }]}>
                                <CheckCircle2 size={24} color="#16A34A" />
                            </View>
                            <View style={styles.actionTextCol}>
                                <Text style={styles.actionTitle}>Shift Ended & Completed</Text>
                                <Text style={styles.actionDesc}>
                                    Your workday checkout has been recorded. Tap below to check in for a new day or new shift.
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() => navigation.navigate('StartDay')}
                            activeOpacity={0.8}
                        >
                            <Play size={18} color="#FFFFFF" />
                            <Text style={styles.primaryBtnText}>Check In for New Day / Shift</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionCardReady}>
                        <View style={styles.shiftActiveRow}>
                            <View style={styles.greenDot} />
                            <Text style={styles.shiftActiveText}>Shift Active • Ready For Next Visit</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addVisitBtn}
                            onPress={() => navigation.navigate('StartVisit')}
                            activeOpacity={0.8}
                        >
                            <MapPin size={20} color="#FFFFFF" />
                            <Text style={styles.addVisitBtnText}>+ Check In To New Visit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.endShiftBtn}
                            onPress={handleEndDay}
                            activeOpacity={0.7}
                        >
                            <LogOut size={16} color="#DC2626" />
                            <Text style={styles.endShiftText}>Clock Out & End Shift</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Today's KPI Counters */}
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <CheckCircle2 size={20} color="#16A34A" />
                        <Text style={styles.kpiValue}>{stats.completed_visits}</Text>
                        <Text style={styles.kpiLabel}>Visits Done</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Clock size={20} color="#004B87" />
                        <Text style={styles.kpiValue}>
                            {Math.floor(stats.total_time_minutes / 60)}h {stats.total_time_minutes % 60}m
                        </Text>
                        <Text style={styles.kpiLabel}>Field Time</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Navigation size={20} color="#D91424" />
                        <Text style={styles.kpiValue}>{stats.approx_km} km</Text>
                        <Text style={styles.kpiLabel}>Auto Travel</Text>
                    </View>
                </View>

                {/* Quick Menu */}
                <Text style={styles.sectionTitle}>HRMS & Field Operations</Text>
                <View style={styles.menuGrid}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('Timeline')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBox, { backgroundColor: '#E0F2FE' }]}>
                            <Clock size={22} color="#004B87" />
                        </View>
                        <Text style={styles.menuLabel}>Today's Timeline</Text>
                        <Text style={styles.menuSub}>Sequential records</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('Expenses')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
                            <Wallet size={22} color="#D91424" />
                        </View>
                        <Text style={styles.menuLabel}>Expenses & KM</Text>
                        <Text style={styles.menuSub}>Claim allowance</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('LeaveRequest')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
                            <Calendar size={22} color="#D97706" />
                        </View>
                        <Text style={styles.menuLabel}>Leaves</Text>
                        <Text style={styles.menuSub}>Balance & requests</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('HRMSPayslips')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
                            <FileText size={22} color="#16A34A" />
                        </View>
                        <Text style={styles.menuLabel}>Payslips & CTC</Text>
                        <Text style={styles.menuSub}>Monthly salary slips</Text>
                    </TouchableOpacity>
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
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    appNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    headerLogo: {
        width: 110,
        height: 30,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#004B87',
    },
    greeting: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    orgSubtitle: {
        fontSize: 12,
        color: '#64748B',
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    addressCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
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
    addressTitleRow: {
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
        marginBottom: 6,
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
    actionCardStart: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        shadowColor: '#004B87',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    actionCardHeader: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    clockIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTextCol: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    actionDesc: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#004B87',
        borderRadius: 14,
        paddingVertical: 14,
        gap: 8,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    actionCardActive: {
        backgroundColor: '#FEF3C7',
        borderRadius: 18,
        padding: 18,
        marginBottom: 18,
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    activeTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    liveIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D97706',
    },
    liveText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#B45309',
        letterSpacing: 0.6,
    },
    activeTime: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B45309',
    },
    clientName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#78350F',
        marginBottom: 4,
    },
    clientAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 10,
    },
    clientAddressText: {
        fontSize: 13,
        color: '#92400E',
        flex: 1,
    },
    lockNotice: {
        fontSize: 12,
        color: '#B45309',
        fontStyle: 'italic',
        marginBottom: 12,
    },
    resumeVisitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D97706',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 6,
    },
    resumeVisitText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    actionCardReady: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    shiftActiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    greenDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#16A34A',
    },
    shiftActiveText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#15803D',
    },
    addVisitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#004B87',
        borderRadius: 14,
        paddingVertical: 14,
        gap: 8,
        marginBottom: 10,
    },
    addVisitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    endShiftBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
    },
    endShiftText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#DC2626',
    },
    kpiRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    kpiCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    kpiValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 6,
        marginBottom: 2,
    },
    kpiLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    menuItem: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    menuIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    menuLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    menuSub: {
        fontSize: 11,
        color: '#64748B',
    },
});
