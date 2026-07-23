import { useRef, useCallback, useState } from 'react';
import { Button } from '../ui/Button';
import type { PlayerCharacter } from '../../types';

interface ShareCardProps {
  playerId: string;
  nickname: string;
  rank: number;
  totalPlayers: number;
  score: number;
  bestMoment: string;
  coinEarned: number;
  character?: PlayerCharacter;
}

export function ShareCard({ nickname, rank, totalPlayers, score, bestMoment, coinEarned, character }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shared, setShared] = useState(false);

  const drawAvatar = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    if (!character) return;
    const r = size / 2;
    // Background circle
    ctx.fillStyle = character.backgroundColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Skin ellipse
    ctx.fillStyle = character.skinTone;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, r * 0.45, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    if (character.hairStyle !== 'bald') {
      ctx.fillStyle = character.hairColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.3, r * 0.5, r * 0.35, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 9, cy - 5, 4, 0, Math.PI * 2);
    ctx.arc(cx + 9, cy - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(cx - 9, cy - 5, 2, 0, Math.PI * 2);
    ctx.arc(cx + 9, cy - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + 5, 8, 0, Math.PI);
    ctx.stroke();
  }, [character]);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const w = 600, h = 315;
    canvas.width = w;
    canvas.height = h;

    // Dark background
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    // Violet accent bars
    ctx.fillStyle = '#7C5CFF';
    ctx.fillRect(0, 0, w, 6);
    ctx.fillRect(0, h - 6, w, 6);

    // Logo - violet circle with TP
    ctx.fillStyle = '#7C5CFF';
    ctx.beginPath();
    ctx.arc(55, 35, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TP', 55, 43);

    // Avatar (left side)
    if (character) {
      drawAvatar(ctx, 90, 170, 90);
    }

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TriviaParty', 90, 35);

    // Score centered
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 40px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}`, 350, 90);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('SCORE', 350, 112);

    // Rank
    ctx.fillStyle = '#7C5CFF';
    ctx.font = 'bold 34px Outfit, sans-serif';
    ctx.fillText(`#${rank} of ${totalPlayers}`, 350, 155);

    // Best moment
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(bestMoment, 350, 185);

    // Nickname
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(nickname, 350, 215);

    // Coins
    ctx.fillStyle = '#F59E0B';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`🪙 +${coinEarned} coins`, 350, 240);

    // URL
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Play at triviaparty.pages.dev', 350, 290);

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  }, [nickname, rank, totalPlayers, score, bestMoment, coinEarned, character, drawAvatar]);

  const handleShare = useCallback(async () => {
    const blob = await generateImage();
    if (!blob) return;

    const shareData: ShareData = {
      title: 'TriviaParty',
      text: `I scored ${score} points on TriviaParty and placed #${rank}! ${bestMoment}. Play free at`,
      url: 'https://triviaparty.pages.dev',
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share({
          ...shareData,
          files: [new File([blob], 'triviaparty-result.png', { type: 'image/png' })],
        });
        setShared(true);
        return;
      } catch {
        // fallback
      }
    }

    try {
      await navigator.clipboard.writeText('https://triviaparty.pages.dev');
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {}
  }, [generateImage, score, rank, bestMoment]);

  return (
    <div className="share-card">
      <canvas ref={canvasRef} style={{ display: 'none' }} width={600} height={315} />
      <Button onClick={handleShare} variant="primary" size="md" fullWidth>
        {shared ? '✅ Link copied!' : '📤 Share Result'}
      </Button>
    </div>
  );
}