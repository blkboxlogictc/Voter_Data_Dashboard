import { apiRequest } from './queryClient';
import { uploadLargeContent } from './chunkedUpload';

interface ProcessingOptions {
  onProgress?: (progress: number, stage: string) => void;
  maxSyncSize?: number; // Maximum size for synchronous processing (in bytes)
}

interface ProcessingResult {
  data: any;
  processingMethod: 'sync' | 'background' | 'chunked';
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
    } else if (totalSize < 50 * 1024 * 1024) { // 50MB
      // Medium data - use background processing
      this.updateProgress(20, 'Using background processing for large dataset...');
      const result = await this.processInBackground(voterData, geoData, censusLocation);
      return {
        data: result,
        processingMethod: 'background',
        processingTime: Date.now() - startTime
      };
    } else {
      // Very large data - use chunked upload + background processing
      this.updateProgress(20, 'Using chunked upload for very large dataset...');
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
    
    const requestData = {
      voterData,
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

  private async processInBackground(
    voterData: any,
    geoData: any,
    censusLocation?: any
  ): Promise<any> {
    this.updateProgress(30, 'Starting background processing...');
    
    const jobId = this.generateJobId();
    const requestData = {
      voterData,
      geoData,
      jobId,
      ...(censusLocation && { censusLocation })
    };

    this.updateProgress(50, 'Submitting to background processor...');
    
    const response = await apiRequest('POST', '/api/process-data-background', requestData);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Background processing failed: ${errorText}`);
    }

    this.updateProgress(100, 'Background processing complete!');
    return response.json();
  }

  private async processWithChunking(
    voterData: any,
    geoData: any,
    censusLocation?: any
  ): Promise<any> {
    this.updateProgress(30, 'Uploading voter data in chunks...');
    
    // Upload voter data in chunks
    const voterDataResult = await uploadLargeContent(
      JSON.stringify(voterData),
      {
        fileName: 'voter-data.json',
        fileType: 'application/json',
        totalSize: JSON.stringify(voterData).length
      },
      {
        onProgress: (progress) => {
          this.updateProgress(30 + (progress * 0.3), 'Uploading voter data...');
        }
      }
    );

    this.updateProgress(60, 'Uploading geographic data in chunks...');
    
    // Upload geo data in chunks
    const geoDataResult = await uploadLargeContent(
      JSON.stringify(geoData),
      {
        fileName: 'geo-data.json',
        fileType: 'application/json',
        totalSize: JSON.stringify(geoData).length
      },
      {
        onProgress: (progress) => {
          this.updateProgress(60 + (progress * 0.2), 'Uploading geographic data...');
        }
      }
    );

    this.updateProgress(80, 'Processing uploaded data...');
    
    // Process the uploaded data
    const jobId = this.generateJobId();
    const requestData = {
      voterData: JSON.parse(voterDataResult.content),
      geoData: JSON.parse(geoDataResult.content),
      jobId,
      ...(censusLocation && { censusLocation })
    };

    const response = await apiRequest('POST', '/api/process-data-background', requestData);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chunked processing failed: ${errorText}`);
    }

    this.updateProgress(100, 'Chunked processing complete!');
    return response.json();
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