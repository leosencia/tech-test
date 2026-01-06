import { useState, useEffect } from 'react';
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
  const [visibleCount, setVisibleCount] = useState(Math.min(skills?.length || 0, maxDisplay));

  useEffect(() => {
    const newCount = Math.min(skills?.length || 0, maxDisplay);
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (!cancelled) {
        setVisibleCount(prev => (prev === newCount ? prev : newCount));
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [skills, maxDisplay]);

  if (!skills || skills.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400">No skills data available</p>
      </div>
    );
  }

  const displaySkills = skills.slice(0, visibleCount);
  const maxPercentage = Math.max(...displaySkills.map(s => s.percentage), 100);
  const moreAvailable = visibleCount < skills.length;

  const handleSeeMore = () => {
    setVisibleCount(prev => Math.min(skills.length, prev + maxDisplay));
  };

  const handleSeeAll = () => {
    setVisibleCount(skills.length);
  };

  const handleShowLess = () => {
    setVisibleCount(Math.min(skills.length, maxDisplay));
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="space-y-3">
        {displaySkills.map((skill, idx) => (
          <div key={`${skill.skillName}-${idx}`} className="space-y-1">
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

      {/* Controls */}
      {skills.length > maxDisplay && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {moreAvailable ? (
            <>
              <button
                type="button"
                onClick={handleSeeMore}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                See more ({Math.min(visibleCount + maxDisplay, skills.length)}/{skills.length})
              </button>
              <button
                type="button"
                onClick={handleSeeAll}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                See all
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleShowLess}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Show less
            </button>
          )}
        </div>
      )}

      {skills.length > maxDisplay && visibleCount < skills.length && (
        <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          Showing {visibleCount} of {skills.length} skills
        </p>
      )}

      {skills.length > maxDisplay && visibleCount === skills.length && (
        <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          Showing all {skills.length} skills
        </p>
      )}
    </div>
  );
}

