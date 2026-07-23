import { useRef, useCallback, useState } from 'react';
import { Button } from '../ui/Button';

interface ShareCardProps {
  playerId: string;
  nickname: string;
  rank: number;
  totalPlayers: number;
  score: number;
  bestMoment: string; // e.g. "8/10 correct" or "survived 14"
  coinEarned: number;
}

export function ShareCard({ nickname, rank, totalPlayers, score, bestMoment, coinEarned }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shared, setShared] = useState(false);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const w = 600, h = 315;
    canvas.width = w;
    canvas.height = h;

    // Dark background with violet accent
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    // Violet accent bar at top
    ctx.fillStyle = '#7C5CFF';
    ctx.fillRect(0, 0, w, 6);

    // Logo
    ctx.fillStyle = '#7C5CFF';
    ctx.beginPath();
    ctx.arc(60, 55, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TP', 60, 66);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TriviaParty', 105, 52);

    // Score
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}`, 300, 125);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('SCORE', 300, 145);

    // Rank
    ctx.fillStyle = '#7C5CFF';
    ctx.font = 'bold 32px Outfit, sans-serif';
    ctx.fillText(`#${rank} of ${totalPlayers}`, 300, 190);

    // Best moment
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(bestMoment, 300, 220);

    // Nickname
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(nickname, 300, 250);

    // Coins earned
    ctx.fillStyle = '#F59E0B';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`🪙 +${coinEarned} coins`, 300, 275);

    // Footer
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Play at triviaparty.pages.dev', 300, 305);

    // Violet accent bar at bottom
    ctx.fillStyle = '#7C5CFF';
    ctx.fillRect(0, h - 6, w, 6);

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  }, [nickname, rank, totalPlayers, score, bestMoment, coinEarned]);

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
        // User cancelled or share failed - fall through to clipboard
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText('https://triviaparty.pages.dev');
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard not available
    }
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