import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Image, TextInput, Modal, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
    useAudioRecorder,
    useAudioPlayer,
    useAudioPlayerStatus,
    setAudioModeAsync,
    RecordingPresets,
    requestRecordingPermissionsAsync
} from 'expo-audio';
import client from '../api/client';
import { getCurrentRealLocation } from '../utils/reverseGeocode';
import {
    MapPin, Camera, Mic, Square, Play, Pause, Trash2, CheckCircle2,
    Clock, Building2, User, Phone, FileText, ChevronLeft,
    AlertCircle, ShieldCheck, RotateCw, Volume2
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function ActiveVisitScreen({ route, navigation }) {
    const rawVisit = route.params?.visit || {};
    const visit = rawVisit.visit || rawVisit;

    const [durationSeconds, setDurationSeconds] = useState(0);
    const [personMet, setPersonMet] = useState(visit.contact_name || '');
    const [phone, setPhone] = useState(visit.contact_phone || '');
    const [remarks, setRemarks] = useState(visit.notes || '');

    // Photo Capture
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [capturedPhotos, setCapturedPhotos] = useState(visit?.photos || []);

    // Real Audio Voice Note
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [audioRecordDuration, setAudioRecordDuration] = useState(0);
    const [audioNoteUri, setAudioNoteUri] = useState(null);
    const audioTimerRef = useRef(null);

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
        if (status?.url) {
            setAudioNoteUri(status.url);
        }
    });

    const audioPlayer = useAudioPlayer(audioNoteUri || undefined);
    const audioPlayerStatus = useAudioPlayerStatus(audioPlayer);

    // Submission
    const [submitting, setSubmitting] = useState(false);

    // Live Visit Stopwatch
    useEffect(() => {
        const startTimeStr = visit.check_in_time || visit.start_time;
        if (!startTimeStr) return;
        const startTime = new Date(startTimeStr).getTime();

        const updateTimer = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((now - startTime) / 1000));
            setDurationSeconds(diff);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [visit.check_in_time, visit.start_time]);

    const formatStopwatch = (totalSec) => {
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        if (hrs > 0) {
            return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
        }
        return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    };

    // Camera Handlers
    const handleSnapPhoto = async () => {
        if (!cameraRef.current) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.6,
                skipProcessing: true,
            });
            setCapturedPhotos((prev) => [...prev, photo.uri]);
            setShowCameraModal(false);
        } catch (e) {
            Alert.alert('Camera Error', 'Failed to capture photo.');
        }
    };

    const handleRemovePhoto = (index) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    // Voice Note Recorder Handlers
    const startAudioRecording = async () => {
        try {
            const perm = await requestRecordingPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Microphone Access', 'Microphone permission is required to record voice notes.');
                return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });
            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();
            setIsRecordingAudio(true);
            setAudioRecordDuration(0);

            audioTimerRef.current = setInterval(() => {
                setAudioRecordDuration((sec) => sec + 1);
            }, 1000);
        } catch (e) {
            console.warn('Audio start error:', e);
            Alert.alert('Audio Error', 'Could not start voice recording: ' + (e.message || ''));
        }
    };

    const stopAudioRecording = async () => {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (audioTimerRef.current) {
                clearInterval(audioTimerRef.current);
            }
            await audioRecorder.stop();
            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });
            setIsRecordingAudio(false);
            const status = typeof audioRecorder.getStatus === 'function' ? audioRecorder.getStatus() : null;
            const recordedUri = audioRecorder.uri || audioRecorder.url || status?.url;
            console.log('[Audio] Recorded audio note URI:', recordedUri);
            if (recordedUri) {
                setAudioNoteUri(recordedUri);
            }
        } catch (e) {
            console.warn('Stop audio failed', e);
            setIsRecordingAudio(false);
        }
    };

    const deleteAudioNote = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (audioPlayer && audioPlayerStatus.playing) {
            audioPlayer.pause();
        }
        setAudioNoteUri(null);
        setAudioRecordDuration(0);
    };

    const toggleAudioPreview = () => {
        if (!audioPlayer) return;
        try {
            if (audioPlayerStatus.playing) {
                audioPlayer.pause();
            } else {
                if (audioPlayerStatus.currentTime >= (audioPlayerStatus.duration || 1)) {
                    audioPlayer.seekTo(0);
                }
                audioPlayer.play();
            }
        } catch (e) {
            console.warn('Audio preview error:', e);
        }
    };

    // Complete Visit Checkout
    const handleCompleteVisit = async () => {
        if (capturedPhotos.length === 0) {
            Alert.alert(
                'Photo Required',
                'Please capture at least one photo of your client visit before checking out.'
            );
            return;
        }

        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            const visitId = visit._id || visit.id || visit.visit_id;

            // Step 1: Upload media (each photo as live proof)
            for (let i = 0; i < capturedPhotos.length; i++) {
                const uri = capturedPhotos[i];
                const filename = uri.split('/').pop() || `photo_${i}.jpg`;
                const photoForm = new FormData();
                photoForm.append('media_type', 'photo');
                photoForm.append('file', {
                    uri,
                    name: filename,
                    type: 'image/jpeg',
                });

                try {
                    await client.post(`/api/flyfield/visit/${visitId}/media`, photoForm, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                } catch (mediaErr) {
                    console.warn(`Media upload warning for photo ${i}:`, mediaErr);
                }
            }

            // Step 2: Upload audio voice note if recorded
            if (audioNoteUri) {
                try {
                    const audioForm = new FormData();
                    audioForm.append('media_type', 'voice_note');
                    audioForm.append('duration_sec', String(audioRecordDuration || 10));
                    const audioFilename = audioNoteUri.split('/').pop() || 'voice_note.m4a';
                    audioForm.append('file', {
                        uri: audioNoteUri,
                        name: audioFilename.endsWith('.m4a') || audioFilename.endsWith('.aac') ? audioFilename : `${audioFilename}.m4a`,
                        type: 'audio/m4a',
                    });

                    console.log('[Upload] Uploading audio note:', audioNoteUri);
                    const audioRes = await client.post(`/api/flyfield/visit/${visitId}/media`, audioForm, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    console.log('[Upload] Audio uploaded response:', audioRes.data);
                } catch (audioErr) {
                    console.warn('Voice note upload warning:', audioErr);
                }
            }

            // Step 3: Acquire real checkout GPS street location
            let checkoutLoc = null;
            try {
                checkoutLoc = await getCurrentRealLocation();
            } catch (locErr) {
                console.warn('Checkout GPS fallback:', locErr);
            }

            // Step 4: Finalize visit checkout
            const endPayload = {
                remarks: remarks.trim(),
                person_met: personMet.trim(),
                phone: phone.trim(),
                latitude: checkoutLoc?.latitude || visit.check_in_lat || 0.0,
                longitude: checkoutLoc?.longitude || visit.check_in_lng || 0.0,
                address: checkoutLoc?.address || visit.check_in_address || '',
            };

            await client.post(`/api/flyfield/visit/${visitId}/end`, endPayload);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Visit Completed',
                `Visit completed at ${visit.client_name}. You can now begin your next visit.`,
                [{ text: 'OK', onPress: () => navigation.replace('Dashboard') }]
            );
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const rawDetail = err.response?.data?.detail || err.message;
            let msg = 'Failed to complete visit.';
            if (typeof rawDetail === 'string') {
                msg = rawDetail;
            } else if (Array.isArray(rawDetail)) {
                msg = rawDetail.map(d => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join('\n');
            } else if (rawDetail && typeof rawDetail === 'object') {
                msg = rawDetail.msg || JSON.stringify(rawDetail);
            }
            Alert.alert('Error Completing Visit', msg);
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
                    onPress={() => navigation.navigate('Dashboard')}
                >
                    <ChevronLeft size={22} color="#004B87" />
                    <Text style={styles.backText}>Dashboard</Text>
                </TouchableOpacity>
                <View style={styles.activeTag}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.activeTagText}>VISIT IN PROGRESS</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Client Info Banner */}
                <View style={styles.clientHeroCard}>
                    <Text style={styles.clientHeroCategory}>{visit.client_type || 'Client Site'}</Text>
                    <Text style={styles.clientHeroName}>{visit.client_name || 'Active Client'}</Text>

                    <View style={styles.addressRow}>
                        <MapPin size={14} color="#004B87" style={{ marginTop: 2 }} />
                        <Text style={styles.addressText} numberOfLines={2}>
                            {visit.check_in_address || visit.address || 'Client Site'}
                        </Text>
                    </View>

                    {/* Live Stopwatch */}
                    <View style={styles.stopwatchContainer}>
                        <Clock size={18} color="#D97706" />
                        <Text style={styles.stopwatchLabel}>Time On-Site:</Text>
                        <Text style={styles.stopwatchValue}>{formatStopwatch(durationSeconds)}</Text>
                    </View>
                </View>

                {/* Section 1: Photos */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Camera size={18} color="#004B87" />
                            <Text style={styles.sectionTitle}>Visit Photos (Required)</Text>
                        </View>
                        <Text style={styles.sectionCount}>
                            {capturedPhotos.length} Captured
                        </Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        Capture photos of client site, store display, or meeting documentation.
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                        {capturedPhotos.map((uri, idx) => (
                            <View key={idx} style={styles.photoThumbWrapper}>
                                <Image source={{ uri }} style={styles.photoThumb} />
                                <TouchableOpacity
                                    style={styles.photoDeleteBtn}
                                    onPress={() => handleRemovePhoto(idx)}
                                >
                                    <Trash2 size={12} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={styles.addPhotoBtn}
                            onPress={async () => {
                                if (!cameraPermission?.granted) {
                                    const res = await requestCameraPermission();
                                    if (!res.granted) {
                                        Alert.alert('Permission Denied', 'Camera is required to capture visit proof.');
                                        return;
                                    }
                                }
                                setShowCameraModal(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <Camera size={24} color="#004B87" />
                            <Text style={styles.addPhotoText}>+ Snap Photo</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Proof Section 2: Audio Voice Note */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Mic size={18} color="#004B87" />
                            <Text style={styles.sectionTitle}>Audio Voice Note</Text>
                        </View>
                        <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        Quickly dictate meeting outcomes, client feedback, or required follow-ups.
                    </Text>

                    {audioNoteUri ? (
                        <View style={styles.recordedAudioBox}>
                            <TouchableOpacity style={styles.audioMeta} onPress={toggleAudioPreview} activeOpacity={0.7}>
                                {audioPlayerStatus?.playing ? (
                                    <Pause size={22} color="#004B87" />
                                ) : (
                                    <Play size={22} color="#16A34A" />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.audioTitle}>
                                        {audioPlayerStatus?.playing ? 'Playing Voice Note...' : 'Voice Note Ready (Tap to Listen)'}
                                    </Text>
                                    <Text style={styles.audioDuration}>{audioRecordDuration} seconds recorded</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.audioDeleteBtn} onPress={deleteAudioNote}>
                                <Trash2 size={16} color="#DC2626" />
                            </TouchableOpacity>
                        </View>
                    ) : isRecordingAudio ? (
                        <View style={styles.recordingActiveBox}>
                            <View style={styles.recordingDot} />
                            <Text style={styles.recordingTimer}>{audioRecordDuration}s Recording...</Text>
                            <TouchableOpacity style={styles.stopRecordBtn} onPress={stopAudioRecording}>
                                <Square size={16} color="#FFFFFF" />
                                <Text style={styles.stopRecordText}>Stop & Save</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.startRecordBtn}
                            onPress={startAudioRecording}
                            activeOpacity={0.8}
                        >
                            <Mic size={18} color="#004B87" />
                            <Text style={styles.startRecordText}>Record Voice Summary</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Meeting Details Form */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Meeting & Contact Info</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Person Met</Text>
                        <View style={styles.inputWrapper}>
                            <User size={18} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Mr. Rajesh Sharma (Store Manager)"
                                placeholderTextColor="#94A3B8"
                                value={personMet}
                                onChangeText={setPersonMet}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Contact Phone (Optional)</Text>
                        <View style={styles.inputWrapper}>
                            <Phone size={18} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="+91 98765 43210"
                                placeholderTextColor="#94A3B8"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Discussion Remarks / Outcome</Text>
                        <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                            <FileText size={18} color="#64748B" style={[styles.inputIcon, { marginTop: 2 }]} />
                            <TextInput
                                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                                placeholder="e.g. Order of 50 units confirmed. Delivery expected by Friday."
                                placeholderTextColor="#94A3B8"
                                value={remarks}
                                onChangeText={setRemarks}
                                multiline
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.securityBox}>
                    <ShieldCheck size={16} color="#16A34A" />
                    <Text style={styles.securityText}>
                        Completing this visit will record your checkout time and submit your report.
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom Checkout Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.checkoutBtn,
                        (capturedPhotos.length === 0 || submitting) && styles.checkoutBtnDisabled
                    ]}
                    onPress={handleCompleteVisit}
                    disabled={capturedPhotos.length === 0 || submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <CheckCircle2 size={20} color="#FFFFFF" />
                            <Text style={styles.checkoutBtnText}>Complete & Submit Visit</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Camera View Modal */}
            <Modal
                visible={showCameraModal}
                animationType="slide"
                onRequestClose={() => setShowCameraModal(false)}
            >
                <SafeAreaView style={styles.cameraModalContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.modalCamera}
                        facing="back"
                    >
                        <View style={styles.cameraControlsOverlay}>
                            <TouchableOpacity
                                style={styles.closeCameraBtn}
                                onPress={() => setShowCameraModal(false)}
                            >
                                <Text style={styles.closeCameraText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cameraShutterBtn}
                                onPress={handleSnapPhoto}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cameraShutterInner} />
                            </TouchableOpacity>

                            <View style={{ width: 60 }} />
                        </View>
                    </CameraView>
                </SafeAreaView>
            </Modal>
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
    activeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D97706',
    },
    activeTagText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#B45309',
        letterSpacing: 0.5,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    clientHeroCard: {
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
    clientHeroCategory: {
        fontSize: 11,
        fontWeight: '800',
        color: '#004B87',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    clientHeroName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 14,
    },
    addressText: {
        fontSize: 13,
        color: '#475569',
        flex: 1,
        lineHeight: 18,
    },
    stopwatchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    stopwatchLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#92400E',
    },
    stopwatchValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#B45309',
    },
    sectionCard: {
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#004B87',
    },
    optionalBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
        marginBottom: 14,
    },
    photoList: {
        flexDirection: 'row',
    },
    photoThumbWrapper: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 10,
        position: 'relative',
    },
    photoThumb: {
        width: '100%',
        height: '100%',
    },
    photoDeleteBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(220,38,38,0.85)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoBtn: {
        width: 80,
        height: 80,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#BAE6FD',
        borderStyle: 'dashed',
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    addPhotoText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#004B87',
    },
    startRecordBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F0F9FF',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    startRecordText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#004B87',
    },
    recordingActiveBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#DC2626',
    },
    recordingTimer: {
        fontSize: 14,
        fontWeight: '700',
        color: '#DC2626',
    },
    stopRecordBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#DC2626',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    stopRecordText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    recordedAudioBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F0FDF4',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    audioMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    audioTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#15803D',
    },
    audioDuration: {
        fontSize: 11,
        color: '#16A34A',
    },
    audioDeleteBtn: {
        padding: 6,
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
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 12,
        height: 46,
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        color: '#0F172A',
    },
    securityBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F1F5F9',
        padding: 12,
        borderRadius: 12,
    },
    securityText: {
        fontSize: 11,
        color: '#475569',
        flex: 1,
        lineHeight: 16,
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderColor: '#E2E8F0',
    },
    checkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#16A34A',
        borderRadius: 14,
        paddingVertical: 15,
        gap: 8,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    checkoutBtnDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
    },
    checkoutBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    cameraModalContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    modalCamera: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    cameraControlsOverlay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 40,
    },
    closeCameraBtn: {
        padding: 10,
    },
    closeCameraText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    cameraShutterBtn: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    cameraShutterInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#FFFFFF',
    },
});
