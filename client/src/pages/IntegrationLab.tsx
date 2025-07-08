import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Globe,
  Code,
  Database,
  Map,
  Download,
  Eye,
  Settings,
  Layers,
} from "lucide-react";
import BestNeighborhoodMap from "@/components/BestNeighborhoodMap";
import PlotlyDemographicMap from "@/components/PlotlyDemographicMap";
import CensusGeographicMap from "@/components/CensusGeographicMap";
import CensusLocationInput from "@/components/CensusLocationInput";
import WebsiteIntegration from "@/components/WebsiteIntegration";
import EnhancedCensusIntegration from "@/components/EnhancedCensusIntegration";
import CensusApiIntegration from "@/components/CensusApiIntegration";
import type { CensusTractFeature } from "@/assets/census";

export default function IntegrationLab() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [countyName, setCountyName] = useState<string>("");
  const [selectedTract, setSelectedTract] = useState<CensusTractFeature | null>(
    null
  );
  const [customUrl, setCustomUrl] = useState(
    "https://bestneighborhood.org/household-income-martin-county-fl/"
  );

  // Handle location selection
  const handleLocationSelected = (
    state: string,
    county: string,
    stateNameParam: string,
    countyNameParam: string
  ) => {
    setSelectedState(state);
    setSelectedCounty(county);
    setStateName(stateNameParam);
    setCountyName(countyNameParam);
  };

  // Handle tract selection
  const handleTractSelected = (tract: CensusTractFeature) => {
    setSelectedTract(tract);
    console.log("Selected census tract:", tract);
  };

  // Integration methods
  const integrationMethods = [
    {
      id: "iframe",
      name: "Iframe Embedding",
      description: "Embed the entire website or specific pages directly",
      icon: <Globe className="h-4 w-4" />,
      pros: [
        "Easy to implement",
        "Full functionality preserved",
        "No CORS issues",
      ],
      cons: [
        "Limited customization",
        "Responsive design challenges",
        "Security considerations",
      ],
    },
    {
      id: "api",
      name: "API Integration",
      description: "Fetch data through APIs and create custom visualizations",
      icon: <Database className="h-4 w-4" />,
      pros: ["Full control over UI/UX", "Better performance", "Custom styling"],
      cons: [
        "Requires API access",
        "More development time",
        "Data structure dependencies",
      ],
    },
    {
      id: "scraping",
      name: "Web Scraping",
      description: "Extract data from web pages programmatically",
      icon: <Code className="h-4 w-4" />,
      pros: [
        "Works with any website",
        "Can extract specific data",
        "Flexible data processing",
      ],
      cons: [
        "Legal considerations",
        "Fragile to site changes",
        "Rate limiting issues",
      ],
    },
    {
      id: "hybrid",
      name: "Hybrid Approach",
      description: "Combine multiple methods for optimal integration",
      icon: <Settings className="h-4 w-4" />,
      pros: [
        "Best of all worlds",
        "Fallback options",
        "Optimized user experience",
      ],
      cons: [
        "Complex implementation",
        "Higher maintenance",
        "Multiple failure points",
      ],
    },
  ];

  // Render iframe integration
  const renderIframeIntegration = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Iframe Integration Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Enter BestNeighborhood.org URL"
              className="flex-1"
            />
            <Button onClick={() => window.open(customUrl, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Original
            </Button>
          </div>

          <div
            className="border rounded-lg overflow-hidden"
            style={{ height: "600px" }}
          >
            <iframe
              src={customUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              title="BestNeighborhood.org Integration"
              className="w-full h-full"
            />
          </div>

          <div className="text-sm text-gray-600">
            <p>
              <strong>Note:</strong> This iframe directly embeds the
              BestNeighborhood.org website. You can navigate and interact with
              it as if you were on their site.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render API integration demo
  const renderApiIntegration = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            API Integration Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Census API Integration</h4>
              <p className="text-sm text-gray-600 mb-4">
                We've integrated with the U.S. Census Bureau's API to recreate
                BestNeighborhood.org's functionality using the same underlying
                data sources.
              </p>

              <CensusLocationInput
                onLocationSelected={handleLocationSelected}
                isLoading={false}
              />
            </div>

            {selectedState && (
              <CensusGeographicMap
                selectedState={selectedState}
                selectedCounty={selectedCounty}
                stateName={stateName}
                countyName={countyName}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render scraping integration demo
  const renderScrapingIntegration = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Web Scraping Integration Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-medium mb-2">⚠️ Web Scraping Considerations</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                • Always check the website's robots.txt and terms of service
              </li>
              <li>• Respect rate limits to avoid being blocked</li>
              <li>• Consider the legal implications of data extraction</li>
              <li>• Implement proper error handling for site changes</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scraping Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded">
                    <div className="font-medium">Map Data</div>
                    <div className="text-sm text-gray-600">
                      Extract color-coded geographic data
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="font-medium">Statistics</div>
                    <div className="text-sm text-gray-600">
                      Median income, percentiles, comparisons
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="font-medium">Navigation</div>
                    <div className="text-sm text-gray-600">
                      Available demographic categories
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Implementation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Fetch Page HTML
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Code className="h-4 w-4 mr-2" />
                    Parse DOM Elements
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Extract Data Points
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Map className="h-4 w-4 mr-2" />
                    Render Custom Map
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Sample Scraping Code</h4>
            <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
              {`// Example scraping implementation
const scrapeBestNeighborhood = async (url) => {
  const response = await fetch('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ url }),
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await response.json();
  return {
    mapData: data.mapColors,
    statistics: data.stats,
    demographics: data.categories
  };
};`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render hybrid integration demo
  const renderHybridIntegration = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Hybrid Integration Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800">
                  Primary: API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700">
                  Use Census API for core demographic data with custom
                  visualizations
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-800">
                  Secondary: Iframe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700">
                  Embed specific BestNeighborhood pages for detailed analysis
                </p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-800">
                  Fallback: Scraping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-700">
                  Extract data when APIs are unavailable or insufficient
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Integration Flow</h4>
            <div className="flex items-center space-x-4 text-sm">
              <Badge variant="outline">1. Check API</Badge>
              <span>→</span>
              <Badge variant="outline">2. Custom Visualization</Badge>
              <span>→</span>
              <Badge variant="outline">3. Iframe Enhancement</Badge>
              <span>→</span>
              <Badge variant="outline">4. Scraping Backup</Badge>
            </div>
          </div>

          <WebsiteIntegration
            selectedLocation={
              selectedState
                ? {
                    state: selectedState,
                    county: selectedCounty,
                    stateName,
                    countyName,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  );

  // Render enhanced census integration
  const renderEnhancedCensusIntegration = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Enhanced Census Integration with Local GeoJSON
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <h4 className="font-medium mb-2 text-green-800">✨ New Features</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>
                • Comprehensive local GeoJSON files for major states (FL, CA,
                TX, NY)
              </li>
              <li>
                • Proper Census Bureau GEOIDs for all geographic boundaries
              </li>
              <li>• Offline-first approach with API fallback</li>
              <li>• GEOID validation and parsing utilities</li>
              <li>• Enhanced performance and reliability</li>
            </ul>
          </div>

          <EnhancedCensusIntegration
            selectedState={selectedState}
            selectedCounty={selectedCounty}
            onTractSelected={handleTractSelected}
          />

          {selectedTract && (
            <Card className="mt-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800">
                  Selected Census Tract Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2">Geographic Information</h5>
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>GEOID:</strong> {selectedTract.properties.GEOID}
                      </div>
                      <div>
                        <strong>Name:</strong> {selectedTract.properties.NAME}
                      </div>
                      <div>
                        <strong>State FIPS:</strong>{" "}
                        {selectedTract.properties.STATEFP}
                      </div>
                      <div>
                        <strong>County FIPS:</strong>{" "}
                        {selectedTract.properties.COUNTYFP}
                      </div>
                      <div>
                        <strong>Tract Code:</strong>{" "}
                        {selectedTract.properties.TRACTCE}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Area Information</h5>
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Land Area:</strong>{" "}
                        {(selectedTract.properties.ALAND / 1000000).toFixed(2)}{" "}
                        km²
                      </div>
                      <div>
                        <strong>Water Area:</strong>{" "}
                        {(selectedTract.properties.AWATER / 1000000).toFixed(2)}{" "}
                        km²
                      </div>
                      <div>
                        <strong>Center Point:</strong>{" "}
                        {selectedTract.properties.INTPTLAT},{" "}
                        {selectedTract.properties.INTPTLON}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        {selectedTract.properties.FUNCSTAT}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Website Integration Laboratory</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Experiment with different methods to integrate BestNeighborhood.org
          and other external websites into your voter data dashboard. Compare
          approaches and see live demonstrations.
        </p>
      </div>

      {/* Integration Methods Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Integration Methods Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {integrationMethods.map((method) => (
              <Card
                key={method.id}
                className="cursor-pointer transition-all hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {method.icon}
                    {method.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-gray-600">{method.description}</p>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs font-medium text-green-700">
                        Pros:
                      </div>
                      <ul className="text-xs text-green-600 space-y-1">
                        {method.pros.map((pro, index) => (
                          <li key={index}>• {pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-red-700">
                        Cons:
                      </div>
                      <ul className="text-xs text-red-600 space-y-1">
                        {method.cons.map((con, index) => (
                          <li key={index}>• {con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Demos */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="census">Census GeoJSON</TabsTrigger>
          <TabsTrigger value="census-api">Census API</TabsTrigger>
          <TabsTrigger value="iframe">Iframe Demo</TabsTrigger>
          <TabsTrigger value="api">API Demo</TabsTrigger>
          <TabsTrigger value="scraping">Scraping Demo</TabsTrigger>
          <TabsTrigger value="hybrid">Hybrid Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                This laboratory demonstrates various approaches to integrating
                BestNeighborhood.org functionality into your voter data
                dashboard. Each method has its own advantages and use cases.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">What We're Integrating</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      Color-coded demographic maps
                    </li>
                    <li className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Statistical analysis and comparisons
                    </li>
                    <li className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Interactive navigation and filtering
                    </li>
                    <li className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Rich data visualizations
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3">
                    Benefits for Voter Analysis
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Enhanced demographic context for voting patterns</li>
                    <li>• Socioeconomic correlation analysis</li>
                    <li>• Geographic visualization of voter characteristics</li>
                    <li>• Comprehensive neighborhood profiling</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="census" className="mt-6">
          {renderEnhancedCensusIntegration()}
        </TabsContent>

        <TabsContent value="census-api" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Census API Integration
                <Badge variant="default">Live API Data</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <h4 className="font-medium mb-2 text-blue-800">
                  🌐 Live Census API Features
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Access live data from the U.S. Census Bureau API</li>
                  <li>• Select any state and county to view census tracts</li>
                  <li>
                    • Comprehensive demographic data including population,
                    income, race, housing, education
                  </li>
                  <li>
                    • Real-time data updates from official government sources
                  </li>
                  <li>• Detailed tract-level statistics and analysis</li>
                </ul>
              </div>
              <CensusApiIntegration />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iframe" className="mt-6">
          {renderIframeIntegration()}
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          {renderApiIntegration()}
        </TabsContent>

        <TabsContent value="scraping" className="mt-6">
          {renderScrapingIntegration()}
        </TabsContent>

        <TabsContent value="hybrid" className="mt-6">
          {renderHybridIntegration()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
