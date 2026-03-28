import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  SafeAreaView, Alert, TouchableOpacity, RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProfileCard from '../components/ProfileCard';
import { Colors, Spacing, Typography } from '../constants/theme';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuth';

export default function DiscoverScreen({ navigation }) {
  const { user } = useAuthStore();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);

  const fetchCards = useCallback(async () => {
    try {
      const res = await api.get('/matches/daily');
      setCards(res.data.cards);
    } catch (err) {
      Alert.alert('Error', 'Could not load profiles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const handleAction = async (targetUser, action) => {
    setCards(prev => prev.filter(c => c.id !== targetUser.id));
    try {
      const res = await api.post('/matches/connect', {
        target_user_id: targetUser.id,
        action,
      });
      if (res.data.matched) {
        setMatchedUser(targetUser);
        setTimeout(() => setMatchedUser(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user?.city) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={Typography.h3}>Complete your profile first</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
          <Text style={{ color: Colors.primary, marginTop: 8 }}>Set up profile →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Kindred</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle-outline" size={30} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Match toast */}
      {matchedUser && (
        <View style={styles.matchToast}>
          <Text style={styles.matchToastText}>
            🎉 You and {matchedUser.name} connected! Say hi!
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[Typography.body, { marginTop: Spacing.sm }]}>Finding your people...</Text>
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>You've seen everyone for today</Text>
          <Text style={styles.emptySubtitle}>
            Come back tomorrow for new profiles, or check your matches!
          </Text>
          {user.subscription_tier === 'free' && (
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate('Premium')}
            >
              <Text style={styles.upgradeBtnText}>Get Kindred+ for unlimited profiles</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ marginBottom: Spacing.md }}>
              <ProfileCard
                user={item}
                onConnect={() => handleAction(item, 'connect')}
                onPass={() => handleAction(item, 'pass')}
              />
            </View>
          )}
          contentContainerStyle={{ paddingVertical: Spacing.md }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCards(); }} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  logo: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  matchToast: {
    backgroundColor: Colors.primary, margin: Spacing.md,
    padding: Spacing.md, borderRadius: 12,
  },
  matchToastText: { color: Colors.white, fontWeight: '600', textAlign: 'center', fontSize: 15 },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.xs },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  upgradeBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.accent,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999,
  },
  upgradeBtnText: { fontWeight: '700', color: Colors.dark },
});
