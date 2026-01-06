import type {
  OpportunityResponse,
  EntitySearchResult,
  EntitySearchRequest,
  GenomeResponse,
  ApiError,
} from '../types/api';

// API Base URLs
const TORRE_API_BASE = 'https://torre.ai/api';
const TORRE_SEARCH_BASE = 'https://search.torre.co';

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status?: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates and parses JSON response
 */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new ApiClientError(
      `API request failed: ${response.statusText}`,
      response.status,
      response.status.toString(),
      errorText
    );
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new ApiClientError(
      'Failed to parse JSON response',
      response.status,
      'PARSE_ERROR',
      error
    );
  }
}

/**
 * Parses a stream of JSON objects (one per line)
 */
function parseStreamResponse(text: string): EntitySearchResult[] {
  const lines = text.trim().split('\n');
  const results: EntitySearchResult[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const parsed = JSON.parse(line) as EntitySearchResult;
      results.push(parsed);
    } catch (error) {
      // Skip invalid JSON lines but log for debugging
      console.warn('Failed to parse line in stream:', line, error);
    }
  }

  return results;
}

/**
 * Fetches job opportunity details by job ID
 * GET /suite/opportunities/$job-id
 * 
 * @param jobId - The job ID from the opportunity URL (e.g., "PW9yY63W")
 * @returns Promise resolving to the opportunity response
 * @throws ApiClientError if the request fails or response is invalid
 */
export async function getOpportunity(jobId: string): Promise<OpportunityResponse> {
  if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
    throw new ApiClientError('Job ID is required and must be a non-empty string', 400, 'INVALID_INPUT');
  }

  try {
    const url = `${TORRE_API_BASE}/suite/opportunities/${encodeURIComponent(jobId.trim())}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await parseJsonResponse<OpportunityResponse>(response);

    // Validate response structure
    if (!data.id || !data.organizations || !Array.isArray(data.organizations)) {
      throw new ApiClientError(
        'Invalid opportunity response: missing required fields',
        response.status,
        'INVALID_RESPONSE',
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      `Failed to fetch opportunity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      'NETWORK_ERROR',
      error
    );
  }
}

/**
 * Searches for entities (people or organizations) using the search stream endpoint
 * POST /entities/_searchStream
 * 
 * @param query - Search query parameters
 * @returns Promise resolving to an array of search results
 * @throws ApiClientError if the request fails or response is invalid
 */
export async function searchEntities(query: EntitySearchRequest): Promise<EntitySearchResult[]> {
  if (!query || typeof query !== 'object') {
    throw new ApiClientError('Search query is required and must be an object', 400, 'INVALID_INPUT');
  }

  try {
    const url = `${TORRE_API_BASE}/entities/_searchStream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiClientError(
        `Entity search failed: ${response.statusText}`,
        response.status,
        response.status.toString(),
        errorText
      );
    }

    // The searchStream endpoint returns a text stream of JSON objects (one per line)
    const text = await response.text();
    const results = parseStreamResponse(text);

    if (results.length === 0 && query.limit && query.limit > 0) {
      // This is not necessarily an error - just no results found
      return [];
    }

    return results;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      `Failed to search entities: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      'NETWORK_ERROR',
      error
    );
  }
}

/**
 * Fetches genome (bio) information for a given username
 * GET /genome/bios/$username
 * 
 * @param username - The username from the genome URL (e.g., "renanpeixotox")
 * @returns Promise resolving to the genome response
 * @throws ApiClientError if the request fails or response is invalid
 */
