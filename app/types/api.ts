// API Response Types

// ============================================================================
// GET /suite/opportunities/$job-id
// ============================================================================

export interface OpportunityResponse {
  id: string;
  owner: OpportunityOwner;
  members: OpportunityMember[];
  organizations: OpportunityOrganization[];
  languages?: OpportunityLanguage[];
  skills?: OpportunitySkill[];
  [key: string]: unknown; // Allow for additional fields
}

export interface OpportunityOwner {
  id: string;
  ggId: string;
  name: string;
  hasEmail: boolean;
  hasBio: boolean;
  theme: string;
  username: string;
  professionalHeadline?: string;
  picture?: string;
  pictureThumbnail?: string;
  weight: number;
  verified: boolean;
  subjectId: number;
  locale: string;
  isTester: boolean;
  flags?: Record<string, unknown>;
}

export interface OpportunityMember {
  id: string;
  person: OpportunityPerson;
  manager: boolean;
  poster: boolean;
  member: boolean;
  leader: boolean;
  status: string;
  visible: boolean;
  feedbackProvider: boolean;
  tsoOperator: boolean;
  salesOperator: boolean;
  position: number;
  flags?: Record<string, unknown>;
}

export interface OpportunityPerson {
  id: string;
  ggId: string;
  name: string;
  hasEmail: boolean;
  hasBio: boolean;
  theme: string;
  username: string;
  professionalHeadline?: string;
  picture?: string;
  pictureThumbnail?: string;
  weight: number;
  verified: boolean;
  subjectId: number;
  veiled: boolean;
  locale: string;
  isTester: boolean;
  flags?: Record<string, unknown>;
}

export interface OpportunityOrganization {
  id: number;
  name: string;
  size?: number;
  picture?: string;
  publicId?: string;
  websiteUrl?: string;
  theme?: string;
  serviceType?: string;
  hashedId?: string;
  status?: string;
}

export interface OpportunityLanguage {
  language: {
    code: string;
    name: string;
  };
  fluency: string;
}

export interface OpportunitySkill {
  id?: string;
  code?: number;
  name: string;
  experience?: string;
  proficiency?: string;
  suggested?: boolean;
}

// ============================================================================
// POST /entities/_searchStream
// ============================================================================

export interface EntitySearchResult {
  ardaId: number;
  ggId: string;
  name: string;
  comparableName: string;
  username: string;
  professionalHeadline?: string;
  imageUrl?: string | null;
  completion: number;
  grammar: number;
  weight: number;
  verified: boolean;
  connections: unknown[];
  totalStrength: number;
  pageRank: number;
  organizationId: number | null;
  organizationNumericId: number | null;
  publicId: string | null;
  status: string | null;
  creators: unknown[];
  relationDegree: number;
  isSearchable: boolean;
  contact: boolean;
}

// The searchStream endpoint returns a stream of JSON objects (one per line)
// Each line is a separate EntitySearchResult
export type EntitySearchStream = EntitySearchResult[];

// ============================================================================
// GET /genome/bios/$username
// ============================================================================

export interface GenomeResponse {
  person: GenomePerson;
  stats: GenomeStats;
  strengths: GenomeStrength[];
  interests: unknown[];
  experiences: GenomeExperience[];
  awards: unknown[];
  jobs: GenomeJob[];
  projects: GenomeProject[];
  publications: unknown[];
  education: GenomeEducation[];
  opportunities: unknown[];
  preferences: GenomePreferences;
  languages: GenomeLanguage[];
}

export interface GenomePerson {
  professionalHeadline: string;
  completion: number;
  showPhone: boolean;
  created: string;
  verified: boolean;
  flags: Record<string, unknown>;
  weight: number;
  ggId: string;
  completionStage: {
    stage: number;
    progress: number;
  };
  locale: string;
  subjectId: number;
  picture?: string;
  hasEmail: boolean;
  isTest: boolean;
  name: string;
  links: GenomeLink[];
  location?: GenomeLocation;
  theme: string;
  id: string;
  pictureThumbnail?: string;
  claimant: boolean;
  summaryOfBio?: string;
  publicId: string;
}

export interface GenomeLink {
  id: string;
  name: string;
  address: string;
}

export interface GenomeLocation {
  name: string;
  shortName: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeId: string;
}

export interface GenomeStats {
  jobs: number;
  education: number;
  projects: number;
  strengths: number;
}

export interface GenomeStrength {
  id: string;
  code: number;
  name: string;
  proficiency: 'no-experience-interested' | 'novice' | 'proficient' | 'expert' | 'master';
  implicitProficiency: boolean;
  weight: number;
  recommendations: number;
  media: unknown[];
  supra: boolean;
  created: string;
  hits: number;
  relatedExperiences: string[];
  pin: boolean;
}

