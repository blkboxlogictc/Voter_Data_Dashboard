import config from './config';

export interface CensusDataParams {
  // Geographic identifiers
  state: string;
  county: string;
  tract?: string;
  blockGroup?: string;
  
  // Year for data (defaults to most recent)
  year?: string;
}

export interface CensusDataResult {
  // Population statistics
  totalPopulation: number;
  votingAgePopulation: number;
  
  // Demographics
  raceDistribution: Record<string, number>;
  hispanicOrigin: {
    hispanic: number;
    nonHispanic: number;
  };
  
  // Socioeconomic indicators
  medianIncome: number;
  educationLevels: {
    lessThanHighSchool: number;
    highSchool: number;
    someCollege: number;
    bachelors: number;
    graduate: number;
  };
  
  // Housing and household data
  housingUnits: number;
  homeownershipRate: number;
  
  // Geographic identifiers
  geoid: string;
  geoName: string;
}

// New interfaces for ACS microdata mapping
export interface ACSMicrodataParams {
  state: string;
  county?: string;
  year?: string;
  variables: string[];
  filters?: Record<string, string>;
}

export interface DemographicMapData {
  geoid: string;
  name: string;
  coordinates: [number, number]; // [lat, lng]
  value: number;
  category: string;
  details: Record<string, any>;
}

export interface DemographicMapOptions {
  dataType: 'education' | 'income' | 'age' | 'sex' | 'householdSize';
  geographyLevel: 'state' | 'county' | 'tract' | 'blockGroup';
  colorScheme: 'sequential' | 'diverging' | 'categorical';
}

export interface ACSMicrodataResult {
  data: DemographicMapData[];
  metadata: {
    totalRecords: number;
    dataType: string;
    geographyLevel: string;
    year: string;
    source: string;
  };
}

/**
 * Census API Service
 *
 * Provides methods to fetch and process data from the U.S. Census Bureau APIs
 * Documentation: https://www.census.gov/data/developers/guidance/api-user-guide.html
 */
class CensusApiService {
  private apiKey: string;
  private baseUrl: string = 'https://api.census.gov/data';
  
  constructor() {
    // Get API key from config
    this.apiKey = config.censusApiKey || '';
    
    if (!this.apiKey) {
      console.warn('Census API key not found. Some features may be limited.');
    }
  }