export async function getGenome(username: string): Promise<GenomeResponse> {
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    throw new ApiClientError('Username is required and must be a non-empty string', 400, 'INVALID_INPUT');
  }

  try {
    // Normalize input and extract the final username segment.
    const raw = username.trim();

    // Remove scheme+host if user pasted a full URL
    let cleanUsername = raw.replace(/^https?:\/\/[^\/]+/i, '');

    // If the path includes '/bios/<username>' prefer the <username> after /bios/
    const biosMatch = cleanUsername.match(/\/?bios\/([^\/\s]+)$/i);
    if (biosMatch && biosMatch[1]) {
      cleanUsername = biosMatch[1];
    } else {
      // Otherwise take the last non-empty path segment
      const parts = cleanUsername.split('/').filter(Boolean);
      cleanUsername = parts.length ? parts[parts.length - 1] : cleanUsername;
    }

    // Final trim and guard
    cleanUsername = String(cleanUsername).trim().replace(/^\//, '');
    if (!cleanUsername) {
      throw new ApiClientError('Username required', 400, 'INVALID_INPUT');
    }

    // Use local server-side proxy route to avoid CORS in browser
    const url = `/api/genome/${encodeURIComponent(cleanUsername)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await parseJsonResponse<GenomeResponse>(response);

    // Validate response structure
    if (!data.person || !data.strengths || !Array.isArray(data.strengths)) {
      throw new ApiClientError(
        'Invalid genome response: missing required fields',
        response.status,
        'INVALID_RESPONSE',
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      `Failed to fetch genome: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      'NETWORK_ERROR',
      error
    );
  }
}

/**
 * Helper function to extract organization ID from opportunity response
 * 
 * @param opportunity - The opportunity response
 * @returns The organization ID, or null if not found
 */
export function extractOrganizationId(opportunity: OpportunityResponse): number | null {
  if (!opportunity.organizations || opportunity.organizations.length === 0) {
    return null;
  }
  return opportunity.organizations[0].id ?? null;
}

/**
 * Helper function to search for team members at an organization
 * 
 * @param organizationId - The organization ID to search for
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Promise resolving to an array of team member search results
 */
export async function searchTeamMembers(
  orgIdentifier: number | string,
  limit: number = 20
): Promise<EntitySearchResult[]> {
  if (orgIdentifier === undefined || orgIdentifier === null) {
    throw new ApiClientError('Organization identifier is required', 400, 'INVALID_INPUT');
  }

  // If caller passed a string (organization name or publicId), use it as the search query.
  if (typeof orgIdentifier === 'string') {
    const orgName = orgIdentifier.trim();
    if (!orgName) {
      throw new ApiClientError('Organization name is empty', 400, 'INVALID_INPUT');
    }

    const request: EntitySearchRequest = {
      query: orgName,
      identityType: 'person',
      limit,
      meta: true,
      excludeContacts: true,
    };

    try {
      const results = await searchEntities(request);
      return results;
    } catch (err) {
      throw new ApiClientError(
        `Entity search by organization name failed: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'SEARCH_FAILED',
        err
      );
    }
  }

  // If caller passed a number, try several shapes (best-effort) then fall back to using the numeric id as a plain query.
  if (typeof orgIdentifier === 'number') {
    const organizationId = orgIdentifier;
    if (!organizationId || isNaN(organizationId) || organizationId <= 0) {
      throw new ApiClientError('Organization ID must be a positive number', 400, 'INVALID_ORG_ID');
    }

    const candidateRequests: EntitySearchRequest[] = [
      { query: '', identityType: 'person', limit, meta: true, excludeContacts: true, organizationNumericId: organizationId },
      { query: '', identityType: 'person', limit, meta: true, excludeContacts: true, organizationId: organizationId },
      { query: '', identityType: 'person', limit, meta: true, excludeContacts: true, organization: { id: organizationId } },
      { query: '', identityType: 'person', limit, meta: true, excludeContacts: true, organization: { numericId: organizationId } },
      // fallback: use numeric id as a plain query (may match org pages / members)
      { query: String(organizationId), identityType: 'person', limit, meta: true, excludeContacts: true },
    ];

    let lastError: unknown = null;

    for (const req of candidateRequests) {
      try {
        const results = await searchEntities(req);
        return results;
      } catch (err) {
        lastError = err;
        if (err instanceof ApiClientError && err.status && err.status >= 400 && err.status < 500) {
          continue;
        }
        throw new ApiClientError(
          `Entity search failed: ${err instanceof Error ? err.message : String(err)}`,
          undefined,
          'SEARCH_FAILED',
          err
        );
      }
    }

    throw new ApiClientError(
      'Entity search did not accept any tested organization filters',
      undefined,
      'SEARCH_NO_FILTER_MATCH',
      lastError
    );
  }

  throw new ApiClientError('Unsupported organization identifier type', 400, 'INVALID_INPUT');
}
