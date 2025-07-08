/**
 * Utility functions for validating data files before processing
 */

import { apiRequest } from "./queryClient";
import config from "./config";

/**
 * Validate voter data and GeoJSON files
 * @param voterData The voter data to validate
 * @param geoData The GeoJSON data to validate
 * @returns Validation results
 */
export async function validateData(voterData: any, geoData: any) {
  try {
    // Use the validate-data function to check the data format
    const response = await apiRequest('POST', '/api/validate-data', {
      voterData,
      geoData
    });
    
    return await response.json();
  } catch (error: any) {
    console.error('Error validating data:', error);
    throw new Error(`Validation failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Check if a file is valid JSON
 * @param content The file content to check
 * @returns Whether the content is valid JSON
 */
export function isValidJson(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a file is likely to be a valid voter data file
 * @param data The parsed JSON data to check
 * @returns Whether the data is likely to be valid voter data
 */
export function isLikelyVoterData(data: any): boolean {
  // Check if data is an array of voter objects
  if (Array.isArray(data)) {
    if (data.length === 0) return false;
    
    // Check if first item has voter-like properties
    const firstItem = data[0];
    return (
      typeof firstItem === 'object' &&
      (firstItem.Precinct !== undefined || 
       firstItem.precinct !== undefined)
    );
  }
  
  // Check if data has a voters array
  if (data && data.voters && Array.isArray(data.voters)) {
    if (data.voters.length === 0) return false;
    
    // Check if first item has voter-like properties
    const firstItem = data.voters[0];
    return (
      typeof firstItem === 'object' &&
      (firstItem.Precinct !== undefined || 
       firstItem.precinct !== undefined)
    );
  }
  
  return false;
}

/**
 * Check if a file is likely to be a valid GeoJSON file
 * @param data The parsed JSON data to check
 * @returns Whether the data is likely to be valid GeoJSON
 */
export function isLikelyGeoJson(data: any): boolean {
  return (
    data &&
    data.type === 'FeatureCollection' &&
    Array.isArray(data.features) &&
    data.features.length > 0
  );
}

/**
 * Get a sample of the data for display
 * @param data The data to sample
 * @param maxItems Maximum number of items to include in the sample
 * @returns A sample of the data
 */
export function getDataSample(data: any, maxItems: number = 3): any {
  if (Array.isArray(data)) {
    return data.slice(0, maxItems);
  }
  
  if (data && data.voters && Array.isArray(data.voters)) {
    return {
      ...data,
      voters: data.voters.slice(0, maxItems)
    };
  }
  
  if (data && data.features && Array.isArray(data.features)) {
    return {
      ...data,
      features: data.features.slice(0, maxItems)
    };
  }
  
  return data;
}