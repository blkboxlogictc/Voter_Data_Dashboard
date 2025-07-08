// Enhanced Census Geography Helper with Local GeoJSON Support
import { feature } from 'topojson-client';
import {
  loadStateCensusTracts,
  loadCountyCensusTracts,
  getCensusTractByGeoId,
  hasLocalCensusData,
  getStateInfo,
  validateGeoId,
  parseGeoId,
  type CensusGeoJSON,
  type CensusTractFeature
} from '@/assets/census';

export interface CensusGeography {
  states: any;
  counties: any;
  tracts?: any;
}

export interface EnhancedCensusGeography extends CensusGeography {
  localTracts?: CensusGeoJSON;
  tractFeatures?: CensusTractFeature[];
}

/**
 * Load US geographic boundaries using us-atlas package
 * This provides real Census FIPS boundaries in GeoJSON format
 */
export class CensusGeographyService {
  private static instance: CensusGeographyService;
  private geographyCache: Map<string, any> = new Map();

  static getInstance(): CensusGeographyService {
    if (!CensusGeographyService.instance) {
      CensusGeographyService.instance = new CensusGeographyService();
    }
    return CensusGeographyService.instance;
  }

  /**
   * Load state boundaries
   */
  async loadStates(): Promise<any> {
    const cacheKey = 'states';
    if (this.geographyCache.has(cacheKey)) {
      return this.geographyCache.get(cacheKey);
    }

    try {
      // Load US topology from us-atlas
      const us = await import('us-atlas/states-10m.json');
      const states = feature(us.default, us.default.objects.states);
      
      this.geographyCache.set(cacheKey, states);
      return states;
    } catch (error) {
      console.error('Error loading state boundaries:', error);
      throw new Error('Failed to load state boundaries');
    }
  }

  /**
   * Load county boundaries for a specific state
   */
  async loadCounties(stateFips?: string): Promise<any> {
    const cacheKey = `counties-${stateFips || 'all'}`;
    if (this.geographyCache.has(cacheKey)) {
      return this.geographyCache.get(cacheKey);
    }

    try {
      // Load US county topology
      const us = await import('us-atlas/counties-10m.json');
      let counties = feature(us.default, us.default.objects.counties);
      
      // Filter by state if specified
      if (stateFips) {
        counties.features = counties.features.filter((county: any) => 
          county.properties.STATEFP === stateFips
        );
      }
      
      this.geographyCache.set(cacheKey, counties);
      return counties;
    } catch (error) {
      console.error('Error loading county boundaries:', error);
      throw new Error('Failed to load county boundaries');
    }
  }

  /**
   * Load census tract boundaries - Enhanced with local GeoJSON support
   * Prioritizes local data, falls back to Census Bureau API
   */
  async loadTracts(stateFips: string, countyFips: string): Promise<any> {
    const cacheKey = `tracts-${stateFips}-${countyFips}`;
    if (this.geographyCache.has(cacheKey)) {
      return this.geographyCache.get(cacheKey);
    }

    try {
      // First, try to load from local GeoJSON files
      if (hasLocalCensusData(stateFips)) {
        console.log(`Loading local census tract data for state ${stateFips}, county ${countyFips}`);
        const localTracts = await loadCountyCensusTracts(stateFips, countyFips);
        
        if (localTracts.length > 0) {
          const geoJson = {
            type: 'FeatureCollection',
            features: localTracts
          };
          this.geographyCache.set(cacheKey, geoJson);
          return geoJson;
        }
      }

      // Fallback to Census Bureau's TIGER/Line API
      console.log(`Loading census tract data from TIGER API for state ${stateFips}, county ${countyFips}`);
      const year = '2023';
      const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/${year}/MapServer/0/query`;
      
      const params = new URLSearchParams({
        where: `STATEFP='${stateFips}' AND COUNTYFP='${countyFips}'`,
        outFields: 'GEOID,NAME,STATEFP,COUNTYFP,TRACTCE',
        f: 'geojson',
        returnGeometry: 'true'
      });

      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`TIGER API error: ${response.status}`);
      }

      const geoJson = await response.json();
      this.geographyCache.set(cacheKey, geoJson);
      return geoJson;
    } catch (error) {
      console.error('Error loading tract boundaries:', error);
      // Fallback to mock boundaries if both local and API fail
      return this.generateMockTracts(stateFips, countyFips);
    }
  }

  /**
   * Load all census tracts for a state from local data
   */
  async loadStateTracts(stateFips: string): Promise<CensusGeoJSON | null> {
    const cacheKey = `state-tracts-${stateFips}`;
    if (this.geographyCache.has(cacheKey)) {
      return this.geographyCache.get(cacheKey);
    }

    try {
      if (hasLocalCensusData(stateFips)) {
        const stateTracts = await loadStateCensusTracts(stateFips);
        if (stateTracts) {
          this.geographyCache.set(cacheKey, stateTracts);
          return stateTracts;
        }
      }
      return null;
    } catch (error) {
      console.error(`Error loading state tracts for ${stateFips}:`, error);
      return null;
    }
  }

  /**
   * Get a specific census tract by GEOID
   */
  async getTractByGeoId(geoid: string): Promise<CensusTractFeature | null> {
    if (!validateGeoId(geoid)) {
      console.error('Invalid GEOID format:', geoid);
      return null;
    }

    const cacheKey = `tract-${geoid}`;
    if (this.geographyCache.has(cacheKey)) {
      return this.geographyCache.get(cacheKey);
    }

    try {
      const tract = await getCensusTractByGeoId(geoid);
      if (tract) {
        this.geographyCache.set(cacheKey, tract);
      }
      return tract;
    } catch (error) {
      console.error(`Error loading tract ${geoid}:`, error);
      return null;
    }
  }

  /**
   * Check if local census data is available for a state
   */
  hasLocalData(stateFips: string): boolean {
    return hasLocalCensusData(stateFips);
  }

  /**
   * Get information about available census data for a state
   */
  getStateDataInfo(stateFips: string) {
    return getStateInfo(stateFips);
  }

  /**
   * Parse and validate a GEOID
   */
  parseGeoId(geoid: string) {
    return parseGeoId(geoid);
  }

  /**
   * Alternative: Load tract boundaries using simplified approach
   */
  async loadTractsSimplified(stateFips: string, countyFips: string): Promise<any> {
    try {
      // Use the Census Cartographic Boundary Files API
      const year = '2023';
      const url = `https://www2.census.gov/geo/tiger/GENZ${year}/shp/cb_${year}_${stateFips}_tract_500k.zip`;
      
      // Note: This would require a server-side endpoint to download and process the shapefile
      // For client-side, we'll use the TIGER web service instead
      return this.loadTracts(stateFips, countyFips);
    } catch (error) {
      console.error('Error loading simplified tracts:', error);
      return this.generateMockTracts(stateFips, countyFips);
    }
  }

