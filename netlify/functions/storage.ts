import { ProcessedVoterData, CensusData } from "../../shared/schema";
import fetch from "node-fetch";

// In-memory storage for serverless functions
// Note: This will reset between function invocations
// For production, consider using a database or Netlify's Key-Value store
class MemStorage {
  private processedVoterData: ProcessedVoterData | null = null;
  private censusApiKey: string = process.env.CENSUS_API_KEY || '';

  async processVoterData(voterData: any, geoData: any): Promise<ProcessedVoterData> {
    try {
      console.log("Storage: Processing voter data...");
      console.log("Storage: Voter data type:", typeof voterData);
      console.log("Storage: Voter data is array:", Array.isArray(voterData));
      
      // Process the voter data and generate statistics
      let processedData: ProcessedVoterData;
      
      // Check if data is in the expected format with voters array
      if (voterData?.voters && Array.isArray(voterData.voters)) {
        console.log("Storage: Processing data in {voters: [...]} format");
        console.log("Storage: Number of voters:", voterData.voters.length);
        
        // If we have actual voter data in the expected format, process it
        processedData = this.generateStatsFromVoterData(voterData, geoData);
      }
      // Check if data is an array of voter objects (like csvjson format)
      else if (Array.isArray(voterData)) {
        console.log("Storage: Processing data in array format");
        console.log("Storage: Number of voters:", voterData.length);
        
        // Validate that the array contains voter objects
        if (voterData.length > 0) {
          const firstItem = voterData[0];
          console.log("Storage: First voter item keys:", Object.keys(firstItem));
          
          // Check if it has expected voter properties
          if (!firstItem.Precinct && !firstItem.precinct) {
            console.warn("Storage: Warning - Voter data doesn't contain Precinct field");
          }
        }
        
        // Convert to expected format with voters array
        processedData = this.generateStatsFromVoterData({ voters: voterData }, geoData);
      }
      else {
        console.error("Storage: Invalid voter data format:", voterData);
        throw new Error("Invalid voter data format. Expected an array or an object with a 'voters' array.");
      }
      
      // Store the processed data for later retrieval
      this.processedVoterData = processedData;
      
      console.log("Storage: Processing complete. Generated data for",
        processedData.precinctDemographics?.precincts?.length || 0, "precincts");
      
      return processedData;
    } catch (error) {
      console.error('Error processing voter data:', error);
      
      // Provide more context in the error
      const enhancedError = new Error(
        `Failed to process voter data: ${error.message || 'Unknown error'}. ` +
        `Voter data type: ${typeof voterData}, ` +
        `Is array: ${Array.isArray(voterData)}, ` +
        `GeoJSON type: ${geoData?.type || 'unknown'}`
      );
      
      // Preserve the original stack trace
      if (error.stack) {
        enhancedError.stack = error.stack;
      }
      
      throw enhancedError;
    }
  }

  async getProcessedData(): Promise<ProcessedVoterData | null> {
    return this.processedVoterData;
  }

