import React, { useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import Button from '../components/Button';
import useAuthStore from '../hooks/useAuth';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  const photo = user?.photos?.[0];
  const isPremium = user?.subscription_tier === 'premium';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <LinearGradient colors={['#E07A5F', '#81B29A']} style={styles.headerGradient}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="pencil" size={18} color={Colors.white} />
          </TouchableOpacity>

          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{user?.name?.[0]}</Text>
            </View>
          )}

          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.meta}>
            {user?.age_range} · {user?.neighborhood || user?.city}
          </Text>

          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color={Colors.dark} />
              <Text style={styles.premiumText}>Kindred+</Text>
            </View>
          )}
        </LinearGradient>

        {/* Bio */}
        {user?.bio && (
          <View style={styles.section}>
            <Text style={styles.bio}>{user.bio}</Text>
          </View>
        )}

        {/* Interests */}
        {user?.interests?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.tags}>
              {user.interests.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Premium CTA */}
        {!isPremium && (
          <TouchableOpacity
            style={[styles.premiumCard, Shadows.md]}
            onPress={() => navigation.navigate('Premium')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#F2CC8F', '#E07A5F']} style={styles.premiumGradient}>
              <Ionicons name="star" size={24} color={Colors.white} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.premiumCardTitle}>Upgrade to Kindred+</Text>
                <Text style={styles.premiumCardSub}>Unlimited matches · See who likes you · Advanced filters</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {[
            { icon: 'person-outline', label: 'Edit Profile', screen: 'EditProfile' },
            { icon: 'shield-checkmark-outline', label: 'Safety & Privacy', screen: 'Safety' },
            { icon: 'card-outline', label: 'Billing', screen: 'Billing' },
            { icon: 'help-circle-outline', label: 'Help & Feedback', screen: 'Help' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.settingsRow}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
              <Text style={styles.settingsLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl }}>
          <Button
            title="Log Out"
            variant="outline"
            onPress={handleLogout}
            loading={loggingOut}
          />
          <Text style={styles.legalText}>
            Kindred v1.0.0 · Platonic connections only{'\n'}
            Report issues: hello@kindred.app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xl },
  headerGradient: { alignItems: 'center', paddingVertical: Spacing.xl, paddingTop: 50 },
  editBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.white },
  avatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: Colors.white },
  name: { fontSize: 22, fontWeight: '700', color: Colors.white, marginTop: Spacing.sm },
  meta: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: Spacing.sm,
  },
  premiumText: { fontWeight: '700', color: Colors.dark, fontSize: 12 },
  section: {
    backgroundColor: Colors.white, marginHorizontal: Spacing.md,
    marginTop: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md,
  },
  sectionTitle: { ...Typography.label, color: Colors.textMuted, marginBottom: Spacing.sm, textTransform: 'uppercase', fontSize: 11 },
  bio: { ...Typography.body, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.secondary + '20', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  tagText: { color: Colors.secondary, fontSize: 13, fontWeight: '600' },
  premiumCard: { marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  premiumGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  premiumCardTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  premiumCardSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.background, gap: Spacing.sm,
  },
  settingsLabel: { ...Typography.body, flex: 1 },
  legalText: {
    ...Typography.caption, textAlign: 'center',
    marginTop: Spacing.lg, color: Colors.textMuted, lineHeight: 18,
  },
});
