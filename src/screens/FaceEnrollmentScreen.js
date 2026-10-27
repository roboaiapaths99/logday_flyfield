import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, Dimensions, StatusBar, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import {
    Camera as CameraIcon, ChevronLeft, ShieldCheck,
    CheckCircle2, AlertCircle, RefreshCw, ScanFace
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function FaceEnrollmentScreen({ navigation, route }) {
    const { user, updateUser, logout } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [capturing, setCapturing] = useState(false);

    const isInitial = route?.params?.initialEnrollment ?? user?.needs_face_enrollment;

    const handleCancel = () => {
        if (isInitial) {
            Alert.alert(
                'Cancel Face Setup',
                'Face enrollment is required for field attendance. Do you want to sign out?',
                [
                    { text: 'Keep Enrolling', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: async () => await logout() }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    const handleCaptureFace = async () => {
        if (!cameraRef.current || capturing) return;

        try {
            setCapturing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                skipProcessing: true
            });

            // Crop/Resize to optimal 500px JPEG for face recognition matching
            const manipulated = await ImageManipulator.manipulateAsync(
                photo.uri,
                [{ resize: { width: 500 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            // Send to existing /api/employee/update-face endpoint
            await client.post('/api/employee/update-face', {
                image: manipulated.base64,
                face_image: manipulated.base64
            });

            // Update user state so needs_face_enrollment is now false
            if (user) {
                updateUser({
                    ...user,
                    needs_face_enrollment: false,
                    face_enrolled: true
                });
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            if (isInitial) {
                Alert.alert(
                    'Setup Complete',
                    'Your face profile has been registered. You are now ready to start your shift.',
                    [{ text: 'Continue to Dashboard' }]
                );
            } else {
                Alert.alert(
                    'Face Registration Updated',
                    'Your face profile has been updated successfully.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = err.response?.data?.detail || err.message || 'Face enrollment failed. Please ensure your face is well-lit and clearly centered.';
            Alert.alert('Enrollment Failed', typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setCapturing(false);
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
                    Front camera access is required to register your face profile.
                </Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                    <Text style={styles.permBtnText}>Grant Camera Permission</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleCancel}
                    disabled={capturing}
                >
                    <ChevronLeft size={22} color="#FFFFFF" />
                    <Text style={styles.backText}>{isInitial ? 'Sign Out' : 'Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isInitial ? 'Face Registration' : 'Update Face'}
                </Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Camera Viewport */}
            <View style={styles.cameraWrapper}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="front"
                >
                    {/* Dark Mask with Oval Cutout */}
                    <View style={styles.overlayContainer}>
                        <View style={styles.guideContainer}>
                            <View style={styles.ovalFrame}>
                                <View style={styles.cornerTL} />
                                <View style={styles.cornerTR} />
                                <View style={styles.cornerBL} />
                                <View style={styles.cornerBR} />
                            </View>
                            <Text style={styles.guidanceText}>
                                Position your face inside the frame
                            </Text>
                            <Text style={styles.guidanceSubtext}>
                                Look directly at the camera in a well-lit space
                            </Text>
                        </View>
                    </View>
                </CameraView>
            </View>

            {/* Security Badge */}
            <View style={styles.securityBox}>
                <ShieldCheck size={16} color="#16A34A" />
                <Text style={styles.securityText}>
                    Official Employee Identity Registration
                </Text>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.captureBtn, capturing && styles.btnDisabled]}
                    onPress={handleCaptureFace}
                    disabled={capturing}
                    activeOpacity={0.8}
                >
                    {capturing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <View style={styles.captureInner}>
                            <CameraIcon size={28} color="#004B87" />
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={styles.shutterHint}>
                    {capturing ? 'Registering Face ID...' : 'Tap shutter to capture face'}
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#0F172A',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
    },
    backText: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '600',
        marginLeft: 2,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    permTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 16,
    },
    permDesc: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    permBtn: {
        marginTop: 24,
        backgroundColor: '#004B87',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
    },
    permBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    cameraWrapper: {
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    overlayContainer: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    guideContainer: {
        alignItems: 'center',
    },
    ovalFrame: {
        width: width * 0.72,
        height: width * 0.95,
        borderRadius: (width * 0.72) / 2,
        borderWidth: 3,
        borderColor: '#00A3E0',
        backgroundColor: 'transparent',
        borderStyle: 'dashed',
        position: 'relative',
    },
    cornerTL: {
        position: 'absolute',
        top: -2,
        left: 20,
        width: 30,
        height: 4,
        backgroundColor: '#38BDF8',
        borderRadius: 2,
    },
    cornerTR: {
        position: 'absolute',
        top: -2,
        right: 20,
        width: 30,
        height: 4,
        backgroundColor: '#38BDF8',
        borderRadius: 2,
    },
    cornerBL: {
        position: 'absolute',
        bottom: -2,
        left: 20,
        width: 30,
        height: 4,
        backgroundColor: '#38BDF8',
        borderRadius: 2,
    },
    cornerBR: {
        position: 'absolute',
        bottom: -2,
        right: 20,
        width: 30,
        height: 4,
        backgroundColor: '#38BDF8',
        borderRadius: 2,
    },
    guidanceText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 20,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    guidanceSubtext: {
        color: '#CBD5E1',
        fontSize: 13,
        marginTop: 6,
        textAlign: 'center',
    },
    securityBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: '#1E293B',
    },
    securityText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '600',
    },
    bottomBar: {
        backgroundColor: '#0F172A',
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtn: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#00A3E0',
    },
    captureInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E0F2FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    shutterHint: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 12,
    },
});
