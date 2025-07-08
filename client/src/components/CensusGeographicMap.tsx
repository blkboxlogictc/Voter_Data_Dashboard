import { useRef, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  LayersControl,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Map, Home, Download, Layers, Grid } from "lucide-react";
import { censusApi, CensusDataResult } from "@/lib/censusApi";
import { censusGeography } from "@/lib/censusGeography";
import config from "@/lib/config";
import L from "leaflet";

// Fix Leaflet default icon issues
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

type CensusMapDataType =
  | "income"
  | "education"
  | "population"
  | "housing"
  | "race";

interface CensusGeographicMapProps {
  selectedState: string;
  selectedCounty: string;
  stateName: string;
  countyName: string;
}

// State FIPS to coordinates mapping for better map centering
const STATE_CENTERS: Record<
  string,
  { lat: number; lng: number; zoom: number }
> = {
  "06": { lat: 36.7783, lng: -119.4179, zoom: 6 }, // California
  "12": { lat: 27.7663, lng: -81.6868, zoom: 7 }, // Florida
  "48": { lat: 31.9686, lng: -99.9018, zoom: 6 }, // Texas
  "36": { lat: 42.1657, lng: -74.9481, zoom: 7 }, // New York
  "17": { lat: 40.6331, lng: -89.3985, zoom: 7 }, // Illinois
  "04": { lat: 34.0489, lng: -111.0937, zoom: 7 }, // Arizona
  "13": { lat: 32.1656, lng: -82.9001, zoom: 7 }, // Georgia
  "37": { lat: 35.7596, lng: -79.0193, zoom: 7 }, // North Carolina
  "39": { lat: 40.4173, lng: -82.9071, zoom: 7 }, // Ohio
  "42": { lat: 41.2033, lng: -77.1945, zoom: 7 }, // Pennsylvania
};

