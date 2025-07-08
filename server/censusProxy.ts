import express from 'express';

const router = express.Router();

// Census API proxy to handle CORS issues
router.get('/counties/:stateFips', async (req, res) => {
  try {
    const { stateFips } = req.params;
    const apiKey = 'f0b106758e077c8e0d3dbd117d83cce29ffe0f11';
    
    const url = `https://api.census.gov/data/2023/acs/acs1?get=NAME,B01003_001E,B19013_001E&for=county:*&in=state:${stateFips}&key=${apiKey}`;
    
    console.log('Fetching counties from Census API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Census API error: ${response.status} ${response.statusText}`);
    }
    
    // Check if response has content before parsing
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      console.log('Empty response from Census API - state may not exist');
      res.json([]); // Return empty array for non-existent states
      return;
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Census API response:', responseText);
      throw new Error('Invalid JSON response from Census API');
    }
    console.log('Census API response:', data);
    
    // Process the data (skip header row)
    const counties = data.slice(1).map((row: any[]) => ({
      name: row[0],
      population: parseInt(row[1]) || 0,
      medianIncome: parseInt(row[2]) || 0,
      fips: row[4] // County FIPS is in column 4 (index 4), not column 3
    }));
    
    res.json(counties);
  } catch (error: any) {
    console.error('Error fetching counties:', error);
    res.status(500).json({ 
      error: 'Failed to fetch counties', 
      message: error.message 
    });
  }
});

router.get('/tracts/:stateFips/:countyFips', async (req, res) => {
  try {
    const { stateFips, countyFips } = req.params;
    const apiKey = 'f0b106758e077c8e0d3dbd117d83cce29ffe0f11';
    
    // Use proper county FIPS format - ensure it's 3 digits
    const formattedCountyFips = countyFips.padStart(3, '0');
    
    const url = `https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E,B19013_001E&for=tract:*&in=state:${stateFips}%20county:${formattedCountyFips}&key=${apiKey}`;
    
    console.log('Fetching tracts from Census API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Census API error: ${response.status} ${response.statusText}`);
    }
    
    // Check if response has content before parsing
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      console.log('Empty response from Census API - county may not exist');
      res.json([]); // Return empty array for non-existent counties
      return;
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Census API response:', responseText);
      throw new Error('Invalid JSON response from Census API');
    }
    console.log('Census API tracts response:', data);
    
    // Process the data (skip header row)
    const tracts = data.slice(1).map((row: any[]) => {
      // row[3] = state, row[4] = county, row[5] = tract
      const stateFipsFromApi = row[3];
      const countyFipsFromApi = row[4];
      const tractCode = row[5]; // The tract code is in the 6th column (index 5)
      
      // Construct proper 11-digit GEOID: SSCCCTTTTTT
      const geoid = `${stateFipsFromApi}${countyFipsFromApi}${tractCode}`;
      
      console.log(`Tract: ${row[0]}, State: ${stateFipsFromApi}, County: ${countyFipsFromApi}, Tract: ${tractCode}, GEOID: ${geoid}`);
      
      return {
        name: row[0],
        population: parseInt(row[1]) || 0,
        medianIncome: parseInt(row[2]) || 0,
        geoid: geoid,
        demographics: {}
      };
    });
    
    res.json(tracts);
  } catch (error: any) {
    console.error('Error fetching tracts:', error);
    res.status(500).json({
      error: 'Failed to fetch tracts',
      message: error.message
    });
  }
});

router.get('/tract-details/:stateFips/:countyFips/:tractCode', async (req, res) => {
  try {
    const { stateFips, countyFips, tractCode } = req.params;
    const apiKey = 'f0b106758e077c8e0d3dbd117d83cce29ffe0f11';
    
    // Comprehensive demographic variables
    const variables = [
      'NAME',
      'B01003_001E', // Total population
      'B19013_001E', // Median household income
      'B02001_002E', // White alone
      'B02001_003E', // Black or African American alone
      'B02001_004E', // American Indian and Alaska Native alone
      'B02001_005E', // Asian alone
      'B02001_006E', // Native Hawaiian and Other Pacific Islander alone
      'B02001_007E', // Some other race alone
      'B02001_008E', // Two or more races
      'B03003_002E', // Not Hispanic or Latino
      'B03003_003E', // Hispanic or Latino
      'B25001_001E', // Housing units
      'B25003_002E', // Owner occupied
      'B25003_003E', // Renter occupied
      'B15003_017E', // High school graduate
      'B15003_022E', // Bachelor's degree
      'B15003_023E', // Master's degree
      'B08303_001E', // Total commuters
      'B08303_013E'  // Public transportation
    ];
    
    const url = `https://api.census.gov/data/2023/acs/acs5?get=${variables.join(',')}&for=tract:${tractCode}&in=state:${stateFips}%20county:${countyFips}&key=${apiKey}`;
    
    console.log('Fetching tract details from Census API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Census API error: ${response.status} ${response.statusText}`);
    }
    
    // Check if response has content before parsing
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      console.log('Empty response from Census API - tract may not exist');
      throw new Error('Tract not found in Census API');
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Census API response:', responseText);
      throw new Error('Invalid JSON response from Census API');
    }
    console.log('Census API tract details response:', data);
    
    if (data.length < 2) {
      throw new Error('No data returned for tract');
    }
    
    const headers = data[0];
    const values = data[1];
    
    // Create a mapping of variable names to values
    const result: any = {};
    headers.forEach((header: string, index: number) => {
      result[header] = values[index];
    });
    
    const tractDetails = {
      name: result.NAME,
      geoid: `${stateFips}${countyFips}${tractCode}`,
      totalPopulation: parseInt(result.B01003_001E) || 0,
      medianIncome: parseInt(result.B19013_001E) || 0,
      race: {
        white: parseInt(result.B02001_002E) || 0,
        black: parseInt(result.B02001_003E) || 0,
        nativeAmerican: parseInt(result.B02001_004E) || 0,
        asian: parseInt(result.B02001_005E) || 0,
        pacificIslander: parseInt(result.B02001_006E) || 0,
        other: parseInt(result.B02001_007E) || 0,
        multiracial: parseInt(result.B02001_008E) || 0
      },
      ethnicity: {
        nonHispanic: parseInt(result.B03003_002E) || 0,
        hispanic: parseInt(result.B03003_003E) || 0
      },
      housing: {
        totalUnits: parseInt(result.B25001_001E) || 0,
        ownerOccupied: parseInt(result.B25003_002E) || 0,
        renterOccupied: parseInt(result.B25003_003E) || 0
      },
      education: {
        highSchool: parseInt(result.B15003_017E) || 0,
        bachelors: parseInt(result.B15003_022E) || 0,
        masters: parseInt(result.B15003_023E) || 0
      },
      transportation: {
        totalCommuters: parseInt(result.B08303_001E) || 0,
        publicTransport: parseInt(result.B08303_013E) || 0
      }
    };
    
    res.json(tractDetails);
  } catch (error: any) {
    console.error('Error fetching tract details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tract details', 
      message: error.message 
    });
  }
});

export default router;