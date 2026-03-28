import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import Button from '../components/Button';
import useAuthStore from '../hooks/useAuth';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuthStore();

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert('Please fill in all fields');
    if (mode === 'register' && !name) return Alert.alert('Please enter your name');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
        navigation.navigate('Onboarding');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#E07A5F', '#81B29A']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.logo}>Kindred</Text>
          <Text style={styles.tagline}>Find your people.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </Text>

            {mode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title={mode === 'login' ? 'Log In' : 'Get Started'}
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: Spacing.sm }}
            />

            <TouchableOpacity
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={styles.switchBtn}
            >
              <Text style={styles.switchText}>
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Log in'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legal}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
            Kindred is for platonic friendships only.
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flexGrow: 1, padding: Spacing.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { fontSize: 48, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  tagline: { fontSize: 18, color: 'rgba(255,255,255,0.85)', marginBottom: Spacing.xl },
  card: {
    width: '100%', backgroundColor: Colors.white,
    borderRadius: Radius.xl, padding: Spacing.lg,
  },
  cardTitle: { ...Typography.h2, marginBottom: Spacing.md },
  input: {
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 14,
    fontSize: 15, marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  switchBtn: { alignItems: 'center', marginTop: Spacing.md },
  switchText: { color: Colors.primary, fontSize: 14, fontWeight: '500' },
  legal: {
    color: 'rgba(255,255,255,0.7)', fontSize: 11,
    textAlign: 'center', marginTop: Spacing.lg, lineHeight: 16,
  },
});
