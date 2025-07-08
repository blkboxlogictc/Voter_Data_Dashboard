import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Globe, Database, Map } from "lucide-react";

interface WebsiteIntegrationProps {
  selectedLocation?: {
    state: string;
    county: string;
    stateName: string;
    countyName: string;
  };
}

export default function WebsiteIntegration({
  selectedLocation,
}: WebsiteIntegrationProps) {
  const [activeTab, setActiveTab] = useState("census");
  const [customUrl, setCustomUrl] = useState("");

  // Integration examples for different data sources
  const integrationOptions = [
    {
      id: "census",
      name: "Census Bureau",
      description: "American Community Survey data",
      url: "https://data.census.gov",
      icon: <Database className="h-4 w-4" />,
      implemented: true,
    },
    {
      id: "bestneighborhood",
      name: "BestNeighborhood.org",
      description: "Neighborhood demographics and statistics",
      url: "https://bestneighborhood.org",
      icon: <Map className="h-4 w-4" />,
      implemented: true,
    },
    {
      id: "voting-info",
      name: "Voting Information Project",
      description: "Election and polling data",
      url: "https://www.votinginfoproject.org",
      icon: <Globe className="h-4 w-4" />,
      implemented: false,
    },
    {
      id: "ballotpedia",
      name: "Ballotpedia",
      description: "Election and candidate information",
      url: "https://ballotpedia.org",
      icon: <ExternalLink className="h-4 w-4" />,
      implemented: false,
    },
  ];

  const renderCensusIntegration = () => (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-800">
            Census API Integration Active
          </span>
        </div>
        <p className="text-sm text-green-700">
          Successfully integrated with the U.S. Census Bureau's American
          Community Survey API. Provides demographic data including education,
          income, age, and household information.
        </p>
      </div>

      {selectedLocation && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Current Location Data</h4>
          <p className="text-sm text-gray-600">
            Fetching data for: {selectedLocation.countyName},{" "}
            {selectedLocation.stateName}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            State FIPS: {selectedLocation.state} | County FIPS:{" "}
            {selectedLocation.county}
          </div>
        </div>
      )}
    </div>
  );

  const renderBestNeighborhoodIntegration = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Map className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-800">
            BestNeighborhood.org Style Integration
          </span>
        </div>
        <p className="text-sm text-blue-700">
          Implemented demographic mapping similar to BestNeighborhood.org using
          Census microdata. Provides interactive visualizations of education,
          income, age, and household data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white border rounded-lg">
          <div className="text-sm font-medium">Data Sources</div>
          <ul className="text-xs text-gray-600 mt-1 space-y-1">
            <li>• ACS 5-Year Estimates</li>
            <li>• PUMS Microdata</li>
            <li>• Geographic Boundaries</li>
          </ul>
        </div>
        <div className="p-3 bg-white border rounded-lg">
          <div className="text-sm font-medium">Visualization Types</div>
          <ul className="text-xs text-gray-600 mt-1 space-y-1">
            <li>• Heat Maps</li>
            <li>• Choropleth Maps</li>
            <li>• Statistical Overlays</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderCustomIntegration = () => (
    <div className="space-y-4">
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5 text-yellow-600" />
          <span className="font-medium text-yellow-800">
            Custom Website Integration
          </span>
        </div>
        <p className="text-sm text-yellow-700">
          Integrate data from any website using APIs, web scraping, or iframe
          embedding.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Website URL</label>
          <Input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://example.com/api/data"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm">
            API Call
          </Button>
          <Button variant="outline" size="sm">
            Scrape Data
          </Button>
          <Button variant="outline" size="sm">
            Embed Widget
          </Button>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <strong>API Integration:</strong> Direct data fetching from
          REST/GraphQL APIs
        </p>
        <p>
          <strong>Web Scraping:</strong> Extract data from HTML pages (requires
          backend)
        </p>
        <p>
          <strong>Widget Embedding:</strong> Embed interactive components via
          iframe
        </p>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Website Integration Hub
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="census">Census Data</TabsTrigger>
            <TabsTrigger value="bestneighborhood">Demographics</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="census" className="mt-4">
            {renderCensusIntegration()}
          </TabsContent>

          <TabsContent value="bestneighborhood" className="mt-4">
            {renderBestNeighborhoodIntegration()}
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            {renderCustomIntegration()}
          </TabsContent>
        </Tabs>

        <div className="mt-6 border-t pt-4">
          <h4 className="font-medium mb-3">Available Integration Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrationOptions.map((option) => (
              <div
                key={option.id}
                className={`p-3 border rounded-lg ${
                  option.implemented
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span className="font-medium text-sm">{option.name}</span>
                  </div>
                  {option.implemented ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Available
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {option.description}
                </p>
                <a
                  href={option.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Visit Website <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
