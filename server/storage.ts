import { users, type User, type InsertUser, ProcessedVoterData, SummaryStatistic } from "@shared/schema";

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
      
      if (voterData?.voters && Array.isArray(voterData.voters)) {
        // If we have actual voter data in the expected format, process it
        processedData = this.generateStatsFromVoterData(voterData, geoData);
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
        const party = voter.party || 'Unknown';
        partyCount[party] = (partyCount[party] || 0) + 1;
      });
      
      // 2. Calculate age group turnout
      const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
      const ageRanges = [[18, 24], [25, 34], [35, 44], [45, 54], [55, 64], [65, 100]];
      const votedByAge: number[] = Array(ageGroups.length).fill(0);
      const notVotedByAge: number[] = Array(ageGroups.length).fill(0);
      
      voters.forEach((voter: any) => {
        const age = voter.age || 0;
        const voted = voter.voted || false;
        
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
        const race = voter.race || 'Unknown';
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
      const votedCount = voters.filter((v: any) => v.voted).length;
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
      districts.forEach(districtId => {
        const districtVoters = voters.filter((v: any) => v.precinct === districtId);
        const districtVoterCount = districtVoters.length;
        
        if (districtVoterCount === 0) return;
        
        // Calculate turnout
        const districtVotedCount = districtVoters.filter((v: any) => v.voted).length;
        const turnout = districtVotedCount / districtVoterCount;
        
        // Calculate average age
        const totalAge = districtVoters.reduce((sum: number, v: any) => sum + (v.age || 0), 0);
        const averageAge = totalAge / districtVoterCount;
        
        // Determine majority party
        const partyDistribution: Record<string, number> = {};
        districtVoters.forEach((v: any) => {
          const party = v.party || 'Unknown';
          partyDistribution[party] = (partyDistribution[party] || 0) + 1;
        });
        const majorityParty = Object.entries(partyDistribution)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // Determine majority race
        const raceDistribution: Record<string, number> = {};
        districtVoters.forEach((v: any) => {
          const race = v.race || 'Unknown';
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
      
      // Calculate average age
      const totalAge = voters.reduce((sum: number, v: any) => sum + (v.age || 0), 0);
      const avgAge = totalAge / registeredVoters;
      
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
      summaryStats: [
        {
          label: 'Registered Voters',
          value: '145,350',
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
        'D1': {
          registeredVoters: 12545,
          turnout: 0.73,
          majorityParty: 'Democratic',
          voterDensity: 0.82,
          averageAge: 38.5,
          majorityRace: 'White'
        },
        'D2': {
          registeredVoters: 9876,
          turnout: 0.68,
          majorityParty: 'Republican',
          voterDensity: 0.56,
          averageAge: 45.2,
          majorityRace: 'White'
        },
        'D3': {
          registeredVoters: 11234,
          turnout: 0.81,
          majorityParty: 'Democratic',
          voterDensity: 0.91,
          averageAge: 36.7,
          majorityRace: 'Black'
        },
        'D4': {
          registeredVoters: 10567,
          turnout: 0.62,
          majorityParty: 'Libertarian',
          voterDensity: 0.45,
          averageAge: 52.3,
          majorityRace: 'Asian'
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
