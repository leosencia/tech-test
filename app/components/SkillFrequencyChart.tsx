import type { SkillFrequency } from '../types/api';

interface SkillFrequencyChartProps {
  skills: SkillFrequency[];
  maxDisplay?: number;
  title?: string;
  totalMembers?: number;
}

export default function SkillFrequencyChart({ 
  skills, 
  maxDisplay = 15,
  title = 'Team Skill Frequency',
  totalMembers
}: SkillFrequencyChartProps) {
  if (!skills || skills.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400">No skills data available</p>
      </div>
    );
  }

  const displaySkills = skills.slice(0, maxDisplay);
  const maxPercentage = Math.max(...displaySkills.map(s => s.percentage), 100);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="space-y-3">
        {displaySkills.map((skill) => (
          <div key={skill.skillName} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate flex-1 mr-2">
                {skill.skillName}
              </span>
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {skill.percentage.toFixed(1)}% {totalMembers ? `(${skill.count}/${totalMembers})` : `(${skill.count})`}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(skill.percentage / maxPercentage) * 100}%` }}
                role="progressbar"
                aria-valuenow={skill.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
          </div>
        ))}
      </div>
      {skills.length > maxDisplay && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing top {maxDisplay} of {skills.length} skills
        </p>
      )}
    </div>
  );
}

