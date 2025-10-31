/**
 * Area Mapping Service
 * Maps external area names (e.g., from Bangalore) to Mysore areas based on:
 * - Semantic similarity
 * - Area characteristics (central, highway, residential, etc.)
 * - Traffic patterns
 */

export interface AreaMapping {
  externalName: string;
  mappedArea: string;
  confidence: number;
  reason: string;
}

// Mysore areas with their characteristics
const MYSORE_AREA_PROFILES = {
  'Mysore Palace Area': {
    keywords: ['palace', 'central', 'downtown', 'city center', 'main', 'heritage'],
    type: 'central',
    trafficProfile: 'high-medium'
  },
  'Gokulam': {
    keywords: ['residential', 'north', 'layout', 'suburb', 'neighborhood'],
    type: 'residential',
    trafficProfile: 'low-medium'
  },
  'Jayalakshmipuram': {
    keywords: ['residential', 'north', 'layout', 'suburb', 'colony'],
    type: 'residential',
    trafficProfile: 'medium'
  },
  'Vijayanagar': {
    keywords: ['market', 'commercial', 'shopping', 'business', 'east'],
    type: 'commercial',
    trafficProfile: 'high'
  },
  'KRS Road': {
    keywords: ['highway', 'road', 'expressway', 'route', 'corridor', 'south'],
    type: 'highway',
    trafficProfile: 'high'
  },
  'Chamundi Hill Road': {
    keywords: ['hill', 'scenic', 'tourist', 'religious', 'temple', 'route'],
    type: 'tourist',
    trafficProfile: 'medium'
  },
  'Bannimantap': {
    keywords: ['central', 'residential', 'mixed', 'area'],
    type: 'mixed',
    trafficProfile: 'medium'
  },
  'Kuvempunagar': {
    keywords: ['residential', 'west', 'layout', 'suburb', 'quiet'],
    type: 'residential',
    trafficProfile: 'low-medium'
  },
  'Hebbal': {
    keywords: ['industrial', 'warehouse', 'east', 'business', 'commercial'],
    type: 'industrial',
    trafficProfile: 'medium-high'
  },
  'Saraswathipuram': {
    keywords: ['residential', 'north', 'colony', 'suburb', 'layout'],
    type: 'residential',
    trafficProfile: 'low'
  }
};

/**
 * Calculate similarity score between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Word overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w)).length;
  
  if (commonWords > 0) {
    return 0.6 * (commonWords / Math.max(words1.length, words2.length));
  }
  
  return 0;
}

/**
 * Map external area name to Mysore area
 */
export function mapAreaToMysore(externalAreaName: string): AreaMapping {
  const normalizedInput = externalAreaName.toLowerCase().trim();
  
  let bestMatch = {
    area: 'Mysore Palace Area', // Default fallback
    score: 0,
    reason: 'default'
  };
  
  // Try to find best match
  for (const [mysoreArea, profile] of Object.entries(MYSORE_AREA_PROFILES)) {
    let score = 0;
    let matchedKeyword = '';
    
    // Check direct name similarity
    const nameSimilarity = calculateSimilarity(normalizedInput, mysoreArea);
    if (nameSimilarity > score) {
      score = nameSimilarity;
      matchedKeyword = 'name similarity';
    }
    
    // Check keyword matches
    for (const keyword of profile.keywords) {
      if (normalizedInput.includes(keyword)) {
        const keywordScore = 0.7 + (keyword.length / normalizedInput.length) * 0.2;
        if (keywordScore > score) {
          score = keywordScore;
          matchedKeyword = `keyword: ${keyword}`;
        }
      }
    }
    
    // Update best match
    if (score > bestMatch.score) {
      bestMatch = {
        area: mysoreArea,
        score,
        reason: matchedKeyword
      };
    }
  }
  
  // If no good match found, use intelligent fallback based on common patterns
  if (bestMatch.score < 0.3) {
    bestMatch = intelligentFallback(normalizedInput);
  }
  
  return {
    externalName: externalAreaName,
    mappedArea: bestMatch.area,
    confidence: Math.min(bestMatch.score, 0.95),
    reason: bestMatch.reason
  };
}

/**
 * Intelligent fallback for unmapped areas
 */
function intelligentFallback(areaName: string): { area: string; score: number; reason: string } {
  // Highway/Road patterns
  if (/highway|expressway|nh-|sh-|route|corridor/i.test(areaName)) {
    return { area: 'KRS Road', score: 0.6, reason: 'highway pattern' };
  }
  
  // Central/Downtown patterns
  if (/central|downtown|city center|main|mg road|brigade/i.test(areaName)) {
    return { area: 'Mysore Palace Area', score: 0.6, reason: 'central area pattern' };
  }
  
  // Commercial patterns
  if (/market|commercial|shopping|mall|business|trade/i.test(areaName)) {
    return { area: 'Vijayanagar', score: 0.6, reason: 'commercial pattern' };
  }
  
  // Industrial patterns
  if (/industrial|warehouse|factory|peenya|whitefield/i.test(areaName)) {
    return { area: 'Hebbal', score: 0.6, reason: 'industrial pattern' };
  }
  
  // Residential patterns
  if (/layout|colony|nagar|puram|extension|stage|block/i.test(areaName)) {
    return { area: 'Gokulam', score: 0.6, reason: 'residential pattern' };
  }
  
  // Tourist/Scenic patterns
  if (/temple|hill|park|garden|tourist|monument/i.test(areaName)) {
    return { area: 'Chamundi Hill Road', score: 0.6, reason: 'tourist pattern' };
  }
  
  // Default to central area
  return { area: 'Mysore Palace Area', score: 0.4, reason: 'default central' };
}

/**
 * Batch map multiple area names
 */
export function mapAreasToMysore(externalAreas: string[]): Map<string, AreaMapping> {
  const mappings = new Map<string, AreaMapping>();
  
  for (const area of externalAreas) {
    const mapping = mapAreaToMysore(area);
    mappings.set(area.toLowerCase(), mapping);
  }
  
  return mappings;
}

/**
 * Get area characteristics for traffic prediction
 */
export function getAreaCharacteristics(mysoreArea: string) {
  return MYSORE_AREA_PROFILES[mysoreArea as keyof typeof MYSORE_AREA_PROFILES] || 
    MYSORE_AREA_PROFILES['Mysore Palace Area'];
}
