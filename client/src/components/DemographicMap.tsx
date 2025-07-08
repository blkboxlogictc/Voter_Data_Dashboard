import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Map, BarChart3 } from "lucide-react";
import {
  censusApi,
  DemographicMapData,
  ACSMicrodataResult,
} from "@/lib/censusApi";
import { useToast } from "@/hooks/use-toast";

interface DemographicMapProps {
  selectedState: string;
  selectedCounty: string;
  stateName: string;
  countyName: string;
}

const DEMOGRAPHIC_OPTIONS = [
  { value: "education", label: "Education Levels", icon: "🎓" },
  { value: "income", label: "Household Income", icon: "💰" },
  { value: "age", label: "Age Distribution", icon: "👥" },
  { value: "sex", label: "Gender Distribution", icon: "⚧" },
  { value: "householdSize", label: "Household Size", icon: "🏠" },
];

const COLOR_SCHEMES = {
  education: {
    "Graduate Degree": "#1e40af",
    "Bachelor's Degree": "#3b82f6",
    "High School": "#93c5fd",
    "Less than High School": "#dbeafe",
  },
  income: {
    "High Income": "#059669",
    "Middle Income": "#10b981",
    "Low Income": "#6ee7b7",
    "Very Low Income": "#d1fae5",
  },
  age: {
    Senior: "#7c2d12",
    "Middle Age": "#ea580c",
    "Young Adult": "#fb923c",
    Minor: "#fed7aa",
  },
  sex: {
    Male: "#2563eb",
    Female: "#dc2626",
  },
};

export default function DemographicMap({
  selectedState,
  selectedCounty,
  stateName,
  countyName,
}: DemographicMapProps) {
  const [selectedDemographic, setSelectedDemographic] =
    useState<string>("education");
  const [mapData, setMapData] = useState<DemographicMapData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load demographic data when parameters change
  useEffect(() => {
    if (selectedState && selectedDemographic) {
      loadDemographicData();
    }
  }, [selectedState, selectedCounty, selectedDemographic]);

  const loadDemographicData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const variableSets = censusApi.getDemographicVariableSets();
      const selectedVariables = variableSets[selectedDemographic];

      if (!selectedVariables) {
        throw new Error("Invalid demographic type selected");
      }

      const params = {
        state: selectedState,
        county: selectedCounty,
        variables: selectedVariables.variables,
        year: "2023",
      };

      const result: ACSMicrodataResult = await censusApi.fetchACSMicrodata(
        params
      );

      setMapData(result.data);
      setMetadata(result.metadata);

      toast({
        title: "Data Loaded",
        description: `Loaded ${result.data.length} demographic data points`,
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load demographic data";
      setError(errorMessage);
      console.error("Error loading demographic data:", err);

      toast({
        title: "Error Loading Data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics for the current data
  const calculateStatistics = () => {
    if (!mapData.length) return null;

    const categories = mapData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = mapData.length;
    const averageValue =
      mapData.reduce((sum, item) => sum + item.value, 0) / total;

    return {
      total,
      categories,
      averageValue: Math.round(averageValue * 100) / 100,
    };
  };

  const statistics = calculateStatistics();

  // Render data points as a grid (simulating map visualization)
  const renderDataVisualization = () => {
    if (!mapData.length) return null;

    const colorScheme =
      COLOR_SCHEMES[selectedDemographic as keyof typeof COLOR_SCHEMES] || {};

    return (
      <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-1 p-4 bg-gray-50 rounded-lg">
        {mapData.slice(0, 96).map((dataPoint, index) => (
          <div
            key={dataPoint.geoid}
            className="w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-110 hover:shadow-md"
            style={{
              backgroundColor:
                (colorScheme as Record<string, string>)[dataPoint.category] ||
                "#e5e7eb",
            }}
            title={`${dataPoint.name}: ${dataPoint.category} (${dataPoint.value})`}
          />
        ))}
      </div>
    );
  };

  // Render legend
  const renderLegend = () => {
    if (!statistics) return null;

    const colorScheme =
      COLOR_SCHEMES[selectedDemographic as keyof typeof COLOR_SCHEMES] || {};

    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {Object.entries(statistics.categories).map(([category, count]) => (
          <div key={category} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{
                backgroundColor:
                  (colorScheme as Record<string, string>)[category] ||
                  "#e5e7eb",
              }}
            />
            <span className="text-sm">
              {category} ({count})
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Demographic Map
          </CardTitle>
          <Badge variant="outline">
            {stateName}
            {countyName ? `, ${countyName}` : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Demographic Data Type
            </label>
            <Select
              value={selectedDemographic}
              onValueChange={setSelectedDemographic}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select demographic type" />
              </SelectTrigger>
              <SelectContent>
                {DEMOGRAPHIC_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={loadDemographicData}
              disabled={isLoading || !selectedState}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Load Data
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-medium">Error Loading Data</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
          </div>
        )}

        {/* Statistics Summary */}
        {statistics && !isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">
                Total Records
              </div>
              <div className="text-xl font-bold text-blue-900">
                {statistics.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600 font-medium">
                Categories
              </div>
              <div className="text-xl font-bold text-green-900">
                {Object.keys(statistics.categories).length}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">
                Average Value
              </div>
              <div className="text-xl font-bold text-purple-900">
                {statistics.averageValue}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">
                Data Source
              </div>
              <div className="text-sm font-bold text-orange-900">
                ACS {metadata?.year || "2023"}
              </div>
            </div>
          </div>
        )}

        {/* Map Visualization */}
        {!isLoading && mapData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {
                  DEMOGRAPHIC_OPTIONS.find(
                    (opt) => opt.value === selectedDemographic
                  )?.label
                }{" "}
                Distribution
              </h3>
              <Badge variant="secondary">{mapData.length} data points</Badge>
            </div>

            {renderDataVisualization()}
            {renderLegend()}

            <div className="text-xs text-gray-500 mt-2">
              Each square represents a geographic area colored by{" "}
              {selectedDemographic} data. Hover over squares to see details.
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <div className="text-lg font-medium">
                Loading Demographic Data
              </div>
              <div className="text-sm text-gray-500">
                Fetching {selectedDemographic} data from Census API...
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && mapData.length === 0 && selectedState && (
          <div className="text-center py-12">
            <Map className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <div className="text-lg font-medium text-gray-600">
              No Data Available
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Click "Load Data" to fetch demographic information for the
              selected area.
            </div>
          </div>
        )}

        {/* Instructions */}
        {!selectedState && (
          <div className="text-center py-12">
            <Map className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <div className="text-lg font-medium text-gray-600">
              Select a Location
            </div>
            <div className="text-sm text-gray-500">
              Use the Census Location selector above to choose a state and
              county for demographic analysis.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
