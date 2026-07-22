// ====== English Translations ======
const en = {
  // App
  appTitle: 'TriviaParty',

  // Language Selection
  selectLanguage: 'Choose Your Language',
  english: 'English',
  arabic: 'العربية',

  // Character Maker
  characterMaker: 'Create Your Character',
  skinTone: 'Skin Tone',
  hairStyle: 'Hair Style',
  hairColor: 'Hair Color',
  eyes: 'Eyes',
  accessory: 'Accessory',
  backgroundColor: 'Background Color',
  randomCharacter: 'Random Character',
  currentCharacter: (desc: string) => `Current character: ${desc}`,
  characterOption: (part: string, current: number, total: number, label: string) =>
    `${part}, option ${current} of ${total}: ${label}`,
  nicknameLabel: 'Nickname',
  nicknamePlaceholder: 'Enter your nickname',
  nicknameHint: '3-15 characters, letters and numbers',
  startPlaying: 'Start Playing!',

  // Home
  homeTitle: 'TriviaParty',
  playSolo: 'Play Solo',
  createRoom: 'Create Room',
  joinRoom: 'Join Room',
  shop: 'Shop',
  profile: 'Profile',

  // Game - Solo Survival
  survival: 'Survival',
  lives: 'Lives',
  score: 'Score',
  streak: 'Streak',
  bestStreak: 'Best Streak',
  question: 'Question',
  of: 'of',
  correct: 'Correct!',
  wrong: 'Wrong!',
  timeUp: "Time's Up!",
  correctAnswer: 'The correct answer was:',
  yourAnswer: 'Your answer',
  youGotItRight: 'You got it right!',
  nextQuestion: 'Next',
  gameOver: 'Game Over!',
  survivalResults: 'You survived {count} questions!',
  finalScore: 'Final Score',
  newBestStreak: 'New Best Streak!',
  playAgain: 'Play Again',
  goHome: 'Go Home',

  // Timer
  seconds: 'sec',

  // Results
  results: 'Results',
  totalCorrect: 'Total Correct',
  totalWrong: 'Total Wrong',
  gamesPlayed: 'Games Played',

  // Errors
  loading: 'Loading questions...',
  errorNoQuestions: "Couldn't load questions. Check your connection.",
  retry: 'Retry',

  // Accessibility
  questionRead: (n: number) => `Question ${n}`,
  answerOption: (label: string, index: number) => `Answer option ${index + 1}: ${label}`,
  timerSeconds: (s: number) => `${s} seconds remaining`,
  gameStarted: 'Game started! Good luck!',
  scoreAnnounced: (s: number) => `Your score is ${s}`,
  correctAnnounce: 'That was correct!',
  wrongAnnounce: 'That was wrong.',
};

export type TranslationKeys = typeof en;
export default en;
