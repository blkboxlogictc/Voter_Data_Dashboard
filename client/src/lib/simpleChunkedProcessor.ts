import { apiRequest } from './queryClient';

interface ProcessingOptions {
  chunkSize?: number;
  onProgress?: (progress: number, stage: string) => void;
  onStageChange?: (stage: string) => void;
}

export class SimpleChunkedProcessor {
  private chunkSize: number;
  private onProgress?: (progress: number, stage: string) => void;
  private onStageChange?: (stage: string) => void;

  constructor(options: ProcessingOptions = {}) {
    this.chunkSize = options.chunkSize || 5000; // 5000 records per chunk
    this.onProgress = options.onProgress;
    this.onStageChange = options.onStageChange;
  }

  async processLargeDataset(
    voterData: any[],
    geoData: any,
    censusLocation?: {
      state: string;
      county: string;
      stateName: string;
      countyName: string;
    }
  ): Promise<any> {
    
    // Check if data is small enough for direct processing
    if (voterData.length <= this.chunkSize) {
      this.updateStage('Processing data directly...');
      return this.processDirectly(voterData, geoData, censusLocation);
    }

    // Use chunked processing for large datasets
    this.updateStage('Preparing chunked processing...');
    this.updateProgress(10, 'Splitting data into chunks...');
    
    // Step 1: Split voter data into chunks
    const chunks = this.splitIntoChunks(voterData);
    console.log(`Split ${voterData.length} records into ${chunks.length} chunks`);
    
    this.updateProgress(30, 'Sending data for processing...');
    this.updateStage('Processing large dataset...');
    
    // Step 2: Check if the payload is still too large
    const payload = {
      voterDataChunks: chunks,
      geoData,
      censusLocation,
      totalRecords: voterData.length
    };
    
    const payloadSize = JSON.stringify(payload).length;
    console.log(`Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)}MB`);
    
    // If payload is still too large (> 5MB), we need to process chunks individually
    if (payloadSize > 5 * 1024 * 1024) {
      console.log('Payload too large, processing chunks individually...');
      return this.processChunksIndividually(chunks, geoData, censusLocation);
    }
    
    // Step 3: Send all chunks at once to the processing function
    const response = await apiRequest('POST', '/api/process-large-data', payload);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Processing failed');
    }

    this.updateProgress(100, 'Processing completed!');
    this.updateStage('Processing completed!');
    
