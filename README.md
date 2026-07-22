# TriviaParty 🎯

A free online multiplayer trivia party game. Friends join with a room code, answer live-synced questions, battle in surprise challenges, and earn coins for power-ups. Arabic and English.

Built by **Ahmed Torky (Torky)** for his 1M+ followers.

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Hosting:** Cloudflare Pages
- **Realtime:** Supabase (coming in Phase 2)
- **Questions:** The Trivia API + Open Trivia Database (fallback)
- **AI:** Google Gemini (Phase 5)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Current Phase

**Phase 1: Solo Survival** — Play solo survival mode with live API questions, dark theme, character maker, and full accessibility.

## Roadmap

| Phase | Feature |
|-------|---------|
| 1 | ✅ Solo Survival (live) |
| 2 | Multiplayer rooms + lobby |
| 3 | Economy, shop, power-ups |
| 4 | Challenges (Tap Frenzy, Shake It, Blow Up, Lucky Box) |
| 5 | Arabic UI + RTL, AI questions, Survival multiplayer |
| 6 | Polish, sound, accessibility, share cards, launch |

## Accessibility

Built with NVDA screen reader in mind from day one:
- Semantic HTML, ARIA labels, keyboard navigation
- Screen-reader-friendly character maker
- Arablic RTL support ready
- Focus management throughout
