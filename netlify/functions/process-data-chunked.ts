import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { storage } from './storage';

// Configure for background processing with extended timeout
export const config = {
  maxDuration: 900, // 15 minutes for background functions
};

interface ProcessingJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
  chunks: {
    voterData: any[];
    geoData: any;
    censusLocation?: any;
  };
  processedChunks: number;
  totalChunks: number;
}

// In-memory job storage (for demo - in production, use external storage)
const jobs = new Map<string, ProcessingJob>();

const handler: Handler = async (event, context) => {
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    };
    
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers, body: '' };
    }
    
    const path = event.path.split('/').pop();
    
    // Handle different endpoints
    switch (event.httpMethod) {
      case 'POST':
        if (path === 'start') {
          return await startProcessingJob(event, headers);
        } else if (path === 'chunk') {
          return await processChunk(event, headers);
        } else if (path === 'finalize') {
          return await finalizeProcessing(event, headers);
        }
        break;
        
      case 'GET':
        if (path === 'status') {
          return await getJobStatus(event, headers);
        }
        break;
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint not found' })
    };
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
    };
  }
};

async function startProcessingJob(event: any, headers: any) {
  const body = JSON.parse(event.body || '{}');
  
  const schema = z.object({
    totalChunks: z.number(),
    geoData: z.any(),
    censusLocation: z.object({
      state: z.string(),
      county: z.string(),
      stateName: z.string(),
      countyName: z.string()
    }).optional()
  });
  
  const validation = schema.safeParse(body);
  if (!validation.success) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        message: 'Invalid request format',
        errors: validation.error.errors
      })
    };
  }
  
  const { totalChunks, geoData, censusLocation } = validation.data;
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Initialize job
  jobs.set(jobId, {
    jobId,
    status: 'pending',
    progress: 0,
    chunks: {
      voterData: new Array(totalChunks),
      geoData,
      censusLocation
    },
    processedChunks: 0,
    totalChunks
  });
  
  console.log(`Started processing job ${jobId} with ${totalChunks} chunks`);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ jobId, status: 'pending' })
  };
}

async function processChunk(event: any, headers: any) {
  const body = JSON.parse(event.body || '{}');
  
  const schema = z.object({
    jobId: z.string(),
    chunkIndex: z.number(),
    voterDataChunk: z.any()
  });
  
  const validation = schema.safeParse(body);
  if (!validation.success) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        message: 'Invalid chunk format',
        errors: validation.error.errors
      })
    };
  }
  
  const { jobId, chunkIndex, voterDataChunk } = validation.data;
  const job = jobs.get(jobId);
  
  if (!job) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Job not found' })
    };
  }
  
  // Store the chunk
  job.chunks.voterData[chunkIndex] = voterDataChunk;
  job.processedChunks++;
  job.progress = (job.processedChunks / job.totalChunks) * 50; // 50% for receiving chunks
  
  console.log(`Received chunk ${chunkIndex + 1}/${job.totalChunks} for job ${jobId}`);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      jobId,
      progress: job.progress,
      chunksReceived: job.processedChunks,
      totalChunks: job.totalChunks
    })
  };
}

async function finalizeProcessing(event: any, headers: any) {
  const body = JSON.parse(event.body || '{}');
  const { jobId } = body;
  
  const job = jobs.get(jobId);
  if (!job) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Job not found' })
    };
  }
  
  if (job.processedChunks !== job.totalChunks) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        message: 'Not all chunks received',
        received: job.processedChunks,
        expected: job.totalChunks
      })
    };
  }
  
  // Start background processing
  job.status = 'processing';
  job.progress = 50;
  
  // Process in background (don't await)
  processJobInBackground(job).catch(error => {
    console.error(`Background processing failed for job ${jobId}:`, error);
    job.status = 'error';
    job.error = error.message;
  });
  
  return {
    statusCode: 202, // Accepted for background processing
    headers,
    body: JSON.stringify({
      jobId,
      status: 'processing',
      message: 'Processing started in background'
    })
  };
}

async function processJobInBackground(job: ProcessingJob) {
  try {
    console.log(`Starting background processing for job ${job.jobId}`);
    
    // Combine all voter data chunks
    const combinedVoterData = job.chunks.voterData.flat();
    console.log(`Combined ${combinedVoterData.length} voter records from ${job.totalChunks} chunks`);
    
    job.progress = 60;
    
    // Process the combined data
    const voterProcessedData = await storage.processVoterData(
      combinedVoterData,
      job.chunks.geoData
    );
    
    job.progress = 80;
    
    // Integrate census data if provided
    let finalResult = voterProcessedData;
    if (job.chunks.censusLocation) {
      console.log(`Integrating census data for job ${job.jobId}`);
      finalResult = await storage.integrateCensusData(
        voterProcessedData,
        job.chunks.geoData,
        job.chunks.censusLocation.state,
        job.chunks.censusLocation.county,
        job.chunks.censusLocation.stateName,
        job.chunks.censusLocation.countyName
      );
    }
    
    job.progress = 100;
    job.status = 'completed';
    job.result = finalResult;
    
    console.log(`Background processing completed for job ${job.jobId}`);
    
  } catch (error) {
    console.error(`Background processing error for job ${job.jobId}:`, error);
    job.status = 'error';
    job.error = error instanceof Error ? error.message : 'Unknown error';
  }
}

async function getJobStatus(event: any, headers: any) {
  const jobId = event.queryStringParameters?.jobId;
  
  if (!jobId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'jobId parameter required' })
    };
  }
  
  const job = jobs.get(jobId);
  if (!job) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Job not found' })
    };
  }
  
  const response: any = {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress
  };
  
  if (job.status === 'completed' && job.result) {
    response.result = job.result;
    // Clean up completed job after returning result
    setTimeout(() => jobs.delete(jobId), 60000); // Clean up after 1 minute
  }
  
  if (job.status === 'error' && job.error) {
    response.error = job.error;
    // Clean up failed job
    setTimeout(() => jobs.delete(jobId), 60000);
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

export { handler };