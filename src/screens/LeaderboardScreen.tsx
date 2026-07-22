import { getWeeklyLeaderboard, getMyRank } from '../services/leaderboardService';
import { Button } from '../components/ui/Button';

interface LeaderboardScreenProps {
  profile: PlayerProfile;
  onBack: () => void;
}

export function LeaderboardScreen({ profile, onBack }: LeaderboardScreenProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const [board, rank] = await Promise.all([
          getWeeklyLeaderboard(10),
          getMyRank(profile.playerId),
        ]);
        setLeaderboard(board);
        setMyRank(rank);
      } catch (err) {
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [profile.playerId]);

  return (
    <div className="screen leaderboard" role="main">
      <div className="screen__header">
        <h1>Weekly Leaderboard</h1>
        <p>Top players this week</p>
      </div>

      {loading ? (
        <div className="leaderboard__loading">Loading...</div>
      ) : (
        <>
          <div className="leaderboard__top" role="list" aria-label="Top players">
            {leaderboard.map((entry) => (
              <div key={entry.playerId} className="leaderboard__entry" role="listitem">
                <span className="leaderboard__rank">#{entry.rank}</span>
                <span className="leaderboard__name">{entry.nickname}</span>
                <span className="leaderboard__coins">{entry.coins} coins</span>
                <span className="leaderboard__correct">{entry.correctAnswers} correct</span>
              </div>
            ))}
          </div>

          <div className="leaderboard__my-rank">
            <h3>Your Rank</h3>
            <p>#{myRank} with {profile.stats.coinsEarned} coins</p>
          </div>
        </>
      )}

      <div className="leaderboard__actions">
        <Button onClick={onBack} variant="ghost" size="md" fullWidth>
          Back
        </Button>
      </div>
    </div>
  );
}