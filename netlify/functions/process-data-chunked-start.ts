import { Handler } from '@netlify/functions';
import { z } from 'zod';

// Configure for background processing
export const config = {
  maxDuration: 60,
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method Not Allowed' })
      };
    }
    
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
    const job: ProcessingJob = {
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
    };
    
    jobs.set(jobId, job);
    
    console.log(`Started processing job ${jobId} with ${totalChunks} chunks`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobId, status: 'pending' })
    };
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
    };
  }
};

export { handler, jobs };