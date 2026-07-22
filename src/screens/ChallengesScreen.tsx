import { getActiveChallenges, isChallengeClaimedToday } from '../data/challenges';
import { claimChallenges } from '../data/challenges';
import { Button } from '../components/ui/Button';

interface ChallengesScreenProps {
  profile: PlayerProfile;
  onProfileChange: (updated: PlayerProfile) => void;
  onBack: () => void;
}

export function ChallengesScreen({ profile, onProfileChange, onBack }: ChallengesScreenProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setChallenges(getActiveChallenges());
  }, []);

  const handleClaim = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { profile: updated, coinsEarned } = claimChallenges(profile);
      onProfileChange(updated);
      setMessage(`Claimed ${coinsEarned} coins!`);
    } catch (err) {
      setMessage('Error claiming challenge.');
    } finally {
      setLoading(false);
    }
  };

  const claimedToday = isChallengeClaimedToday(profile);

  return (
    <div className="screen challenges" role="main">
      <div className="screen__header">
        <h1>Daily Challenges</h1>
        <p>Complete challenges to earn coins!</p>
      </div>

      <div className="challenges-list" role="list" aria-label="Challenges">
        {challenges.map((challenge) => {
          const isCompleted = challenge.predicate(profile, {
            correctCount: profile.stats.totalCorrect,
            wrongCount: profile.stats.totalWrong,
            streak: profile.stats.bestSurvivalStreak,
            gameType: 'solo',
          });
          return (
            <div key={challenge.id} className="challenge-card" role="listitem">
              <div className="challenge-card__info">
                <h3>{challenge.description}</h3>
                <p>{challenge.reward} coins</p>
              </div>
              <Button
                onClick={() => handleClaim(challenge.id)}
                variant="primary"
                size="sm"
                disabled={loading || !isCompleted || claimedToday}
              >
                {claimedToday ? 'Claimed' : isCompleted ? 'Claim' : 'Incomplete'}
              </Button>
            </div>
          );
        })}
      </div>

      {message && <div className="challenges__message">{message}</div>}

      <div className="challenges__actions">
        <Button onClick={onBack} variant="ghost" size="md" fullWidth>
          Back
        </Button>
      </div>
    </div>
  );
}