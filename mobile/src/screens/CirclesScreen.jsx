import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import api from '../utils/api';

const INTEREST_EMOJIS = {
  Hiking: '🥾', Gaming: '🎮', Cooking: '🍳', Film: '🎬',
  Books: '📚', Fitness: '💪', Art: '🎨', Music: '🎵',
  Tech: '💻', Travel: '✈️', Volunteering: '🤝', Parenting: '👶',
  Pets: '🐾', Photography: '📸', Yoga: '🧘', Cycling: '🚴',
};

export default function CirclesScreen({ navigation }) {
  const [nearby, setNearby] = useState([]);
  const [mine, setMine] = useState([]);
  const [tab, setTab] = useState('nearby'); // 'nearby' | 'mine'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [nearbyRes, mineRes] = await Promise.all([
          api.get('/circles/nearby'),
          api.get('/circles/mine'),
        ]);
        setNearby(nearbyRes.data.circles);
        setMine(mineRes.data.circles);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleJoin = async (circleId, circleName) => {
    try {
      await api.post(`/circles/${circleId}/join`);
      Alert.alert('Joined!', `You're now part of ${circleName} 🎉`);
      const [nearbyRes, mineRes] = await Promise.all([
        api.get('/circles/nearby'),
        api.get('/circles/mine'),
      ]);
      setNearby(nearbyRes.data.circles);
      setMine(mineRes.data.circles);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not join');
    }
  };

  const renderCircle = ({ item }) => {
    const emoji = INTEREST_EMOJIS[item.interest_tag] || '👥';
    const isFull = parseInt(item.member_count) >= item.max_members;

    return (
      <TouchableOpacity
        style={[styles.card, Shadows.sm]}
        onPress={() => navigation.navigate('CircleDetail', { circle_id: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.city} · {item.member_count}/{item.max_members} members
          </Text>
          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          )}
          {item.schedule && (
            <Text style={styles.cardSchedule}>📅 {item.schedule}</Text>
          )}
        </View>
        {!item.is_member ? (
          <TouchableOpacity
            style={[styles.joinBtn, isFull && styles.joinBtnFull]}
            onPress={() => !isFull && handleJoin(item.id, item.name)}
            disabled={isFull}
          >
            <Text style={styles.joinBtnText}>{isFull ? 'Full' : 'Join'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.memberBadge}>
            <Ionicons name="checkmark" size={14} color={Colors.secondary} />
            <Text style={styles.memberText}>Joined</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const data = tab === 'nearby' ? nearby : mine;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Circles</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateCircle')}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['nearby', 'mine'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'nearby' ? 'Near You' : 'My Circles'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>{tab === 'nearby' ? '🌍' : '👥'}</Text>
          <Text style={styles.emptyTitle}>
            {tab === 'nearby' ? 'No circles in your city yet' : 'You haven\'t joined any circles'}
          </Text>
          <TouchableOpacity
            style={styles.createCircleBtn}
            onPress={() => navigation.navigate('CreateCircle')}
          >
            <Text style={styles.createCircleBtnText}>+ Create the first one</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderCircle}
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
  createBtn: {
    backgroundColor: Colors.primary, width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1,
    borderBottomColor: Colors.border, backgroundColor: Colors.white,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { ...Typography.label, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
  },
  cardLeft: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.background, alignItems: 'center',
    justifyContent: 'center', marginRight: Spacing.sm,
  },
  emoji: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardName: { ...Typography.h3, fontSize: 15 },
  cardMeta: { ...Typography.caption, marginTop: 2 },
  cardDesc: { ...Typography.bodySmall, marginTop: 2 },
  cardSchedule: { ...Typography.caption, marginTop: 3, color: Colors.secondary },
  joinBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: Radius.full,
  },
  joinBtnFull: { backgroundColor: Colors.border },
  joinBtnText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberText: { color: Colors.secondary, fontSize: 12, fontWeight: '600' },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, textAlign: 'center', color: Colors.textSecondary },
  createCircleBtn: { marginTop: Spacing.lg },
  createCircleBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
});
