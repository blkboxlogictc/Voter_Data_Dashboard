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
      // Placeholder for data processing logic
      // In a real implementation, this would process and analyze the JSON data
      
      // Example of processed data structure with mock values for demonstration
      const processedData: ProcessedVoterData = {
        partyAffiliation: {
          'Democratic': 42,
          'Republican': 38,
          'Independent': 15,
          'Green': 3,
          'Libertarian': 2
        },
        ageGroupTurnout: {
          ageGroups: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
          voted: [15, 22, 28, 32, 38, 42],
          notVoted: [25, 18, 12, 8, 6, 4]
        },
        racialDemographics: {
          'White': 65,
          'Black': 12,
          'Hispanic': 15,
          'Asian': 5,
          'Other': 3
        },
        turnoutTrends: {
          years: ['2012', '2014', '2016', '2018', '2020', '2022'],
          turnout: [58, 42, 60, 50, 66, 48]
        },
        summaryStats: [
          {
            label: 'Total Registered Voters',
            value: '487,392',
            trend: '+5.2% from last election',
            icon: 'how_to_reg',
            trendDirection: 'up'
          },
          {
            label: 'Voter Turnout',
            value: '62.8%',
            trend: '+3.1% from last election',
            icon: 'poll',
            trendDirection: 'up'
          },
          {
            label: 'Districts Reporting',
            value: '124/124',
            trend: 'All districts processed',
            icon: 'check_circle',
            trendDirection: 'stable'
          }
        ],
        districtData: {}
      };

      // Process district data by matching GeoJSON with voter data
      // This would be more complex in a real implementation
      if (geoData && geoData.features) {
        geoData.features.forEach((feature: any) => {
          const districtId = feature.properties.id || 
                            feature.properties.PRECINCT || 
                            feature.properties.DISTRICT_ID ||
                            feature.properties.districtId;
          
          if (districtId) {
            // In a real implementation, this would match with actual voter data
            processedData.districtData[districtId] = {
              registeredVoters: Math.floor(Math.random() * 10000) + 1000,
              turnout: Math.random() * 0.8 + 0.2,
              majorityParty: Math.random() > 0.5 ? 'Democratic' : 'Republican',
              averageAge: Math.floor(Math.random() * 20) + 35,
              voterDensity: Math.random(),
              majorityRace: 'White'
            };
          }
        });
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
}

export const storage = new MemStorage();
