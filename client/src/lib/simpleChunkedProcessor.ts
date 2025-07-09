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
    
    let combinedResults: any[] = [];
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
      
      // Combine results (assuming the result has a data array)
      if (chunkResult.data && Array.isArray(chunkResult.data)) {
        combinedResults = combinedResults.concat(chunkResult.data);
      } else {
        // If not an array, collect all results
        combinedResults.push(chunkResult);
      }
    }
    
    this.updateProgress(95, 'Combining results...');
    
    // Return combined results in the same format as the original
    return {
      data: combinedResults,
      totalProcessed: combinedResults.length,
      processingMethod: 'chunked-individual'
    };
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