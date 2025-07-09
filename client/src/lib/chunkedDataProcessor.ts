import { apiRequest } from './queryClient';

interface ProcessingOptions {
  chunkSize?: number;
  onProgress?: (progress: number, stage: string) => void;
  onStageChange?: (stage: string) => void;
}

interface ProcessingJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

export class ChunkedDataProcessor {
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
    
    // Step 1: Split voter data into chunks
    const chunks = this.splitIntoChunks(voterData);
    console.log(`Split ${voterData.length} records into ${chunks.length} chunks`);
    
    // Step 2: Start processing job
    this.updateStage('Starting processing job...');
    const jobId = await this.startProcessingJob(chunks.length, geoData, censusLocation);
    
    // Step 3: Send chunks
    this.updateStage('Uploading data chunks...');
    await this.sendChunks(jobId, chunks);
    
    // Step 4: Finalize and start background processing
    this.updateStage('Starting background processing...');
    await this.finalizeProcessing(jobId);
    
    // Step 5: Poll for completion
    this.updateStage('Processing data...');
    const result = await this.pollForCompletion(jobId);
    
    this.updateStage('Processing completed!');
    return result;
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

  private async startProcessingJob(
    totalChunks: number,
    geoData: any,
    censusLocation?: any
  ): Promise<string> {
    const response = await apiRequest('POST', '/api/process-data-chunked/start', {
      totalChunks,
      geoData,
      censusLocation
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start processing job');
    }

    const result = await response.json();
    return result.jobId;
  }

  private async sendChunks(jobId: string, chunks: any[][]): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      const response = await apiRequest('POST', '/api/process-data-chunked/chunk', {
        jobId,
        chunkIndex: i,
        voterDataChunk: chunks[i]
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to send chunk ${i + 1}: ${error.message}`);
      }

      // Update progress for chunk upload (0-50%)
      const progress = ((i + 1) / chunks.length) * 50;
      this.updateProgress(progress, `Uploading chunk ${i + 1}/${chunks.length}`);
    }
  }

  private async finalizeProcessing(jobId: string): Promise<void> {
    const response = await apiRequest('POST', '/api/process-data-chunked/finalize', {
      jobId
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to finalize processing');
    }
  }

  private async pollForCompletion(jobId: string): Promise<any> {
    const maxAttempts = 180; // 15 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await apiRequest('GET', `/api/process-data-chunked/status?jobId=${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to check job status');
      }

      const job: ProcessingJob = await response.json();
      
      // Update progress
      this.updateProgress(job.progress, this.getStageFromProgress(job.progress));
      
      if (job.status === 'completed') {
        return job.result;
      }
      
      if (job.status === 'error') {
        throw new Error(job.error || 'Processing failed');
      }
      
      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    throw new Error('Processing timed out');
  }

  private getStageFromProgress(progress: number): string {
    if (progress < 50) return 'Uploading data...';
    if (progress < 80) return 'Processing voter data...';
    if (progress < 100) return 'Integrating census data...';
    return 'Finalizing results...';
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
export async function processLargeVoterDataset(
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
  const processor = new ChunkedDataProcessor(options);
  return processor.processLargeDataset(voterData, geoData, censusLocation);
}