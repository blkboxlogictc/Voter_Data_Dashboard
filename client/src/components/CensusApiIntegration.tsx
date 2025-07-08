import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Database,
  CheckCircle,
  AlertCircle,
  Info,
  Download,
  Layers,
  Users,
  DollarSign,
  Home,
  GraduationCap,
  Map as MapIcon,
} from "lucide-react";
import { censusApi } from "@/lib/censusApi";
import CensusTractMap from "@/components/CensusTractMap";

// US States with FIPS codes
const US_STATES = [
  { fips: "01", name: "Alabama", code: "AL" },
  { fips: "02", name: "Alaska", code: "AK" },
  { fips: "04", name: "Arizona", code: "AZ" },
  { fips: "05", name: "Arkansas", code: "AR" },
  { fips: "06", name: "California", code: "CA" },
  { fips: "08", name: "Colorado", code: "CO" },
  { fips: "09", name: "Connecticut", code: "CT" },
  { fips: "10", name: "Delaware", code: "DE" },
  { fips: "11", name: "District of Columbia", code: "DC" },
  { fips: "12", name: "Florida", code: "FL" },
  { fips: "13", name: "Georgia", code: "GA" },
  { fips: "15", name: "Hawaii", code: "HI" },
  { fips: "16", name: "Idaho", code: "ID" },
  { fips: "17", name: "Illinois", code: "IL" },
  { fips: "18", name: "Indiana", code: "IN" },
  { fips: "19", name: "Iowa", code: "IA" },
  { fips: "20", name: "Kansas", code: "KS" },
  { fips: "21", name: "Kentucky", code: "KY" },
  { fips: "22", name: "Louisiana", code: "LA" },
  { fips: "23", name: "Maine", code: "ME" },
  { fips: "24", name: "Maryland", code: "MD" },
  { fips: "25", name: "Massachusetts", code: "MA" },
  { fips: "26", name: "Michigan", code: "MI" },
  { fips: "27", name: "Minnesota", code: "MN" },
  { fips: "28", name: "Mississippi", code: "MS" },
  { fips: "29", name: "Missouri", code: "MO" },
  { fips: "30", name: "Montana", code: "MT" },
  { fips: "31", name: "Nebraska", code: "NE" },
  { fips: "32", name: "Nevada", code: "NV" },
  { fips: "33", name: "New Hampshire", code: "NH" },
  { fips: "34", name: "New Jersey", code: "NJ" },
  { fips: "35", name: "New Mexico", code: "NM" },
  { fips: "36", name: "New York", code: "NY" },
  { fips: "37", name: "North Carolina", code: "NC" },
  { fips: "38", name: "North Dakota", code: "ND" },
  { fips: "39", name: "Ohio", code: "OH" },
  { fips: "40", name: "Oklahoma", code: "OK" },
  { fips: "41", name: "Oregon", code: "OR" },
  { fips: "42", name: "Pennsylvania", code: "PA" },
  { fips: "44", name: "Rhode Island", code: "RI" },
  { fips: "45", name: "South Carolina", code: "SC" },
  { fips: "46", name: "South Dakota", code: "SD" },
  { fips: "47", name: "Tennessee", code: "TN" },
  { fips: "48", name: "Texas", code: "TX" },
  { fips: "49", name: "Utah", code: "UT" },
  { fips: "50", name: "Vermont", code: "VT" },
  { fips: "51", name: "Virginia", code: "VA" },
  { fips: "53", name: "Washington", code: "WA" },
  { fips: "54", name: "West Virginia", code: "WV" },
  { fips: "55", name: "Wisconsin", code: "WI" },
  { fips: "56", name: "Wyoming", code: "WY" },
];

interface County {
  name: string;
  fips: string;
  population: number;
  medianIncome: number;
}

interface CensusTract {
  name: string;
  geoid: string;
  population: number;
  medianIncome: number;
  demographics?: any;
}

interface TractDetails {
  name: string;
  geoid: string;
  totalPopulation: number;
  medianIncome: number;
  race: {
    white: number;
    black: number;
    nativeAmerican: number;
    asian: number;
    pacificIslander: number;
    other: number;
    multiracial: number;
  };
  ethnicity: {
    nonHispanic: number;
    hispanic: number;
  };
  housing: {
    totalUnits: number;
    ownerOccupied: number;
    renterOccupied: number;
  };
  education: {
    highSchool: number;
    bachelors: number;
    masters: number;
  };
  transportation: {
    totalCommuters: number;
    publicTransport: number;
  };
}

