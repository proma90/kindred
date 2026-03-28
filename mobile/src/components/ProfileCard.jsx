import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing, Shadows, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.md * 2;

export default function ProfileCard({ user, onConnect, onPass, showActions = true }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = user.photos?.length > 0 ? user.photos : ['https://via.placeholder.com/400x500'];

  return (
    <View style={[styles.card, Shadows.lg]}>
      {/* Photos */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setPhotoIndex((i) => (i + 1) % photos.length)}
      >
        <Image source={{ uri: photos[photoIndex] }} style={styles.photo} />

        {/* Photo dots */}
        {photos.length > 1 && (
          <View style={styles.dots}>
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
            ))}
          </View>
        )}

        {/* Compatibility badge */}
        {user.compatibility_score != null && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{user.compatibility_score}% match</Text>
          </View>
        )}

        {/* Verified badge */}
        {user.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.name}, {user.age_range}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.location}>{user.neighborhood || user.city}</Text>
          </View>
        </View>

        {user.bio ? <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text> : null}

        {/* Icebreaker */}
        {user.icebreaker && (
          <View style={styles.icebreaker}>
            <Text style={styles.icebreakerText}>💬 {user.icebreaker}</Text>
          </View>
        )}

        {/* Interests */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tags}>
          {(user.interests || []).slice(0, 6).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Action buttons */}
        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={onPass}>
              <Ionicons name="close" size={28} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.connectBtn]} onPress={onConnect}>
              <Ionicons name="heart" size={28} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
  },
  photo: { width: '100%', height: 400, resizeMode: 'cover' },
  dots: {
    position: 'absolute', top: Spacing.sm,
    left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.white, width: 18 },
  scoreBadge: {
    position: 'absolute', bottom: Spacing.sm, right: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  scoreText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  verifiedBadge: {
    position: 'absolute', top: Spacing.sm, left: Spacing.sm,
    backgroundColor: Colors.secondary, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  verifiedText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  info: { padding: Spacing.md },
  nameRow: { marginBottom: Spacing.xs },
  name: { ...Typography.h2, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  location: { ...Typography.bodySmall },
  bio: { ...Typography.body, color: Colors.textSecondary, marginVertical: Spacing.xs },
  icebreaker: {
    backgroundColor: Colors.accent + '40',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  icebreakerText: { fontSize: 13, color: Colors.dark, fontStyle: 'italic' },
  tags: { marginVertical: Spacing.sm },
  tag: {
    backgroundColor: Colors.secondary + '25',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 6,
  },
  tagText: { color: Colors.secondary, fontSize: 12, fontWeight: '600' },
  actions: {
    flexDirection: 'row', justifyContent: 'center',
    gap: Spacing.xl, marginTop: Spacing.sm,
  },
  actionBtn: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  passBtn: { backgroundColor: Colors.border },
  connectBtn: { backgroundColor: Colors.primary },
});
