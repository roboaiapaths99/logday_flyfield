import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, Image, Modal, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client, { API_BASE } from '../api/client';
import {
    ChevronLeft, Clock, MapPin, Camera, Mic, CheckCircle2,
    Play, User, Phone, FileText, X, Compass, Calendar
} from 'lucide-react-native';

export default function TimelineScreen({ navigation }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        fetchTimeline();
    }, []);

    const fetchTimeline = async () => {
        try {
            const res = await client.get('/api/flyfield/timeline');
            setEvents(res.data?.events || []);
        } catch (e) {
            console.warn('Failed to fetch timeline:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getFullMediaUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
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
                <Text style={styles.headerTitle}>Daily Field Timeline</Text>
                <View style={{ width: 50 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#004B87" />
                    <Text style={styles.loadingText}>Loading day's trail...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchTimeline();
                            }}
                            colors={['#004B87']}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.dateHeader}>
                        <Calendar size={16} color="#004B87" />
                        <Text style={styles.dateHeaderText}>Today's Activity Sequence</Text>
                    </View>

                    {events.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Clock size={40} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Activity Recorded Today</Text>
                            <Text style={styles.emptyDesc}>
                                Start your shift to begin recording client visits and location activity.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.timelineList}>
                            {events.map((evt, idx) => {
                                const isVisit = evt.event_type === 'visit';
                                const isStart = evt.event_type === 'day_start';
                                const isEnd = evt.event_type === 'day_end';

                                return (
                                    <View key={idx} style={styles.timelineRow}>
                                        {/* Left Connector Line */}
                                        <View style={styles.connectorCol}>
                                            <View
                                                style={[
                                                    styles.nodeDot,
                                                    isStart && styles.nodeDotStart,
                                                    isVisit && styles.nodeDotVisit,
                                                    isEnd && styles.nodeDotEnd,
                                                ]}
                                            />
                                            {idx < events.length - 1 && <View style={styles.nodeLine} />}
                                        </View>

                                        {/* Right Event Card */}
                                        <View style={styles.eventCard}>
                                            <View style={styles.eventHeader}>
                                                <Text style={styles.eventTitle}>{evt.title}</Text>
                                                <Text style={styles.eventTime}>{evt.time}</Text>
                                            </View>

                                            {evt.address && (
                                                <View style={styles.addressRow}>
                                                    <MapPin size={13} color="#004B87" style={{ marginTop: 2 }} />
                                                    <Text style={styles.addressText} numberOfLines={2}>
                                                        {evt.address}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Visit Specific Details */}
                                            {isVisit && (
                                                <View style={styles.visitDetailsBox}>
                                                    <View style={styles.visitMetaRow}>
                                                        <Text style={styles.metaBadge}>{evt.client_type || 'Client'}</Text>
                                                        {evt.duration_minutes !== undefined && (
                                                            <Text style={styles.durationBadge}>
                                                                Duration: {evt.duration_minutes} mins
                                                            </Text>
                                                        )}
                                                    </View>

                                                    {evt.person_met && (
                                                        <View style={styles.infoRow}>
                                                            <User size={13} color="#64748B" />
                                                            <Text style={styles.infoText}>Met: {evt.person_met}</Text>
                                                        </View>
                                                    )}

                                                    {evt.remarks && (
                                                        <View style={styles.infoRow}>
                                                            <FileText size={13} color="#64748B" />
                                                            <Text style={styles.infoText}>{evt.remarks}</Text>
                                                        </View>
                                                    )}

                                                    {/* Photos */}
                                                    {evt.photos && evt.photos.length > 0 && (
                                                        <View style={styles.mediaContainer}>
                                                            <Text style={styles.mediaLabel}>Photos ({evt.photos.length}):</Text>
                                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                                                                {evt.photos.map((p, pIdx) => (
                                                                    <TouchableOpacity
                                                                        key={pIdx}
                                                                        onPress={() => setSelectedPhoto(getFullMediaUrl(p))}
                                                                    >
                                                                        <Image
                                                                            source={{ uri: getFullMediaUrl(p) }}
                                                                            style={styles.thumbImage}
                                                                        />
                                                                    </TouchableOpacity>
                                                                ))}
                                                            </ScrollView>
                                                        </View>
                                                    )}

                                                    {/* Voice Notes */}
                                                    {evt.audio_notes && evt.audio_notes.length > 0 && (
                                                        <View style={styles.audioRow}>
                                                            <Mic size={14} color="#004B87" />
                                                            <Text style={styles.audioText}>Voice Note Recorded</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Photo Lightbox Modal */}
            <Modal
                visible={!!selectedPhoto}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedPhoto(null)}
            >
                <View style={styles.lightboxBackdrop}>
                    <TouchableOpacity
                        style={styles.lightboxCloseBtn}
                        onPress={() => setSelectedPhoto(null)}
                    >
                        <X size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                    {selectedPhoto && (
                        <Image
                            source={{ uri: selectedPhoto }}
                            style={styles.lightboxImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
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
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    dateHeaderText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#004B87',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    timelineList: {
        position: 'relative',
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    connectorCol: {
        width: 30,
        alignItems: 'center',
    },
    nodeDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#94A3B8',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        zIndex: 2,
    },
    nodeDotStart: {
        backgroundColor: '#16A34A',
    },
    nodeDotVisit: {
        backgroundColor: '#004B87',
    },
    nodeDotEnd: {
        backgroundColor: '#DC2626',
    },
    nodeLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#CBD5E1',
        marginVertical: -2,
    },
    eventCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
    },
    eventTime: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginTop: 2,
        marginBottom: 6,
    },
    addressText: {
        fontSize: 12,
        color: '#475569',
        flex: 1,
        lineHeight: 16,
    },
    visitDetailsBox: {
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    visitMetaRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
    },
    metaBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: '#004B87',
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    durationBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#334155',
    },
    mediaContainer: {
        marginTop: 8,
    },
    mediaLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 6,
    },
    thumbScroll: {
        flexDirection: 'row',
    },
    thumbImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    audioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    audioText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#004B87',
    },
    lightboxBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    lightboxCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    lightboxImage: {
        width: '92%',
        height: '80%',
    },
});
