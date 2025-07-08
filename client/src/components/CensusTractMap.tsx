import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Map as MapIcon,
  Users,
  DollarSign,
  Info,
  Layers,
  ZoomIn,
  Download,
} from "lucide-react";
import Plotly from "plotly.js-dist-min";

interface CensusTract {
  name: string;
  geoid: string;
  population: number;
  medianIncome: number;
  demographics?: any;
}

interface CensusTractMapProps {
  data: CensusTract[];
  title: string;
  colorBy?: "population" | "medianIncome";
  onColorByChange?: (colorBy: "population" | "medianIncome") => void;
  selectedState?: string;
  selectedCounty?: string;
  stateName?: string;
  countyName?: string;
}

export default function CensusTractMap({
  data,
  title,
  colorBy = "population",
  onColorByChange,
  selectedState,
  selectedCounty,
  stateName,
  countyName,
}: CensusTractMapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTract, setSelectedTract] = useState<CensusTract | null>(null);
  const [mapType, setMapType] = useState<"choropleth" | "scatter">(
    "choropleth"
  );
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && data.length > 0) {
      createCensusTractMap();
    }
  }, [data, colorBy, mapType]);

  // Cleanup Plotly on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        Plotly.purge(mapRef.current);
      }
    };
  }, []);

  const createCensusTractMap = () => {
    if (!mapRef.current || !data.length) return;

    setIsLoading(true);
    setError(null);

    try {
      // Since we don't have actual GeoJSON boundaries for all tracts,
      // we'll create a scatter plot map with tract locations
      createScatterMap();
    } catch (err: any) {
      setError(err.message || "Failed to create map");
    } finally {
      setIsLoading(false);
    }
  };

  const createScatterMap = () => {
    if (!mapRef.current) return;

    // Generate approximate coordinates for census tracts
    // In a real implementation, you would use actual tract centroids
    const tractData = data.map((tract, index) => {
      // Generate mock coordinates within the county bounds
      // For Miami-Dade County (example)
      const baseLat = 25.7617; // Miami latitude
      const baseLon = -80.1918; // Miami longitude

      // Spread tracts in a grid pattern around the county
      const gridSize = Math.ceil(Math.sqrt(data.length));
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;

      const latOffset = (row - gridSize / 2) * 0.02; // ~2km spacing
      const lonOffset = (col - gridSize / 2) * 0.02;

      return {
        ...tract,
        lat: baseLat + latOffset,
        lon: baseLon + lonOffset,
        colorValue:
          colorBy === "population" ? tract.population : tract.medianIncome,
        hoverText: `
          <b>${tract.name}</b><br>
          GEOID: ${tract.geoid}<br>
          Population: ${tract.population.toLocaleString()}<br>
          Median Income: $${tract.medianIncome.toLocaleString()}<br>
          <extra></extra>
        `,
      };
    });

    const colorScale =
      colorBy === "population"
        ? [
            [0, "#fee5d9"],
            [0.2, "#fcbba1"],
            [0.4, "#fc9272"],
            [0.6, "#fb6a4a"],
            [0.8, "#de2d26"],
            [1, "#a50f15"],
          ]
        : [
            [0, "#f7fcf0"],
            [0.2, "#e0f3db"],
            [0.4, "#ccebc5"],
            [0.6, "#a8ddb5"],
            [0.8, "#7bccc4"],
            [1, "#2b8cbe"],
          ];

    const plotData: any[] = [
      {
        type: "scattermapbox",
        lat: tractData.map((d) => d.lat),
        lon: tractData.map((d) => d.lon),
        mode: "markers",
        marker: {
          size: tractData.map((d) =>
            Math.max(8, Math.min(20, d.population / 500))
          ),
          color: tractData.map((d) => d.colorValue),
          colorscale: colorScale,
          showscale: true,
          colorbar: {
            title: {
              text:
                colorBy === "population" ? "Population" : "Median Income ($)",
              font: { size: 12 },
            },
            thickness: 15,
            len: 0.7,
          },
          opacity: 0.8,
          line: {
            color: "white",
            width: 1,
          },
        },
        text: tractData.map((d) => d.hoverText),
        hovertemplate: "%{text}",
        customdata: tractData,
      },
    ];

    const layout = {
      title: {
        text: title,
        font: { size: 16 },
      },
      mapbox: {
        style: "open-street-map",
        center: {
          lat: tractData.length > 0 ? tractData[0].lat : 25.7617,
          lon: tractData.length > 0 ? tractData[0].lon : -80.1918,
        },
        zoom: 9,
      },
      margin: { t: 50, b: 0, l: 0, r: 0 },
      height: 600,
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

    // Add click event listener
    if (mapRef.current) {
      (mapRef.current as any).on("plotly_click", (eventData: any) => {
        if (eventData.points && eventData.points[0]) {
          const point = eventData.points[0];
          const tract = point.customdata;
          setSelectedTract(tract);
        }
      });
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatistics = () => {
    if (!data.length) return null;

    const populations = data.map((d) => d.population);
    const incomes = data.map((d) => d.medianIncome);

    const totalPopulation = populations.reduce((sum, pop) => sum + pop, 0);
    const avgIncome =
      incomes.reduce((sum, inc) => sum + inc, 0) / incomes.length;
    const minPopulation = Math.min(...populations);
    const maxPopulation = Math.max(...populations);
    const minIncome = Math.min(...incomes);
    const maxIncome = Math.max(...incomes);

    return {
      totalPopulation,
      avgIncome,
      minPopulation,
      maxPopulation,
      minIncome,
      maxIncome,
      tractCount: data.length,
    };
  };

  const stats = getStatistics();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          <Button
            variant={colorBy === "population" ? "default" : "outline"}
            size="sm"
            onClick={() => onColorByChange?.("population")}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Population
          </Button>
          <Button
            variant={colorBy === "medianIncome" ? "default" : "outline"}
            size="sm"
            onClick={() => onColorByChange?.("medianIncome")}
            className="flex items-center gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Income
          </Button>
        </div>

        {stateName && countyName && (
          <Badge variant="outline" className="ml-auto">
            {countyName}, {stateName}
          </Badge>
        )}
      </div>

      {/* Statistics Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {stats.tractCount}
            </div>
            <div className="text-sm text-blue-700">Census Tracts</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {formatNumber(stats.totalPopulation)}
            </div>
            <div className="text-sm text-green-700">Total Population</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {formatCurrency(stats.avgIncome)}
            </div>
            <div className="text-sm text-purple-700">Avg. Income</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">
              {Math.round(stats.totalPopulation / stats.tractCount)}
            </div>
            <div className="text-sm text-orange-700">Avg. Pop/Tract</div>
          </div>
        </div>
      )}

      {/* Map */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading census tract map...</span>
            </div>
          ) : error ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 mb-2">
                No census tract data available
              </div>
              <div className="text-sm text-gray-400">
                Select a state and county to view census tracts
              </div>
            </div>
          ) : (
            <div ref={mapRef} className="w-full" />
          )}
        </CardContent>
      </Card>

      {/* Selected Tract Details */}
      {selectedTract && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Selected Census Tract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">{selectedTract.name}</h4>
                <p className="text-sm text-gray-600">
                  GEOID: {selectedTract.geoid}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Population</div>
                  <div className="text-lg font-semibold">
                    {formatNumber(selectedTract.population)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Median Income</div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(selectedTract.medianIncome)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Legend */}
      <Alert>
        <Layers className="h-4 w-4" />
        <AlertDescription>
          <strong>Interactive Census Tract Map:</strong> Each circle represents
          a census tract. Circle size indicates population density, and color
          represents {colorBy === "population" ? "population" : "median income"}
          . Click on any tract to view detailed information.
        </AlertDescription>
      </Alert>
    </div>
  );
}
