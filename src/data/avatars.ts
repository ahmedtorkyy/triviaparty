// ====== Avatar Data ======

import type { Avatar } from '../types';

// Default avatar (free)
export const defaultAvatar: Avatar = {
  id: 'default',
  name: 'Default',
  cost: 0,
  svg: `<svg viewBox="0 0 120 160" width="120" height="160">
    <circle cx="60" cy="60" r="58" fill="#FFD700" />
    <ellipse cx="60" cy="55" rx="28" ry="30" fill="#F5D7B0" />
    <path d="M32,50 Q32,20 60,18 Q88,20 88,50" fill="#8B4513" />
    <circle cx="48" cy="52" r="3" fill="white" />
    <circle cx="72" cy="52" r="3" fill="white" />
    <circle cx="48" cy="52" r="1.5" fill="#222" />
    <circle cx="72" cy="52" r="1.5" fill="#222" />
    <path d="M48,64 Q60,74 72,64" fill="none" stroke="#222" strokeWidth="2" />
  </svg>`,
  preview: '/avatars/default.png',
};

// Unlockable avatars
export const avatars: Avatar[] = [
  defaultAvatar,
  {
    id: 'robot',
    name: 'Robot',
    cost: 500,
    svg: `<svg viewBox="0 0 120 160" width="120" height="160">
      <rect x="20" y="20" width="80" height="100" rx="10" fill="#A9A9A9" />
      <rect x="30" y="30" width="20" height="20" rx="5" fill="#696969" />
      <rect x="70" y="30" width="20" height="20" rx="5" fill="#696969" />
      <circle cx="40" cy="40" r="2" fill="#FF0000" />
      <circle cx="80" cy="40" r="2" fill="#FF0000" />
      <rect x="45" y="50" width="30" height="4" rx="2" fill="#696969" />
      <rect x="35" y="60" width="50" height="40" rx="5" fill="#D3D3D3" />
      <rect x="40" y="110" width="15" height="30" rx="3" fill="#A9A9A9" />
      <rect x="65" y="110" width="15" height="30" rx="3" fill="#A9A9A9" />
    </svg>`,
    preview: '/avatars/robot.png',
  },
  {
    id: 'ninja',
    name: 'Ninja',
    cost: 800,
    svg: `<svg viewBox="0 0 120 160" width="120" height="160">
      <circle cx="60" cy="60" r="58" fill="#2F4F4F" />
      <ellipse cx="60" cy="55" rx="28" ry="30" fill="#F5D7B0" />
      <path d="M32,50 Q32,20 60,18 Q88,20 88,50" fill="#000" />
      <circle cx="48" cy="52" r="3" fill="white" />
      <circle cx="72" cy="52" r="3" fill="white" />
      <circle cx="48" cy="52" r="1.5" fill="#222" />
      <circle cx="72" cy="52" r="1.5" fill="#222" />
      <path d="M40,64 Q60,70 80,64" fill="none" stroke="#000" strokeWidth="2" />
      <path d="M30,80 Q60,90 90,80" fill="none" stroke="#000" strokeWidth="3" />
    </svg>`,
    preview: '/avatars/ninja.png',
  },
  {
    id: 'alien',
    name: 'Alien',
    cost: 1200,
    svg: `<svg viewBox="0 0 120 160" width="120" height="160">
      <circle cx="60" cy="60" r="58" fill="#7CFC00" />
      <ellipse cx="60" cy="55" rx="28" ry="30" fill="#90EE90" />
      <path d="M32,50 Q32,20 60,18 Q88,20 88,50" fill="#228B22" />
      <ellipse cx="48" cy="52" rx="6" ry="4" fill="white" />
      <ellipse cx="72" cy="52" rx="6" ry="4" fill="white" />
      <circle cx="48" cy="52" r="2" fill="#222" />
      <circle cx="72" cy="52" r="2" fill="#222" />
      <path d="M40,64 Q60,70 80,64" fill="none" stroke="#222" strokeWidth="2" />
    </svg>`,
    preview: '/avatars/alien.png',
  },
  {
    id: 'pirate',
    name: 'Pirate',
    cost: 1500,
    svg: `<svg viewBox="0 0 120 160" width="120" height="160">
      <circle cx="60" cy="60" r="58" fill="#F5D7B0" />
      <ellipse cx="60" cy="55" rx="28" ry="30" fill="#F5D7B0" />
      <path d="M32,50 Q32,20 60,18 Q88,20 88,50" fill="#8B4513" />
      <circle cx="48" cy="52" r="3" fill="white" />
      <circle cx="72" cy="52" r="3" fill="white" />
      <circle cx="48" cy="52" r="1.5" fill="#222" />
      <circle cx="72" cy="52" r="1.5" fill="#222" />
      <path d="M40,64 Q60,70 80,64" fill="none" stroke="#222" strokeWidth="2" />
      <path d="M30,40 Q60,30 90,40" fill="none" stroke="#000" strokeWidth="3" />
      <circle cx="60" cy="45" r="8" fill="#000" />
    </svg>`,
    preview: '/avatars/pirate.png',
  },
  {
    id: 'wizard',
    name: 'Wizard',
    cost: 2000,
    svg: `<svg viewBox="0 0 120 160" width="120" height="160">
      <circle cx="60" cy="60" r="58" fill="#6A5ACD" />
      <ellipse cx="60" cy="55" rx="28" ry="30" fill="#F5D7B0" />
      <path d="M32,50 Q32,20 60,18 Q88,20 88,50" fill="#FFFFFF" />
      <circle cx="48" cy="52" r="3" fill="white" />
      <circle cx="72" cy="52" r="3" fill="white" />
      <circle cx="48" cy="52" r="1.5" fill="#222" />
      <circle cx="72" cy="52" r="1.5" fill="#222" />
      <path d="M40,64 Q60,70 80,64" fill="none" stroke="#222" strokeWidth="2" />
      <path d="M20,30 Q60,10 100,30" fill="none" stroke="#FFD700" strokeWidth="3" />
    </svg>`,
    preview: '/avatars/wizard.png',
  },
];

/** Get avatar by ID */
export function getAvatar(id: string): Avatar | undefined {
  return avatars.find((a) => a.id === id);
}

/** Get all avatars */
export function getAllAvatars(): Avatar[] {
  return avatars;
}