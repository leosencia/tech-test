import type {
  GenomeResponse,
  TeamAggregate,
  SkillFrequency,
  SkillDelta,
  LanguageDelta,
  DeltaAnalysis,
  RedundancyAlert,
  ValueAddAlert,
} from '../types/api';

// Thresholds for analysis
const REDUNDANCY_THRESHOLD = 0.8; // 80% team coverage = redundant
const VALUE_ADD_THRESHOLD = 0.2; // <20% team coverage = value add

/**
 * Builds a team aggregate from multiple genome responses
 * Extracts skills and languages, counts occurrences, and calculates percentages
 * 
 * @param genomes - Array of genome responses from team members
 * @returns Team aggregate with skill and language frequency maps
 */
export function buildTeamAggregate(genomes: GenomeResponse[]): TeamAggregate {
  if (!genomes || genomes.length === 0) {
    return {
      totalMembers: 0,
      skills: [],
      languages: {},
    };
  }

  const totalMembers = genomes.length;
  const skillMap = new Map<string, {
    count: number;
    proficiencyLevels: Map<string, number>;
  }>();
  const languageMap = new Map<string, {
    count: number;
    fluencyLevels: Map<string, number>;
  }>();

  // Process each genome
  for (const genome of genomes) {
    // Process skills (strengths)
    if (genome.strengths && Array.isArray(genome.strengths)) {
      for (const strength of genome.strengths) {
        const skillName = strength.name;
        const proficiency = strength.proficiency || 'unknown';

        if (!skillMap.has(skillName)) {
          skillMap.set(skillName, {
            count: 0,
            proficiencyLevels: new Map<string, number>(),
          });
        }

        const skillData = skillMap.get(skillName)!;
        skillData.count += 1;

        const currentProficiencyCount = skillData.proficiencyLevels.get(proficiency) || 0;
        skillData.proficiencyLevels.set(proficiency, currentProficiencyCount + 1);
      }
    }

    // Process languages
    if (genome.languages && Array.isArray(genome.languages)) {
      for (const lang of genome.languages) {
        const langCode = lang.code;
        const fluency = lang.fluency || 'unknown';

        if (!languageMap.has(langCode)) {
          languageMap.set(langCode, {
            count: 0,
            fluencyLevels: new Map<string, number>(),
          });
        }

        const langData = languageMap.get(langCode)!;
        langData.count += 1;

        const currentFluencyCount = langData.fluencyLevels.get(fluency) || 0;
        langData.fluencyLevels.set(fluency, currentFluencyCount + 1);
      }
    }
  }

  // Convert skill map to array with percentages
  const skills: SkillFrequency[] = Array.from(skillMap.entries()).map(([skillName, data]) => {
    const proficiencyLevels: { [proficiency: string]: number } = {};
    data.proficiencyLevels.forEach((count, proficiency) => {
      proficiencyLevels[proficiency] = count;
    });

    return {
      skillName,
      count: data.count,
      percentage: Math.round((data.count / totalMembers) * 100 * 100) / 100, // Round to 2 decimal places
      proficiencyLevels,
    };
  });

  // Sort skills by frequency (descending)
  skills.sort((a, b) => b.count - a.count);

  // Convert language map to object with percentages
  const languages: TeamAggregate['languages'] = {};
  languageMap.forEach((data, langCode) => {
    const fluencyLevels: { [fluency: string]: number } = {};
    data.fluencyLevels.forEach((count, fluency) => {
      fluencyLevels[fluency] = count;
    });

    languages[langCode] = {
      count: data.count,
      percentage: Math.round((data.count / totalMembers) * 100 * 100) / 100,
      fluencyLevels,
    };
  });

  return {
    totalMembers,
    skills,
    languages,
  };
}

/**
 * Calculates the delta between a candidate's genome and the team aggregate
 * Identifies redundant skills (high team coverage) and value-add skills (low/zero team coverage)
 * 
 * @param candidateGenome - The candidate's genome response
 * @param teamAggregate - The team aggregate built from team members
 * @returns Delta analysis with redundant and value-add skills/languages
 */