export interface GenomeExperience {
  id: string;
  category: 'jobs' | 'education' | 'projects';
  name: string;
  organizations: GenomeOrganization[];
  responsibilities: string[];
  fromMonth?: string;
  fromYear: string;
  toMonth?: string;
  toYear?: string;
  additionalInfo?: string;
  highlighted: boolean;
  weight: number;
  verifications: number;
  recommendations: number;
  media: unknown[];
  rank: number;
  strengths: unknown[];
}

export interface GenomeOrganization {
  id: number;
  name: string;
  publicId?: string;
  picture?: string;
  theme?: string;
  serviceType?: string;
}

export interface GenomeJob {
  id: string;
  category: string;
  name: string;
  organizations: GenomeOrganization[];
  responsibilities: string[];
  fromMonth?: string;
  fromYear: string;
  toMonth?: string;
  toYear?: string;
  additionalInfo?: string;
  highlighted: boolean;
  weight: number;
  verifications: number;
  recommendations: number;
  media: unknown[];
  rank: number;
  strengths: unknown[];
}

export interface GenomeProject {
  id: string;
  category: string;
  name: string;
  organizations: GenomeOrganization[];
  responsibilities: string[];
  fromMonth?: string;
  fromYear: string;
  toMonth?: string;
  toYear?: string;
  additionalInfo?: string;
  highlighted: boolean;
  weight: number;
  verifications: number;
  recommendations: number;
  media: unknown[];
  rank: number;
  strengths: unknown[];
}

export interface GenomeEducation {
  id: string;
  category: string;
  name: string;
  organizations: GenomeOrganization[];
  responsibilities: string[];
  fromMonth?: string;
  fromYear: string;
  toMonth?: string;
  toYear?: string;
  additionalInfo?: string;
  highlighted: boolean;
  weight: number;
  verifications: number;
  recommendations: number;
  media: unknown[];
  rank: number;
  strengths: unknown[];
}

export interface GenomePreferences {
  jobsFullTime?: {
    active: boolean;
    private: boolean;
    desirableCompensation: {
      amount: number;
      currency: string;
      onlyDisclosed?: boolean;
      periodicity: string;
      publiclyVisible: boolean;
      implicit: boolean;
    };
  };
  flexibleJobs?: {
    active: boolean;
    private: boolean;
    desirableCompensation: {
      amount: number;
      currency: string;
      onlyDisclosed?: boolean;
      periodicity: string;
      publiclyVisible: boolean;
      implicit: boolean;
    };
  };
  internships?: {
    active: boolean;
    private: boolean;
    desirableCompensation: {
      amount: number;
      currency: string;
      periodicity: string;
      publiclyVisible: boolean;
      allowUnpaid?: boolean;
      implicit: boolean;
    };
  };
}

export interface GenomeLanguage {
  code: string;
  language: string;
  fluency: 'basic' | 'conversational' | 'fully-fluent' | 'native-or-bilingual';
}

// ============================================================================
// Analysis Types (for team analysis and delta calculation)
// ============================================================================

export interface SkillFrequency {
  skillName: string;
  count: number;
  percentage: number;
  proficiencyLevels: {
    [proficiency: string]: number; // Count per proficiency level
  };
}

export interface TeamAggregate {
  totalMembers: number;
  skills: SkillFrequency[];
  languages: {
    [languageCode: string]: {
      count: number;
      percentage: number;
      fluencyLevels: {
        [fluency: string]: number;
      };
    };
  };
}

export interface SkillDelta {
  skillName: string;
  candidateProficiency: string;
  teamCoverage: number; // Percentage of team with this skill
  teamProficiencyDistribution: {
    [proficiency: string]: number;
  };
  isRedundant: boolean;
  isValueAdd: boolean;
}

export interface LanguageDelta {
  languageCode: string;
  languageName: string;
  candidateFluency: string;
  teamCoverage: number;
  isValueAdd: boolean;
}

export interface DeltaAnalysis {
  redundantSkills: SkillDelta[];
  valueAddSkills: SkillDelta[];
  valueAddLanguages: LanguageDelta[];
  summary: {
    totalRedundantSkills: number;
    totalValueAddSkills: number;
    totalValueAddLanguages: number;
    totalTeamMembers: number;
  };
}

export interface RedundancyAlert {
  type: 'redundancy';
  severity: 'high' | 'medium' | 'low';
  message: string;
  skills: SkillDelta[];
  count: number;
}

export interface ValueAddAlert {
  type: 'value-add';
  message: string;
  skills: SkillDelta[];
  languages: LanguageDelta[];
}

// ============================================================================
// API Request Types
// ============================================================================

export interface EntitySearchRequest {
  query?: string;
  identityType?: 'person' | 'organization';
  limit?: number;
  meta?: boolean;
  excludeContacts?: boolean;
  organizationId?: number;
  [key: string]: unknown; // Allow for additional query parameters
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