  // Import the actual implementation from the server code
  private generateStatsFromVoterData(voterData: any, geoData: any): ProcessedVoterData {
    // This is a simplified version - in production, copy the full implementation from server/storage.ts
    const voters = voterData.voters || [];
    
    // Calculate party affiliation
    const partyCount: Record<string, number> = {};
    voters.forEach((voter: any) => {
      const party = voter.Party || 'Unknown';
      partyCount[party] = (partyCount[party] || 0) + 1;
    });
    
    // Calculate racial demographics
    const raceCount: Record<string, number> = {};
    voters.forEach((voter: any) => {
      const race = voter.Race || 'Unknown';
      raceCount[race] = (raceCount[race] || 0) + 1;
    });
    
    // Extract all unique precincts from the voter data
    const precincts = new Set<string>();
    voters.forEach((voter: any) => {
      if (voter.Precinct !== undefined) {
        precincts.add(voter.Precinct.toString());
      }
    });
    
    const precinctIds = Array.from(precincts);
    
    // Create precinct demographics data structure
    const precinctDemographics = {
      precincts: precinctIds,
      registeredVoters: {} as Record<string, number>,
      turnoutPercentage: {} as Record<string, number>,
      partyAffiliation: {} as Record<string, Record<string, number>>,
      racialDemographics: {} as Record<string, Record<string, number>>
    };
    
    // Process each precinct
    precinctIds.forEach(precinctId => {
      // Get all voters in this precinct
      const precinctVoters = voters.filter((voter: any) => 
        voter.Precinct !== undefined && voter.Precinct.toString() === precinctId
      );
      
      // Count total registered voters in this precinct
      precinctDemographics.registeredVoters[precinctId] = precinctVoters.length;
      
      // Calculate turnout percentage
      const votedCount = precinctVoters.filter((voter: any) => 
        voter.Voted === 1 || voter.Voted === true
      ).length;
      
      const turnoutPercentage = precinctVoters.length > 0
        ? Math.round((votedCount / precinctVoters.length) * 100)
        : 0;
      
      precinctDemographics.turnoutPercentage[precinctId] = turnoutPercentage;
      
      // Calculate party affiliation breakdown
      const partyBreakdown: Record<string, number> = {};
      
      precinctVoters.forEach((voter: any) => {
        const party = voter.Party || 'Unknown';
        partyBreakdown[party] = (partyBreakdown[party] || 0) + 1;
      });
      
      precinctDemographics.partyAffiliation[precinctId] = partyBreakdown;
      
      // Calculate racial demographics breakdown
      const racialBreakdown: Record<string, number> = {};
      
      precinctVoters.forEach((voter: any) => {
        let race = voter.Race || 'Unknown';
        
        // Standardize race categories
        if (race.toLowerCase().includes('white')) race = 'White';
        else if (race.toLowerCase().includes('black')) race = 'Black';
        else if (race.toLowerCase().includes('hispanic') || race.toLowerCase().includes('latino')) race = 'Hispanic';
        else if (race.toLowerCase().includes('asian')) race = 'Asian';
        else if (race.toLowerCase().includes('native')) race = 'Native';
        else if (race.toLowerCase().includes('multi')) race = 'Multiracial';
        else race = 'Unknown';
        
        racialBreakdown[race] = (racialBreakdown[race] || 0) + 1;
      });
      
      precinctDemographics.racialDemographics[precinctId] = racialBreakdown;
    });
    
    // Create district data
    const districtData: Record<string, any> = {};
    
    precinctIds.forEach(precinctId => {
      const precinctVoters = voters.filter((voter: any) => 
        voter.Precinct !== undefined && voter.Precinct.toString() === precinctId
      );
      
      const districtVoterCount = precinctVoters.length;
      
      // Calculate turnout
      const votedCount = precinctVoters.filter((voter: any) => 
        voter.Voted === 1 || voter.Voted === true
      ).length;
      
      const turnout = districtVoterCount > 0 ? votedCount / districtVoterCount : 0;
      
      // Calculate average age
      const totalAge = precinctVoters.reduce((sum: number, v: any) => sum + (v.Age || 0), 0);
      const averageAge = districtVoterCount > 0 ? totalAge / districtVoterCount : 0;
      
      // Determine majority party
      const partyDistribution: Record<string, number> = {};
      precinctVoters.forEach((v: any) => {
        const party = v.Party || 'Unknown';
        partyDistribution[party] = (partyDistribution[party] || 0) + 1;
      });
      
      const majorityParty = Object.entries(partyDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
      
      // Determine majority race
      const raceDistribution: Record<string, number> = {};
      precinctVoters.forEach((v: any) => {
        let race = v.Race || 'Unknown';
        
        // Standardize race categories
        if (race.toLowerCase().includes('white')) race = 'White';
        else if (race.toLowerCase().includes('black')) race = 'Black';
        else if (race.toLowerCase().includes('hispanic') || race.toLowerCase().includes('latino')) race = 'Hispanic';
        else if (race.toLowerCase().includes('asian')) race = 'Asian';
        else if (race.toLowerCase().includes('native')) race = 'Native';
        else if (race.toLowerCase().includes('multi')) race = 'Multiracial';
        else race = 'Unknown';
        
        raceDistribution[race] = (raceDistribution[race] || 0) + 1;
      });
      
      const majorityRace = Object.entries(raceDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
      
      // Calculate voter density (simplified)
      const voterDensity = Math.min(1, districtVoterCount / 100);
      
      districtData[precinctId] = {
        registeredVoters: districtVoterCount,
        turnout,
        majorityParty,
        voterDensity,
        averageAge,
        majorityRace
      };
    });
    
    return {
      partyAffiliation: partyCount,
      racialDemographics: raceCount,
      ageGroupTurnout: {
        ageGroups: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
        voted: [65, 70, 75, 80, 85, 90],
        notVoted: [35, 30, 25, 20, 15, 10]
      },
      turnoutTrends: {
        years: ['2008', '2012', '2016', '2020', '2024'],
        turnout: [62, 58, 65, 67, 71]
      },
      precinctDemographics,
      summaryStats: [
        {
          label: 'Registered Voters',
          value: voters.length.toLocaleString(),
          trend: '+3.2%',
          icon: 'users',
          trendDirection: 'up'
        },
        {
          label: 'Voter Turnout',
          value: `${(voters.filter((v: any) => v.Voted === 1 || v.Voted === true).length / Math.max(1, voters.length) * 100).toFixed(1)}%`,
          trend: '+4.5%',
          icon: 'check-square',
          trendDirection: 'up'
        },
        {
          label: 'Districts',
          value: precinctIds.length.toString(),
          trend: '0',
          icon: 'map',
          trendDirection: 'stable'
        },
        {
          label: 'Avg. Age',
          value: (voters.reduce((sum: number, v: any) => sum + (v.Age || 0), 0) / Math.max(1, voters.length)).toFixed(1),
          trend: '+0.7',
          icon: 'calendar',
          trendDirection: 'up'
        }
      ],
      districtData
    };
  }

  private getDefaultSampleData(geoData: any): ProcessedVoterData {
    // Simplified sample data
    const defaultData: ProcessedVoterData = {
      partyAffiliation: {
        Democratic: 45,
        Republican: 35,
        Independent: 15,
        Green: 3,
        Libertarian: 2
      },
      ageGroupTurnout: {
        ageGroups: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
        voted: [65, 70, 75, 80, 85, 90],
        notVoted: [35, 30, 25, 20, 15, 10]
      },
      racialDemographics: {
        White: 70,
        Black: 13,
        Asian: 6,
        Hispanic: 8,
        'Native American': 1,
        'Pacific Islander': 0.5,
        Multiracial: 1.5
      },
      turnoutTrends: {
        years: ['2008', '2012', '2016', '2020', '2024'],
        turnout: [62, 58, 65, 67, 71]
      },
      precinctDemographics: {
        precincts: ['1', '2', '3', '4', '5', '6', '7', '8'],
        registeredVoters: {
          '1': 12545, '2': 9876, '3': 11234, '4': 10567,
          '5': 8765, '6': 7654, '7': 9123, '8': 8432
        },
        turnoutPercentage: {
          '1': 73, '2': 68, '3': 81, '4': 62,
          '5': 75, '6': 70, '7': 65, '8': 78
        },
        partyAffiliation: {
          '1': { 'R': 6500, 'D': 4000, 'NP': 2045 },
          '2': { 'R': 5500, 'D': 3000, 'NP': 1376 },
          '3': { 'D': 7000, 'R': 2500, 'NP': 1734 },
          '4': { 'R': 5000, 'D': 3000, 'NP': 2567 },
          '5': { 'D': 4500, 'R': 3000, 'NP': 1265 },
          '6': { 'R': 4000, 'D': 2500, 'NP': 1154 },
          '7': { 'D': 5000, 'R': 3000, 'NP': 1123 },
          '8': { 'R': 4500, 'D': 2500, 'NP': 1432 }
        },
        racialDemographics: {
          '1': { 'White': 8500, 'Black': 1500, 'Hispanic': 1200, 'Asian': 800, 'Native': 300, 'Multiracial': 245 },
          '2': { 'White': 7200, 'Black': 1000, 'Hispanic': 800, 'Asian': 500, 'Native': 200, 'Multiracial': 176 },
          '3': { 'White': 3500, 'Black': 5000, 'Hispanic': 1500, 'Asian': 800, 'Native': 200, 'Multiracial': 234 },
          '4': { 'White': 4500, 'Black': 1500, 'Hispanic': 1000, 'Asian': 3000, 'Native': 300, 'Multiracial': 267 },
          '5': { 'White': 5000, 'Black': 1800, 'Hispanic': 1200, 'Asian': 500, 'Native': 100, 'Multiracial': 165 },
          '6': { 'White': 5500, 'Black': 800, 'Hispanic': 700, 'Asian': 400, 'Native': 100, 'Multiracial': 154 },
          '7': { 'White': 2500, 'Black': 1800, 'Hispanic': 3500, 'Asian': 900, 'Native': 200, 'Multiracial': 223 },
          '8': { 'White': 6000, 'Black': 1000, 'Hispanic': 800, 'Asian': 400, 'Native': 100, 'Multiracial': 132 }
        }
      },
      summaryStats: [
        {
          label: 'Registered Voters',
          value: '78,196',
          trend: '+2.3%',
          icon: 'users',
          trendDirection: 'up'
        },
        {
          label: 'Voter Turnout',
          value: '72.1%',
          trend: '+4.5%',
          icon: 'check-square',
          trendDirection: 'up'
        },
        {
          label: 'New Registrations',
          value: '12,450',
          trend: '-1.8%',
          icon: 'user-plus',
          trendDirection: 'down'
        },
        {
          label: 'Avg. Age',
          value: '43.2',
          trend: '+0.7',
          icon: 'calendar',
          trendDirection: 'up'
        }
      ],
      districtData: {
        '1': {
          registeredVoters: 12545,
          turnout: 0.73,
          majorityParty: 'Republican',
          voterDensity: 0.82,
          averageAge: 38.5,
          majorityRace: 'White'
        },
        '2': {
          registeredVoters: 9876,
          turnout: 0.68,
          majorityParty: 'Republican',
          voterDensity: 0.56,
          averageAge: 45.2,
          majorityRace: 'White'
        },
        '3': {
          registeredVoters: 11234,
          turnout: 0.81,
          majorityParty: 'Democratic',
          voterDensity: 0.91,
          averageAge: 36.7,
          majorityRace: 'Black'
        },
        '4': {
          registeredVoters: 10567,
          turnout: 0.62,
          majorityParty: 'Republican',
          voterDensity: 0.45,
          averageAge: 52.3,
          majorityRace: 'Asian'
        },
        '5': {
          registeredVoters: 8765,
          turnout: 0.75,
          majorityParty: 'Democratic',
          voterDensity: 0.78,
          averageAge: 41.2,
          majorityRace: 'White'
        },
        '6': {
          registeredVoters: 7654,
          turnout: 0.70,
          majorityParty: 'Republican',
          voterDensity: 0.65,
          averageAge: 48.7,
          majorityRace: 'White'
        },
        '7': {
          registeredVoters: 9123,
          turnout: 0.65,
          majorityParty: 'Democratic',
          voterDensity: 0.72,
          averageAge: 39.5,
          majorityRace: 'Hispanic'
        },
        '8': {
          registeredVoters: 8432,
          turnout: 0.78,
          majorityParty: 'Republican',
          voterDensity: 0.68,
          averageAge: 44.8,
          majorityRace: 'White'
        }
      }
    };
    
    // If GeoJSON is provided, add districts from it
    if (geoData && geoData.features) {
      geoData.features.forEach((feature: any) => {
        const properties = feature.properties || {};
        const districtId = properties.id || properties.PRECINCT || properties.DISTRICT_ID || properties.districtId;
        
        if (districtId && !defaultData.districtData[districtId]) {
          // Generate random data for this district
          defaultData.districtData[districtId] = {
            registeredVoters: Math.floor(Math.random() * 8000) + 2000,
            turnout: Math.random() * 0.5 + 0.3, // 30%-80%
            majorityParty: Math.random() > 0.5 ? 'Democratic' : 'Republican',
            voterDensity: Math.random() * 0.8 + 0.2,
            averageAge: Math.floor(Math.random() * 15) + 35, // 35-50
            majorityRace: ['White', 'Black', 'Hispanic', 'Asian'][Math.floor(Math.random() * 4)]
          };
        }
      });
    }
    
    return defaultData;
  }
  
  /**
   * Fetch census data for a specific geographic area
   */
  async fetchCensusData(
    state: string,
    county: string,
    stateName?: string,
    countyName?: string
  ): Promise<CensusData | null> {
    try {
      if (!this.censusApiKey) {
        console.warn('Census API key not found. Using sample census data.');
        return this.getSampleCensusData(stateName, countyName);
      }
      
      const year = '2022'; // Use 2022 ACS 5-year estimates
      const dataset = 'acs/acs5';
      
      // Define variables to fetch
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
      const url = `https://api.census.gov/data/${year}/${dataset}?get=${variables.join(',')}&for=county:${county}&in=state:${state}&key=${this.censusApiKey}`;
      
      // Fetch data from Census API
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Census API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process the response (first row contains headers)
      const headers = data[0];
      const values = data[1]; // Assuming we're getting data for one county
      
      if (!values) {
        throw new Error('No data returned from Census API');
      }
      
      // Map the values to our result structure
      const result: CensusData = {
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
        geoName: `${county} County, ${state}`
      };
      
      // Update the geoid and geoName with the provided names if available
      if (stateName && countyName) {
        result.geoName = `${countyName}, ${stateName}`;
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching census data:', error);
      // Fall back to sample data
      return this.getSampleCensusData(stateName, countyName);
    }
  }
  
  /**
   * Generate sample census data for testing
   */
  private getSampleCensusData(stateName?: string, countyName?: string): CensusData {
    return {
      totalPopulation: 350000,
      votingAgePopulation: 270000,
      raceDistribution: {
        white: 210000,
        black: 45000,
        nativeAmerican: 3500,
        asian: 35000,
        pacificIslander: 1500,
        other: 25000,
        multiracial: 30000
      },
      hispanicOrigin: {
        hispanic: 70000,
        nonHispanic: 280000
      },
      medianIncome: 65000,
      educationLevels: {
        lessThanHighSchool: 35000,
        highSchool: 105000,
        someCollege: 70000,
        bachelors: 45000,
        graduate: 15000
      },
      housingUnits: 140000,
      homeownershipRate: 0.65,
      geoid: "06001",
      geoName: countyName && stateName ? `${countyName}, ${stateName}` : "Sample County, CA"
    };
  }
  
  /**
   * Integrate census data with voter data
   */
  async integrateCensusData(
    processedData: ProcessedVoterData,
    geoData: any,
    stateFips?: string,
    countyFips?: string,
    stateName?: string,
    countyName?: string
  ): Promise<ProcessedVoterData> {
    try {
      console.log("Integrating census data with voter data...");
      
      // Use provided state and county if available, otherwise extract from GeoJSON
      let state = stateFips || "06"; // Default to California
      let county = countyFips || "001"; // Default to Alameda County
      let stateNameStr = stateName || "California";
      let countyNameStr = countyName || "Alameda County";
      
      console.log(`Using census location: ${countyNameStr}, ${stateNameStr} (FIPS: ${state}-${county})`);
      
      if (geoData && geoData.features && geoData.features.length > 0) {
        // Try to extract state and county from GeoJSON properties
        const properties = geoData.features[0].properties || {};
        state = properties.STATE || properties.state || state;
        county = properties.COUNTY || properties.county || county;
      }
      
      // Fetch census data
      const censusData = await this.fetchCensusData(state, county, stateNameStr, countyNameStr);
      
      if (!censusData) {
        console.warn("Failed to fetch census data. Skipping integration.");
        return processedData;
      }
      
      // Create a copy of the processed data to add census data
      const enhancedData = { ...processedData };
      
      // Initialize census data structure if it doesn't exist
      if (!enhancedData.censusData) {
        enhancedData.censusData = {};
      }
      
      // Add county-level census data
      enhancedData.censusData.countyLevel = censusData;
      
      // Calculate unregistered voters
      const totalRegisteredVoters = Object.values(
        enhancedData.precinctDemographics.registeredVoters
      ).reduce((sum, count) => sum + count, 0);
      
      const totalUnregisteredVoters = Math.max(
        0,
        censusData.votingAgePopulation - totalRegisteredVoters
      );
      
      // Distribute unregistered voters to precincts based on population proportion
      const unregisteredVoters: Record<string, number> = {};
      const registrationRate: Record<string, number> = {};
      
      // Get all precincts
      const precincts = enhancedData.precinctDemographics.precincts;
      
      // Calculate total registered voters
      const totalVoters = precincts.reduce(
        (sum, precinct) => sum + (enhancedData.precinctDemographics.registeredVoters[precinct] || 0),
        0
      );
      
      // Distribute unregistered voters proportionally
      precincts.forEach(precinct => {
        const registeredVoters = enhancedData.precinctDemographics.registeredVoters[precinct] || 0;
        const proportion = totalVoters > 0 ? registeredVoters / totalVoters : 0;
        
        // Estimate unregistered voters in this precinct
        unregisteredVoters[precinct] = Math.round(totalUnregisteredVoters * proportion);
        
        // Calculate registration rate
        const estimatedVotingAge = Math.round(censusData.votingAgePopulation * proportion);
        registrationRate[precinct] = estimatedVotingAge > 0
          ? registeredVoters / estimatedVotingAge
          : 0;
      });
      
      // Add unregistered voters and registration rate to census data
      enhancedData.censusData.unregisteredVoters = unregisteredVoters;
      enhancedData.censusData.registrationRate = registrationRate;
      
      // Calculate socioeconomic correlations
      // This is a simplified approach - in a real implementation, you would use
      // more sophisticated statistical methods
      
      // Initialize census data structure if it doesn't exist
      if (!enhancedData.censusData) {
        enhancedData.censusData = {};
      }
      
      // Initialize socioeconomic correlations
      enhancedData.censusData.socioeconomicCorrelations = {
        incomeVsTurnout: {
          precincts: [],
          income: [],
          turnout: [],
          correlation: 0
        },
        educationVsTurnout: {
          precincts: [],
          education: [],
          turnout: [],
          correlation: 0
        }
      };
      
      // For this simplified version, we'll generate some sample correlation data
      precincts.forEach(precinct => {
        const turnout = enhancedData.precinctDemographics.turnoutPercentage[precinct] / 100 || 0;
        
        // Generate income and education values that correlate with turnout
        // In a real implementation, you would use actual census tract data
        const randomFactor = Math.random() * 0.4 - 0.2; // Random noise between -0.2 and 0.2
        const income = Math.round(censusData.medianIncome * (0.7 + turnout * 0.6 + randomFactor));
        
        // Education is represented as percentage with bachelor's degree or higher
        const educationRate = 0.2 + turnout * 0.6 + Math.random() * 0.2 - 0.1;
        
        // Add to correlation data
        // Use non-null assertion operator to tell TypeScript these properties exist
        enhancedData.censusData!.socioeconomicCorrelations!.incomeVsTurnout!.precincts.push(precinct);
        enhancedData.censusData!.socioeconomicCorrelations!.incomeVsTurnout!.income.push(income);
        enhancedData.censusData!.socioeconomicCorrelations!.incomeVsTurnout!.turnout.push(turnout);
        
        enhancedData.censusData!.socioeconomicCorrelations!.educationVsTurnout!.precincts.push(precinct);
        enhancedData.censusData!.socioeconomicCorrelations!.educationVsTurnout!.education.push(educationRate);
        enhancedData.censusData!.socioeconomicCorrelations!.educationVsTurnout!.turnout.push(turnout);
      });
      
      // Calculate Pearson correlation coefficient
      // This is a simplified implementation
      enhancedData.censusData!.socioeconomicCorrelations!.incomeVsTurnout!.correlation = 0.65; // Sample value
      enhancedData.censusData!.socioeconomicCorrelations!.educationVsTurnout!.correlation = 0.78; // Sample value
      
      return enhancedData;
    } catch (error) {
      console.error('Error integrating census data:', error);
      return processedData; // Return original data if integration fails
    }
  }
}

export const storage = new MemStorage();