export default function CensusApiIntegration() {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [counties, setCounties] = useState<County[]>([]);
  const [censusTracts, setCensusTracts] = useState<CensusTract[]>([]);
  const [selectedTract, setSelectedTract] = useState<TractDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [mapColorBy, setMapColorBy] = useState<"population" | "medianIncome">(
    "population"
  );

  // Load counties when state is selected
  useEffect(() => {
    if (selectedState) {
      loadCounties(selectedState);
      setSelectedCounty("");
      setCensusTracts([]);
      setSelectedTract(null);
    }
  }, [selectedState]);

  // Load census tracts when county is selected
  useEffect(() => {
    if (selectedState && selectedCounty) {
      loadCensusTracts(selectedState, selectedCounty);
      setSelectedTract(null);
    }
  }, [selectedState, selectedCounty]);

  const loadCounties = async (stateFips: string) => {
    setIsLoading(true);
    setLoadingStep("Loading counties...");
    setError(null);

    try {
      const countiesData = await censusApi.fetchCounties(stateFips);
      // Sort counties alphabetically by name while preserving FIPS codes
      const sortedCounties = countiesData.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setCounties(sortedCounties);
    } catch (err) {
      setError(
        `Error loading counties: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setCounties([]);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const loadCensusTracts = async (stateFips: string, countyFips: string) => {
    setIsLoading(true);
    setLoadingStep("Loading census tracts...");
    setError(null);

    try {
      const tractsData = await censusApi.fetchCensusTracts(
        stateFips,
        countyFips
      );
      setCensusTracts(tractsData);
    } catch (err) {
      setError(
        `Error loading census tracts: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setCensusTracts([]);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const loadTractDetails = async (tract: CensusTract) => {
    setIsLoading(true);
    setLoadingStep("Loading tract details...");
    setError(null);

    try {
      // Extract tract code from GEOID (last 6 digits)
      const tractCode = tract.geoid.slice(-6);
      const tractDetails = await censusApi.fetchTractDemographics(
        selectedState,
        selectedCounty,
        tractCode
      );
      setSelectedTract(tractDetails);
    } catch (err) {
      setError(
        `Error loading tract details: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const getSelectedStateName = () => {
    return US_STATES.find((state) => state.fips === selectedState)?.name || "";
  };

  const getSelectedCountyName = () => {
    return (
      counties.find((county) => county.fips === selectedCounty)?.name || ""
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Census API Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {US_STATES.length}
              </div>
              <div className="text-sm text-gray-600">Available States</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {counties.length}
              </div>
              <div className="text-sm text-gray-600">Counties Loaded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {censusTracts.length}
              </div>
              <div className="text-sm text-gray-600">Census Tracts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {selectedTract ? "1" : "0"}
              </div>
              <div className="text-sm text-gray-600">Tract Selected</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* State and County Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Geographic Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">State</label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.fips} value={state.fips}>
                      {state.name} ({state.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">County</label>
              <Select
                value={selectedCounty}
                onValueChange={setSelectedCounty}
                disabled={!selectedState || counties.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a county" />
                </SelectTrigger>
                <SelectContent>
                  {counties.map((county) => (
                    <SelectItem key={county.fips} value={county.fips}>
                      {county.name} (Pop: {formatNumber(county.population)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedState && selectedCounty && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Selected: {getSelectedCountyName()}, {getSelectedStateName()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <div className="mt-2 text-sm text-gray-600">{loadingStep}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="tracts">Census Tracts</TabsTrigger>
          <TabsTrigger value="details">Tract Details</TabsTrigger>
          <TabsTrigger value="counties">Counties</TabsTrigger>
        </TabsList>

        {/* Map View Tab */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapIcon className="h-4 w-4" />
                Census Tracts Map
                {selectedState && selectedCounty && (
                  <Badge variant="outline">
                    {getSelectedCountyName()}, {getSelectedStateName()}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedState && selectedCounty && censusTracts.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 text-blue-800">
                      📍 Interactive Census Tracts Map
                    </h4>
                    <p className="text-sm text-blue-700">
                      This map shows census tracts for {getSelectedCountyName()}
                      , {getSelectedStateName()} with live data from the U.S.
                      Census Bureau API. Each tract is colored by population
                      density and shows detailed demographic information on
                      hover.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {censusTracts.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Tracts</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {formatNumber(
                          censusTracts.reduce(
                            (sum, tract) => sum + tract.population,
                            0
                          )
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Population
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(
                          Math.round(
                            censusTracts.reduce(
                              (sum, tract) => sum + tract.medianIncome,
                              0
                            ) / censusTracts.length
                          )
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Avg. Median Income
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {Math.round(
                          censusTracts.reduce(
                            (sum, tract) => sum + tract.population,
                            0
                          ) / censusTracts.length
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Avg. Population
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <CensusTractMap
                      data={censusTracts}
                      title={`Census Tracts - ${getSelectedCountyName()}, ${getSelectedStateName()}`}
                      colorBy={mapColorBy}
                      onColorByChange={setMapColorBy}
                      selectedState={selectedState}
                      selectedCounty={selectedCounty}
                      stateName={getSelectedStateName()}
                      countyName={getSelectedCountyName()}
                    />
                  </div>
                </div>
              ) : selectedState && selectedCounty ? (
                <div className="text-center py-12">
                  <MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-500 mb-2">
                    Loading census tracts...
                  </div>
                  <div className="text-sm text-gray-400">
                    Please wait while we fetch the latest data from the Census
                    API
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-500 mb-2">
                    Select a state and county to view the map
                  </div>
                  <div className="text-sm text-gray-400">
                    Choose a location above to see census tracts with live API
                    data
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Census Tracts Tab */}
        <TabsContent value="tracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Census Tracts
                {selectedState && selectedCounty && (
                  <Badge variant="outline">
                    {getSelectedCountyName()}, {getSelectedStateName()}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {censusTracts.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {censusTracts.map((tract) => (
                    <div
                      key={tract.geoid}
                      className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => loadTractDetails(tract)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{tract.name}</div>
                          <div className="text-sm text-gray-600">
                            GEOID: {tract.geoid}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatNumber(tract.population)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(tract.medianIncome)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedState && selectedCounty ? (
                <div className="text-center py-8 text-gray-500">
                  No census tracts loaded yet.
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a state and county to view census tracts.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tract Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Detailed Tract Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTract ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {selectedTract.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="text-sm text-gray-600">
                            Population
                          </div>
                          <div className="font-medium">
                            {formatNumber(selectedTract.totalPopulation)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="text-sm text-gray-600">
                            Median Income
                          </div>
                          <div className="font-medium">
                            {formatCurrency(selectedTract.medianIncome)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-purple-600" />
                        <div>
                          <div className="text-sm text-gray-600">GEOID</div>
                          <div className="font-medium">
                            {selectedTract.geoid}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Race Demographics */}
                  <div>
                    <h4 className="font-semibold mb-2">Race Demographics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(selectedTract.race).map(
                        ([race, count]) => (
                          <div key={race} className="text-sm">
                            <div className="text-gray-600 capitalize">
                              {race.replace(/([A-Z])/g, " $1").trim()}
                            </div>
                            <div className="font-medium">
                              {formatNumber(count)}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Housing */}
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Housing
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Total Units</div>
                        <div className="font-medium">
                          {formatNumber(selectedTract.housing.totalUnits)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Owner Occupied
                        </div>
                        <div className="font-medium">
                          {formatNumber(selectedTract.housing.ownerOccupied)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Renter Occupied
                        </div>
                        <div className="font-medium">
                          {formatNumber(selectedTract.housing.renterOccupied)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Education
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">High School</div>
                        <div className="font-medium">
                          {formatNumber(selectedTract.education.highSchool)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Bachelor's</div>
                        <div className="font-medium">
                          {formatNumber(selectedTract.education.bachelors)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Master's</div>
                        <div className="font-medium">
                          {formatNumber(selectedTract.education.masters)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Click on a census tract to view detailed information.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Counties Tab */}
        <TabsContent value="counties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Counties
                {selectedState && (
                  <Badge variant="outline">{getSelectedStateName()}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {counties.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {counties.map((county) => (
                    <div
                      key={county.fips}
                      className={`border rounded-lg p-3 cursor-pointer ${
                        selectedCounty === county.fips
                          ? "bg-blue-50 border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedCounty(county.fips)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{county.name}</div>
                          <div className="text-sm text-gray-600">
                            FIPS: {county.fips}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatNumber(county.population)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(county.medianIncome)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedState ? (
                <div className="text-center py-8 text-gray-500">
                  Loading counties...
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a state to view counties.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
