import { Handler } from '@netlify/functions';
import { z } from 'zod';

// Store chunks temporarily (in production, use a proper storage solution)
const chunkStore = new Map<string, { chunks: string[], totalChunks: number, metadata: any }>();

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    
    const chunkSchema = z.object({
      uploadId: z.string(),
      chunkIndex: z.number(),
      totalChunks: z.number(),
      chunk: z.string(),
      metadata: z.object({
        fileName: z.string(),
        fileType: z.string(),
        totalSize: z.number()
      }).optional()
    });

    const validationResult = chunkSchema.safeParse(body);
    
    if (!validationResult.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid chunk format',
          errors: validationResult.error.errors
        }),
      };
    }

    const { uploadId, chunkIndex, totalChunks, chunk, metadata } = body;

    // Initialize upload if first chunk
    if (!chunkStore.has(uploadId)) {
      chunkStore.set(uploadId, {
        chunks: new Array(totalChunks),
        totalChunks,
        metadata: metadata || {}
      });
    }

    const upload = chunkStore.get(uploadId)!;
    upload.chunks[chunkIndex] = chunk;

    // Check if all chunks are received
    const receivedChunks = upload.chunks.filter(c => c !== undefined).length;
    const isComplete = receivedChunks === totalChunks;

    if (isComplete) {
      // Reconstruct the file
      const reconstructedContent = upload.chunks.join('');
      
      // Clean up
      chunkStore.delete(uploadId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          complete: true,
          uploadId,
          content: reconstructedContent,
          metadata: upload.metadata
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        complete: false,
        uploadId,
        receivedChunks,
        totalChunks
      }),
    };

  } catch (error) {
    console.error('Error handling chunk upload:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
    };
  }
};

export { handler };