import type { RedundancyAlert, ValueAddAlert } from '../types/api';
import { formatProficiency, formatFluency } from '../lib/teamAnalysis';

interface DeltaAnalysisProps {
  redundancyAlerts: RedundancyAlert[];
  valueAddAlert: ValueAddAlert | null;
}

export default function DeltaAnalysis({ redundancyAlerts, valueAddAlert }: DeltaAnalysisProps) {
  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'low':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getSeverityTextColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'text-red-800 dark:text-red-200';
      case 'medium':
        return 'text-orange-800 dark:text-orange-200';
      case 'low':
        return 'text-yellow-800 dark:text-yellow-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Redundancy Alerts */}
      {redundancyAlerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Redundancy Alerts
          </h3>
          {redundancyAlerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className={`font-medium mb-1 ${getSeverityTextColor(alert.severity)}`}>
                    {alert.message}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityTextColor(alert.severity)} bg-white dark:bg-gray-800/50`}>
                    {alert.severity.toUpperCase()} SEVERITY
                  </span>
                </div>
              </div>
              {alert.skills.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Skills with redundancy:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {alert.skills.map((skill, skillIndex) => (
                      <span
                        key={skillIndex}
                        className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
                      >
                        {skill.skillName} ({formatProficiency(skill.candidateProficiency)})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Value Add Alert */}
      {valueAddAlert && (
        <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="mb-3">
            <p className="font-medium text-green-800 dark:text-green-200 mb-1">
              {valueAddAlert.message}
            </p>
          </div>

          {/* Value-Add Skills */}
          {valueAddAlert.skills.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Skills:
              </p>
              <div className="flex flex-wrap gap-2">
                {valueAddAlert.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
                  >
                    {skill.skillName} ({formatProficiency(skill.candidateProficiency)})
                    {skill.teamCoverage === 0 && (
                      <span className="ml-1 text-green-600 dark:text-green-400">• New</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Value-Add Languages */}
          {valueAddAlert.languages.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Languages:
              </p>
              <div className="flex flex-wrap gap-2">
                {valueAddAlert.languages.map((lang, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
                  >
                    {lang.languageName} ({formatFluency(lang.candidateFluency)})
                    {lang.teamCoverage === 0 && (
                      <span className="ml-1 text-green-600 dark:text-green-400">• New</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Alerts Message */}
      {redundancyAlerts.length === 0 && !valueAddAlert && (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No significant redundancies or value-adds detected.
          </p>
        </div>
      )}
    </div>
  );
}

