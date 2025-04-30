import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, LayersControl, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DistrictType } from '@shared/schema';
import { MapPin, Layers, Grid, Download, Home } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet default icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface GeographicMapProps {
  geoData: any | null;
  districtData: Record<string, any>;
  districtType: DistrictType;
}

export default function GeographicMap({ geoData, districtData, districtType }: GeographicMapProps) {
  const mapRef = useRef<L.Map>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const { toast } = useToast();
  
  // Style function for GeoJSON features
  const getFeatureStyle = (feature: any) => {
    const districtId = feature.properties?.id || 
                      feature.properties?.PRECINCT || 
                      feature.properties?.DISTRICT_ID ||
                      feature.properties?.districtId;
    
    if (!districtId || !districtData[districtId]) {
      return {
        fillColor: '#cccccc',
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
      };
    }
    
    const district = districtData[districtId];
    const voterDensity = district.voterDensity || 0;
    
    // Color based on voter density
    let fillColor = '#cccccc'; // default gray
    if (voterDensity > 0.75) fillColor = '#255c1a'; // Very High
    else if (voterDensity > 0.5) fillColor = '#4d9636'; // High
    else if (voterDensity > 0.25) fillColor = '#83c75d'; // Medium
    else fillColor = '#c5e8b7'; // Low
    
    return {
      fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };
  
  // Handle hovering and clicking on districts
  const onEachFeature = (feature: any, layer: L.Layer) => {
    const districtId = feature.properties?.id || 
                      feature.properties?.PRECINCT || 
                      feature.properties?.DISTRICT_ID ||
                      feature.properties?.districtId;
    
    if (districtId && districtData[districtId]) {
      const district = districtData[districtId];
      
      // Add tooltip with basic district info
      layer.bindTooltip(`${districtType.charAt(0).toUpperCase() + districtType.slice(1)} ${districtId}`);
      
      // Add popup with detailed district info
      const popupContent = `
        <div class="p-2">
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
        </div>
      `;
      
      layer.bindPopup(popupContent);
      
      // Change style on hover
      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            color: '#000',
            fillOpacity: 0.7
          });
          layer.bringToFront();
        },
        mouseout: (e) => {
          if (geoJsonLayerRef.current) {
            geoJsonLayerRef.current.resetStyle(e.target);
          }
        }
      });
    }
  };
  
  // Reset map view to show all districts
  const handleResetMapView = () => {
    if (mapRef.current && geoJsonLayerRef.current) {
      try {
        const bounds = geoJsonLayerRef.current.getBounds();
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.error('Error resetting view:', error);
      }
    }
  };
  
  // Toggle heatmap
  const handleToggleHeatmap = () => {
    toast({
      title: "Toggle Heatmap",
      description: "Heatmap functionality would be implemented here",
    });
  };
  
  // Show all districts
  const handleShowAllDistricts = () => {
    handleResetMapView();
  };
  
  // Download map as image
  const handleDownloadMapImage = () => {
    toast({
      title: "Export Map",
      description: "This feature would allow exporting the map as an image. Currently using Leaflet which doesn't support this natively.",
    });
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">Voter Demographics Map</h3>
        <div className="flex items-center space-x-2">
          <select 
            className="border border-neutral-300 rounded px-2 py-1 text-sm focus:ring-primary focus:border-primary"
            defaultValue="density"
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
            <MapContainer 
              center={[39.8283, -98.5795]} 
              zoom={4} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              whenCreated={(map) => {
                // @ts-ignore - type definition issue with react-leaflet
                mapRef.current = map;
              }}
            >
              <ZoomControl position="topright" />
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Topo Map">
                  <TileLayer
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
                  />
                </LayersControl.BaseLayer>
              </LayersControl>
              
              {geoData && (
                <GeoJSON 
                  data={geoData}
                  style={getFeatureStyle}
                  onEachFeature={onEachFeature}
                  ref={(layer) => {
                    if (layer) {
                      geoJsonLayerRef.current = layer;
                      setTimeout(() => {
                        handleResetMapView();
                      }, 100);
                    }
                  }}
                />
              )}
            </MapContainer>
          )}
        </div>
        
        {/* Map Legend */}
        <div className="mt-4 p-3 bg-neutral-50 rounded border border-neutral-200">
          <h4 className="text-sm font-medium mb-2 text-neutral-900">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
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