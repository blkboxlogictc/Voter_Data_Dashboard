import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { storage } from './storage';

// Configure for background processing with extended timeout
export const config = {
  maxDuration: 900, // 15 minutes for background functions
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
      voterDataChunks: z.array(z.any()), // Array of voter data chunks
      geoData: z.any(),
      censusLocation: z.object({
        state: z.string(),
        county: z.string(),
        stateName: z.string(),
        countyName: z.string()
      }).optional(),
      totalRecords: z.number().optional() // For progress tracking
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
    
    const { voterDataChunks, geoData, censusLocation, totalRecords } = body;
    
    // Log request details
    console.log("Large data processing started");
    console.log("Number of chunks:", voterDataChunks.length);
    console.log("Total records:", totalRecords || 'unknown');
    console.log("Request body size:", event.body?.length || 0);
    
    // Validate data presence
    if (!voterDataChunks || !Array.isArray(voterDataChunks) || voterDataChunks.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Voter data chunks are required and must be a non-empty array',
          error: 'MISSING_VOTER_DATA_CHUNKS'
        }),
      };
    }
    
    if (!geoData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'GeoJSON data is required',
          error: 'MISSING_GEOJSON_DATA'
        }),
      };
    }
    
    if (!geoData.features || !Array.isArray(geoData.features)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid GeoJSON format - features array is required',
          error: 'INVALID_GEOJSON_FORMAT'
        }),
      };
    }
    
    // Combine all voter data chunks into a single array
    console.log("Combining voter data chunks...");
    const combinedVoterData = voterDataChunks.flat();
    console.log(`Combined ${combinedVoterData.length} voter records from ${voterDataChunks.length} chunks`);
    
    // Process the combined data
    let processedData;
    try {
      console.log("Starting data processing...");
      
      // Process voter data first
      const voterProcessedData = await storage.processVoterData(combinedVoterData, geoData);
      
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
        processedAt: new Date().toISOString(),
        totalRecordsProcessed: combinedVoterData.length,
        chunksProcessed: voterDataChunks.length
      }),
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