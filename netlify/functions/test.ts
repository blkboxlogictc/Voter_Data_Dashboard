import { Handler } from '@netlify/functions';

/**
 * Simple test function to verify that Netlify Functions are working correctly
 */
const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
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
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Netlify Functions are working correctly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      event: {
        path: event.path,
        httpMethod: event.httpMethod,
        headers: event.headers,
      }
    }),
  };
};

export { handler };