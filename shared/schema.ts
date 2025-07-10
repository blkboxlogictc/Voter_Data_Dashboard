import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Voter data schema
export const voterData = pgTable("voter_data", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoterDataSchema = createInsertSchema(voterData).pick({
  fileName: true,
  data: true,
});

export type InsertVoterData = z.infer<typeof insertVoterDataSchema>;
export type VoterData = typeof voterData.$inferSelect;

// Geo data schema
export const geoData = pgTable("geo_data", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGeoDataSchema = createInsertSchema(geoData).pick({
  fileName: true,
  data: true,
});

export type InsertGeoData = z.infer<typeof insertGeoDataSchema>;
export type GeoData = typeof geoData.$inferSelect;

// Types for frontend data handling
export type DistrictType = 'precinct' | 'stateHouse' | 'stateSenate' | 'congressional';

export type SummaryStatistic = {
  label: string;
  value: string | number;
  trend?: string;
  icon: string;
  trendDirection?: 'up' | 'down' | 'stable';
};

export type CensusData = {
  totalPopulation: number;
  votingAgePopulation: number;
  raceDistribution: Record<string, number>;
  hispanicOrigin: {
    hispanic: number;
    nonHispanic: number;
  };
  medianIncome: number;
  educationLevels: {
    lessThanHighSchool: number;
    highSchool: number;
    someCollege: number;
    bachelors: number;
    graduate: number;
  };
  housingUnits: number;
  homeownershipRate: number;
  geoid: string;
  geoName: string;
};

export type ProcessedVoterData = {
  partyAffiliation: Record<string, number>;
  ageGroupTurnout: {
    ageGroups: string[];
    voted: number[];
    notVoted: number[];
  };
  racialDemographics: Record<string, number>;
  turnoutTrends: {
    years: string[];
    turnout: number[];
  };
  precinctDemographics: {
    precincts: string[];
    registeredVoters: Record<string, number>;
    turnoutPercentage: Record<string, number>;
    partyAffiliation: Record<string, Record<string, number>>;
    racialDemographics: Record<string, Record<string, number>>;
    _turnoutTracking?: Record<string, { voted: number; total: number }>;
  };
  summaryStats: SummaryStatistic[];
  districtData: Record<string, any>;
  
  // Internal tracking data for chunked processing
  _ageTracking?: {
    totalAge: number;
    totalVoters: number;
  };
  
  // Census data integration
  censusData?: {
    countyLevel?: CensusData;
    byPrecinct?: Record<string, CensusData>;
    unregisteredVoters?: Record<string, number>;
    registrationRate?: Record<string, number>;
    socioeconomicCorrelations?: {
      incomeVsTurnout?: {
        precincts: string[];
        income: number[];
        turnout: number[];
        correlation: number;
      };
      educationVsTurnout?: {
        precincts: string[];
        education: number[];
        turnout: number[];
        correlation: number;
      };
    };
  };
};
