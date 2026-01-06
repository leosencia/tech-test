'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchEntities, getGenome, searchTeamMembers } from './lib/api';
import { buildTeamAggregate, calculateDelta, generateAlerts } from './lib/teamAnalysis';
import type { EntitySearchResult, GenomeResponse } from './types/api';
import Image from 'next/image';
import LoadingSpinner from './components/LoadingSpinner';
import SkillFrequencyChart from './components/SkillFrequencyChart';
import DeltaAnalysis from './components/DeltaAnalysis';
import RadarChart, { proficiencyToValue } from './components/RadarChart';

type AnalysisState = {
  teamAggregate: ReturnType<typeof buildTeamAggregate> | null;
  candidateGenome: GenomeResponse | null;
  delta: ReturnType<typeof calculateDelta> | null;
  alerts: ReturnType<typeof generateAlerts> | null;
};

export default function Home() {
  // Organization state
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<EntitySearchResult[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<EntitySearchResult | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [teamGenomes, setTeamGenomes] = useState<GenomeResponse[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Candidate state
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateSearchResults, setCandidateSearchResults] = useState<EntitySearchResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<EntitySearchResult | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);

  // Analysis state
  const [analysis, setAnalysis] = useState<AnalysisState>({
    teamAggregate: null,
    candidateGenome: null,
    delta: null,
    alerts: null,
  });
  const [analyzing, setAnalyzing] = useState(false);

  // Search organizations
  const handleOrgSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setOrgSearchResults([]);
      return;
    }

    setOrgLoading(true);
    try {
      const results = await searchEntities({
        query,
        identityType: 'organization',
        limit: 10,
        meta: true,
        excludeContacts: true,
      });
      setOrgSearchResults(results);
    } catch (error) {
      console.error('Error searching organizations:', error);
      setOrgSearchResults([]);
    } finally {
      setOrgLoading(false);
    }
  }, []);

  // Search candidates
  const handleCandidateSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCandidateSearchResults([]);
      return;
    }

    setCandidateLoading(true);
    try {
      const results = await searchEntities({
        query,
        identityType: 'person',
        limit: 10,
        meta: true,
        excludeContacts: true,
      });
      setCandidateSearchResults(results);
    } catch (error) {
      console.error('Error searching candidates:', error);
      setCandidateSearchResults([]);
    } finally {
      setCandidateLoading(false);
    }
  }, []);

  // Load team members when organization is selected
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedOrg) {
        setTeamGenomes([]);
        setAnalysis(prev => ({ ...prev, teamAggregate: null }));
        return;
      }

      // Prefer organization name/publicId for searching members
      const orgIdentifier = selectedOrg.name || selectedOrg.publicId || selectedOrg.organizationNumericId || selectedOrg.organizationId || selectedOrg.ardaId || null;

      if (!orgIdentifier) {
        setTeamGenomes([]);
        setAnalysis(prev => ({ ...prev, teamAggregate: null }));
        return;
      }

      setTeamLoading(true);
      try {
        const teamMembers = await searchTeamMembers(orgIdentifier as number | string, 30);

        // Fetch genomes for returned members (best-effort; skip failures)
        const genomePromises = teamMembers.slice(0, 30).map(member =>
          getGenome(member.username)
            .catch(err => {
              console.warn(`Failed to fetch genome for ${member.username}:`, err);
              return null;
            })
        );

        const genomes = (await Promise.all(genomePromises)).filter((g): g is GenomeResponse => g !== null);

        setTeamGenomes(genomes);

        // Build and store the team aggregate used to enable Simulate Impact
        const aggregate = buildTeamAggregate(genomes);
        setAnalysis(prev => ({ ...prev, teamAggregate: aggregate }));
      } catch (error) {
        console.error('Error loading team members:', error);
        setTeamGenomes([]);
        setAnalysis(prev => ({ ...prev, teamAggregate: null }));
      } finally {
        setTeamLoading(false);
      }
    };

    loadTeamMembers();
  }, [selectedOrg]);

  // Load candidate genome when candidate is selected
  useEffect(() => {
    const loadCandidateGenome = async () => {
      if (!selectedCandidate) {
        setAnalysis(prev => ({ ...prev, candidateGenome: null, delta: null, alerts: null }));
        return;
      }

      setCandidateLoading(true);
      try {
        const genome = await getGenome(selectedCandidate.username);
        setAnalysis(prev => ({ ...prev, candidateGenome: genome }));
      } catch (error) {
        console.error('Error loading candidate genome:', error);
        setAnalysis(prev => ({ ...prev, candidateGenome: null, delta: null, alerts: null }));
      } finally {
        setCandidateLoading(false);
      }
    };

    loadCandidateGenome();
  }, [selectedCandidate]);

  // Simulate impact
  const handleSimulateImpact = useCallback(() => {
    if (!analysis.teamAggregate || !analysis.candidateGenome) {
      return;
    }

    setAnalyzing(true);
    try {
      const delta = calculateDelta(analysis.candidateGenome, analysis.teamAggregate);
      const alerts = generateAlerts(delta);
      
      setAnalysis(prev => ({
        ...prev,
        delta,
        alerts,
      }));
    } catch (error) {
      console.error('Error analyzing impact:', error);
    } finally {
      setAnalyzing(false);
    }
  }, [analysis.teamAggregate, analysis.candidateGenome]);

  // Prepare radar chart data
  const getRadarData = () => {
    if (!analysis.teamAggregate) return [];

    const teamSkills = analysis.teamAggregate.skills.slice(0, 6);
    const candidateSkills = analysis.candidateGenome?.strengths || [];
    
    // Get top 2 distinct candidate skills not in team top 6
    const teamSkillNames = teamSkills.map(s => s.skillName.toLowerCase());
    const distinctCandidateSkills = candidateSkills
      .filter(s => !teamSkillNames.includes(s.name.toLowerCase()))
      .slice(0, 2);

    // Combine: top 6 team skills + top 2 distinct candidate skills
    const allSkills = new Map<string, { teamValue: number; candidateProficiency?: string }>();

    // Add team skills
    teamSkills.forEach(skill => {
      allSkills.set(skill.skillName.toLowerCase(), {
        teamValue: skill.percentage / 100,
      });
    });

    // Add distinct candidate skills
    distinctCandidateSkills.forEach(skill => {
      const key = skill.name.toLowerCase();
      if (!allSkills.has(key)) {
        allSkills.set(key, { teamValue: 0 });
      }
      const existing = allSkills.get(key)!;
      existing.candidateProficiency = skill.proficiency;
    });

    // Add candidate values to existing team skills
    if (analysis.candidateGenome) {
      candidateSkills.forEach(skill => {
        const key = skill.name.toLowerCase();
        if (allSkills.has(key)) {
          const existing = allSkills.get(key)!;
          existing.candidateProficiency = skill.proficiency;
        }
      });
    }

    // Convert to radar data points
    return Array.from(allSkills.entries()).map(([skillName, data]) => {
      // Find the original skill name (preserve casing)
      const originalSkillName = teamSkills.find(s => s.skillName.toLowerCase() === skillName)?.skillName ||
                                distinctCandidateSkills.find(s => s.name.toLowerCase() === skillName)?.name ||
                                skillName;

      return {
        skill: originalSkillName,
        teamValue: data.teamValue,
        candidateValue: data.candidateProficiency 
          ? proficiencyToValue(data.candidateProficiency) 
          : 0,
      };
    });
  };

  const radarData = getRadarData();
  const showCandidate = !!analysis.candidateGenome && !!analysis.delta;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            TeamDiff: Visualize Hiring Impact
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Don&apos;t just hire. Complete the puzzle.
          </p>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <div className="flex h-[calc(100vh-80px)] max-w-7xl mx-auto">
        {/* Left Panel - Input Zone (30%) */}
        <div className="w-[30%] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Section 1: Define the Team */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Define the Team
              </h2>
              
              <div className="relative">
                <input
                  type="text"
                  value={orgSearchQuery}
                  onChange={(e) => {
                    setOrgSearchQuery(e.target.value);
                    handleOrgSearch(e.target.value);
                  }}
                  placeholder="Search Organization"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {orgLoading && (
                  <div className="absolute right-3 top-2.5">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Autocomplete dropdown */}
                {orgSearchResults.length > 0 && orgSearchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {orgSearchResults.map((org, i) => (
                      <button
                        key={org.ggId || org.username || org.publicId || String(org.ardaId) || org.name || i}
                        onClick={() => {
                          setSelectedOrg(org);
                          setOrgSearchQuery(org.name);
                          setOrgSearchResults([]);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                      >
                        <div className="font-medium">{org.name}</div>
                        {org.professionalHeadline && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {org.professionalHeadline}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedOrg && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Selected: {selectedOrg.name}
                  </p>
                </div>
              )}

              {teamLoading && (
                <div className="mt-3">
                  <LoadingSpinner message="Analyzing team genomes..." />
                </div>
              )}

              {teamGenomes.length > 0 && !teamLoading && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Found {teamGenomes.length} team members. Analysis complete.
                  </p>
                </div>
              )}
            </section>

            {/* Section 2: The Challenger */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                The Challenger
              </h2>
              
              <div className="relative">
                <input
                  type="text"
                  value={candidateSearchQuery}
                  onChange={(e) => {
                    setCandidateSearchQuery(e.target.value);
                    handleCandidateSearch(e.target.value);
                  }}
                  placeholder="Search Candidate"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {candidateLoading && (
                  <div className="absolute right-3 top-2.5">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Autocomplete dropdown */}
                {candidateSearchResults.length > 0 && candidateSearchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {candidateSearchResults.map((person, i) => (
                      <button
                        key={person.ggId || person.username || person.publicId || String(person.ardaId) || person.name || i}
                        onClick={() => {
                          setSelectedCandidate(person);
                          setCandidateSearchQuery(person.name);
                          setCandidateSearchResults([]);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 flex items-center gap-3"
                      >
                        {person.imageUrl && (
                          <Image
                            src={person.imageUrl}
                            alt={person.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-medium">{person.name}</div>
                          {person.professionalHeadline && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {person.professionalHeadline}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mini Profile Card */}
              {selectedCandidate && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    {selectedCandidate.imageUrl && (
                      <Image
                        src={selectedCandidate.imageUrl}
                        alt={selectedCandidate.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedCandidate.name}
                      </h3>
                      {selectedCandidate.professionalHeadline && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedCandidate.professionalHeadline}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {candidateLoading && (
                <div className="mt-3">
                  <LoadingSpinner message="Loading candidate genome..." />
                </div>
              )}
            </section>

            {/* Action Button */}
            <button
              onClick={handleSimulateImpact}
              disabled={!analysis.teamAggregate || !analysis.candidateGenome || analyzing}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {analyzing ? 'Simulating Impact...' : 'Simulate Impact'}
            </button>
          </div>
        </div>

        {/* Right Panel - Visualization Deck (70%) */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
          {!analysis.teamAggregate ? (
            // Empty State
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Search for an organization to see your team&apos;s skill map
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Radar Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {showCandidate ? 'Impact Visualization' : 'Team Skill Map'}
                </h3>
                <RadarChart
                  data={radarData}
                  teamLabel="Your Team"
                  candidateLabel={selectedCandidate?.name || 'Candidate'}
                  showCandidate={showCandidate}
                />
                {!showCandidate && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    Your team is heavy on {analysis.teamAggregate.skills[0]?.skillName || 'various skills'} 
                    {analysis.teamAggregate.skills.length > 1 && ` but lacks ${analysis.teamAggregate.skills.slice(-1)[0]?.skillName || 'some skills'}`}
                  </p>
                )}
              </div>

              {/* Skill Frequency Chart */}
              <SkillFrequencyChart
                skills={analysis.teamAggregate.skills}
                totalMembers={analysis.teamAggregate.totalMembers}
                title="Team Skill Frequency"
              />

              {/* Delta Analysis */}
              {showCandidate && analysis.alerts && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Impact Analysis
                  </h3>
                  <DeltaAnalysis
                    redundancyAlerts={analysis.alerts.redundancyAlerts}
                    valueAddAlert={analysis.alerts.valueAddAlert}
                  />
                </div>
              )}

              {/* Insight Box */}
              {showCandidate && analysis.delta && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                  {analysis.delta.valueAddSkills.length > 0 ? (
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      Hiring this candidate increases your team&apos;s{' '}
                      {analysis.delta.valueAddSkills[0].skillName} capability by{' '}
                      {analysis.delta.valueAddSkills[0].teamCoverage === 0 ? '100%' : 
                       `${Math.round((1 - analysis.delta.valueAddSkills[0].teamCoverage) * 100)}%`}
                      {analysis.delta.valueAddSkills[0].teamCoverage === 0 && ' (New Skill)'}.
                    </p>
                  ) : analysis.delta.redundantSkills.length > 0 ? (
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      Low Impact. This candidate duplicates existing skills.
                    </p>
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      Moderate Impact. This candidate adds some complementary skills.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
