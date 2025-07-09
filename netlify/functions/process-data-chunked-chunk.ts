import { Handler } from '@netlify/functions';
import { z } from 'zod';

// Import the shared jobs storage
let jobs: Map<string, any>;
try {
  // Try to import from the start function
  const startModule = require('./process-data-chunked-start');
  jobs = startModule.jobs;
} catch {
  // Fallback to local storage if import fails
  jobs = new Map();
}

export const config = {
  maxDuration: 60,
};

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

export { handler };