    return response.json();
  }

  private async processChunksIndividually(
    chunks: any[][],
    geoData: any,
    censusLocation?: any
  ): Promise<any> {
    this.updateStage('Processing chunks individually...');
    
    let combinedProcessedData: any = null;
    const totalChunks = chunks.length;
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = chunks[i];
      const progress = 30 + ((i / totalChunks) * 60); // Progress from 30% to 90%
      
      this.updateProgress(progress, `Processing chunk ${i + 1} of ${totalChunks}...`);
      
      // Process each chunk individually using the regular process-data endpoint
      const response = await apiRequest('POST', '/api/process-data', {
        voterData: chunk,
        geoData,
        censusLocation
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Chunk ${i + 1} processing failed: ${error.message || 'Unknown error'}`);
      }
      
      const chunkResult = await response.json();
      
      if (i === 0) {
        // First chunk - use as base structure
        combinedProcessedData = { ...chunkResult };
      } else {
        // Subsequent chunks - merge the data
        this.mergeProcessedData(combinedProcessedData, chunkResult);
      }
    }
    
    this.updateProgress(95, 'Finalizing combined results...');
    
    // Return the properly combined processed data
    return combinedProcessedData;
  }

  private mergeProcessedData(base: any, chunk: any): void {
    // Initialize age tracking if not present
    if (!base._ageTracking) {
      base._ageTracking = { totalAge: 0, totalVoters: 0 };
    }
    
    // Merge party affiliation data
    if (chunk.partyAffiliation) {
      Object.keys(chunk.partyAffiliation).forEach(party => {
        base.partyAffiliation[party] = (base.partyAffiliation[party] || 0) + chunk.partyAffiliation[party];
      });
    }

    // Merge age group turnout data
    if (chunk.ageGroupTurnout && base.ageGroupTurnout) {
      chunk.ageGroupTurnout.voted.forEach((count: number, index: number) => {
        if (base.ageGroupTurnout.voted[index] !== undefined) {
          base.ageGroupTurnout.voted[index] += count;
        }
      });
      chunk.ageGroupTurnout.notVoted.forEach((count: number, index: number) => {
        if (base.ageGroupTurnout.notVoted[index] !== undefined) {
          base.ageGroupTurnout.notVoted[index] += count;
        }
      });
    }

    // Merge racial demographics
    if (chunk.racialDemographics) {
      Object.keys(chunk.racialDemographics).forEach(race => {
        base.racialDemographics[race] = (base.racialDemographics[race] || 0) + chunk.racialDemographics[race];
      });
    }

    // Merge precinct demographics
    if (chunk.precinctDemographics) {
      // Add new precincts
      chunk.precinctDemographics.precincts.forEach((precinct: string) => {
        if (!base.precinctDemographics.precincts.includes(precinct)) {
          base.precinctDemographics.precincts.push(precinct);
        }
      });

      // Merge registered voters - ADD counts instead of overwriting
      Object.keys(chunk.precinctDemographics.registeredVoters).forEach(precinct => {
        base.precinctDemographics.registeredVoters[precinct] =
          (base.precinctDemographics.registeredVoters[precinct] || 0) +
          chunk.precinctDemographics.registeredVoters[precinct];
      });
      
      // Merge turnout percentage - recalculate based on combined data
      Object.assign(base.precinctDemographics.turnoutPercentage, chunk.precinctDemographics.turnoutPercentage);
      
      // Merge party affiliation by precinct - ADD counts instead of overwriting
      Object.keys(chunk.precinctDemographics.partyAffiliation).forEach(precinct => {
        if (!base.precinctDemographics.partyAffiliation[precinct]) {
          base.precinctDemographics.partyAffiliation[precinct] = {};
        }
        
        Object.keys(chunk.precinctDemographics.partyAffiliation[precinct]).forEach(party => {
          base.precinctDemographics.partyAffiliation[precinct][party] =
            (base.precinctDemographics.partyAffiliation[precinct][party] || 0) +
            chunk.precinctDemographics.partyAffiliation[precinct][party];
        });
      });
      
      // Merge racial demographics by precinct - ADD counts instead of overwriting
      Object.keys(chunk.precinctDemographics.racialDemographics).forEach(precinct => {
        if (!base.precinctDemographics.racialDemographics[precinct]) {
          base.precinctDemographics.racialDemographics[precinct] = {};
        }
        
        Object.keys(chunk.precinctDemographics.racialDemographics[precinct]).forEach(race => {
          base.precinctDemographics.racialDemographics[precinct][race] =
            (base.precinctDemographics.racialDemographics[precinct][race] || 0) +
            chunk.precinctDemographics.racialDemographics[precinct][race];
        });
      });
    }

    // Merge district data
    if (chunk.districtData) {
      Object.assign(base.districtData, chunk.districtData);
    }

    // Track age data from chunk for accurate average calculation
    if (chunk._ageTracking) {
      base._ageTracking.totalAge += chunk._ageTracking.totalAge;
      base._ageTracking.totalVoters += chunk._ageTracking.totalVoters;
    }

    // Update summary stats (recalculate totals)
    this.updateSummaryStats(base);
  }

  private updateSummaryStats(processedData: any): void {
    // Recalculate summary statistics based on combined data
    if (processedData.summaryStats) {
      // Calculate total voters from party affiliation data (most reliable for voter count)
      let totalVoters = 0;
      if (processedData.partyAffiliation) {
        totalVoters = Object.values(processedData.partyAffiliation).reduce((sum: number, count: any) => sum + count, 0);
      }
      
      console.log(`UpdateSummaryStats: Calculated total voters from party affiliation: ${totalVoters}`);
      
      // Update registered voters stat (correct label from storage.ts)
      const registeredVotersStat = processedData.summaryStats.find((stat: any) => stat.label === 'Registered Voters');
      if (registeredVotersStat && totalVoters > 0) {
        registeredVotersStat.value = totalVoters.toLocaleString();
        console.log(`UpdateSummaryStats: Updated Registered Voters stat to: ${registeredVotersStat.value}`);
      }

      // Update voter turnout stat using age group turnout data (most reliable)
      if (processedData.ageGroupTurnout) {
        const totalVoted = processedData.ageGroupTurnout.voted.reduce((sum: number, count: number) => sum + count, 0);
        const totalNotVoted = processedData.ageGroupTurnout.notVoted.reduce((sum: number, count: number) => sum + count, 0);
        const totalEligible = totalVoted + totalNotVoted;
        
        console.log(`UpdateSummaryStats: Turnout calculation - Voted: ${totalVoted}, Not Voted: ${totalNotVoted}, Total Eligible: ${totalEligible}`);
        
        if (totalEligible > 0) {
          const turnoutRate = (totalVoted / totalEligible) * 100;
          
          const turnoutStat = processedData.summaryStats.find((stat: any) => stat.label === 'Voter Turnout');
          if (turnoutStat) {
            turnoutStat.value = `${turnoutRate.toFixed(1)}%`;
            console.log(`UpdateSummaryStats: Updated Voter Turnout stat to: ${turnoutStat.value}`);
          }
        }
      }

      // Update districts count using precinct demographics (this should be accurate)
      const districtsStat = processedData.summaryStats.find((stat: any) => stat.label === 'Districts');
      if (districtsStat && processedData.precinctDemographics && processedData.precinctDemographics.precincts) {
        districtsStat.value = processedData.precinctDemographics.precincts.length.toString();
        console.log(`UpdateSummaryStats: Updated Districts stat to: ${districtsStat.value}`);
      }

      // Update average age using direct age tracking (same method as storage.ts)
      if (processedData._ageTracking && processedData._ageTracking.totalVoters > 0) {
        const avgAge = processedData._ageTracking.totalAge / processedData._ageTracking.totalVoters;
        
        console.log(`UpdateSummaryStats: Direct age calculation - Total Age: ${processedData._ageTracking.totalAge}, Total Voters: ${processedData._ageTracking.totalVoters}, Average: ${avgAge.toFixed(1)}`);
        
        // Sanity check: average age should be reasonable (18-100)
        if (avgAge >= 18 && avgAge <= 100) {
          const avgAgeStat = processedData.summaryStats.find((stat: any) => stat.label === 'Avg. Age');
          if (avgAgeStat) {
            avgAgeStat.value = avgAge.toFixed(1);
            console.log(`UpdateSummaryStats: Updated Avg. Age stat to: ${avgAgeStat.value} (direct calculation)`);
          }
        } else {
          console.log(`UpdateSummaryStats: Calculated age ${avgAge.toFixed(1)} is unreasonable, keeping original value`);
        }
      } else {
        console.log(`UpdateSummaryStats: No age tracking data available, keeping original average age value`);
      }
    }
  }

  private async processDirectly(voterData: any[], geoData: any, censusLocation?: any): Promise<any> {
    const response = await apiRequest('POST', '/api/process-data', {
      voterData,
      geoData,
      censusLocation
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Processing failed');
    }

    return response.json();
  }

  private splitIntoChunks(data: any[]): any[][] {
    const chunks: any[][] = [];
    for (let i = 0; i < data.length; i += this.chunkSize) {
      chunks.push(data.slice(i, i + this.chunkSize));
    }
    return chunks;
  }

  private updateProgress(progress: number, stage: string): void {
    if (this.onProgress) {
      this.onProgress(progress, stage);
    }
  }

  private updateStage(stage: string): void {
    if (this.onStageChange) {
      this.onStageChange(stage);
    }
  }
}

// Utility function for easy use
export async function processLargeVoterDatasetSimple(
  voterData: any[],
  geoData: any,
  censusLocation?: {
    state: string;
    county: string;
    stateName: string;
    countyName: string;
  },
  options: ProcessingOptions = {}
): Promise<any> {
  const processor = new SimpleChunkedProcessor(options);
  return processor.processLargeDataset(voterData, geoData, censusLocation);
}