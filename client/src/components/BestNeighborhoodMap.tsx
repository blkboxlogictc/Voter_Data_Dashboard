import React, { useState, useEffect } from "react";
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

interface BestNeighborhoodMapProps {
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
    active: true,
  },
  {
    id: "education",
    label: "Education",
    icon: <GraduationCap className="h-4 w-4" />,
    description: "Educational attainment levels by geographic area.",
    unit: "%",
    active: false,
  },
  {
    id: "age",
    label: "Age",
    icon: <Users className="h-4 w-4" />,
    description: "Median age distribution across neighborhoods.",
    unit: "years",
    active: false,
  },
  {
    id: "rent",
    label: "Rent Prices",
    icon: <Home className="h-4 w-4" />,
    description: "Median rent prices by area.",
    unit: "$",
    active: false,
  },
  {
    id: "politics",
    label: "Politics",
    icon: <Vote className="h-4 w-4" />,
    description: "Political voting patterns and party affiliation.",
    unit: "%",
    active: false,
  },
  {
    id: "internet",
    label: "Internet",
    icon: <Wifi className="h-4 w-4" />,
    description: "Internet connectivity and broadband access.",
    unit: "%",
    active: false,
  },
  {
    id: "commute",
    label: "Commute",
    icon: <Car className="h-4 w-4" />,
    description: "Average commute times and transportation methods.",
    unit: "min",
    active: false,
  },
];

// BestNeighborhood.org color scheme
const LEGEND_COLORS = {
  high: "#22c55e", // Green
  average: "#eab308", // Yellow
  low: "#ef4444", // Red
};

export default function BestNeighborhoodMap({
  selectedState,
  selectedCounty,
  stateName,
  countyName,
}: BestNeighborhoodMapProps) {
  const [activeCategory, setActiveCategory] = useState("income");
  const [mapData, setMapData] = useState<DemographicMapData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load data when category or location changes
  useEffect(() => {
    if (selectedState && activeCategory) {
      loadCategoryData();
    }
  }, [selectedState, selectedCounty, activeCategory]);

  const loadCategoryData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call to get demographic data
      const mockData = generateMockMapData(activeCategory);
      setMapData(mockData);

      // Generate statistics
      const stats = calculateStatistics(mockData, activeCategory);
      setStatistics(stats);

      toast({
        title: "Data Loaded",
        description: `Loaded ${activeCategory} data for ${countyName}, ${stateName}`,
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

  // Generate mock data similar to BestNeighborhood.org
  const generateMockMapData = (category: string): DemographicMapData[] => {
    const areas = 48; // 8x6 grid like BestNeighborhood
    const data: DemographicMapData[] = [];

    for (let i = 0; i < areas; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;

      // Generate realistic values based on category
      let value: number;
      let categoryLevel: string;

      switch (category) {
        case "income":
          value = 30000 + Math.random() * 120000; // $30k - $150k
          categoryLevel =
            value > 80000 ? "high" : value > 50000 ? "average" : "low";
          break;
        case "education":
          value = Math.random() * 100; // 0-100% college educated
          categoryLevel = value > 60 ? "high" : value > 30 ? "average" : "low";
          break;
        case "age":
          value = 25 + Math.random() * 40; // 25-65 years
          categoryLevel = value < 35 ? "low" : value < 50 ? "average" : "high";
          break;
        case "rent":
          value = 800 + Math.random() * 2200; // $800 - $3000
          categoryLevel =
            value > 2000 ? "high" : value > 1200 ? "average" : "low";
          break;
        default:
          value = Math.random() * 100;
          categoryLevel = value > 66 ? "high" : value > 33 ? "average" : "low";
      }

      data.push({
        geoid: `area-${i}`,
        name: `Area ${i + 1}`,
        coordinates: [39.8283 + (row - 3) * 0.1, -98.5795 + (col - 4) * 0.2],
        value,
        category: categoryLevel,
        details: { [category]: value },
      });
    }

    return data;
  };

  // Calculate statistics like BestNeighborhood.org
  const calculateStatistics = (
    data: DemographicMapData[],
    category: string
  ) => {
    const values = data.map((d) => d.value);
    const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate percentile ranking (mock)
    const nationalMedian = category === "income" ? 62843 : 50; // US median income or generic 50
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

  // Render the map visualization
  const renderMap = () => {
    if (!mapData.length) return null;

    return (
      <div
        className="relative bg-blue-100 rounded-lg overflow-hidden"
        style={{ height: "400px" }}
      >
        {/* Map grid */}
        <div className="grid grid-cols-8 gap-0 h-full p-2">
          {mapData.map((area, index) => (
            <div
              key={area.geoid}
              className="relative cursor-pointer transition-all hover:scale-105 hover:z-10 hover:shadow-lg"
              style={{
                backgroundColor:
                  LEGEND_COLORS[area.category as keyof typeof LEGEND_COLORS],
                opacity: 0.8,
              }}
              title={`${area.name}: ${formatValue(area.value, activeCategory)}`}
            >
              {/* Area content */}
              <div className="w-full h-full flex items-center justify-center text-xs text-white font-medium">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Map controls (zoom, fullscreen) */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button className="bg-white border border-gray-300 rounded px-2 py-1 text-sm hover:bg-gray-50">
            +
          </button>
          <button className="bg-white border border-gray-300 rounded px-2 py-1 text-sm hover:bg-gray-50">
            −
          </button>
          <button className="bg-white border border-gray-300 rounded px-2 py-1 text-sm hover:bg-gray-50">
            ⛶
          </button>
        </div>

        {/* Attribution */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white bg-opacity-75 px-2 py-1 rounded">
          © BestNeighborhood.org style
        </div>
      </div>
    );
  };

  // Format values based on category
  const formatValue = (value: number, category: string): string => {
    switch (category) {
      case "income":
      case "rent":
        return `$${value.toLocaleString()}`;
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
            The Highest and Lowest {activeConfig?.label} Areas in {countyName},{" "}
            {stateName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{activeConfig?.description}</p>
        </CardContent>
      </Card>

      {/* Navigation Menu */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
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

      {/* Map and Legend */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 h-64 flex items-center justify-center">
              Error: {error}
            </div>
          ) : (
            <>
              {renderMap()}

              {/* Legend */}
              <div className="flex justify-center mt-4 gap-6">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: LEGEND_COLORS.high }}
                  ></div>
                  <span className="text-sm font-medium">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: LEGEND_COLORS.average }}
                  ></div>
                  <span className="text-sm font-medium">Average</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: LEGEND_COLORS.low }}
                  ></div>
                  <span className="text-sm font-medium">Low</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {statistics && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                The median {activeConfig?.label.toLowerCase()} in {countyName}{" "}
                is {formatValue(statistics.median, activeCategory)}.
              </h3>

              <p className="text-gray-600">
                This means {countyName} {activeConfig?.label.toLowerCase()} is{" "}
                {statistics.nationalComparison} the median{" "}
                {activeConfig?.label.toLowerCase()} in the United States, with
                county {activeConfig?.label.toLowerCase()} in the{" "}
                {statistics.percentile}th percentile.
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
                  <div className="text-sm text-gray-500">Range Low</div>
                  <div className="text-xl font-semibold">
                    {formatValue(statistics.min, activeCategory)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Range High</div>
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
