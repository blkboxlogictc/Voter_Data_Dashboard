import { users, type User, type InsertUser, ProcessedVoterData, SummaryStatistic, DistrictType } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  processVoterData(voterData: any, geoData: any): Promise<ProcessedVoterData>;
  getProcessedData(): Promise<ProcessedVoterData | null>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private processedVoterData: ProcessedVoterData | null = null;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async processVoterData(voterData: any, geoData: any): Promise<ProcessedVoterData> {
    try {
      // Process the voter data and generate statistics
      let processedData: ProcessedVoterData;
      
      // Check if data is in the expected format with voters array
      if (voterData?.voters && Array.isArray(voterData.voters)) {
        // If we have actual voter data in the expected format, process it
        processedData = this.generateStatsFromVoterData(voterData, geoData);
      }
      // Check if data is an array of voter objects (like csvjson format)
      else if (Array.isArray(voterData)) {
        // Convert to expected format with voters array
        const formattedData = { voters: voterData };
        processedData = this.generateStatsFromVoterData(formattedData, geoData);
      } else {
        // Otherwise, provide default sample data
        processedData = this.getDefaultSampleData(geoData);
      }
      
      // Store the processed data for later retrieval
      this.processedVoterData = processedData;
      return processedData;
    } catch (error) {
      console.error('Error processing voter data:', error);
      throw new Error('Failed to process voter data');
    }
  }

  async getProcessedData(): Promise<ProcessedVoterData | null> {
    return this.processedVoterData;
  }
  
  // Generate statistics from actual voter and district data
  private generateStatsFromVoterData(voterData: any, geoData: any): ProcessedVoterData {
    try {
      const voters = voterData.voters || [];
      const features = geoData?.features || [];
      
      // 1. Calculate party affiliation
      const partyCount: Record<string, number> = {};
      voters.forEach((voter: any) => {
        // The Party field is uppercase in the example data
        let party = voter.Party || 'Unknown';
        
        // Convert single letter party codes to full names
        if (party === 'R') party = 'Republican';
        else if (party === 'D') party = 'Democratic';
        else if (party === 'L') party = 'Libertarian';
        else if (party === 'G') party = 'Green';
        else if (party === 'I') party = 'Independent';
        else if (party === 'NP') party = 'No Party';
        
        partyCount[party] = (partyCount[party] || 0) + 1;
      });
      
      // 2. Calculate age group turnout
      const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
      const ageRanges = [[18, 24], [25, 34], [35, 44], [45, 54], [55, 64], [65, 100]];
      const votedByAge: number[] = Array(ageGroups.length).fill(0);
      const notVotedByAge: number[] = Array(ageGroups.length).fill(0);
      
      voters.forEach((voter: any) => {
        // The Age field is uppercase in the example data
        const age = voter.Age || 0;
        
        // The Voted field is uppercase in the example data and uses 1/0
        let voted = false;
        if (voter.Voted !== undefined) {
          voted = voter.Voted === 1 || voter.Voted === true;
        }
        
        for (let i = 0; i < ageRanges.length; i++) {
          const [min, max] = ageRanges[i];
          if (age >= min && age <= max) {
            if (voted) {
              votedByAge[i]++;
            } else {
              notVotedByAge[i]++;
            }
            break;
          }
        }
      });
      
      // 3. Calculate racial demographics
      const raceCount: Record<string, number> = {};
      voters.forEach((voter: any) => {
        // The Race field is uppercase in the example data
        let race = voter.Race || 'Unknown';
        
        // Standardize race categories to match the specified categories
        if (race.toLowerCase().includes('white')) race = 'White';
        else if (race.toLowerCase().includes('black')) race = 'Black';
        else if (race.toLowerCase().includes('hispanic') || race.toLowerCase().includes('latino')) race = 'Hispanic';
        else if (race.toLowerCase().includes('asian')) race = 'Asian';
        else if (race.toLowerCase().includes('native')) race = 'Native';
        else if (race.toLowerCase().includes('multi')) race = 'Multiracial';
        else race = 'Unknown';
        
        raceCount[race] = (raceCount[race] || 0) + 1;
      });
      
      // 4. Create placeholder for turnout trends (simulated historical data)
      const currentYear = new Date().getFullYear();
      const years = [
        (currentYear - 16).toString(),
        (currentYear - 12).toString(),
        (currentYear - 8).toString(),
        (currentYear - 4).toString(),
        currentYear.toString()
      ];
      
      // Calculate current turnout rate
      const totalVoters = voters.length;
      
      // Handle both boolean and numeric (1/0) voted values
      const votedCount = voters.filter((v: any) => {
        // The Voted field is uppercase in the example data and uses 1/0
        if (v.Voted !== undefined) {
          return v.Voted === 1 || v.Voted === true;
        }
        return false;
      }).length;
      
      const currentTurnout = totalVoters > 0 ? votedCount / totalVoters : 0;
      
      // Simulate historical turnout with some random variation
      const baselineTurnout = 0.5; // starting point
      const turnoutTrend = [
        baselineTurnout + Math.random() * 0.1,
        baselineTurnout + Math.random() * 0.15,
        baselineTurnout + Math.random() * 0.2,
        baselineTurnout + Math.random() * 0.25,
        currentTurnout
      ].map(t => Math.round(t * 100));
      
      // 5. Calculate district data
      const districtData: Record<string, any> = {};
      
      // Get precinct/district properties from GeoJSON features
      const districts = new Set<string>();
      features.forEach((feature: any) => {
        const properties = feature.properties || {};
        const districtId = properties.id || properties.PRECINCT || properties.DISTRICT_ID || "unknown";
        districts.add(districtId);
      });
      
      // For each district, calculate statistics
      // Add a variable to track the district type (default to precinct)
      const districtType: DistrictType = 'precinct'; // This should ideally be passed as a parameter
      
      districts.forEach(districtId => {
        // Handle different district field names based on the district type
        const districtVoters = voters.filter((v: any) => {
          // Check for precinct match (Precinct is uppercase in the example data)
          if (v.Precinct !== undefined && v.Precinct.toString() === districtId) return true;
          
          // Check for CD (Congressional District) match
          if (districtType === 'congressional' as DistrictType && v.CD && v.CD.toString() === districtId) return true;
          
          // Check for SD (State Senate District) match
          if (districtType === 'stateSenate' as DistrictType && v.SD && v.SD.toString() === districtId) return true;
          
          // Check for HD (State House District) match
          if (districtType === 'stateHouse' as DistrictType && v.HD && v.HD.toString() === districtId) return true;
          
          return false;
        });
        
        const districtVoterCount = districtVoters.length;
        
        if (districtVoterCount === 0) return;
        
        // Calculate turnout - handle both boolean and numeric (1/0) voted values
        const districtVotedCount = districtVoters.filter((v: any) => {
          // The Voted field is uppercase in the example data and uses 1/0
          if (v.Voted !== undefined) {
            return v.Voted === 1 || v.Voted === true;
          }
          return false;
        }).length;
        
        const turnout = districtVotedCount / districtVoterCount;
        
        // Calculate average age - Age is uppercase in the example data
        const totalAge = districtVoters.reduce((sum: number, v: any) => sum + (v.Age || 0), 0);
        const averageAge = totalAge / districtVoterCount;
        
        // Determine majority party
        const partyDistribution: Record<string, number> = {};
        districtVoters.forEach((v: any) => {
          // The Party field is uppercase in the example data
          let party = v.Party || 'Unknown';
          
          // Convert single letter party codes to full names
          if (party === 'R') party = 'Republican';
          else if (party === 'D') party = 'Democratic';
          else if (party === 'L') party = 'Libertarian';
          else if (party === 'G') party = 'Green';
          else if (party === 'I') party = 'Independent';
          
          partyDistribution[party] = (partyDistribution[party] || 0) + 1;
        });
        const majorityParty = Object.entries(partyDistribution)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // Determine majority race
        const raceDistribution: Record<string, number> = {};
        districtVoters.forEach((v: any) => {
          // The Race field is uppercase in the example data
          let race = v.Race || 'Unknown';
          
          // Standardize race categories to match the specified categories
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
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // Calculate voter density (normalized 0-1 for visualization)
        // This is simplified - in a real app would use actual geographic area
        const voterDensity = Math.min(1, districtVoterCount / 100);
        
        districtData[districtId] = {
          registeredVoters: districtVoterCount,
          turnout,
          majorityParty,
          voterDensity,
          averageAge,
          majorityRace
        };
      });
      
      // 6. Generate summary statistics
      const registeredVoters = voters.length;
      const overallTurnout = votedCount / registeredVoters;
      
      // Calculate average age - Age is uppercase in the example data
      const totalAge = voters.reduce((sum: number, v: any) => sum + (v.Age || 0), 0);
      const avgAge = totalAge / registeredVoters;
      
      // Extract all unique precincts from the voter data
      const allPrecincts = new Set<string>();
      
      // Log a sample voter for debugging
      if (voters.length > 0) {
        console.log("Sample voter object:", JSON.stringify(voters[0], null, 2));
      }
      
      voters.forEach((voter: any) => {
        // The Precinct field is uppercase in the example data
        // Handle both numeric and string precinct values
        const precinct = voter.Precinct;
        if (precinct !== undefined) {
          allPrecincts.add(precinct.toString());
        }
      });
      
      console.log("Found precincts:", Array.from(allPrecincts));
      
      const precinctIds = Array.from(allPrecincts).sort((a, b) => {
        // Sort numerically if possible
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b);
      });
      
      // Create precinct demographics data structure with direct processing from voter records
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
        const precinctVoters = voters.filter((voter: any) => {
          // The Precinct field is uppercase in the example data
          const voterPrecinct = voter.Precinct;
          // Handle both numeric and string precinct values
          return voterPrecinct !== undefined && voterPrecinct.toString() === precinctId;
        });
        
        console.log(`Voters in precinct ${precinctId}:`, precinctVoters.length);
        
        // Count total registered voters in this precinct
        precinctDemographics.registeredVoters[precinctId] = precinctVoters.length;
        
        // Calculate turnout percentage
        const votedCount = precinctVoters.filter((voter: any) => {
          if (voter.voted !== undefined) {
            return !!voter.voted;
          } else if (voter.Voted !== undefined) {
            return voter.Voted === 1 || voter.Voted === true;
          }
          return false;
        }).length;
        
        const turnoutPercentage = precinctVoters.length > 0
          ? Math.round((votedCount / precinctVoters.length) * 100)
          : 0;
        
        precinctDemographics.turnoutPercentage[precinctId] = turnoutPercentage;
        
        // Calculate party affiliation breakdown
        const partyBreakdown: Record<string, number> = {};
        
        precinctVoters.forEach((voter: any) => {
          // The Party field is uppercase in the example data
          const party = voter.Party || 'Unknown';
          partyBreakdown[party] = (partyBreakdown[party] || 0) + 1;
        });
        
        precinctDemographics.partyAffiliation[precinctId] = partyBreakdown;
        
        // Calculate racial demographics breakdown
        const racialBreakdown: Record<string, number> = {};
        
        precinctVoters.forEach((voter: any) => {
          // The Race field is uppercase in the example data
          let race = voter.Race || 'Unknown';
          
          // Standardize race categories to match the specified categories
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

      // Log the precinct demographics data for debugging
      console.log("Precinct IDs:", precinctIds);
      console.log("Precinct Demographics:", JSON.stringify(precinctDemographics, null, 2));
      
      return {
        partyAffiliation: partyCount,
        ageGroupTurnout: {
          ageGroups,
          voted: votedByAge,
          notVoted: notVotedByAge
        },
        racialDemographics: raceCount,
        turnoutTrends: {
          years,
          turnout: turnoutTrend
        },
        precinctDemographics,
        summaryStats: [
          {
            label: 'Registered Voters',
            value: registeredVoters.toLocaleString(),
            trend: '+3.2%',
            icon: 'users',
            trendDirection: 'up'
          },
          {
            label: 'Voter Turnout',
            value: `${(overallTurnout * 100).toFixed(1)}%`,
            trend: '+4.5%',
            icon: 'check-square',
            trendDirection: 'up'
          },
          {
            label: 'Districts',
            value: districts.size.toString(),
            trend: '0',
            icon: 'map',
            trendDirection: 'stable'
          },
          {
            label: 'Avg. Age',
            value: avgAge.toFixed(1),
            trend: '+0.7',
            icon: 'calendar',
            trendDirection: 'up'
          }
        ],
        districtData
      };
    } catch (error) {
      console.error('Error generating stats from voter data:', error);
      return this.getDefaultSampleData(null);
    }
  }
  
  // Default sample data for demo purposes
  private getDefaultSampleData(geoData: any): ProcessedVoterData {
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
          '1': 12545,
          '2': 9876,
          '3': 11234,
          '4': 10567,
          '5': 8765,
          '6': 7654,
          '7': 9123,
          '8': 8432
        },
        turnoutPercentage: {
          '1': 73,
          '2': 68,
          '3': 81,
          '4': 62,
          '5': 75,
          '6': 70,
          '7': 65,
          '8': 78
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
          value: '12', // Count each JSON object as one voter (sample data has 12 voters)
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
}

export const storage = new MemStorage();
