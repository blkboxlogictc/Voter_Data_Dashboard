import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { storage } from './storage';

// Configure as background function with larger limits
export const config = {
  maxDuration: 900, // 15 minutes for background functions
};

const handler: Handler = async (event, context) => {
  try {
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    
    // Handle OPTIONS request (preflight)
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }
    
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method Not Allowed' }),
      };
    }
    
    // Parse the request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid JSON in request body',
          error: parseError.message,
        }),
      };
    }

    // Validate incoming request body
    const requestSchema = z.object({
      voterData: z.any(),
      geoData: z.any(),
      censusLocation: z.object({
        state: z.string(),
        county: z.string(),
        stateName: z.string(),
        countyName: z.string()
      }).optional(),
      jobId: z.string().optional() // For tracking background jobs
    });
    
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid request format',
          errors: validationResult.error.errors
        }),
      };
    }
    
    const { voterData, geoData, censusLocation, jobId } = body;
    
    // Log request details
    console.log("Background processing started for job:", jobId);
    console.log("Request body size:", event.body?.length || 0);
    
    // Validate data presence
    if (!voterData || !geoData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Both voter data and geo data are required',
          error: 'MISSING_DATA'
        }),
      };
    }
    
    if (Array.isArray(voterData) && voterData.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Voter data array is empty',
          error: 'EMPTY_VOTER_DATA'
        }),
      };
    }
    
    if (!geoData.features || !Array.isArray(geoData.features)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid GeoJSON format',
          error: 'INVALID_GEOJSON_FORMAT'
        }),
      };
    }
    
    // Process the data with extended timeout for background function
    let processedData;
    try {
      console.log("Starting data processing...");
      
      // Process voter data first
      const voterProcessedData = await storage.processVoterData(voterData, geoData);
      
      // Integrate census data if location is provided
      if (censusLocation) {
        console.log("Integrating census data...");
        processedData = await storage.integrateCensusData(
          voterProcessedData,
          geoData,
          censusLocation.state,
          censusLocation.county,
          censusLocation.stateName,
          censusLocation.countyName
        );
      } else {
        processedData = voterProcessedData;
      }
      
      console.log("Data processing completed successfully");
      
    } catch (processingError) {
      console.error('Error processing data:', processingError);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          message: 'Error processing data',
          error: processingError.message,
          jobId,
          stack: process.env.NODE_ENV === 'development' ? processingError.stack : undefined,
        }),
      };
    }
    
    // Return the processed data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...processedData,
        jobId,
        processedAt: new Date().toISOString()
      }),
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

export { handler };