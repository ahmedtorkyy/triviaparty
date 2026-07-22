interface TimerRingProps {
  seconds: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export function TimerRing({
  seconds,
  total,
  size = 80,
  strokeWidth = 6,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const dashOffset = circumference * (1 - progress);

  // Color shifts from violet -> amber -> red as time runs out
  let strokeColor = '#7C5CFF';
  if (progress < 0.5) strokeColor = '#f59e0b'; // amber
  if (progress < 0.25) strokeColor = '#ef4444'; // red

  const displayTime = Math.ceil(seconds);

  return (
    <div className="timer-ring" role="timer" aria-label={`${displayTime} seconds remaining`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className="timer-ring__text" aria-hidden="true">
        {displayTime}
      </span>
    </div>
  );
}
