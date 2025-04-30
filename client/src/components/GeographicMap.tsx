import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Home, Layers, Grid, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DistrictType } from "@shared/schema";
import L from "leaflet";
import { GeoJSON } from 'geojson';
import "leaflet/dist/leaflet.css";

interface GeographicMapProps {
  geoData: any | null;
  districtData: Record<string, any>;
  districtType: DistrictType;
}

export default function GeographicMap({ geoData, districtData, districtType }: GeographicMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLayer, setMapLayer] = useState<'density' | 'turnout' | 'party' | 'race'>('density');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [geoJsonLayer, setGeoJsonLayer] = useState<L.GeoJSON | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance) return;
    
    // Create Leaflet map instance
    const map = L.map(mapRef.current, {
      center: [39.8283, -98.5795], // Center of the US
      zoom: 4,
      zoomControl: true,
    });
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    setMapInstance(map);
    
    return () => {
      map.remove();
    };
  }, [mapInstance]);

  // Update GeoJSON layer when data or district type changes
  useEffect(() => {
    if (!mapInstance || !geoData) return;
    
    // Clear existing GeoJSON layer
    if (geoJsonLayer) {
      geoJsonLayer.removeFrom(mapInstance);
      setGeoJsonLayer(null);
    }
    
    // Create tooltip div if it doesn't exist
    if (!document.getElementById('map-tooltip')) {
      const tooltipDiv = document.createElement('div');
      tooltipDiv.id = 'map-tooltip';
      tooltipDiv.className = 'absolute bg-white rounded-md shadow-lg p-3 z-50 pointer-events-none';
      tooltipDiv.style.display = 'none';
      document.body.appendChild(tooltipDiv);
    }
    
    // Function to get color based on value and selected layer
    const getColor = (feature: any) => {
      const districtId = feature.properties.id || 
                         feature.properties.PRECINCT || 
                         feature.properties.DISTRICT_ID ||
                         feature.properties.districtId;
      
      const district = districtData[districtId];
      
      if (!district) return '#CCCCCC'; // Gray for no data
      
      if (mapLayer === 'density') {
        const density = district.voterDensity || 0;
        if (density > 0.75) return '#255c1a'; // Very High
        if (density > 0.5) return '#4d9636';  // High
        if (density > 0.25) return '#83c75d'; // Medium
        return '#c5e8b7';                     // Low
      } 
      
      if (mapLayer === 'turnout') {
        const turnout = district.turnout || 0;
        if (turnout > 0.75) return '#1a237e'; // Very High
        if (turnout > 0.5) return '#3949ab';  // High
        if (turnout > 0.25) return '#7986cb'; // Medium
        return '#c5cae9';                     // Low
      }
      
      if (mapLayer === 'party') {
        const party = district.majorityParty?.toLowerCase();
        if (party === 'democratic') return '#1976d2';
        if (party === 'republican') return '#d32f2f';
        if (party === 'green') return '#388e3c';
        if (party === 'libertarian') return '#ffa726';
        if (party === 'independent') return '#9575cd';
        return '#757575'; // Unknown
      }
      
      if (mapLayer === 'race') {
        const race = district.majorityRace?.toLowerCase();
        if (race === 'white') return '#90caf9';
        if (race === 'black' || race === 'african american') return '#5c6bc0';
        if (race === 'hispanic' || race === 'latino') return '#26a69a';
        if (race === 'asian') return '#ffb74d';
        if (race === 'native american') return '#ef6c00';
        if (race === 'pacific islander') return '#1e88e5';
        if (race === 'other') return '#757575';
        if (race === 'multiracial') return '#ab47bc';
        return '#bdbdbd'; // Unknown
      }
      
      return '#CCCCCC';
    };
    
    // Function to style GeoJSON features
    const style = (feature: any) => {
      return {
        fillColor: getColor(feature),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
      };
    };
    
    // Function to handle mouseover event
    const highlightFeature = (e: L.LeafletMouseEvent) => {
      const layer = e.target;
      const tooltipDiv = document.getElementById('map-tooltip');
      
      if (!tooltipDiv) return;
      
      // Highlight the district
      layer.setStyle({
        weight: 3,
        color: '#666',
        fillOpacity: 0.9
      });
      
      layer.bringToFront();
      
      // Get district data for tooltip
      const feature = layer.feature;
      const districtId = feature.properties.id || 
                         feature.properties.PRECINCT || 
                         feature.properties.DISTRICT_ID ||
                         feature.properties.districtId;
      
      const district = districtData[districtId];
      
      if (district) {
        // Update tooltip content
        tooltipDiv.innerHTML = `
          <h4 class="font-medium text-sm text-neutral-900 border-b pb-1 mb-2">${districtType.charAt(0).toUpperCase() + districtType.slice(1)} ${districtId}</h4>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div class="text-neutral-500">Registered Voters:</div>
            <div class="font-medium text-right text-neutral-900">${district.registeredVoters?.toLocaleString() || 'N/A'}</div>
            
            <div class="text-neutral-500">Turnout:</div>
            <div class="font-medium text-right text-neutral-900">${district.turnout ? `${(district.turnout * 100).toFixed(1)}%` : 'N/A'}</div>
            
            <div class="text-neutral-500">Party Majority:</div>
            <div class="font-medium text-right text-neutral-900">${district.majorityParty || 'N/A'}</div>
            
            <div class="text-neutral-500">Avg. Age:</div>
            <div class="font-medium text-right text-neutral-900">${district.averageAge?.toFixed(1) || 'N/A'}</div>
          </div>
        `;
        
        // Position tooltip based on mouse position
        const rect = mapRef.current?.getBoundingClientRect();
        
        if (rect) {
          tooltipDiv.style.display = 'block';
          tooltipDiv.style.left = `${e.originalEvent.clientX + 15}px`;
          tooltipDiv.style.top = `${e.originalEvent.clientY + 15}px`;
        }
      }
    };
    
    // Function to handle mouseout event
    const resetHighlight = (e: L.LeafletEvent) => {
      geoJsonLayer?.resetStyle(e.target);
      
      const tooltipDiv = document.getElementById('map-tooltip');
      if (tooltipDiv) {
        tooltipDiv.style.display = 'none';
      }
    };
    
    // Function to handle click event
    const zoomToFeature = (e: L.LeafletEvent) => {
      mapInstance.fitBounds(e.target.getBounds());
    };
    
    // Function to bind events to each feature
    const onEachFeature = (feature: any, layer: L.Layer) => {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
      });
    };
    
    // Create GeoJSON layer
    try {
      // Add more detailed logging to diagnose the issue
      console.log('GeoData structure:', {
        type: geoData.type,
        featuresCount: geoData.features?.length,
        sampleFeature: geoData.features?.[0]
      });
      
      // Validate GeoJSON structure
      if (!geoData.type || !geoData.features || !Array.isArray(geoData.features)) {
        throw new Error('Invalid GeoJSON structure: missing type or features array');
      }
      
      // Check for empty features
      if (geoData.features.length === 0) {
        throw new Error('GeoJSON contains no features');
      }
      
      // Process GeoJSON to ensure it's compatible with Leaflet
      const normalizedGeoJSON = {
        type: 'FeatureCollection',
        features: geoData.features.map(feature => {
          // Make a deep copy to avoid modifying the original
          const newFeature = JSON.parse(JSON.stringify(feature));
          
          // If coordinates are 3D (with altitude), convert to 2D
          if (newFeature.geometry && newFeature.geometry.coordinates) {
            const processCoordinates = (coords: any[]): any[] => {
              if (Array.isArray(coords[0])) {
                // Array of coordinates
                return coords.map(c => processCoordinates(c));
              } else if (coords.length === 3) {
                // Single coordinate with altitude - remove the altitude
                return [coords[0], coords[1]];
              }
              return coords;
            };
            
            newFeature.geometry.coordinates = processCoordinates(newFeature.geometry.coordinates);
          }
          
          return newFeature;
        })
      };
      
      // Create GeoJSON layer with more explicit error handling and normalized GeoJSON
      const layer = L.geoJSON(normalizedGeoJSON, {
        style: style,
        onEachFeature: onEachFeature
      }).addTo(mapInstance);
      
      setGeoJsonLayer(layer);
      
      // Fit map to GeoJSON bounds
      mapInstance.fitBounds(layer.getBounds());
    } catch (error) {
      console.error('Error creating GeoJSON layer:', error);
      toast({
        title: 'Map Error',
        description: `Failed to render the geographic map: ${error instanceof Error ? error.message : 'Invalid GeoJSON format'}. Please check your GeoJSON data.`,
        variant: 'destructive'
      });
    }
  }, [geoData, districtData, districtType, mapInstance, mapLayer, toast]);

  const handleMapLayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMapLayer(e.target.value as 'density' | 'turnout' | 'party' | 'race');
  };

  const handleResetMapView = () => {
    if (mapInstance && geoJsonLayer) {
      mapInstance.fitBounds(geoJsonLayer.getBounds());
    }
  };

  const handleToggleHeatmap = () => {
    toast({
      title: "Toggle Heatmap",
      description: "Heatmap toggle functionality would be implemented here",
    });
  };

  const handleShowAllDistricts = () => {
    if (mapInstance && geoJsonLayer) {
      mapInstance.fitBounds(geoJsonLayer.getBounds());
    }
  };

  const handleDownloadMapImage = () => {
    toast({
      title: "Exporting Map",
      description: "This would trigger a map export to an image file",
    });
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">Voter Density & Demographics Map</h3>
        <div className="flex items-center space-x-2">
          <select 
            className="border border-neutral-300 rounded px-2 py-1 text-sm focus:ring-primary focus:border-primary"
            value={mapLayer}
            onChange={handleMapLayerChange}
          >
            <option value="density">Voter Density</option>
            <option value="turnout">Voter Turnout</option>
            <option value="party">Party Majority</option>
            <option value="race">Racial Majority</option>
          </select>
        </div>
      </div>
      <CardContent className="p-4">
        <div ref={mapRef} className="w-full h-[500px] bg-gray-100 rounded relative">
          {(!geoData || !districtData) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <MapPin className="h-10 w-10 text-neutral-300 mb-2" />
              <p className="text-neutral-500">Interactive Geographic Map</p>
              <p className="text-sm text-neutral-400 mt-2">Upload and process data files to generate the map</p>
            </div>
          )}
        </div>
        
        {/* Map Legend */}
        <div className="mt-4 p-3 bg-neutral-50 rounded border border-neutral-200">
          <h4 className="text-sm font-medium mb-2 text-neutral-900">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
            {mapLayer === 'density' && (
              <>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#c5e8b7' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Low Density</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#83c75d' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Medium Density</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4d9636' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">High Density</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#255c1a' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Very High Density</span>
                </div>
              </>
            )}
            
            {mapLayer === 'turnout' && (
              <>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#c5cae9' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Low Turnout</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7986cb' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Medium Turnout</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3949ab' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">High Turnout</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1a237e' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Very High Turnout</span>
                </div>
              </>
            )}
            
            {mapLayer === 'party' && (
              <>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1976d2' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Democratic</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d32f2f' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Republican</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#388e3c' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Green</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffa726' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Libertarian</span>
                </div>
              </>
            )}
            
            {mapLayer === 'race' && (
              <>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#90caf9' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">White</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#5c6bc0' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Black</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#26a69a' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Hispanic</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffb74d' }}></div>
                  <span className="ml-2 text-xs text-neutral-700">Asian</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Map Controls */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button 
            className="bg-white border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-sm flex items-center"
            onClick={handleResetMapView}
          >
            <Home className="h-4 w-4 mr-1" />
            Reset View
          </button>
          <button 
            className="bg-white border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-sm flex items-center"
            onClick={handleToggleHeatmap}
          >
            <Layers className="h-4 w-4 mr-1" />
            Toggle Heatmap
          </button>
          <button 
            className="bg-white border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-sm flex items-center"
            onClick={handleShowAllDistricts}
          >
            <Grid className="h-4 w-4 mr-1" />
            Show All Districts
          </button>
          <button 
            className="bg-white border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-sm flex items-center"
            onClick={handleDownloadMapImage}
          >
            <Download className="h-4 w-4 mr-1" />
            Export Map
          </button>
        </div>
      </CardContent>
      
      {/* Hidden tooltip div - will be controlled by the map */}
      <div ref={tooltipRef} id="map-tooltip" className="hidden absolute bg-white rounded-md shadow-lg p-3 z-50 pointer-events-none"></div>
    </Card>
  );
}