export function calculateDelta(
  candidateGenome: GenomeResponse,
  teamAggregate: TeamAggregate
): DeltaAnalysis {
  const redundantSkills: SkillDelta[] = [];
  const valueAddSkills: SkillDelta[] = [];
  const valueAddLanguages: LanguageDelta[] = [];

  // Create a map of team skills for quick lookup
  const teamSkillMap = new Map<string, SkillFrequency>();
  for (const skill of teamAggregate.skills) {
    teamSkillMap.set(skill.skillName.toLowerCase(), skill);
  }

  // Process candidate's skills
  if (candidateGenome.strengths && Array.isArray(candidateGenome.strengths)) {
    for (const strength of candidateGenome.strengths) {
      const skillName = strength.name;
      const candidateProficiency = strength.proficiency || 'unknown';
      const skillKey = skillName.toLowerCase();

      // Find matching team skill (case-insensitive)
      const teamSkill = teamSkillMap.get(skillKey);
      const teamCoverage = teamSkill ? teamSkill.percentage / 100 : 0;

      // Get proficiency distribution from team
      const teamProficiencyDistribution: { [proficiency: string]: number } = {};
      if (teamSkill) {
        // Count how many team members have this skill at each proficiency level
        const totalTeamMembers = teamAggregate.totalMembers;
        Object.entries(teamSkill.proficiencyLevels).forEach(([proficiency, count]) => {
          teamProficiencyDistribution[proficiency] = Math.round((count / totalTeamMembers) * 100 * 100) / 100;
        });
      }

      const skillDelta: SkillDelta = {
        skillName,
        candidateProficiency,
        teamCoverage,
        teamProficiencyDistribution,
        isRedundant: teamCoverage > REDUNDANCY_THRESHOLD,
        isValueAdd: teamCoverage < VALUE_ADD_THRESHOLD,
      };

      if (skillDelta.isRedundant) {
        redundantSkills.push(skillDelta);
      } else if (skillDelta.isValueAdd) {
        valueAddSkills.push(skillDelta);
      }
    }
  }

  // Process candidate's languages
  if (candidateGenome.languages && Array.isArray(candidateGenome.languages)) {
    for (const lang of candidateGenome.languages) {
      const langCode = lang.code;
      const languageName = lang.language;
      const candidateFluency = lang.fluency || 'unknown';

      const teamLanguage = teamAggregate.languages[langCode];
      const teamCoverage = teamLanguage ? teamLanguage.percentage / 100 : 0;

      // Language is a value-add if team coverage is low
      if (teamCoverage < VALUE_ADD_THRESHOLD) {
        valueAddLanguages.push({
          languageCode: langCode,
          languageName,
          candidateFluency,
          teamCoverage,
          isValueAdd: true,
        });
      }
    }
  }

  // Sort redundant skills by team coverage (descending)
  redundantSkills.sort((a, b) => b.teamCoverage - a.teamCoverage);

  // Sort value-add skills by team coverage (ascending - least covered first)
  valueAddSkills.sort((a, b) => a.teamCoverage - b.teamCoverage);

  return {
    redundantSkills,
    valueAddSkills,
    valueAddLanguages,
    summary: {
      totalRedundantSkills: redundantSkills.length,
      totalValueAddSkills: valueAddSkills.length,
      totalValueAddLanguages: valueAddLanguages.length,
      totalTeamMembers: teamAggregate.totalMembers,
    },
  };
}

/**
 * Generates alerts based on delta analysis
 * Creates redundancy alerts and value-add recommendations
 * 
 * @param delta - The delta analysis result
 * @returns Object containing redundancy alerts and value-add alerts
 */
