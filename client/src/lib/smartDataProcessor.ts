import { apiRequest } from './queryClient';
import { processLargeVoterDatasetSimple } from './simpleChunkedProcessor';
import { processVoterDataLocally } from './localDataProcessor';

interface ProcessingOptions {
  onProgress?: (progress: number, stage: string) => void;
  maxSyncSize?: number; // Maximum size for synchronous processing (in bytes)
}

interface ProcessingResult {
  data: any;
  processingMethod: 'sync' | 'chunked';
  processingTime: number;
}

export class SmartDataProcessor {
  private maxSyncSize: number;
  private onProgress?: (progress: number, stage: string) => void;

  constructor(options: ProcessingOptions = {}) {
    this.maxSyncSize = options.maxSyncSize || 5 * 1024 * 1024; // 5MB default
    this.onProgress = options.onProgress;
  }

  async processData(
    voterData: any,
    geoData: any,
    censusLocation?: {
      state: string;
      county: string;
      stateName: string;
      countyName: string;
    }
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    // Check if we're in development mode
    const isDevelopment = !import.meta.env.PROD;
    
    // Calculate data sizes
    const voterDataSize = JSON.stringify(voterData).length;
    const geoDataSize = JSON.stringify(geoData).length;
    const totalSize = voterDataSize + geoDataSize;

    this.updateProgress(10, 'Analyzing data size...');

    // In development, always use synchronous processing to avoid Netlify function calls
    if (isDevelopment) {
      this.updateProgress(20, 'Using local development processing...');
      const result = await this.processSynchronously(voterData, geoData, censusLocation);
      return {
        data: result,
        processingMethod: 'sync',
        processingTime: Date.now() - startTime
      };
    }

    // Choose processing method based on data size (production only)
    if (totalSize < this.maxSyncSize) {
      // Small data - use synchronous processing
      this.updateProgress(20, 'Using fast synchronous processing...');
      const result = await this.processSynchronously(voterData, geoData, censusLocation);
      return {
        data: result,
        processingMethod: 'sync',
        processingTime: Date.now() - startTime
      };
    } else {
      // Large data - use chunked processing for anything over 5MB
      this.updateProgress(20, 'Using chunked processing for large dataset...');
      const result = await this.processWithChunking(voterData, geoData, censusLocation);
      return {
        data: result,
        processingMethod: 'chunked',
        processingTime: Date.now() - startTime
      };
    }
  }

  private async processSynchronously(
    voterData: any,
    geoData: any,
    censusLocation?: any
  ): Promise<any> {
    this.updateProgress(50, 'Processing data...');
    
    // Check if we're in development mode
    const isDevelopment = !import.meta.env.PROD;
    
    if (isDevelopment) {
      // In development, use local processing instead of API calls
      this.updateProgress(60, 'Using local processing...');
      
      // Use the local data processor for all development processing
      const result = await processVoterDataLocally(
        voterData,
        geoData,
        censusLocation,
        {
          onProgress: (progress, stage) => {
            // Map the local processor progress to our progress range (60-100)
            const mappedProgress = 60 + (progress * 0.4);
            this.updateProgress(mappedProgress, stage);
          }
        }
      );
      
      this.updateProgress(100, 'Local processing complete!');
      return result;
    }
    
    // Production synchronous processing - use API
    // Ensure voter data is in the correct format for synchronous processing
    let processedVoterData: any;
    if (Array.isArray(voterData)) {
      // If it's already an array, wrap it in the expected format
      processedVoterData = { voters: voterData };
      console.log(`Synchronous processing: ${voterData.length} voter records (array format)`);
    } else if (voterData && voterData.voters && Array.isArray(voterData.voters)) {
      // If it's already in the correct format, use as-is
      processedVoterData = voterData;
      console.log(`Synchronous processing: ${voterData.voters.length} voter records (object format)`);
    } else {
      throw new Error('Invalid voter data format. Expected array or object with voters property.');
    }
    
    const requestData = {
      voterData: processedVoterData,
      geoData,
      ...(censusLocation && { censusLocation })
    };

    const response = await apiRequest('POST', '/api/process-data', requestData);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Processing failed: ${errorText}`);
    }

    this.updateProgress(100, 'Processing complete!');
    return response.json();
  }


  private async processWithChunking(
    voterData: any,
    geoData: any,
    censusLocation?: any
  ): Promise<any> {
    this.updateProgress(30, 'Starting chunked data processing...');
    
    // Ensure voter data is in the correct format (array of voter records)
    let voterArray: any[];
    if (Array.isArray(voterData)) {
      voterArray = voterData;
      console.log(`Processing ${voterArray.length} voter records (array format)`);
    } else if (voterData && voterData.voters && Array.isArray(voterData.voters)) {
      voterArray = voterData.voters;
      console.log(`Processing ${voterArray.length} voter records (object with voters property)`);
    } else {
      throw new Error('Invalid voter data format. Expected array or object with voters property.');
    }
    
    // Use the new chunked data processor
    const result = await processLargeVoterDatasetSimple(
      voterArray,
      geoData,
      censusLocation,
      {
        chunkSize: 5000, // 5000 records per chunk
        onProgress: (progress, stage) => {
          // Map the chunked processor progress to our progress range (30-100)
          const mappedProgress = 30 + (progress * 0.7);
          this.updateProgress(mappedProgress, stage);
        }
      }
    );

    this.updateProgress(100, 'Chunked processing complete!');
    return result;
  }

  private updateProgress(progress: number, stage: string): void {
    if (this.onProgress) {
      this.onProgress(Math.min(progress, 100), stage);
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Utility function for easy use
export async function processVoterData(
  voterData: any,
  geoData: any,
  censusLocation?: {
    state: string;
    county: string;
    stateName: string;
    countyName: string;
  },
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const processor = new SmartDataProcessor(options);
  return processor.processData(voterData, geoData, censusLocation);
}