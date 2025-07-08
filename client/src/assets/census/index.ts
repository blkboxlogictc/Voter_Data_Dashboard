// Census GeoJSON Data Index
// This file provides access to local census tract boundaries with proper GEOIDs

export interface CensusTractFeature {
  type: 'Feature';
  properties: {
    GEOID: string;           // 11-digit census tract GEOID
    NAME: string;            // Human-readable name
    STATEFP: string;         // 2-digit state FIPS code
    COUNTYFP: string;        // 3-digit county FIPS code
    TRACTCE: string;         // 6-digit tract code
    NAMELSAD: string;        // Legal/statistical area description
    MTFCC: string;           // MAF/TIGER feature class code
    FUNCSTAT: string;        // Functional status
    ALAND: number;           // Land area in square meters
    AWATER: number;          // Water area in square meters
    INTPTLAT: string;        // Internal point latitude
    INTPTLON: string;        // Internal point longitude
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface CensusGeoJSON {
  type: 'FeatureCollection';
  name: string;
  crs: {
    type: 'name';
    properties: {
      name: string;
    };
  };
  features: CensusTractFeature[];
}

// State information with FIPS codes and data availability
export interface StateInfo {
  name: string;
  code: string;
  fips: string;
  hasLocalTracts: boolean;
  majorCounties: Array<{
    name: string;
    fips: string;
    tractCount: number;
  }>;
}

// Available states with local census tract data
export const AVAILABLE_STATES: Record<string, StateInfo> = {
  '12': {
    name: 'Florida',
    code: 'FL',
    fips: '12',
    hasLocalTracts: true,
    majorCounties: [
      { name: 'Miami-Dade County', fips: '086', tractCount: 2 },
      { name: 'Martin County', fips: '111', tractCount: 2 }
    ]
  },
  '06': {
    name: 'California',
    code: 'CA',
    fips: '06',
    hasLocalTracts: true,
    majorCounties: [
      { name: 'Los Angeles County', fips: '037', tractCount: 2 },
      { name: 'San Francisco County', fips: '075', tractCount: 2 }
    ]
  },
  '48': {
    name: 'Texas',
    code: 'TX',
    fips: '48',
    hasLocalTracts: true,
    majorCounties: [
      { name: 'Harris County', fips: '201', tractCount: 2 },
      { name: 'Dallas County', fips: '113', tractCount: 2 }
    ]
  },
  '36': {
    name: 'New York',
    code: 'NY',
    fips: '36',
    hasLocalTracts: true,
    majorCounties: [
      { name: 'New York County', fips: '061', tractCount: 2 },
      { name: 'Kings County', fips: '047', tractCount: 2 }
    ]
  }
};

// Dynamic import functions for each state
export const loadStateCensusTracts = async (stateFips: string): Promise<CensusGeoJSON | null> => {
  try {
    switch (stateFips) {
      case '12': // Florida
        const floridaData = await import('./florida-tracts.json');
        return floridaData.default as CensusGeoJSON;
      
      case '06': // California
        const californiaData = await import('./california-tracts.json');
        return californiaData.default as CensusGeoJSON;
      
      case '48': // Texas
        const texasData = await import('./texas-tracts.json');
        return texasData.default as CensusGeoJSON;
      
      case '36': // New York
        const newyorkData = await import('./newyork-tracts.json');
        return newyorkData.default as CensusGeoJSON;
      
      default:
        console.warn(`No local census tract data available for state FIPS: ${stateFips}`);
        return null;
    }
  } catch (error) {
    console.error(`Error loading census tracts for state ${stateFips}:`, error);
    return null;
  }
};

// Get census tracts for a specific county
export const loadCountyCensusTracts = async (
  stateFips: string, 
  countyFips: string
): Promise<CensusTractFeature[]> => {
  const stateData = await loadStateCensusTracts(stateFips);
  
  if (!stateData) {
    return [];
  }
  
  // Filter tracts for the specific county
  return stateData.features.filter(
    feature => feature.properties.COUNTYFP === countyFips
  );
};

// Get a specific census tract by GEOID
export const getCensusTractByGeoId = async (geoid: string): Promise<CensusTractFeature | null> => {
  if (geoid.length !== 11) {
    console.error('Invalid GEOID format. Expected 11 digits.');
    return null;
  }
  
  const stateFips = geoid.substring(0, 2);
  const countyFips = geoid.substring(2, 5);
  
  const countyTracts = await loadCountyCensusTracts(stateFips, countyFips);
  
  return countyTracts.find(tract => tract.properties.GEOID === geoid) || null;
};

// Validate GEOID format
export const validateGeoId = (geoid: string): boolean => {
  // Standard census tract GEOID is 11 digits: SSCCCTTTTTT
  // SS = State FIPS (2 digits)
  // CCC = County FIPS (3 digits)  
  // TTTTTT = Tract code (6 digits)
  return /^\d{11}$/.test(geoid);
};

// Parse GEOID into components
export const parseGeoId = (geoid: string): {
  state: string;
  county: string;
  tract: string;
  isValid: boolean;
} => {
  if (!validateGeoId(geoid)) {
    return {
      state: '',
      county: '',
      tract: '',
      isValid: false
    };
  }
  
  return {
    state: geoid.substring(0, 2),
    county: geoid.substring(2, 5),
    tract: geoid.substring(5, 11),
    isValid: true
  };
};

// Get all available GEOIDs for a state
export const getAvailableGeoIds = async (stateFips: string): Promise<string[]> => {
  const stateData = await loadStateCensusTracts(stateFips);
  
  if (!stateData) {
    return [];
  }
  
  return stateData.features.map(feature => feature.properties.GEOID);
};

// Check if local data is available for a state
export const hasLocalCensusData = (stateFips: string): boolean => {
  return AVAILABLE_STATES[stateFips]?.hasLocalTracts || false;
};

// Get state information
export const getStateInfo = (stateFips: string): StateInfo | null => {
  return AVAILABLE_STATES[stateFips] || null;
};