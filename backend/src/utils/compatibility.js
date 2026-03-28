/**
 * Kindred Compatibility Scoring Algorithm
 * Score = quiz (50%) + interests (30%) + location (20%)
 */

const QUIZ_WEIGHT = 0.5;
const INTERESTS_WEIGHT = 0.3;
const LOCATION_WEIGHT = 0.2;

// Questions where exact match is ideal
const EXACT_MATCH_KEYS = ['social_style', 'weekend_energy', 'communication_style'];

// Questions where close match scores well
const RANGE_MATCH_KEYS = ['friendship_goals', 'life_stage'];

function scoreQuizAnswers(answersA, answersB) {
  if (!answersA || !answersB) return 0;
  let score = 0;
  let total = 0;

  for (const key of EXACT_MATCH_KEYS) {
    if (answersA[key] && answersB[key]) {
      score += answersA[key] === answersB[key] ? 1 : 0.3;
      total++;
    }
  }

  for (const key of RANGE_MATCH_KEYS) {
    if (answersA[key] && answersB[key]) {
      const a = Array.isArray(answersA[key]) ? answersA[key] : [answersA[key]];
      const b = Array.isArray(answersB[key]) ? answersB[key] : [answersB[key]];
      const overlap = a.filter(v => b.includes(v)).length;
      score += overlap > 0 ? Math.min(overlap / Math.max(a.length, b.length), 1) : 0.1;
      total++;
    }
  }

  // Values: top 3 ranked — score by overlap
  if (answersA.values && answersB.values) {
    const aVals = answersA.values.slice(0, 3);
    const bVals = answersB.values.slice(0, 3);
    const overlap = aVals.filter(v => bVals.includes(v)).length;
    score += overlap / 3;
    total++;
  }

  return total > 0 ? score / total : 0;
}

function scoreInterests(interestsA, interestsB) {
  if (!interestsA?.length || !interestsB?.length) return 0;
  const setA = new Set(interestsA);
  const overlap = interestsB.filter(i => setA.has(i)).length;
  const union = new Set([...interestsA, ...interestsB]).size;
  return overlap / union; // Jaccard similarity
}

function scoreLocation(cityA, neighborhoodA, cityB, neighborhoodB) {
  if (cityA !== cityB) return 0;
  if (neighborhoodA && neighborhoodB && neighborhoodA === neighborhoodB) return 1;
  return 0.6; // Same city, different neighborhood
}

function calculateCompatibility(userA, userB) {
  const quizScore = scoreQuizAnswers(userA.quiz_answers, userB.quiz_answers);
  const interestScore = scoreInterests(userA.interests, userB.interests);
  const locationScore = scoreLocation(
    userA.city, userA.neighborhood,
    userB.city, userB.neighborhood
  );

  const total =
    quizScore * QUIZ_WEIGHT +
    interestScore * INTERESTS_WEIGHT +
    locationScore * LOCATION_WEIGHT;

  return Math.round(total * 100); // Return as 0-100 percentage
}

module.exports = { calculateCompatibility };
