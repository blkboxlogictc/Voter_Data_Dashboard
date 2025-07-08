import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Map,
  TrendingUp,
  Users,
  Home,
  GraduationCap,
  DollarSign,
  Vote,
  Wifi,
  Car,
} from "lucide-react";
import {
  censusApi,
  DemographicMapData,
  ACSMicrodataResult,
} from "@/lib/censusApi";
import { useToast } from "@/hooks/use-toast";
import Plotly from "plotly.js-dist-min";

interface PlotlyDemographicMapProps {
  selectedState: string;
  selectedCounty: string;
  stateName: string;
  countyName: string;
}

// Demographic categories matching BestNeighborhood.org
const DEMOGRAPHIC_CATEGORIES = [
  {
    id: "income",
    label: "Household Income",
    icon: <DollarSign className="h-4 w-4" />,
    description:
      "Median household income by area. High-earning areas are in green, moderate-earning areas are in yellow, and low-earning areas are in red.",
    unit: "$",
  },
  {
    id: "education",
    label: "Education",
    icon: <GraduationCap className="h-4 w-4" />,
    description: "Educational attainment levels by geographic area.",
    unit: "%",
  },
  {
    id: "age",
    label: "Age",
    icon: <Users className="h-4 w-4" />,
    description: "Median age distribution across neighborhoods.",
    unit: "years",
  },
  {
    id: "rent",
    label: "Rent Prices",
    icon: <Home className="h-4 w-4" />,
    description: "Median rent prices by area.",
    unit: "$",
  },
  {
    id: "politics",
    label: "Politics",
    icon: <Vote className="h-4 w-4" />,
    description: "Political voting patterns and party affiliation.",
    unit: "%",
  },
];

// State FIPS codes for mapping
const STATE_FIPS_MAP: Record<string, string> = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
};

