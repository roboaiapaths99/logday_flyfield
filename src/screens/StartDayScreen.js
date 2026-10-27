import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, Image, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { getCurrentRealLocation } from '../utils/reverseGeocode';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import {
    MapPin, Camera as CameraIcon, RotateCw, CheckCircle2,
    ChevronLeft, ShieldCheck, AlertCircle, RefreshCw, Video
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function StartDayScreen({ navigation }) {
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);

    const [locationData, setLocationData] = useState(null);
    const [fetchingLocation, setFetchingLocation] = useState(true);
    const [photoUri, setPhotoUri] = useState(null);
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
            Alert.alert('GPS Error', e.message || 'Unable to retrieve your current location.');
        } finally {
            setFetchingLocation(false);
        }
    };

    const handleTakePhoto = async () => {
        if (!cameraRef.current) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.6,
                skipProcessing: true
            });
            setPhotoUri(photo.uri);
        } catch (e) {
            Alert.alert('Camera Error', 'Could not capture photo. Please try again.');
        }
    };

    const handleRetake = () => {
        setPhotoUri(null);
    };

    const handleConfirmStartDay = async () => {
        if (!photoUri) {
            Alert.alert('Selfie Required', 'Please take a live selfie before starting your shift.');
            return;
        }

        if (!locationData) {
            Alert.alert('Location Required', 'Acquiring GPS location. Please wait or tap refresh.');
            return;
        }

        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            // Optimize and compress photo to Base64
            const manipulated = await ImageManipulator.manipulateAsync(
                photoUri,
                [{ resize: { width: 500 } }],
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            // Enterprise Smart Attendance payload
            const payload = {
                email: user?.email || '',
                lat: parseFloat(locationData.latitude),
                long: parseFloat(locationData.longitude),
                accuracy: parseFloat(locationData.accuracy || 10),
                address: locationData.address || '',
                image: manipulated.base64,
                intended_type: 'check-in',
                client_type: 'flyfield'
            };

            const response = await client.post('/smart-attendance', payload);
            const msg = response.data?.message || 'Shift started successfully! You can now check in to client locations on the fly.';

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Shift Started',
                msg,
                [{ text: 'OK', onPress: () => navigation.replace('Dashboard') }]
            );
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const rawMsg = err.response?.data?.detail || err.message || 'Failed to start shift.';
            const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
            
            if (msg.toLowerCase().includes('not enrolled') || msg.toLowerCase().includes('enrollment')) {
                Alert.alert(
                    'Face Registration Required',
                    'Your face must be registered before checking in. Please complete face registration.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Register Face Now',
                            onPress: () => navigation.navigate('FaceEnrollment', { fromStartDay: true })
                        }
                    ]
                );
            } else {
                Alert.alert('Check-In Failed', msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!permission) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#004B87" />
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <CameraIcon size={48} color="#64748B" />
                <Text style={styles.permTitle}>Camera Access Required</Text>
                <Text style={styles.permDesc}>
                    Camera access is required for attendance check-in.
                </Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                    <Text style={styles.permBtnText}>Grant Permission</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

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
                    <Text style={styles.backText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Morning Check-In</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Address Banner */}
            <View style={styles.addressBox}>
                <View style={styles.addressTop}>
                    <View style={styles.pinRow}>
                        <MapPin size={16} color="#004B87" />
                        <Text style={styles.addressLabel}>CURRENT LOCATION</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.refreshLocBtn}
                        onPress={fetchLocation}
                        disabled={fetchingLocation}
                    >
                        <RefreshCw
                            size={13}
                            color="#004B87"
                            style={fetchingLocation ? { transform: [{ rotate: '45deg' }] } : {}}
                        />
                        <Text style={styles.refreshLocText}>
                            {fetchingLocation ? 'Updating...' : 'Refresh'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.addressText} numberOfLines={2}>
                    {fetchingLocation ? 'Detecting current address...' : (locationData?.address || 'Location detected')}
                </Text>
            </View>

            {/* Camera / Photo Preview View */}
            <View style={styles.cameraWrapper}>
                {photoUri ? (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                        <View style={styles.verifiedBadge}>
                            <CheckCircle2 size={14} color="#10B981" />
                            <Text style={styles.verifiedBadgeText}>Photo Ready</Text>
                        </View>
                        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                            <RotateCw size={16} color="#FFFFFF" />
                            <Text style={styles.retakeText}>Retake Photo</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.cameraContainer}>
                        <CameraView
                            ref={cameraRef}
                            style={styles.camera}
                            facing="front"
                        >
                            {/* Biometric Oval Face Guide Overlay */}
                            <View style={styles.faceGuideOverlay}>
                                <View style={styles.faceOvalFrame}>
                                    <View style={styles.guideCornerTL} />
                                    <View style={styles.guideCornerTR} />
                                    <View style={styles.guideCornerBL} />
                                    <View style={styles.guideCornerBR} />
                                </View>
                                <Text style={styles.faceGuideText}>Align Face in Frame</Text>
                            </View>
                        </CameraView>
                        {/* Live Feed Header Chip */}
                        <View style={styles.liveFeedChip}>
                            <View style={styles.livePulseDot} />
                            <Text style={styles.liveFeedText}>CAMERA ACTIVE</Text>
                        </View>

                        {/* Bottom Shutter Controls */}
                        <View style={styles.shutterBar}>
                            <TouchableOpacity
                                style={styles.captureBtn}
                                onPress={handleTakePhoto}
                                activeOpacity={0.8}
                            >
                                <CameraIcon size={26} color="#004B87" />
                            </TouchableOpacity>
                            <Text style={styles.guideText}>Tap shutter to capture</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Footer Action */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.confirmBtn,
                        (!photoUri || fetchingLocation || submitting) && styles.confirmBtnDisabled
                    ]}
                    onPress={handleConfirmStartDay}
                    disabled={!photoUri || fetchingLocation || submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <CheckCircle2 size={20} color="#FFFFFF" />
                            <Text style={styles.confirmBtnText}>Check In & Start Shift</Text>
                        </>
                    )}
                </TouchableOpacity>
                <View style={styles.securityNote}>
                    <ShieldCheck size={14} color="#16A34A" />
                    <Text style={styles.securityNoteText}>Secure Mobile Attendance Check-In</Text>
                </View>
            </View>
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
        paddingHorizontal: 30,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
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
    addressBox: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    addressTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
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
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    refreshLocText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#004B87',
    },
    addressText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
        lineHeight: 18,
    },
    cameraWrapper: {
        flex: 1,
        marginHorizontal: 20,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#0F172A',
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    faceGuideOverlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        paddingBottom: 60,
    },
    faceOvalFrame: {
        width: 220,
        height: 270,
        borderRadius: 110,
        borderWidth: 2.5,
        borderColor: 'rgba(56, 189, 248, 0.85)',
        borderStyle: 'dashed',
        position: 'relative',
        backgroundColor: 'transparent',
    },
    guideCornerTL: {
        position: 'absolute',
        top: -2,
        left: 20,
        width: 24,
        height: 4,
        backgroundColor: '#38BDF8',
        borderRadius: 2,
    },
    guideCornerTR: {
        position: 'absolute',
        top: -2,
        right: 20,
        width: 24,
        height: 4,
        backgroundColor: '#38BDF8',
        borderRadius: 2,
    },
    guideCornerBL: {
        position: 'absolute',
        bottom: -2,
        left: 20,
        width: 24,
        height: 4,
        backgroundColor: '#38BDF8',
        borderRadius: 2,
    },
    guideCornerBR: {
        position: 'absolute',
        bottom: -2,
        right: 20,
        width: 24,
        height: 4,
        backgroundColor: '#38BDF8',
        borderRadius: 2,
    },
    faceGuideText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 14,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    liveFeedChip: {
        position: 'absolute',
        top: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    livePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
    },
    liveFeedText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    shutterBar: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 8,
    },
    captureBtn: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#BAE6FD',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    guideText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    verifiedBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    verifiedBadgeText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '700',
    },
    previewContainer: {
        flex: 1,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    retakeBtn: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15,23,42,0.8)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    retakeText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#004B87',
        borderRadius: 16,
        paddingVertical: 16,
        gap: 8,
        shadowColor: '#004B87',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    confirmBtnDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    securityNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
    },
    securityNoteText: {
        fontSize: 11,
        color: '#64748B',
    },
    permTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 16,
        marginBottom: 8,
    },
    permDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    permBtn: {
        backgroundColor: '#004B87',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
