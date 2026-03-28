import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import api from '../utils/api';

const COST_LABELS = { free: '🆓 Free', low: '$ Low cost', medium: '$$ Mid', high: '$$$ Premium' };

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/events')
      .then(res => setEvents(res.data.events))
      .finally(() => setLoading(false));
  }, []);

  const handleRSVP = async (eventId) => {
    try {
      await api.post(`/events/${eventId}/rsvp`);
      setEvents(prev =>
        prev.map(e => e.id === eventId
          ? { ...e, is_attending: true, attendee_count: parseInt(e.attendee_count) + 1 }
          : e
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const renderEvent = ({ item }) => {
    const date = new Date(item.datetime);
    const isFull = item.max_attendees && parseInt(item.attendee_count) >= item.max_attendees;

    return (
      <View style={[styles.card, Shadows.sm]}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{date.getDate()}</Text>
          <Text style={styles.dateMon}>{date.toLocaleString('default', { month: 'short' })}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.attendee_count} going</Text>
            {item.cost_tier && (
              <Text style={styles.costLabel}>{COST_LABELS[item.cost_tier]}</Text>
            )}
          </View>
          {item.circle_name && (
            <Text style={styles.circleTag}>👥 {item.circle_name}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.rsvpBtn,
            item.is_attending && styles.rsvpBtnAttending,
            isFull && !item.is_attending && styles.rsvpBtnFull,
          ]}
          onPress={() => !item.is_attending && !isFull && handleRSVP(item.id)}
          disabled={item.is_attending || isFull}
        >
          <Text style={[styles.rsvpText, item.is_attending && styles.rsvpTextAttending]}>
            {item.is_attending ? '✓ Going' : isFull ? 'Full' : 'RSVP'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyTitle}>No events nearby yet</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')}>
            <Text style={{ color: Colors.primary, marginTop: 8, fontWeight: '600' }}>
              + Host the first one
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderEvent}
          contentContainerStyle={{ padding: Spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { ...Typography.h1 },
  addBtn: {
    backgroundColor: Colors.secondary, width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
  },
  dateBlock: {
    width: 44, alignItems: 'center',
    backgroundColor: Colors.primary + '15', borderRadius: Radius.sm,
    paddingVertical: 6, marginRight: Spacing.md,
  },
  dateDay: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  dateMon: { fontSize: 11, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase' },
  eventInfo: { flex: 1 },
  eventTitle: { ...Typography.h3, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { ...Typography.caption, flex: 1 },
  costLabel: { ...Typography.caption, color: Colors.secondary, marginLeft: 8 },
  circleTag: { ...Typography.caption, marginTop: 3, color: Colors.secondary },
  rsvpBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: Radius.full, marginLeft: 8,
  },
  rsvpBtnAttending: { backgroundColor: Colors.secondary },
  rsvpBtnFull: { backgroundColor: Colors.border },
  rsvpText: { color: Colors.white, fontWeight: '600', fontSize: 12 },
  rsvpTextAttending: { color: Colors.white },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
});
