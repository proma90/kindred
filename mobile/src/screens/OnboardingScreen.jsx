import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, SafeAreaView,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import Button from '../components/Button';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuth';

const STEPS = ['basics', 'quiz', 'interests'];

const INTERESTS = [
  'Hiking', 'Gaming', 'Cooking', 'Film', 'Books', 'Fitness',
  'Art', 'Music', 'Tech', 'Travel', 'Volunteering', 'Parenting',
  'Pets', 'Photography', 'Yoga', 'Cycling', 'Coffee', 'Dancing',
];

const QUIZ_QUESTIONS = [
  {
    key: 'social_style',
    question: 'How do you recharge?',
    options: ['Alone time (introvert)', 'Small groups', 'Big social events (extrovert)'],
  },
  {
    key: 'weekend_energy',
    question: 'Your ideal weekend looks like:',
    options: ['Cozy at home', 'Outdoor adventure', 'Spontaneous plans', 'Pre-planned activities'],
  },
  {
    key: 'communication_style',
    question: 'You keep in touch by:',
    options: ['Texting all day', 'Voice/video calls', 'Memes & GIFs', 'Deep 1-on-1 convos'],
  },
  {
    key: 'friendship_goals',
    question: 'What kind of friend are you looking for?',
    options: ['Accountability partner', 'Activity buddy', 'Emotional support', 'Coffee & chill'],
  },
];

const AGE_RANGES = ['18-24', '25-30', '31-35', '36-40', '41-45', '46+'];

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuthStore();

  // Step 0 — Basics
  const [ageRange, setAgeRange] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [bio, setBio] = useState('');

  // Step 1 — Quiz
  const [quizAnswers, setQuizAnswers] = useState({});

  // Step 2 — Interests
  const [interests, setInterests] = useState([]);

  const toggleInterest = (tag) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter(i => i !== tag));
    } else if (interests.length < 8) {
      setInterests([...interests, tag]);
    }
  };

  const next = () => {
    if (step === 0 && (!city || !ageRange)) {
      return Alert.alert('Please select your age range and city');
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/onboarding', {
        age_range: ageRange,
        city,
        neighborhood,
        bio,
        quiz_answers: quizAnswers,
        interests,
      });
      updateUser(res.data.user);
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressStep, i <= step && styles.progressActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <View>
            <Text style={styles.title}>Let's set up your profile</Text>
            <Text style={styles.subtitle}>This helps us find your people.</Text>

            <Text style={styles.label}>Age range</Text>
            <View style={styles.optionsRow}>
              {AGE_RANGES.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, ageRange === r && styles.chipSelected]}
                  onPress={() => setAgeRange(r)}
                >
                  <Text style={[styles.chipText, ageRange === r && styles.chipTextSelected]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Your city</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Berlin" />

            <Text style={styles.label}>Neighborhood (optional)</Text>
            <TextInput style={styles.input} value={neighborhood} onChangeText={setNeighborhood} placeholder="e.g. Prenzlauer Berg" />

            <Text style={styles.label}>Bio (one line about you)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="I'm a UX designer who loves hiking and bad films 🎬"
              multiline
              maxLength={120}
            />
            <Text style={styles.charCount}>{bio.length}/120</Text>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.title}>Quick quiz</Text>
            <Text style={styles.subtitle}>Helps us find compatible people for you.</Text>
            {QUIZ_QUESTIONS.map((q) => (
              <View key={q.key} style={styles.question}>
                <Text style={styles.questionText}>{q.question}</Text>
                {q.options.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.option, quizAnswers[q.key] === opt && styles.optionSelected]}
                    onPress={() => setQuizAnswers({ ...quizAnswers, [q.key]: opt })}
                  >
                    <Text style={[styles.optionText, quizAnswers[q.key] === opt && styles.optionTextSelected]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Your interests</Text>
            <Text style={styles.subtitle}>Pick up to 8 things you love.</Text>
            <Text style={styles.charCount}>{interests.length}/8 selected</Text>
            <View style={styles.interestsGrid}>
              {INTERESTS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, styles.chipLarge, interests.includes(tag) && styles.chipSelected]}
                  onPress={() => toggleInterest(tag)}
                >
                  <Text style={[styles.chipText, interests.includes(tag) && styles.chipTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <Button
          title={step === STEPS.length - 1 ? "Let's go! 🎉" : 'Continue'}
          onPress={next}
          loading={loading}
          style={styles.nextBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progressBar: { flexDirection: 'row', gap: 6, padding: Spacing.md },
  progressStep: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  progressActive: { backgroundColor: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  title: { ...Typography.h1, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  label: { ...Typography.label, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 14, fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.white,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  charCount: { ...Typography.caption, textAlign: 'right', marginTop: 4 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  chipLarge: { paddingHorizontal: 16, paddingVertical: 10 },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextSelected: { color: Colors.white },
  question: { marginBottom: Spacing.lg },
  questionText: { ...Typography.h3, marginBottom: Spacing.sm },
  option: {
    padding: 14, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white, marginBottom: 8,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  optionText: { fontSize: 14, color: Colors.textSecondary },
  optionTextSelected: { color: Colors.primary, fontWeight: '600' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, backgroundColor: Colors.background,
    flexDirection: 'row', gap: Spacing.sm,
  },
  backBtn: {
    paddingVertical: 14, paddingHorizontal: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  backText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  nextBtn: { flex: 1 },
});
