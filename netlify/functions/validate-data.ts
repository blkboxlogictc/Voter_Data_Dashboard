import { Handler } from '@netlify/functions';

/**
 * Function to validate data format without processing it
 * This helps users diagnose issues with their data files
 */
const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
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
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse the request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid JSON in request body',
          error: parseError.message,
        }),
      };
    }

    const { voterData, geoData } = body;
    
    // Validate voter data
    const voterDataValidation = validateVoterData(voterData);
    
    // Validate GeoJSON data
    const geoDataValidation = validateGeoData(geoData);
    
    // Return validation results
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        voterData: voterDataValidation,
        geoData: geoDataValidation,
        isValid: voterDataValidation.isValid && geoDataValidation.isValid,
        message: 'Data validation complete',
      }),
    };
  } catch (error) {
    console.error('Error validating data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Error validating data',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

/**
 * Validate voter data format
 */
function validateVoterData(data: any) {
  const result = {
    isValid: false,
    type: typeof data,
    isArray: Array.isArray(data),
    length: Array.isArray(data) ? data.length : undefined,
    hasVotersArray: false,
    votersLength: 0,
    sampleKeys: [] as string[],
    hasPrecinct: false,
    hasRace: false,
    hasParty: false,
    issues: [] as string[],
    recommendations: [] as string[],
  };
  
  // Check if data exists
  if (!data) {
    result.issues.push('Voter data is missing');
    result.recommendations.push('Provide voter data in JSON format');
    return result;
  }
  
  // Check if data is in {voters: [...]} format
  if (data.voters && Array.isArray(data.voters)) {
    result.hasVotersArray = true;
    result.votersLength = data.voters.length;
    
    if (data.voters.length === 0) {
      result.issues.push('Voters array is empty');
      result.recommendations.push('Provide at least one voter record');
      return result;
    }
    
    // Check first voter record
    const firstVoter = data.voters[0];
    result.sampleKeys = Object.keys(firstVoter);
    
    // Check for required fields
    result.hasPrecinct = 
      firstVoter.Precinct !== undefined || 
      firstVoter.precinct !== undefined;
      
    result.hasRace = 
      firstVoter.Race !== undefined || 
      firstVoter.race !== undefined;
      
    result.hasParty = 
      firstVoter.Party !== undefined || 
      firstVoter.party !== undefined;
    
    // Add issues and recommendations
    if (!result.hasPrecinct) {
      result.issues.push('Precinct field is missing');
      result.recommendations.push('Add a "Precinct" field to each voter record');
    }
    
    if (!result.hasRace) {
      result.issues.push('Race field is missing');
      result.recommendations.push('Add a "Race" field to each voter record');
    }
    
    if (!result.hasParty) {
      result.issues.push('Party field is missing');
      result.recommendations.push('Add a "Party" field to each voter record');
    }
    
    // Set validity
    result.isValid = result.hasPrecinct && result.votersLength > 0;
    
    return result;
  }
  
  // Check if data is an array of voter objects
  if (Array.isArray(data)) {
    result.votersLength = data.length;
    
    if (data.length === 0) {
      result.issues.push('Voter data array is empty');
      result.recommendations.push('Provide at least one voter record');
      return result;
    }
    
    // Check first voter record
    const firstVoter = data[0];
    result.sampleKeys = Object.keys(firstVoter);
    
    // Check for required fields
    result.hasPrecinct = 
      firstVoter.Precinct !== undefined || 
      firstVoter.precinct !== undefined;
      
    result.hasRace = 
      firstVoter.Race !== undefined || 
      firstVoter.race !== undefined;
      
    result.hasParty = 
      firstVoter.Party !== undefined || 
      firstVoter.party !== undefined;
    
    // Add issues and recommendations
    if (!result.hasPrecinct) {
      result.issues.push('Precinct field is missing');
      result.recommendations.push('Add a "Precinct" field to each voter record');
    }
    
    if (!result.hasRace) {
      result.issues.push('Race field is missing');
      result.recommendations.push('Add a "Race" field to each voter record');
    }
    
    if (!result.hasParty) {
      result.issues.push('Party field is missing');
      result.recommendations.push('Add a "Party" field to each voter record');
    }
    
    // Set validity
    result.isValid = result.hasPrecinct && result.votersLength > 0;
    
    return result;
  }
  
  // If we get here, the data format is invalid
  result.issues.push('Invalid voter data format');
  result.recommendations.push('Provide voter data as an array or an object with a "voters" array');
  
  return result;
}

/**
 * Validate GeoJSON data format
 */
function validateGeoData(data: any) {
  const result = {
    isValid: false,
    type: typeof data,
    geoJsonType: data?.type,
    hasFeatures: false,
    featuresLength: 0,
    hasPrecinct: false,
    issues: [] as string[],
    recommendations: [] as string[],
  };
  
  // Check if data exists
  if (!data) {
    result.issues.push('GeoJSON data is missing');
    result.recommendations.push('Provide GeoJSON data');
    return result;
  }
  
  // Check if data has type property
  if (!data.type) {
    result.issues.push('GeoJSON type is missing');
    result.recommendations.push('GeoJSON must have a "type" property');
    return result;
  }
  
  // Check if data has features array
  if (!data.features || !Array.isArray(data.features)) {
    result.issues.push('GeoJSON features array is missing');
    result.recommendations.push('GeoJSON must have a "features" array');
    return result;
  }
  
  result.hasFeatures = true;
  result.featuresLength = data.features.length;
  
  if (data.features.length === 0) {
    result.issues.push('GeoJSON features array is empty');
    result.recommendations.push('GeoJSON must have at least one feature');
    return result;
  }
  
  // Check if features have properties with precinct information
  const firstFeature = data.features[0];
  
  if (!firstFeature.properties) {
    result.issues.push('GeoJSON feature is missing properties');
    result.recommendations.push('Each GeoJSON feature must have a "properties" object');
    return result;
  }
  
  // Check for precinct identifier in properties
  const properties = firstFeature.properties;
  result.hasPrecinct = 
    properties.id !== undefined || 
    properties.PRECINCT !== undefined || 
    properties.DISTRICT_ID !== undefined || 
    properties.districtId !== undefined ||
    properties.precinct !== undefined;
  
  if (!result.hasPrecinct) {
    result.issues.push('GeoJSON features are missing precinct identifiers');
    result.recommendations.push('Each GeoJSON feature must have an "id", "PRECINCT", "DISTRICT_ID", "districtId", or "precinct" property');
  }
  
  // Set validity
  result.isValid = 
    data.type === 'FeatureCollection' && 
    result.hasFeatures && 
    result.featuresLength > 0 && 
    result.hasPrecinct;
  
  return result;
}

export { handler };