  /**
   * Generate mock tract boundaries as fallback
   */
  private generateMockTracts(stateFips: string, countyFips: string): any {
    // This creates realistic-looking tract boundaries for demonstration
    const features = [];
    const numTracts = 15; // Typical number of tracts in a county
    
    // Get approximate county center (this would be more accurate with real data)
    const countyCenter = this.getCountyCenter(stateFips, countyFips);
    
    for (let i = 1; i <= numTracts; i++) {
      const tractCode = String(i * 100).padStart(6, '0'); // Standard tract numbering
      const geoid = stateFips + countyFips + tractCode;
      
      // Create a realistic tract boundary
      const tractSize = 0.02; // Degrees
      const gridSize = Math.ceil(Math.sqrt(numTracts));
      const gridX = (i - 1) % gridSize;
      const gridY = Math.floor((i - 1) / gridSize);
      
      const centerLat = countyCenter.lat + (gridY - gridSize/2) * tractSize * 2;
      const centerLng = countyCenter.lng + (gridX - gridSize/2) * tractSize * 2;
      
      // Create irregular tract shape (more realistic than perfect squares)
      const jitter = () => (Math.random() - 0.5) * tractSize * 0.3;
      const coordinates = [[
        [centerLng - tractSize + jitter(), centerLat - tractSize + jitter()],
        [centerLng + tractSize + jitter(), centerLat - tractSize + jitter()],
        [centerLng + tractSize + jitter(), centerLat + tractSize + jitter()],
        [centerLng - tractSize + jitter(), centerLat + tractSize + jitter()],
        [centerLng - tractSize + jitter(), centerLat - tractSize + jitter()]
      ]];

      features.push({
        type: 'Feature',
        properties: {
          GEOID: geoid,
          NAME: `Census Tract ${tractCode}`,
          STATEFP: stateFips,
          COUNTYFP: countyFips,
          TRACTCE: tractCode
        },
        geometry: {
          type: 'Polygon',
          coordinates
        }
      });
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }

  /**
   * Get approximate county center coordinates
   */
  private getCountyCenter(stateFips: string, countyFips: string): { lat: number, lng: number } {
    // This is a simplified lookup - in practice, you'd use the county boundaries
    const stateCenters: Record<string, { lat: number, lng: number }> = {
      '06': { lat: 36.7783, lng: -119.4179 }, // California
      '12': { lat: 27.7663, lng: -81.6868 },  // Florida
      '48': { lat: 31.9686, lng: -99.9018 },  // Texas
      '36': { lat: 42.1657, lng: -74.9481 },  // New York
      '17': { lat: 40.6331, lng: -89.3985 },  // Illinois
    };

    const stateCenter = stateCenters[stateFips] || { lat: 39.8283, lng: -98.5795 };
    
    // Add some offset based on county code for variety
    const countyOffset = parseInt(countyFips, 10) % 100;
    return {
      lat: stateCenter.lat + (countyOffset - 50) * 0.01,
      lng: stateCenter.lng + (countyOffset - 50) * 0.01
    };
  }

  /**
   * Get FIPS code information
   */
  getFipsInfo(geoid: string): { state: string, county?: string, tract?: string } {
    if (geoid.length >= 2) {
      const state = geoid.substring(0, 2);
      if (geoid.length >= 5) {
        const county = geoid.substring(2, 5);
        if (geoid.length >= 11) {
          const tract = geoid.substring(5, 11);
          return { state, county, tract };
        }
        return { state, county };
      }
      return { state };
    }
    return { state: '' };
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.geographyCache.clear();
  }
}

export const censusGeography = CensusGeographyService.getInstance();