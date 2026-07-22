import type { TriviaQuestion } from '../types';

// The Trivia API - free, no key required
// Docs: https://the-trivia-api.com/docs/
const TRIVIA_API_BASE = 'https://the-trivia-api.com/v2';

// Fallback: Open Trivia Database
const OPENTDB_BASE = 'https://opentdb.com/api.php';

export interface TriviaApiResponse {
  id: string;
  category: string;
  difficulty: string;
  question: string; // HTML entities!
  correctAnswer: string;
  incorrectAnswers: string[];
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function normalizeQuestion(q: TriviaApiResponse): TriviaQuestion {
  const question = decodeHtmlEntities(q.question);
  const correctAnswer = decodeHtmlEntities(q.correctAnswer);
  const incorrectAnswers = q.incorrectAnswers.map(decodeHtmlEntities);

  return {
    id: q.id || String(Math.random()),
    category: decodeHtmlEntities(q.category),
    difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
    question,
    correctAnswer,
    incorrectAnswers,
    allAnswers: shuffleArray([correctAnswer, ...incorrectAnswers]),
  };
}

/**
 * Fetch questions from The Trivia API v2 (primary source)
 */
export async function fetchQuestions(
  count: number = 10,
  category?: string
): Promise<TriviaQuestion[]> {
  const params = new URLSearchParams({
    limit: String(count),
  });
  if (category && category !== 'any') {
    // Map our category names to their slugs
    params.set('categories', category.toLowerCase().replace(/\s+/g, '_'));
  }

  const url = `${TRIVIA_API_BASE}/questions?${params}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data: TriviaApiResponse[] = await response.json();
    const questions = data.map(normalizeQuestion);

    if (questions.length === 0) throw new Error('No questions returned');

    return questions;
  } catch (err) {
    console.warn('Primary API failed, trying fallback:', err);
    return fetchQuestionsFallback(count);
  }
}

/**
 * Fallback to Open Trivia Database
 */
async function fetchQuestionsFallback(count: number): Promise<TriviaQuestion[]> {
  const url = `${OPENTDB_BASE}?amount=${count}&type=multiple&encode=base64`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`OpenTDB returned ${response.status}`);

    const data = await response.json();
    if (data.response_code !== 0) throw new Error(`OpenTDB error: ${data.response_code}`);

    return data.results.map((q: any, i: number) => {
      const correctAnswer = atob(q.correct_answer);
      const incorrectAnswers = q.incorrect_answers.map((a: string) => atob(a));

      return {
        id: `opentdb-${i}-${Date.now()}`,
        category: atob(q.category),
        difficulty: q.difficulty,
        question: atob(q.question),
        correctAnswer,
        incorrectAnswers,
        allAnswers: shuffleArray([correctAnswer, ...incorrectAnswers]),
      };
    });
  } catch (err) {
    console.error('All API sources failed:', err);
    throw new Error('Could not fetch questions. Check your connection.');
  }
}

/**
 * Available categories from The Trivia API
 * Food & Drink is featured first as it's Torky's brand
 */
export const CATEGORIES = [
  { id: 'food_and_drink', name: '🍔 Food & Drink' },
  { id: 'arts_and_literature', name: '🎨 Arts & Literature' },
  { id: 'film_and_tv', name: '🎬 Film & TV' },
  { id: 'history', name: '📜 History' },
  { id: 'music', name: '🎵 Music' },
  { id: 'science', name: '🔬 Science' },
  { id: 'society_and_culture', name: '🌍 Society & Culture' },
  { id: 'sport_and_leisure', name: '⚽ Sport & Leisure' },
  { id: 'geography', name: '🌎 Geography' },
  { id: 'general_knowledge', name: '🧠 General Knowledge' },
];

export const CATEGORY_ANY = { id: 'any', name: '🎲 Mixed' };