export default function PlotlyDemographicMap({
  selectedState,
  selectedCounty,
  stateName,
  countyName,
}: PlotlyDemographicMapProps) {
  const [activeCategory, setActiveCategory] = useState("income");
  const [mapData, setMapData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load data when category or location changes
  useEffect(() => {
    if (selectedState && activeCategory) {
      loadCategoryData();
    }
  }, [selectedState, selectedCounty, activeCategory]);

  // Cleanup Plotly on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        Plotly.purge(mapRef.current);
      }
    };
  }, []);

  const loadCategoryData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate mock county-level data for the selected state
      const countyData = await generateCountyData(
        selectedState,
        activeCategory
      );
      setMapData(countyData);

      // Generate statistics
      const stats = calculateStatistics(countyData, activeCategory);
      setStatistics(stats);

      // Create the Plotly choropleth map
      createPlotlyMap(countyData, activeCategory);

      toast({
        title: "Map Updated",
        description: `Loaded ${activeCategory} data for ${stateName}`,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load data");
      toast({
        title: "Error",
        description: "Failed to load demographic data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock county data for the state
  const generateCountyData = async (stateFips: string, category: string) => {
    // In a real implementation, this would fetch actual county data from Census API
    const stateCode = STATE_FIPS_MAP[stateFips] || "CA";
    const numCounties = Math.floor(Math.random() * 50) + 10; // 10-60 counties

    const counties = [];
    for (let i = 1; i <= numCounties; i++) {
      const countyFips = String(i).padStart(3, "0");
      const fullFips = stateFips + countyFips;

      let value: number;
      let colorValue: number;

      switch (category) {
        case "income":
          value = 30000 + Math.random() * 120000; // $30k - $150k
          colorValue = value;
          break;
        case "education":
          value = Math.random() * 100; // 0-100% college educated
          colorValue = value;
          break;
        case "age":
          value = 25 + Math.random() * 40; // 25-65 years
          colorValue = value;
          break;
        case "rent":
          value = 800 + Math.random() * 2200; // $800 - $3000
          colorValue = value;
          break;
        default:
          value = Math.random() * 100;
          colorValue = value;
      }

      counties.push({
        fips: fullFips,
        county: `County ${i}`,
        state: stateCode,
        value: Math.round(value),
        colorValue: colorValue,
        text: `${stateCode} County ${i}<br>${formatValue(value, category)}`,
      });
    }

    return counties;
  };

  // Create Plotly choropleth map
  const createPlotlyMap = (data: any[], category: string) => {
    if (!mapRef.current || !data.length) return;

    const activeConfig = DEMOGRAPHIC_CATEGORIES.find(
      (cat) => cat.id === category
    );

    const plotData = [
      {
        type: "choropleth",
        locationmode: "USA-states",
        locations: data.map((d) => d.state),
        z: data.map((d) => d.colorValue),
        text: data.map((d) => d.text),
        hovertemplate: "%{text}<extra></extra>",
        colorscale: [
          [0, "#ef4444"], // Red for low values
          [0.5, "#eab308"], // Yellow for medium values
          [1, "#22c55e"], // Green for high values
        ],
        reversescale: category === "rent", // Reverse for rent (high rent = bad)
        colorbar: {
          title: {
            text: `${activeConfig?.label} (${activeConfig?.unit})`,
            font: { size: 12 },
          },
          thickness: 15,
          len: 0.7,
        },
      },
    ];

    const layout = {
      title: {
        text: `${activeConfig?.label} Distribution - ${stateName}`,
        font: { size: 16 },
      },
      geo: {
        scope: "usa",
        projection: { type: "albers usa" },
        showlakes: true,
        lakecolor: "rgb(255, 255, 255)",
        bgcolor: "rgba(0,0,0,0)",
        center: getStateCenter(selectedState),
        lonaxis: { range: getStateLonRange(selectedState) },
        lataxis: { range: getStateLatRange(selectedState) },
      },
      margin: { t: 50, b: 0, l: 0, r: 0 },
      height: 500,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["pan2d", "lasso2d", "select2d"],
      displaylogo: false,
    };

    Plotly.newPlot(mapRef.current, plotData, layout, config);
  };

  // Get state center coordinates for better map focus
  const getStateCenter = (stateFips: string) => {
    const centers: Record<string, { lat: number; lon: number }> = {
      "06": { lat: 36.7783, lon: -119.4179 }, // California
      "12": { lat: 27.7663, lon: -81.6868 }, // Florida
      "48": { lat: 31.9686, lon: -99.9018 }, // Texas
      "36": { lat: 42.1657, lon: -74.9481 }, // New York
      // Add more states as needed
    };
    return centers[stateFips] || { lat: 39.8283, lon: -98.5795 }; // Default to US center
  };

  const getStateLonRange = (stateFips: string) => {
    const ranges: Record<string, [number, number]> = {
      "06": [-124.4096, -114.1312], // California
      "12": [-87.6349, -79.9743], // Florida
      "48": [-106.6456, -93.5083], // Texas
      "36": [-79.7624, -71.7517], // New York
    };
    return ranges[stateFips] || [-125, -65]; // Default US range
  };

  const getStateLatRange = (stateFips: string) => {
    const ranges: Record<string, [number, number]> = {
      "06": [32.5343, 42.0095], // California
      "12": [24.3963, 31.0009], // Florida
      "48": [25.8371, 36.5007], // Texas
      "36": [40.4774, 45.0153], // New York
    };
    return ranges[stateFips] || [20, 50]; // Default US range
  };

  // Calculate statistics
  const calculateStatistics = (data: any[], category: string) => {
    const values = data.map((d) => d.value);
    const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate percentile ranking (mock)
    const nationalMedian = category === "income" ? 62843 : 50;
    const percentile = Math.round((median / nationalMedian) * 100);

    return {
      median: Math.round(median),
      average: Math.round(average),
      min: Math.round(min),
      max: Math.round(max),
      percentile,
      nationalComparison: percentile > 50 ? "above" : "below",
    };
  };

  // Format values based on category
  const formatValue = (value: number, category: string): string => {
    switch (category) {
      case "income":
      case "rent":
        return `$${Math.round(value).toLocaleString()}`;
      case "age":
        return `${Math.round(value)} years`;
      case "education":
        return `${Math.round(value)}%`;
      default:
        return Math.round(value).toString();
    }
  };

  const activeConfig = DEMOGRAPHIC_CATEGORIES.find(
    (cat) => cat.id === activeCategory
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            {activeConfig?.label} Distribution in {stateName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{activeConfig?.description}</p>
        </CardContent>
      </Card>

      {/* Navigation Menu */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {DEMOGRAPHIC_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(category.id)}
            className="flex items-center gap-2 justify-start"
          >
            {category.icon}
            <span className="hidden sm:inline">{category.label}</span>
          </Button>
        ))}
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 h-96 flex items-center justify-center">
              Error: {error}
            </div>
          ) : (
            <div ref={mapRef} className="w-full" />
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {statistics && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                The median {activeConfig?.label.toLowerCase()} in {stateName} is{" "}
                {formatValue(statistics.median, activeCategory)}.
              </h3>

              <p className="text-gray-600">
                This places {stateName} {statistics.nationalComparison} the
                national median, ranking in the {statistics.percentile}th
                percentile nationally.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Median</div>
                  <div className="text-xl font-semibold">
                    {formatValue(statistics.median, activeCategory)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Average</div>
                  <div className="text-xl font-semibold">
                    {formatValue(statistics.average, activeCategory)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Lowest</div>
                  <div className="text-xl font-semibold">
                    {formatValue(statistics.min, activeCategory)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Highest</div>
                  <div className="text-xl font-semibold">
                    {formatValue(statistics.max, activeCategory)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
