// ====== Arabic Translations (right-to-left) ======
const ar: Record<string, string | ((...args: any[]) => string)> = {
  // App
  appTitle: 'TriviaParty',

  // Language Selection
  selectLanguage: 'اختر لغتك',
  english: 'English',
  arabic: 'العربية',

  // Character Maker
  characterMaker: 'أنشئ شخصيتك',
  skinTone: 'لون البشرة',
  hairStyle: 'تصفيفة الشعر',
  hairColor: 'لون الشعر',
  eyes: 'العيون',
  accessory: 'الإكسسوار',
  backgroundColor: 'لون الخلفية',
  randomCharacter: 'شخصية عشوائية',
  currentCharacter: (desc: string) => `الشخصية الحالية: ${desc}`,
  characterOption: (part: string, current: number, total: number, label: string) =>
    `${part}، الخيار ${current} من ${total}: ${label}`,
  nicknameLabel: 'الاسم',
  nicknamePlaceholder: 'أدخل اسمك',
  nicknameHint: '3-15 حرفاً، حروف وأرقام',
  startPlaying: 'ابدأ اللعب!',

  // Home
  homeTitle: 'TriviaParty',
  playSolo: 'العب منفرداً',
  createRoom: 'أنشئ غرفة',
  joinRoom: 'انضم لغرفة',
  shop: 'المتجر',
  profile: 'الملف الشخصي',

  // Game
  survival: 'البقاء',
  lives: 'الأرواح',
  score: 'النقاط',
  streak: 'التتابع',
  bestStreak: 'أفضل تتابع',
  question: 'سؤال',
  of: 'من',
  correct: 'صحيح!',
  wrong: 'خطأ!',
  timeUp: 'انتهى الوقت!',
  correctAnswer: 'الإجابة الصحيحة:',
  yourAnswer: 'إجابتك',
  youGotItRight: 'أجبت صحيحاً!',
  nextQuestion: 'التالي',
  gameOver: 'انتهت اللعبة!',
  survivalResults: 'نجوت {count} أسئلة!',
  finalScore: 'النتيجة النهائية',
  newBestStreak: 'رقم قياسي جديد!',
  playAgain: 'لعب مرة أخرى',
  goHome: 'العودة للرئيسية',

  // Timer
  seconds: 'ثانية',

  // Results
  results: 'النتائج',
  totalCorrect: 'الإجابات الصحيحة',
  totalWrong: 'الإجابات الخاطئة',
  gamesPlayed: 'الألعاب التي لعبتها',

  // Errors
  loading: 'جارٍ تحميل الأسئلة...',
  errorNoQuestions: 'تعذر تحميل الأسئلة. تحقق من اتصالك.',
  retry: 'إعادة المحاولة',

  // Accessibility
  questionRead: (n: number) => `سؤال ${n}`,
  answerOption: (label: string, index: number) => `خيار ${index + 1}: ${label}`,
  timerSeconds: (s: number) => `${s} ثانية متبقية`,
  gameStarted: 'بدأت اللعبة! حظ موفق!',
  scoreAnnounced: (s: number) => `نقاطك ${s}`,
  correctAnnounce: 'هذا صحيح!',
  wrongAnnounce: 'هذا خطأ.',
};

export default ar;
