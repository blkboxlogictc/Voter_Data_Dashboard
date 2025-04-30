import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Home, Layers, Grid, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DistrictType } from "@shared/schema";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox token from environment variables if available
// In development, we'll use the token from the environment
// or fall back to a basic style that doesn't require authentication
const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
(mapboxgl as any).accessToken = envToken || 'public-token-for-testing';

interface MapboxMapProps {
  geoData: any | null;
  districtData: Record<string, any>;
  districtType: DistrictType;
}

export default function MapboxMap({ geoData, districtData, districtType }: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLayer, setMapLayer] = useState<'density' | 'turnout' | 'party' | 'race'>('density');
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);
  const [popupRef, setPopupRef] = useState<mapboxgl.Popup | null>(null);
  const { toast } = useToast();
  
  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    try {
      // Use OpenStreetMap style that doesn't require token
      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [-98.5795, 39.8283], // Center of the US
        zoom: 3
      });
      
      // Add navigation controls (zoom, rotation)
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      mapInstance.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }), 'top-right');
      
      // Add scale
      mapInstance.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
      
      // Set map instance to state
      setMap(mapInstance);
      
      // Clean up on unmount
      return () => {
        mapInstance.remove();
      };
    } catch (error) {
      console.error('Error initializing Mapbox map:', error);
      toast({
        title: 'Map Error',
        description: 'Failed to initialize the map. Please make sure your Mapbox access token is valid.',
        variant: 'destructive'
      });
    }
  }, [toast]);
  
  // Process GeoJSON data to ensure compatibility
  const processGeoJSON = useCallback(() => {
    if (!geoData) return null;
    
    try {
      // Create a deep copy of the GeoJSON data
      const processedGeoJSON = JSON.parse(JSON.stringify(geoData));
      
      // Add a districtId property to each feature based on existing properties
      processedGeoJSON.features = processedGeoJSON.features.map((feature: any) => {
        if (!feature.properties) {
          feature.properties = {};
        }
        
        // Try to find an appropriate ID property
        const districtId = feature.properties.id || 
                           feature.properties.PRECINCT || 
                           feature.properties.DISTRICT_ID ||
                           feature.properties.districtId;
        
        // Add as a separate property for easy access
        if (districtId) {
          feature.properties.districtId = districtId;
        }
        
        return feature;
      });
      
      return processedGeoJSON;
    } catch (error) {
      console.error('Error processing GeoJSON:', error);
      toast({
        title: 'GeoJSON Processing Error',
        description: `Failed to process GeoJSON data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
      return null;
    }
  }, [geoData, toast]);
  
  // Generate layer paint style based on the current selected visualization
  const getLayerPaint = useCallback(() => {
    const paint: any = {
      'fill-opacity': 0.7,
      'fill-outline-color': '#ffffff'
    };
    
    // Create a color expression that matches district IDs to colors
    const colorExpression: any[] = ['match', ['get', 'districtId']];
    
    // Add color matches for each district based on its data
    Object.entries(districtData).forEach(([id, data]: [string, any]) => {
      if (mapLayer === 'density') {
        const density = data.voterDensity || 0;
        if (density > 0.75) colorExpression.push(id, '#255c1a'); // Very High
        else if (density > 0.5) colorExpression.push(id, '#4d9636'); // High
        else if (density > 0.25) colorExpression.push(id, '#83c75d'); // Medium
        else colorExpression.push(id, '#c5e8b7'); // Low
      }
      else if (mapLayer === 'turnout') {
        const turnout = data.turnout || 0;
        if (turnout > 0.75) colorExpression.push(id, '#1a237e'); // Very High
        else if (turnout > 0.5) colorExpression.push(id, '#3949ab'); // High
        else if (turnout > 0.25) colorExpression.push(id, '#7986cb'); // Medium
        else colorExpression.push(id, '#c5cae9'); // Low
      }
      else if (mapLayer === 'party') {
        const party = data.majorityParty?.toLowerCase();
        if (party === 'democratic') colorExpression.push(id, '#1976d2');
        else if (party === 'republican') colorExpression.push(id, '#d32f2f');
        else if (party === 'green') colorExpression.push(id, '#388e3c');
        else if (party === 'libertarian') colorExpression.push(id, '#ffa726');
        else if (party === 'independent') colorExpression.push(id, '#9575cd');
        else colorExpression.push(id, '#757575'); // Unknown
      }
      else if (mapLayer === 'race') {
        const race = data.majorityRace?.toLowerCase();
        if (race === 'white') colorExpression.push(id, '#90caf9');
        else if (race === 'black' || race === 'african american') colorExpression.push(id, '#5c6bc0');
        else if (race === 'hispanic' || race === 'latino') colorExpression.push(id, '#26a69a');
        else if (race === 'asian') colorExpression.push(id, '#ffb74d');
        else if (race === 'native american') colorExpression.push(id, '#ef6c00');
        else if (race === 'pacific islander') colorExpression.push(id, '#1e88e5');
        else if (race === 'multiracial') colorExpression.push(id, '#ab47bc');
        else colorExpression.push(id, '#bdbdbd'); // Unknown
      }
    });
    
    // Add default color and set the fill-color
    colorExpression.push('#cccccc'); // Default gray for districts with no data
    paint['fill-color'] = colorExpression;
    
    return paint;
  }, [districtData, mapLayer]);
  
  // Update map when data changes
  useEffect(() => {
    if (!map || !geoData) return;
    
    // Wait until map is loaded
    if (!map.isStyleLoaded()) {
      map.on('load', () => {
        // This will trigger this useEffect again after the style is loaded
        setMap(map);
      });
      return;
    }
    
    try {
      // Process GeoJSON data
      const processedGeoJSON = processGeoJSON();
      if (!processedGeoJSON) return;
      
      // Remove previous layers and sources if they exist
      if (map.getLayer('districts-fill')) map.removeLayer('districts-fill');
      if (map.getLayer('districts-outline')) map.removeLayer('districts-outline');
      if (map.getLayer('districts-hover')) map.removeLayer('districts-hover');
      if (map.getSource('districts')) map.removeSource('districts');
      
      // Add the GeoJSON as a source
      map.addSource('districts', {
        type: 'geojson',
        data: processedGeoJSON
      });
      
      // Add fill layer
      map.addLayer({
        id: 'districts-fill',
        type: 'fill',
        source: 'districts',
        paint: getLayerPaint()
      });
      
      // Add outline layer
      map.addLayer({
        id: 'districts-outline',
        type: 'line',
        source: 'districts',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1
        }
      });
      
      // Add hover effect layer
      map.addLayer({
        id: 'districts-hover',
        type: 'line',
        source: 'districts',
        paint: {
          'line-color': '#000000',
          'line-width': 2
        },
        filter: ['==', 'districtId', '']
      });
      
      // Set up mouse events
      map.on('mousemove', 'districts-fill', (e) => {
        if (e.features && e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          
          const feature = e.features[0];
          const districtId = feature.properties?.districtId;
          
          if (districtId) {
            setHoveredDistrictId(districtId);
            map.setFilter('districts-hover', ['==', 'districtId', districtId]);
          }
        }
      });
      
      map.on('mouseleave', 'districts-fill', () => {
        map.getCanvas().style.cursor = '';
        setHoveredDistrictId(null);
        map.setFilter('districts-hover', ['==', 'districtId', '']);
        
        // Close any popup when leaving a district
        if (popupRef) {
          popupRef.remove();
          setPopupRef(null);
        }
      });
      
      map.on('click', 'districts-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const districtId = feature.properties?.districtId;
          
          if (districtId && districtData[districtId]) {
            // Close existing popup if any
            if (popupRef) {
              popupRef.remove();
            }
            
            const district = districtData[districtId];
            
            // Create popup content
            const popupContent = document.createElement('div');
            popupContent.className = 'p-2';
            popupContent.innerHTML = `
              <h4 class="font-medium text-sm border-b pb-1 mb-2">
                ${districtType.charAt(0).toUpperCase() + districtType.slice(1)} ${districtId}
              </h4>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div class="text-neutral-500">Registered Voters:</div>
                <div class="font-medium text-right">
                  ${district.registeredVoters?.toLocaleString() || 'N/A'}
                </div>
                
                <div class="text-neutral-500">Turnout:</div>
                <div class="font-medium text-right">
                  ${district.turnout ? `${(district.turnout * 100).toFixed(1)}%` : 'N/A'}
                </div>
                
                <div class="text-neutral-500">Party Majority:</div>
                <div class="font-medium text-right">
                  ${district.majorityParty || 'N/A'}
                </div>
                
                <div class="text-neutral-500">Avg. Age:</div>
                <div class="font-medium text-right">
                  ${district.averageAge?.toFixed(1) || 'N/A'}
                </div>
              </div>
            `;
            
            // Create and display popup
            const popup = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
              maxWidth: '300px'
            })
              .setLngLat(e.lngLat)
              .setDOMContent(popupContent)
              .addTo(map);
            
            setPopupRef(popup);
          }
        }
      });
      
      // Fit the map to the bounds of the GeoJSON
      // Create an empty bounds object
      const bounds = new mapboxgl.LngLatBounds();
      
      try {
        processedGeoJSON.features.forEach((feature: any) => {
          if (feature.geometry && feature.geometry.coordinates) {
            if (feature.geometry.type === 'Polygon') {
              feature.geometry.coordinates.forEach((ring: number[][]) => {
                if (Array.isArray(ring)) {
                  ring.forEach((coord: number[]) => {
                    if (Array.isArray(coord) && coord.length >= 2) {
                      bounds.extend([coord[0], coord[1]]);
                    }
                  });
                }
              });
            } else if (feature.geometry.type === 'MultiPolygon') {
              feature.geometry.coordinates.forEach((polygon: number[][][]) => {
                if (Array.isArray(polygon)) {
                  polygon.forEach((ring: number[][]) => {
                    if (Array.isArray(ring)) {
                      ring.forEach((coord: number[]) => {
                        if (Array.isArray(coord) && coord.length >= 2) {
                          bounds.extend([coord[0], coord[1]]);
                        }
                      });
                    }
                  });
                }
              });
            }
          }
        });
      } catch (error) {
        console.error('Error extending bounds:', error);
      }
      
      // Fit to bounds with padding
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('Error adding GeoJSON to map:', error);
      toast({
        title: 'Map Error',
        description: `Failed to render the geographic map: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  }, [map, geoData, districtData, processGeoJSON, getLayerPaint, districtType, toast]);
  
  // Update map when layer type changes
  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !map.getLayer('districts-fill')) return;
    
    try {
      map.setPaintProperty('districts-fill', 'fill-color', getLayerPaint()['fill-color']);
    } catch (error) {
      console.error('Error updating map layer:', error);
    }
  }, [map, mapLayer, getLayerPaint]);
  
  // Handle map layer type change
  const handleMapLayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMapLayer(e.target.value as 'density' | 'turnout' | 'party' | 'race');
  };
  
  // Reset map view to show all districts
  const handleResetMapView = () => {
    if (!map || !geoData) return;
    
    try {
      const bounds = new mapboxgl.LngLatBounds();
      
      // Calculate bounds from all features with extra safety checks
      try {
        geoData.features.forEach((feature: any) => {
          if (feature.geometry && feature.geometry.coordinates) {
            if (feature.geometry.type === 'Polygon') {
              feature.geometry.coordinates.forEach((ring: number[][]) => {
                if (Array.isArray(ring)) {
                  ring.forEach((coord: number[]) => {
                    if (Array.isArray(coord) && coord.length >= 2) {
                      bounds.extend([coord[0], coord[1]]);
                    }
                  });
                }
              });
            } else if (feature.geometry.type === 'MultiPolygon') {
              feature.geometry.coordinates.forEach((polygon: number[][][]) => {
                if (Array.isArray(polygon)) {
                  polygon.forEach((ring: number[][]) => {
                    if (Array.isArray(ring)) {
                      ring.forEach((coord: number[]) => {
                        if (Array.isArray(coord) && coord.length >= 2) {
                          bounds.extend([coord[0], coord[1]]);
                        }
                      });
                    }
                  });
                }
              });
            }
          }
        });
      } catch (error) {
        console.error('Error extending bounds in resetView:', error);
      }
      
      // Fit to bounds with padding
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('Error resetting view:', error);
    }
  };
  
  // Toggle map features
  const handleToggleHeatmap = () => {
    toast({
      title: "Toggle Heatmap",
      description: "Heatmap functionality would be implemented here",
    });
  };
  
  const handleShowAllDistricts = () => {
    handleResetMapView();
  };
  
  const handleDownloadMapImage = () => {
    if (!map) return;
    
    try {
      // Get the canvas element
      const canvas = map.getCanvas();
      
      // Create a data URL from the canvas
      const dataUrl = canvas.toDataURL();
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `voter-map-${districtType}-${mapLayer}.png`;
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Map Exported",
        description: "Map image has been downloaded",
      });
    } catch (error) {
      console.error('Error exporting map:', error);
      toast({
        title: "Export Failed",
        description: "Could not export the map image. Try again or try taking a screenshot instead.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">Voter Demographics Map</h3>
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
        <div className="w-full h-[500px] bg-gray-100 rounded relative">
          {(!geoData || !districtData) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <MapPin className="h-10 w-10 text-neutral-300 mb-2" />
              <p className="text-neutral-500">Interactive Geographic Map</p>
              <p className="text-sm text-neutral-400 mt-2">Upload and process data files to generate the map</p>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full" />
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
    </Card>
  );
}