  /**
   * Fetch all counties for a given state using server proxy
   */
  async fetchCounties(stateFips: string): Promise<Array<{
    name: string;
    fips: string;
    population: number;
    medianIncome: number;
  }>> {
    try {
      const url = `/api/census/counties/${stateFips}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Census proxy error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching counties:', error);
      throw new Error(`Failed to fetch counties: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Fetch all census tracts for a given state and county using local GeoJSON + API data
   */
  async fetchCensusTracts(stateFips: string, countyFips: string): Promise<Array<{
    name: string;
    geoid: string;
    population: number;
    medianIncome: number;
    demographics: any;
  }>> {
    try {
      // First, load local GeoJSON census tract boundaries
      const { loadCountyCensusTracts, hasLocalCensusData } = await import('@/assets/census');
      
      // Ensure county FIPS is 3 digits
      const formattedCountyFips = countyFips.padStart(3, '0');
      
      console.log(`Loading census tracts for state ${stateFips}, county ${formattedCountyFips}`);
      
      // Check if we have local data for this state
      if (hasLocalCensusData(stateFips)) {
        console.log(`Checking local GeoJSON data for state ${stateFips}`);
        
        // Load local census tract boundaries
        const localTracts = await loadCountyCensusTracts(stateFips, formattedCountyFips);
        
        // Only use local data if we have a reasonable number of tracts (more than 10)
        // Miami-Dade should have 600+ tracts, so 2 tracts indicates incomplete sample data
        if (localTracts.length > 10) {
          console.log(`Found ${localTracts.length} local census tracts for county ${formattedCountyFips} - using local data`);
          
          // Use local tract boundaries with Census API demographic data
          const tractsWithData = await Promise.all(
            localTracts.map(async (tract) => {
              try {
                // Extract tract code from GEOID (last 6 digits)
                const tractCode = tract.properties.TRACTCE;
                
                // Fetch demographic data for this specific tract from Census API
                const demographics = await this.fetchTractDemographicsFromAPI(stateFips, formattedCountyFips, tractCode);
                
                return {
                  name: tract.properties.NAME,
                  geoid: tract.properties.GEOID,
                  population: demographics?.totalPopulation || 0,
                  medianIncome: demographics?.medianIncome || 0,
                  demographics: demographics || {}
                };
              } catch (error) {
                console.warn(`Failed to fetch demographics for tract ${tract.properties.GEOID}:`, error);
                // Return tract with basic info if API call fails
                return {
                  name: tract.properties.NAME,
                  geoid: tract.properties.GEOID,
                  population: 0,
                  medianIncome: 0,
                  demographics: {}
                };
              }
            })
          );
          
          return tractsWithData;
        } else {
          console.warn(`Found only ${localTracts.length} local census tracts for county ${formattedCountyFips} - insufficient data, falling back to API`);
        }
      }
      
      // Fallback to API call if no local data is available
      console.log(`No local data available for state ${stateFips}, using Census API`);
      return this.fetchCensusTractsFromAPI(stateFips, formattedCountyFips);
    } catch (error: any) {
      console.error('Error fetching census tracts:', error);
      throw new Error(`Failed to fetch census tracts: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Fallback method to fetch census tracts from API when no local data is available
   */
  private async fetchCensusTractsFromAPI(stateFips: string, countyFips: string): Promise<Array<{
    name: string;
    geoid: string;
    population: number;
    medianIncome: number;
    demographics: any;
  }>> {
    try {
      const url = `/api/census/tracts/${stateFips}/${countyFips}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Census proxy error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching census tracts from API:', error);
      throw new Error(`Failed to fetch census tracts from API: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Fetch demographic data for a specific tract from Census API
   */
  private async fetchTractDemographicsFromAPI(stateFips: string, countyFips: string, tractCode: string): Promise<any> {
    try {
      // Use a simplified API call for basic demographics
      const apiKey = this.apiKey;
      const url = `https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E,B19013_001E&for=tract:${tractCode}&in=state:${stateFips}%20county:${countyFips}&key=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Census API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.length < 2) {
        return null;
      }
      
      const values = data[1];
      return {
        name: values[0],
        totalPopulation: parseInt(values[1]) || 0,
        medianIncome: parseInt(values[2]) || 0
      };
    } catch (error: any) {
      console.error('Error fetching tract demographics from API:', error);
      return null;
    }
  }

  /**
   * Fetch detailed demographic profile data for all census tracts in the US
   * Example: https://api.census.gov/data/2023/acs/acs5/profile?get=group(DP05)&ucgid=0100000US
   */
  async fetchDetailedDemographics(): Promise<any> {
    try {
      const url = `${this.baseUrl}/2023/acs/acs5/profile?get=group(DP05)&ucgid=0100000US&key=${this.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Census API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching detailed demographics:', error);
      throw new Error(`Failed to fetch detailed demographics: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Fetch demographic data for a specific tract using server proxy
   */
  async fetchTractDemographics(stateFips: string, countyFips: string, tractCode: string): Promise<any> {
    try {
      const url = `/api/census/tract-details/${stateFips}/${countyFips}/${tractCode}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Census proxy error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching tract demographics:', error);
      throw new Error(`Failed to fetch tract demographics: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get available data variables for a dataset
   */
  async getAvailableVariables(year: string = '2023', dataset: string = 'acs/acs5'): Promise<any> {
    try {
      const url = `${this.baseUrl}/${year}/${dataset}/variables.json`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Census API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching available variables:', error);
      throw new Error(`Failed to fetch available variables: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Fetch demographic data from the American Community Survey (ACS)
   */
  async fetchDemographicData(params: CensusDataParams): Promise<CensusDataResult> {
    try {
      const year = params.year || '2022'; // Default to 2022 ACS 5-year estimates
      const dataset = 'acs/acs5';
      
      // Define variables to fetch
      // See: https://api.census.gov/data/2022/acs/acs5/variables.html
      const variables = [
        'B01001_001E', // Total population
        'B01001_001E', // Population 18 years and over (voting age)
        'B02001_002E', // White alone
        'B02001_003E', // Black or African American alone
        'B02001_004E', // American Indian and Alaska Native alone
        'B02001_005E', // Asian alone
        'B02001_006E', // Native Hawaiian and Other Pacific Islander alone
        'B02001_007E', // Some other race alone
        'B02001_008E', // Two or more races
        'B03003_002E', // Not Hispanic or Latino
        'B03003_003E', // Hispanic or Latino
        'B19013_001E', // Median household income
        'B15003_002E', // No schooling completed
        'B15003_017E', // High school graduate
        'B15003_022E', // Bachelor's degree
        'B15003_023E', // Master's degree
        'B15003_024E', // Professional school degree
        'B15003_025E', // Doctorate degree
        'B25001_001E', // Housing units
        'B25003_002E', // Owner occupied
        'B25003_003E'  // Renter occupied
      ];
      
      // Construct the API URL
      let url = `${this.baseUrl}/${year}/${dataset}?get=${variables.join(',')}&for=`;
      
      // Add geographic parameters
      if (params.blockGroup) {
        url += `block%20group:${params.blockGroup}&in=state:${params.state}%20county:${params.county}%20tract:${params.tract}`;
      } else if (params.tract) {
        url += `tract:${params.tract}&in=state:${params.state}%20county:${params.county}`;
      } else {
        url += `county:${params.county}&in=state:${params.state}`;
      }
      
      // Add API key if available
      if (this.apiKey) {
        url += `&key=${this.apiKey}`;
      }
      
      // Fetch data from Census API
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Census API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the response (first row contains headers)
      const headers = data[0];
      const values = data[1]; // Assuming we're getting data for one geographic area
      
      if (!values) {
        throw new Error('No data returned from Census API');
      }
      
      // Map the values to our result structure
      const result: CensusDataResult = {
        totalPopulation: parseInt(values[0], 10),
        votingAgePopulation: parseInt(values[1], 10),
        raceDistribution: {
          white: parseInt(values[2], 10),
          black: parseInt(values[3], 10),
          nativeAmerican: parseInt(values[4], 10),
          asian: parseInt(values[5], 10),
          pacificIslander: parseInt(values[6], 10),
          other: parseInt(values[7], 10),
          multiracial: parseInt(values[8], 10)
        },
        hispanicOrigin: {
          nonHispanic: parseInt(values[9], 10),
          hispanic: parseInt(values[10], 10)
        },
        medianIncome: parseInt(values[11], 10),
        educationLevels: {
          lessThanHighSchool: parseInt(values[12], 10),
          highSchool: parseInt(values[13], 10),
          someCollege: 0, // Need to calculate from other fields
          bachelors: parseInt(values[14], 10),
          graduate: parseInt(values[15], 10) + parseInt(values[16], 10) + parseInt(values[17], 10)
        },
        housingUnits: parseInt(values[18], 10),
        homeownershipRate: parseInt(values[19], 10) / (parseInt(values[19], 10) + parseInt(values[20], 10)),
        geoid: values[values.length - 1],
        geoName: `${params.county} County, ${params.state}`
      };
      
      return result;
    } catch (error: any) {
      console.error('Error fetching census data:', error);
      throw new Error(`Failed to fetch census data: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Match census geographies to voting precincts
   * This is a complex problem as census geographies (tracts, block groups) don't align with voting precincts
   * We'll use a simplified approach of finding the best match based on geographic overlap
   */
  async matchCensusToPrecincts(
    geoJson: any, 
    censusData: Record<string, CensusDataResult>
  ): Promise<Record<string, CensusDataResult>> {
    // This is a placeholder for a more sophisticated matching algorithm
    // In a real implementation, you would:
    // 1. Use a spatial database or library to find overlaps between census geographies and precincts
    // 2. Allocate census data to precincts based on population-weighted geographic overlap
    // 3. Handle edge cases like precincts that span multiple census geographies
    
    const precinctCensusData: Record<string, CensusDataResult> = {};
    
    // For now, we'll just assign the county-level data to each precinct
    // In a real implementation, you would use tract or block group level data
    if (geoJson && geoJson.features) {
      geoJson.features.forEach((feature: any) => {
        const precinctId = feature.properties?.PRECINCT || 
                          feature.properties?.precinct || 
                          feature.properties?.id || 
                          'unknown';
        
        // Just use the first census data result for now (county level)
        const firstCensusKey = Object.keys(censusData)[0];
        if (firstCensusKey) {
          precinctCensusData[precinctId] = censusData[firstCensusKey];
        }
      });
    }
    
    return precinctCensusData;
  }
  
  /**
   * Calculate estimated unregistered voters by comparing census voting age population
   * with registered voter counts from the voter data
   */
  calculateUnregisteredVoters(
    precinctCensusData: Record<string, CensusDataResult>,
    registeredVotersByPrecinct: Record<string, number>
  ): Record<string, number> {
    const unregisteredVoters: Record<string, number> = {};
    
    Object.entries(precinctCensusData).forEach(([precinctId, censusData]) => {
      const registeredVoters = registeredVotersByPrecinct[precinctId] || 0;
      const votingAgePopulation = censusData.votingAgePopulation;
      
      // Calculate unregistered voters (with a floor of 0)
      unregisteredVoters[precinctId] = Math.max(0, votingAgePopulation - registeredVoters);
    });
    
    return unregisteredVoters;
  }

  /**
   * Fetch ACS microdata for demographic mapping
   * Similar to Bestneighborhood.org's detailed demographic visualizations
   */
  async fetchACSMicrodata(params: ACSMicrodataParams): Promise<ACSMicrodataResult> {
    try {
      const year = params.year || '2023';
      const dataset = 'acs/acs5/pums';
      
      // Build the API URL for microdata
      let url = `${this.baseUrl}/${year}/${dataset}?get=${params.variables.join(',')}`;
      
      // Add geographic filters
      if (params.county) {
        url += `&for=state:${params.state}&PUMA=${params.county}`;
      } else {
        url += `&for=state:${params.state}`;
      }
      
      // Add additional filters if provided
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          url += `&${key}=${value}`;
        });
      }
      
      // Add API key
      if (this.apiKey) {
        url += `&key=${this.apiKey}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`ACS Microdata API error: ${response.status} ${response.statusText}`);
      }
      
      const rawData = await response.json();
      
      // Process the microdata into map-ready format
      const processedData = this.processACSMicrodata(rawData, params);
      
      return {
        data: processedData,
        metadata: {
          totalRecords: processedData.length,
          dataType: params.variables.join(','),
          geographyLevel: params.county ? 'county' : 'state',
          year,
          source: 'American Community Survey'
        }
      };
    } catch (error: any) {
      console.error('Error fetching ACS microdata:', error);
      throw new Error(`Failed to fetch ACS microdata: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Process raw ACS microdata into demographic map format
   */
  private processACSMicrodata(rawData: any[], params: ACSMicrodataParams): DemographicMapData[] {
    if (!rawData || rawData.length < 2) {
      return [];
    }
    
    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    
    return dataRows.map((row, index) => {
      // Create a mapping of header to value
      const record: Record<string, any> = {};
      headers.forEach((header: string, i: number) => {
        record[header] = row[i];
      });
      
      // Extract geographic identifiers
      const state = record.state || params.state;
      const geoid = `${state}-${index}`;
      
      // Generate mock coordinates for demonstration
      // In a real implementation, you'd use actual geographic data
      const baseLatitude = 39.8283; // Center of US
      const baseLongitude = -98.5795;
      const coordinates: [number, number] = [
        baseLatitude + (Math.random() - 0.5) * 10,
        baseLongitude + (Math.random() - 0.5) * 20
      ];
      
      return {
        geoid,
        name: `Area ${index + 1}`,
        coordinates,
        value: this.calculateDemographicValue(record, params.variables),
        category: this.categorizeDemographicData(record, params.variables),
        details: record
      };
    });
  }

  /**
   * Calculate a representative value for mapping based on the requested variables
   */
  private calculateDemographicValue(record: Record<string, any>, variables: string[]): number {
    // This is a simplified calculation - in practice, you'd have specific logic
    // for each type of demographic variable
    
    if (variables.includes('SCHL')) {
      // Education level (SCHL variable)
      return parseInt(record.SCHL || '0', 10);
    }
    
    if (variables.includes('PINCP')) {
      // Personal income
      return parseInt(record.PINCP || '0', 10);
    }
    
    if (variables.includes('AGEP')) {
      // Age
      return parseInt(record.AGEP || '0', 10);
    }
    
    if (variables.includes('SEX')) {
      // Sex (1 = Male, 2 = Female)
      return parseInt(record.SEX || '0', 10);
    }
    
    if (variables.includes('NP')) {
      // Number of persons in household
      return parseInt(record.NP || '0', 10);
    }
    
    // Default to first numeric value found
    for (const variable of variables) {
      const value = parseInt(record[variable] || '0', 10);
      if (!isNaN(value)) {
        return value;
      }
    }
    
    return 0;
  }

  /**
   * Categorize demographic data for color coding
   */
  private categorizeDemographicData(record: Record<string, any>, variables: string[]): string {
    if (variables.includes('SCHL')) {
      const education = parseInt(record.SCHL || '0', 10);
      if (education >= 21) return 'Graduate Degree';
      if (education >= 19) return 'Bachelor\'s Degree';
      if (education >= 16) return 'High School';
      return 'Less than High School';
    }
    
    if (variables.includes('PINCP')) {
      const income = parseInt(record.PINCP || '0', 10);
      if (income >= 100000) return 'High Income';
      if (income >= 50000) return 'Middle Income';
      if (income >= 25000) return 'Low Income';
      return 'Very Low Income';
    }
    
    if (variables.includes('AGEP')) {
      const age = parseInt(record.AGEP || '0', 10);
      if (age >= 65) return 'Senior';
      if (age >= 35) return 'Middle Age';
      if (age >= 18) return 'Young Adult';
      return 'Minor';
    }
    
    if (variables.includes('SEX')) {
      const sex = parseInt(record.SEX || '0', 10);
      return sex === 1 ? 'Male' : 'Female';
    }
    
    return 'Other';
  }

  /**
   * Get predefined variable sets for common demographic analyses
   */
  getDemographicVariableSets(): Record<string, { variables: string[], description: string }> {
    return {
      education: {
        variables: ['SEX', 'PWGTP', 'SCHL'],
        description: 'Educational attainment levels'
      },
      income: {
        variables: ['SEX', 'PWGTP', 'PINCP'],
        description: 'Personal income distribution'
      },
      age: {
        variables: ['SEX', 'PWGTP', 'AGEP'],
        description: 'Age distribution'
      },
      sex: {
        variables: ['SEX', 'PWGTP'],
        description: 'Gender distribution'
      },
      householdSize: {
        variables: ['SEX', 'PWGTP', 'NP'],
        description: 'Household size distribution'
      },
      maritalStatus: {
        variables: ['SEX', 'PWGTP', 'MAR'],
        description: 'Marital status distribution'
      }
    };
  }

  /**
   * Fetch geographic boundaries for mapping
   * This would typically come from a separate geographic API or service
   */
  async fetchGeographicBoundaries(state: string, county?: string): Promise<any> {
    // This is a placeholder - in a real implementation, you'd fetch actual
    // geographic boundary data from the Census Bureau's TIGER/Line files
    // or a service like Mapbox
    
    try {
      // For now, return mock boundary data
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              GEOID: state + (county || ''),
              NAME: `Geographic Area ${state}${county ? '-' + county : ''}`
            },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [-100, 40],
                [-90, 40],
                [-90, 50],
                [-100, 50],
                [-100, 40]
              ]]
            }
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching geographic boundaries:', error);
      throw new Error('Failed to fetch geographic boundaries');
    }
  }
}

export const censusApi = new CensusApiService();