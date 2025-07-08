import { Handler } from '@netlify/functions';
import { storage } from './storage';

// Configure function with larger payload size
export const config = {
  maxDuration: 30, // Allow up to 30 seconds for retrieving data
};

const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*', // Or specify your domain
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
  
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS' as any) {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const processedData = await storage.getProcessedData();
    
    if (!processedData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: 'No processed data found. Please upload and process data files first.'
        }),
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(processedData),
    };
  } catch (error) {
    console.error('Error retrieving processed data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        error: error instanceof Error ? error.stack : 'Unknown error'
      }),
    };
  }
};

export { handler };