export function generateAlerts(delta: DeltaAnalysis): {
  redundancyAlerts: RedundancyAlert[];
  valueAddAlert: ValueAddAlert | null;
} {
  const redundancyAlerts: RedundancyAlert[] = [];

  // Group redundant skills by proficiency level to find exact matches
  const skillGroups = new Map<string, SkillDelta[]>();
  
  for (const skill of delta.redundantSkills) {
    // Create a key that combines skill name and proficiency level
    const key = `${skill.skillName.toLowerCase()}_${skill.candidateProficiency}`;
    
    if (!skillGroups.has(key)) {
      skillGroups.set(key, []);
    }
    skillGroups.get(key)!.push(skill);
  }

  // Generate redundancy alerts
  for (const skills of skillGroups.values()) {
    if (skills.length === 0) continue;

    const skill = skills[0]; // All skills in group have same name and proficiency
    const totalMembers = delta.summary.totalTeamMembers || 1;
    
    // Determine severity based on team coverage
    let severity: 'high' | 'medium' | 'low' = 'low';
    if (skill.teamCoverage >= 0.9) {
      severity = 'high';
    } else if (skill.teamCoverage >= 0.85) {
      severity = 'medium';
    }

    // Count how many team members have this exact skill + proficiency
    // teamProficiencyDistribution is a percentage, so multiply by totalMembers
    const proficiencyPercentage = skill.teamProficiencyDistribution[skill.candidateProficiency] || 0;
    const exactMatchCount = Math.round((proficiencyPercentage / 100) * totalMembers);

    const message = exactMatchCount > 0
      ? `Warning: You already have ${exactMatchCount} team member${exactMatchCount > 1 ? 's' : ''} with ${skill.skillName} at ${formatProficiency(skill.candidateProficiency)} proficiency level.`
      : `Warning: ${Math.round(skill.teamCoverage * 100)}% of your team already has ${skill.skillName}.`;

    redundancyAlerts.push({
      type: 'redundancy',
      severity,
      message,
      skills,
      count: exactMatchCount || Math.round(skill.teamCoverage * totalMembers),
    });
  }

  // Generate value-add alert
  let valueAddAlert: ValueAddAlert | null = null;
  
  if (delta.valueAddSkills.length > 0 || delta.valueAddLanguages.length > 0) {
    const topValueAddSkills = delta.valueAddSkills.slice(0, 10); // Top 10 value-add skills
    const skillNames = topValueAddSkills.map(s => s.skillName);
    const languageNames = delta.valueAddLanguages.map(l => l.languageName);

    let message = 'Strong Hire: ';
    const additions: string[] = [];

    if (skillNames.length > 0) {
      additions.push(`skills '${skillNames.slice(0, 3).join("', '")}${skillNames.length > 3 ? `' and ${skillNames.length - 3} more` : "'"}`);
    }

    if (languageNames.length > 0) {
      additions.push(`languages '${languageNames.join("', '")}'`);
    }

    if (additions.length > 0) {
      message += `This candidate brings ${additions.join(' and ')}—skills your current team ${delta.valueAddSkills.some(s => s.teamCoverage === 0) ? 'completely lacks' : 'has limited coverage in'}.`;
    }

    valueAddAlert = {
      type: 'value-add',
      message,
      skills: topValueAddSkills,
      languages: delta.valueAddLanguages,
    };
  }

  return {
    redundancyAlerts,
    valueAddAlert,
  };
}

/**
 * Helper function to format proficiency level for display
 */
export function formatProficiency(proficiency: string): string {
  const proficiencyMap: { [key: string]: string } = {
    'no-experience-interested': 'No Experience (Interested)',
    'novice': 'Novice',
    'proficient': 'Proficient',
    'expert': 'Expert',
    'master': 'Master',
  };
  return proficiencyMap[proficiency] || proficiency;
}

/**
 * Helper function to format fluency level for display
 */
export function formatFluency(fluency: string): string {
  const fluencyMap: { [key: string]: string } = {
    'basic': 'Basic',
    'conversational': 'Conversational',
    'fully-fluent': 'Fully Fluent',
    'native-or-bilingual': 'Native/Bilingual',
  };
  return fluencyMap[fluency] || fluency;
}

