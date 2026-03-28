import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import api from '../utils/api';
import { formatDistanceToNow } from '../utils/time';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/matches/active');
        setMatches(res.data.matches);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const renderMatch = ({ item }) => {
    const photo = item.photos?.[0];
    const hasUnread = parseInt(item.unread_count) > 0;

    return (
      <TouchableOpacity
        style={[styles.matchRow, Shadows.sm]}
        onPress={() => navigation.navigate('Chat', {
          match_id: item.match_id,
          name: item.name,
          photo: photo,
        })}
        activeOpacity={0.7}
      >
        <View style={styles.photoWrapper}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoInitial}>{item.name[0]}</Text>
            </View>
          )}
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.info}>
          <View style={styles.infoTop}>
            <Text style={[styles.name, hasUnread && styles.nameBold]}>{item.name}</Text>
            {item.last_message_at && (
              <Text style={styles.time}>{formatDistanceToNow(item.last_message_at)}</Text>
            )}
          </View>
          <Text style={[styles.preview, hasUnread && styles.previewBold]} numberOfLines={1}>
            {item.last_message || '💬 Say hi to ' + item.name + '!'}
          </Text>
          <View style={styles.scoreRow}>
            <Ionicons name="heart" size={12} color={Colors.primary} />
            <Text style={styles.score}>{Math.round(item.compatibility_score)}% match</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.hangoutBtn}
          onPress={() => navigation.navigate('ProposeHangout', { match_id: item.match_id, name: item.name })}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.subtitle}>{matches.length} connection{matches.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>👋</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            Start connecting with people on Discover. When you both connect, you'll appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.match_id}
          renderItem={renderMatch}
          contentContainerStyle={{ padding: Spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { ...Typography.h1 },
  subtitle: { ...Typography.bodySmall, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  matchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
  },
  photoWrapper: { position: 'relative', marginRight: Spacing.md },
  photo: { width: 56, height: 56, borderRadius: 28 },
  photoPlaceholder: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  photoInitial: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  unreadDot: {
    position: 'absolute', top: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.white,
  },
  info: { flex: 1 },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  nameBold: { fontWeight: '700' },
  time: { ...Typography.caption },
  preview: { ...Typography.bodySmall, marginTop: 2 },
  previewBold: { fontWeight: '600', color: Colors.textPrimary },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  score: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  hangoutBtn: { padding: 6, marginLeft: Spacing.sm },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h2, marginBottom: Spacing.xs },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});
