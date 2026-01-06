interface RadarDataPoint {
  skill: string;
  teamValue: number; // 0-1 (percentage of team with skill)
  candidateValue: number; // 0-1 (proficiency mapped to number)
}

interface RadarChartProps {
  data: RadarDataPoint[];
  teamLabel?: string;
  candidateLabel?: string;
  showCandidate?: boolean;
}

// Map proficiency to numeric value
function proficiencyToValue(proficiency: string): number {
  const map: { [key: string]: number } = {
    'master': 1.0,
    'expert': 0.8,
    'proficient': 0.5,
    'novice': 0.3,
    'no-experience-interested': 0.1,
  };
  return map[proficiency.toLowerCase()] || 0.3;
}

export default function RadarChart({ 
  data, 
  teamLabel = 'Team',
  candidateLabel = 'Candidate',
  showCandidate = false 
}: RadarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No data to display</p>
      </div>
    );
  }

  const numPoints = data.length;
  const centerX = 200;
  const centerY = 200;
  const radius = 150;
  const angleStep = (2 * Math.PI) / numPoints;

  // Generate polygon points
  const teamPoints: string[] = [];
  const candidatePoints: string[] = [];
  const skillLabels: { x: number; y: number; text: string; angle: number }[] = [];

  data.forEach((point, index) => {
    const angle = index * angleStep - Math.PI / 2; // Start from top
    const teamRadius = radius * point.teamValue;
    const candidateRadius = radius * point.candidateValue;

    const teamX = centerX + teamRadius * Math.cos(angle);
    const teamY = centerY + teamRadius * Math.sin(angle);
    teamPoints.push(`${teamX},${teamY}`);

    if (showCandidate) {
      const candidateX = centerX + candidateRadius * Math.cos(angle);
      const candidateY = centerY + candidateRadius * Math.sin(angle);
      candidatePoints.push(`${candidateX},${candidateY}`);
    }

    // Label position (outside the circle)
    const labelRadius = radius + 30;
    const labelX = centerX + labelRadius * Math.cos(angle);
    const labelY = centerY + labelRadius * Math.sin(angle);
    skillLabels.push({
      x: labelX,
      y: labelY,
      text: point.skill,
      angle: angle,
    });
  });

  // Generate grid circles
  const gridCircles = [0.2, 0.4, 0.6, 0.8, 1.0].map((scale) => (
    <circle
      key={scale}
      cx={centerX}
      cy={centerY}
      r={radius * scale}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.5"
      className="text-gray-300 dark:text-gray-700"
      opacity="0.3"
    />
  ));

  // Generate grid lines (spokes)
  const gridLines = data.map((_, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return (
      <line
        key={index}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="currentColor"
        strokeWidth="0.5"
        className="text-gray-300 dark:text-gray-700"
        opacity="0.3"
      />
    );
  });

  // Find missing pieces (candidate extends beyond team)
  const missingPieces = data
    .map((point, index) => ({
      index,
      skill: point.skill,
      extension: point.candidateValue - point.teamValue,
    }))
    .filter((item) => item.extension > 0.2) // Significant extension
    .sort((a, b) => b.extension - a.extension);

  return (
    <div className="w-full h-full p-4">
      <div className="relative">
        <svg
          width="100%"
          height="400"
          viewBox="0 0 400 400"
          className="overflow-visible"
        >
          {/* Grid */}
          {gridCircles}
          {gridLines}

          {/* Team polygon (blue) */}
          <polygon
            points={teamPoints.join(' ')}
            fill="rgba(37, 99, 235, 0.3)"
            stroke="rgb(37, 99, 235)"
            strokeWidth="2"
            className="transition-all duration-500"
          />

          {/* Candidate polygon (green) - only if showCandidate is true */}
          {showCandidate && candidatePoints.length > 0 && (
            <polygon
              points={candidatePoints.join(' ')}
              fill="rgba(34, 197, 94, 0.3)"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              className="transition-all duration-500"
            />
          )}

          {/* Missing pieces highlight (gold/pulsing) */}
          {showCandidate &&
            missingPieces.map((piece) => {
              const angle = piece.index * angleStep - Math.PI / 2;
              const teamRadius = radius * data[piece.index].teamValue;
              const candidateRadius = radius * data[piece.index].candidateValue;
              const teamX = centerX + teamRadius * Math.cos(angle);
              const teamY = centerY + teamRadius * Math.sin(angle);
              const candidateX = centerX + candidateRadius * Math.cos(angle);
              const candidateY = centerY + candidateRadius * Math.sin(angle);

              return (
                <line
                  key={`missing-${piece.index}`}
                  x1={teamX}
                  y1={teamY}
                  x2={candidateX}
                  y2={candidateY}
                  stroke="rgb(234, 179, 8)"
                  strokeWidth="4"
                  className="animate-pulse"
                  strokeLinecap="round"
                />
              );
            })}

          {/* Skill labels */}
          {skillLabels.map((label, index) => (
            <text
              key={index}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-gray-700 dark:fill-gray-300"
            >
              {label.text}
            </text>
          ))}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{teamLabel}</span>
          </div>
          {showCandidate && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">{candidateLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Missing pieces insight */}
      {showCandidate && missingPieces.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Missing Piece Highlight: {missingPieces[0].skill}
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            Candidate extends team capability by{' '}
            {Math.round(missingPieces[0].extension * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}

// Export helper function for use in main page
export { proficiencyToValue };

