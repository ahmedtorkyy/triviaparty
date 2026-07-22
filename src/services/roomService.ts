// ====== Room Code Generation ======

// Exclude ambiguous letters: O, I, Q
const CODE_ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('');
const CODE_LENGTH = 4;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// ====== Nickname Helpers ======

const BAD_WORDS_EN = /fuck|shit|damn|ass|crap|bitch|dick|piss/i;
const BAD_WORDS_AR = /كس|شرموط|عرص|زمب|قحبة/i; // basic Arabic filter

export function validateNickname(nickname: string): string | null {
  const trimmed = nickname.trim();
  if (trimmed.length < 3 || trimmed.length > 15) {
    return 'Nickname must be 3-15 characters';
  }
  if (!/^[a-zA-Z0-9\u0600-\u06FF\s]+$/.test(trimmed)) {
    return 'Use letters and numbers only';
  }
  if (BAD_WORDS_EN.test(trimmed) || BAD_WORDS_AR.test(trimmed)) {
    return 'Please choose a different nickname';
  }
  return null;
}

export function disambiguateNickname(nickname: string, existing: string[]): string {
  if (!existing.includes(nickname)) return nickname;
  let suffix = 1;
  while (existing.includes(`${nickname}${suffix}`)) suffix++;
  return `${nickname}${suffix}`;
}