export default function CensusGeographicMap({
  selectedState,
  selectedCounty,
  stateName,
  countyName,
}: CensusGeographicMapProps) {
  const mapRef = useRef<L.Map>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const { toast } = useToast();

  const [mapDataType, setMapDataType] = useState<CensusMapDataType>("income");
  const [geoData, setGeoData] = useState<any>(null);
  const [censusData, setCensusData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load census data and geographic boundaries when location changes
  useEffect(() => {
    if (selectedState && selectedCounty) {
      loadCensusMapData();
    }
  }, [selectedState, selectedCounty]);

  // Update map styling when data type changes
  useEffect(() => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.setStyle(getFeatureStyle);
      updateLegend(mapDataType);
    }
  }, [mapDataType, censusData]);

  const loadCensusMapData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch real census tract data using the API endpoint you provided
      const variables = [
        "S0201_001E", // Total population
        "S1901_C01_012E", // Median household income
        "S1501_C01_006E", // Bachelor's degree
        "S1501_C01_007E", // Graduate degree
        "S2501_C01_001E", // Housing units
        "S2502_C01_022E", // Owner occupied
      ];

      const apiUrl = `https://api.census.gov/data/2023/acs/acs5/subject?get=NAME,${variables.join(
        ","
      )}&for=tract:*&in=state:${selectedState}%20county:${selectedCounty}&key=${
        config.censusApiKey
      }`;

      console.log("Fetching census data from:", apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(
          `Census API error: ${response.status} ${response.statusText}`
        );
      }

      const rawData = await response.json();
      console.log("Census API response:", rawData);

      // Step 1: Try to load real tract boundaries
      let tractBoundaries;
      try {
        console.log("Loading real tract boundaries...");
        tractBoundaries = await censusGeography.loadTracts(
          selectedState,
          selectedCounty
        );
        console.log(
          "Real boundaries loaded:",
          tractBoundaries.features?.length,
          "tracts"
        );
      } catch (boundaryError) {
        console.warn(
          "Failed to load real boundaries, using mock:",
          boundaryError
        );
        tractBoundaries = null;
      }

      // Step 2: Process census data and combine with boundaries
      const processedData = tractBoundaries
        ? processCensusDataWithBoundaries(rawData, tractBoundaries)
        : processCensusData(rawData, selectedState, selectedCounty)
            .processedData;

      // Step 3: Set the geographic data
      if (tractBoundaries) {
        setGeoData(tractBoundaries);
      } else {
        const { features } = processCensusData(
          rawData,
          selectedState,
          selectedCounty
        );
        setGeoData({
          type: "FeatureCollection",
          features,
        });
      }

      setCensusData(processedData);

      const featureCount =
        tractBoundaries?.features?.length || Object.keys(processedData).length;
      toast({
        title: "Census Data Loaded",
        description: `Loaded ${featureCount} census tracts for ${countyName}, ${stateName}`,
      });
    } catch (err: any) {
      console.error("Census API error:", err);
      setError(err.message || "Failed to load census data");

      // Fallback to mock data
      const mockData = generateMockData(selectedState, selectedCounty);
      setGeoData(mockData.geoData);
      setCensusData(mockData.censusData);

      toast({
        title: "Using Mock Data",
        description: "Census API unavailable, showing sample data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Process census data with real boundaries
  const processCensusDataWithBoundaries = (
    rawData: any[],
    boundaries: any
  ): Record<string, any> => {
    const processedData: Record<string, any> = {};

    // Skip header row
    const dataRows = rawData.slice(1);

    // Create a lookup map for the census data
    const dataLookup: Record<string, any> = {};
    for (const row of dataRows) {
      const [
        name,
        totalPop,
        medianIncome,
        bachelors,
        graduate,
        housingUnits,
        ownerOccupied,
        stateFp,
        countyFp,
        tractCode,
      ] = row;
      const geoid = stateFp + countyFp + tractCode;

      const parseValue = (val: string) => {
        if (val === null || val === undefined || val === "null") return 0;
        const num = parseInt(val, 10);
        return isNaN(num) ? 0 : num;
      };

      dataLookup[geoid] = {
        name: name || `Census Tract ${tractCode}`,
        totalPopulation: parseValue(totalPop),
        medianIncome: parseValue(medianIncome),
        educationBachelors: parseValue(bachelors),
        educationGraduate: parseValue(graduate),
        housingUnits: parseValue(housingUnits),
        ownerOccupied: parseValue(ownerOccupied),
        homeownershipRate:
          parseValue(housingUnits) > 0
            ? parseValue(ownerOccupied) / parseValue(housingUnits)
            : 0,
        geoid,
        tractCode,
      };
    }

    // Match boundary features with census data
    if (boundaries.features) {
      for (const feature of boundaries.features) {
        const geoid = feature.properties?.GEOID;
        if (geoid && dataLookup[geoid]) {
          processedData[geoid] = dataLookup[geoid];
        }
      }
    }

    return processedData;
  };

  // Process real census data from API
  const processCensusData = (rawData: any[], state: string, county: string) => {
    const features = [];
    const processedData: Record<string, any> = {};

    // Skip header row
    const dataRows = rawData.slice(1);

    // Get state center for positioning tracts
    const stateCenter = STATE_CENTERS[state] || {
      lat: 39.8283,
      lng: -98.5795,
      zoom: 7,
    };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const [
        name,
        totalPop,
        medianIncome,
        bachelors,
        graduate,
        housingUnits,
        ownerOccupied,
        stateFp,
        countyFp,
        tractCode,
      ] = row;
      const geoid = stateFp + countyFp + tractCode;

      // Parse numeric values safely
      const parseValue = (val: string) => {
        if (val === null || val === undefined || val === "null") return 0;
        const num = parseInt(val, 10);
        return isNaN(num) ? 0 : num;
      };

      const totalPopulation = parseValue(totalPop);
      const income = parseValue(medianIncome);
      const bachelorsDegree = parseValue(bachelors);
      const graduateDegree = parseValue(graduate);
      const housing = parseValue(housingUnits);
      const ownerOcc = parseValue(ownerOccupied);

      // Store processed data
      processedData[geoid] = {
        name: name || `Census Tract ${tractCode}`,
        totalPopulation,
        medianIncome: income,
        educationBachelors: bachelorsDegree,
        educationGraduate: graduateDegree,
        housingUnits: housing,
        ownerOccupied: ownerOcc,
        homeownershipRate: housing > 0 ? ownerOcc / housing : 0,
        geoid,
        tractCode,
      };

      // Create geographic feature with realistic positioning
      // Arrange tracts in a grid pattern within the county
      const gridSize = Math.ceil(Math.sqrt(dataRows.length));
      const gridX = i % gridSize;
      const gridY = Math.floor(i / gridSize);

      // Position tracts closer together for county-level view
      const offsetRange = 0.3; // Smaller range for county focus
      const tractSize = 0.02; // Smaller tract size

      const centerLat =
        stateCenter.lat + (gridY - gridSize / 2) * (offsetRange / gridSize);
      const centerLng =
        stateCenter.lng + (gridX - gridSize / 2) * (offsetRange / gridSize);

      const coordinates = [
        [centerLng - tractSize, centerLat - tractSize],
        [centerLng + tractSize, centerLat - tractSize],
        [centerLng + tractSize, centerLat + tractSize],
        [centerLng - tractSize, centerLat + tractSize],
        [centerLng - tractSize, centerLat - tractSize],
      ];

      features.push({
        type: "Feature",
        properties: {
          GEOID: geoid,
          NAME: name || `Census Tract ${tractCode}`,
          STATEFP: stateFp,
          COUNTYFP: countyFp,
          TRACTCE: tractCode,
          id: geoid,
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      });
    }

    return { features, processedData };
  };

  // Generate mock data as fallback
  const generateMockData = (state: string, county: string) => {
    const features = [];
    const censusData: Record<string, any> = {};
    const numTracts = 12; // Fixed number for consistency

    const stateCenter = STATE_CENTERS[state] || {
      lat: 39.8283,
      lng: -98.5795,
      zoom: 7,
    };

    for (let i = 1; i <= numTracts; i++) {
      const tractCode = String(i).padStart(6, "0");
      const geoid = state + county + tractCode;

      // Mock data
      censusData[geoid] = {
        name: `Census Tract ${tractCode}`,
        totalPopulation: Math.floor(1000 + Math.random() * 3000),
        medianIncome: Math.floor(30000 + Math.random() * 80000),
        educationBachelors: Math.floor(Math.random() * 500),
        educationGraduate: Math.floor(Math.random() * 200),
        housingUnits: Math.floor(400 + Math.random() * 1200),
        ownerOccupied: Math.floor(200 + Math.random() * 800),
        homeownershipRate: 0.4 + Math.random() * 0.4,
        geoid,
        tractCode,
      };

      // Create geographic features
      const gridSize = Math.ceil(Math.sqrt(numTracts));
      const gridX = (i - 1) % gridSize;
      const gridY = Math.floor((i - 1) / gridSize);

      const centerLat = stateCenter.lat + (gridY - gridSize / 2) * 0.1;
      const centerLng = stateCenter.lng + (gridX - gridSize / 2) * 0.1;
      const size = 0.03;

      const coordinates = [
        [centerLng - size, centerLat - size],
        [centerLng + size, centerLat - size],
        [centerLng + size, centerLat + size],
        [centerLng - size, centerLat + size],
        [centerLng - size, centerLat - size],
      ];

      features.push({
        type: "Feature",
        properties: {
          GEOID: geoid,
          NAME: `Census Tract ${tractCode}`,
          STATEFP: state,
          COUNTYFP: county,
          TRACTCE: tractCode,
          id: geoid,
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      });
    }

    return {
      geoData: { type: "FeatureCollection", features },
      censusData,
    };
  };

  // Get color based on value and data type
  const getColor = (value: number, dataType: CensusMapDataType): string => {
    switch (dataType) {
      case "income":
        if (value >= 80000) return "#1a5f1a"; // Dark green - high income
        if (value >= 60000) return "#2e7d2e"; // Medium green
        if (value >= 40000) return "#4caf50"; // Light green
        if (value >= 25000) return "#81c784"; // Very light green
        return "#c8e6c9"; // Pale green - low income

      case "education":
        // Number with bachelor's degree or higher
        if (value >= 400) return "#1a237e"; // Dark blue - highly educated
        if (value >= 300) return "#303f9f"; // Medium blue
        if (value >= 200) return "#3f51b5"; // Light blue
        if (value >= 100) return "#7986cb"; // Very light blue
        return "#c5cae9"; // Pale blue - less educated

      case "population":
        if (value >= 3000) return "#b71c1c"; // Dark red - high density
        if (value >= 2500) return "#d32f2f"; // Medium red
        if (value >= 2000) return "#f44336"; // Light red
        if (value >= 1500) return "#ef5350"; // Very light red
        return "#ffcdd2"; // Pale red - low density

      case "housing":
        // Homeownership rate
        if (value >= 0.8) return "#4a148c"; // Dark purple - high ownership
        if (value >= 0.6) return "#7b1fa2"; // Medium purple
        if (value >= 0.4) return "#9c27b0"; // Light purple
        if (value >= 0.2) return "#ba68c8"; // Very light purple
        return "#e1bee7"; // Pale purple - low ownership

      default:
        return "#cccccc";
    }
  };

  // Calculate value for styling based on data type
  const getValueForStyling = (
    tractData: any,
    dataType: CensusMapDataType
  ): number => {
    switch (dataType) {
      case "income":
        return tractData.medianIncome || 0;
      case "education":
        return (
          (tractData.educationBachelors || 0) +
          (tractData.educationGraduate || 0)
        );
      case "population":
        return tractData.totalPopulation || 0;
      case "housing":
        return tractData.homeownershipRate || 0;
      default:
        return 0;
    }
  };

  // Style function for GeoJSON features
  const getFeatureStyle = (feature: any) => {
    const geoid = feature.properties?.GEOID || feature.properties?.id;

    if (!geoid || !censusData[geoid]) {
      return {
        fillColor: "#cccccc",
        weight: 1,
        opacity: 1,
        color: "white",
        fillOpacity: 0.7,
      };
    }

    const tractData = censusData[geoid];
    const value = getValueForStyling(tractData, mapDataType);

    return {
      fillColor: getColor(value, mapDataType),
      weight: 1,
      opacity: 1,
      color: "white",
      fillOpacity: 0.7,
    };
  };

  // Handle feature interactions
  const onEachFeature = (feature: any, layer: L.Layer) => {
    const geoid = feature.properties?.GEOID || feature.properties?.id;
    const tractName = feature.properties?.NAME || `Tract ${geoid}`;

    layer.bindTooltip(tractName);

    if (geoid && censusData[geoid]) {
      const tractData = censusData[geoid];
      const value = getValueForStyling(tractData, mapDataType);

      let valueDisplay = "";
      switch (mapDataType) {
        case "income":
          valueDisplay = `$${value.toLocaleString()}`;
          break;
        case "education":
          valueDisplay = `${value.toLocaleString()} people`;
          break;
        case "population":
          valueDisplay = value.toLocaleString();
          break;
        case "housing":
          valueDisplay = `${(value * 100).toFixed(1)}%`;
          break;
      }

      const popupContent = `
        <div class="p-3" style="min-width: 250px;">
          <h4 class="font-medium text-sm border-b pb-2 mb-3">
            ${tractName}
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
            <div style="color: #6b7280;">Current Metric:</div>
            <div style="font-weight: 500; text-align: right;">${valueDisplay}</div>
            
            <div style="color: #6b7280;">Total Population:</div>
            <div style="font-weight: 500; text-align: right;">${(
              tractData.totalPopulation || 0
            ).toLocaleString()}</div>
            
            <div style="color: #6b7280;">Median Income:</div>
            <div style="font-weight: 500; text-align: right;">$${(
              tractData.medianIncome || 0
            ).toLocaleString()}</div>
            
            <div style="color: #6b7280;">Housing Units:</div>
            <div style="font-weight: 500; text-align: right;">${(
              tractData.housingUnits || 0
            ).toLocaleString()}</div>
          </div>
        </div>
      `;

      layer.bindPopup(popupContent);
    }

    // Hover effects
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 2,
          color: "#000",
          fillOpacity: 0.7,
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.resetStyle(e.target);
        }
      },
    });
  };

  // Update legend
  const updateLegend = (dataType: CensusMapDataType) => {
    const legendTitle = document.getElementById("census-legend-title");
    const legendItems = document.getElementById("census-legend-items");

    if (!legendTitle || !legendItems) return;

    const legends = {
      income: {
        title: "Median Household Income",
        items: [
          { color: "#c8e6c9", label: "Under $25k" },
          { color: "#81c784", label: "$25k - $40k" },
          { color: "#4caf50", label: "$40k - $60k" },
          { color: "#2e7d2e", label: "$60k - $80k" },
          { color: "#1a5f1a", label: "$80k+" },
        ],
      },
      education: {
        title: "Bachelor's Degree or Higher",
        items: [
          { color: "#c5cae9", label: "Under 100" },
          { color: "#7986cb", label: "100 - 200" },
          { color: "#3f51b5", label: "200 - 300" },
          { color: "#303f9f", label: "300 - 400" },
          { color: "#1a237e", label: "400+" },
        ],
      },
      population: {
        title: "Total Population",
        items: [
          { color: "#ffcdd2", label: "Under 1.5k" },
          { color: "#ef5350", label: "1.5k - 2k" },
          { color: "#f44336", label: "2k - 2.5k" },
          { color: "#d32f2f", label: "2.5k - 3k" },
          { color: "#b71c1c", label: "3k+" },
        ],
      },
      housing: {
        title: "Homeownership Rate",
        items: [
          { color: "#e1bee7", label: "Under 20%" },
          { color: "#ba68c8", label: "20% - 40%" },
          { color: "#9c27b0", label: "40% - 60%" },
          { color: "#7b1fa2", label: "60% - 80%" },
          { color: "#4a148c", label: "80%+" },
        ],
      },
    };

    const legend = legends[dataType as keyof typeof legends] || legends.income;
    legendTitle.textContent = legend.title;
    legendItems.innerHTML = "";

    legend.items.forEach((item: { color: string; label: string }) => {
      const div = document.createElement("div");
      div.className = "flex items-center";
      div.innerHTML = `
        <div class="w-4 h-4 rounded" style="background-color: ${item.color}"></div>
        <span class="ml-2 text-xs text-neutral-700">${item.label}</span>
      `;
      legendItems.appendChild(div);
    });
  };

  // Reset map view
  const handleResetMapView = () => {
    if (mapRef.current && geoJsonLayerRef.current) {
      try {
        const bounds = geoJsonLayerRef.current.getBounds();
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      } catch (error) {
        console.error("Error resetting view:", error);
      }
    }
  };

  // Get map center based on selected state
  const getMapCenter = (): [number, number] => {
    const stateCenter = STATE_CENTERS[selectedState];
    return stateCenter
      ? [stateCenter.lat, stateCenter.lng]
      : [39.8283, -98.5795];
  };

  const getMapZoom = (): number => {
    const stateCenter = STATE_CENTERS[selectedState];
    return stateCenter ? stateCenter.zoom + 1 : 4; // Zoom in more for county level
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">
          Census Demographics Map - {countyName}, {stateName}
        </h3>
        <div className="flex items-center space-x-2">
          <select
            className="border border-neutral-300 rounded px-2 py-1 text-sm focus:ring-primary focus:border-primary"
            value={mapDataType}
            onChange={(e) =>
              setMapDataType(e.target.value as CensusMapDataType)
            }
          >
            <option value="income">Median Income</option>
            <option value="education">Education Level</option>
            <option value="population">Population</option>
            <option value="housing">Homeownership</option>
          </select>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="w-full h-[500px] bg-gray-100 rounded relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-neutral-500">Loading Census Data...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Map className="h-10 w-10 text-red-300 mb-2" />
              <p className="text-red-600">Error: {error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Using mock data instead
              </p>
            </div>
          ) : !geoData ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Map className="h-10 w-10 text-neutral-300 mb-2" />
              <p className="text-neutral-500">
                Select a location to view census data
              </p>
            </div>
          ) : (
            <MapContainer
              center={getMapCenter()}
              zoom={getMapZoom()}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              ref={mapRef}
            >
              <ZoomControl position="topright" />
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {geoData && (
                <GeoJSON
                  key={`census-geo-${mapDataType}-${selectedState}-${selectedCounty}`}
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

        {/* Legend */}
        <div className="mt-4 p-3 bg-neutral-50 rounded border border-neutral-200">
          <h4 className="text-sm font-medium mb-2 text-neutral-900">
            Legend:{" "}
            <span id="census-legend-title">Median Household Income</span>
          </h4>
          <div
            className="grid grid-cols-2 md:grid-cols-5 gap-y-2 gap-x-4"
            id="census-legend-items"
          >
            {/* Legend items will be dynamically updated */}
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
            onClick={() => loadCensusMapData()}
          >
            <Layers className="h-4 w-4 mr-1" />
            Refresh Data
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
