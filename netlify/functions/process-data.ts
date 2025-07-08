import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { storage } from './storage';

// Configure function with larger payload size
export const config = {
  maxDuration: 60, // Allow up to 60 seconds for processing
};

const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*', // Or specify your domain
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    
    // Handle OPTIONS request (preflight)
    if (event.httpMethod === 'OPTIONS' as any) {
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }
    
    // Parse the request body with error handling
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
      }).optional()
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
    
    const { voterData, geoData, censusLocation } = body;
    
    // Log detailed information about the request
    console.log("Request headers:", event.headers);
    console.log("Request body size:", event.body?.length || 0);
    
    // Check for empty data with more detailed logging
    if (!voterData) {
      console.error("Voter data is missing");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Voter data is missing',
          error: 'MISSING_VOTER_DATA'
        }),
      };
    }
    
    if (Array.isArray(voterData) && voterData.length === 0) {
      console.error("Voter data array is empty");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Voter data array is empty',
          error: 'EMPTY_VOTER_DATA'
        }),
      };
    }
    
    if (!geoData) {
      console.error("GeoJSON data is missing");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'GeoJSON data is missing',
          error: 'MISSING_GEOJSON_DATA'
        }),
      };
    }
    
    if (!geoData.features) {
      console.error("GeoJSON data is missing features array");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'GeoJSON data is invalid or missing features array',
          error: 'INVALID_GEOJSON_FORMAT',
          geoDataType: typeof geoData,
          geoDataKeys: Object.keys(geoData)
        }),
      };
    }
    
    // Log the incoming data for debugging
    console.log("Received voterData type:", typeof voterData);
    console.log("Received voterData is array:", Array.isArray(voterData));
    console.log("Received voterData length:", Array.isArray(voterData) ? voterData.length : 'N/A');
    console.log("Received voterData sample:",
      Array.isArray(voterData) && voterData.length > 0
        ? JSON.stringify(voterData[0], null, 2)
        : "No voter data");
    console.log("Received geoData type:", typeof geoData);
    console.log("Received geoData.type:", geoData.type);
    console.log("Received geoData.features length:", geoData.features?.length || 0);
    
    // Process the data with timeout handling
    let processedData;
    try {
      // First process the voter data
      const voterProcessedData = await Promise.race([
        storage.processVoterData(voterData, geoData),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Processing timed out')), 50000)
        )
      ]) as any;
      
      // Then integrate census data if location is provided
      if (censusLocation) {
        console.log("Census location provided, integrating census data...");
        console.log("State:", censusLocation.stateName, "County:", censusLocation.countyName);
        
        processedData = await Promise.race([
          storage.integrateCensusData(
            voterProcessedData,
            geoData,
            censusLocation.state,
            censusLocation.county,
            censusLocation.stateName,
            censusLocation.countyName
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Census data integration timed out')), 20000)
          )
        ]) as any;
      } else {
        console.log("No census location provided, skipping census data integration");
        processedData = voterProcessedData;
      }
    } catch (processingError) {
      console.error('Error processing data:', processingError);
      
      // Determine appropriate status code based on error
      let statusCode = 500;
      const errorMessage = processingError.message || 'Unknown error';
      
      if (errorMessage.includes('Invalid') ||
          errorMessage.includes('missing') ||
          errorMessage.includes('format')) {
        statusCode = 400; // Bad request for validation errors
      }
      
      return {
        statusCode,
        headers,
        body: JSON.stringify({
          message: 'Error processing data',
          error: errorMessage,
          stack: process.env.NODE_ENV === 'development' ? processingError.stack : undefined,
          voterDataType: typeof voterData,
          isVoterDataArray: Array.isArray(voterData),
          voterDataLength: Array.isArray(voterData) ? voterData.length : undefined,
          geoDataType: typeof geoData,
          hasFeatures: geoData && Array.isArray(geoData.features),
        }),
      };
    }
    
    // Log the processed data structure
    console.log("Processed data keys:", Object.keys(processedData));
    console.log("Has precinctDemographics:", !!processedData.precinctDemographics);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(processedData),
    };
  } catch (error) {
    console.error('Error processing data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
    };
  }
};

export { handler };