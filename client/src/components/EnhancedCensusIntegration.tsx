import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Database,
  CheckCircle,
  AlertCircle,
  Info,
  Download,
  Layers,
} from "lucide-react";
import { censusGeography } from "@/lib/censusGeography";
import {
  AVAILABLE_STATES,
  hasLocalCensusData,
  getStateInfo,
  validateGeoId,
  parseGeoId,
  type StateInfo,
  type CensusTractFeature,
} from "@/assets/census";

interface EnhancedCensusIntegrationProps {
  selectedState?: string;
  selectedCounty?: string;
  onTractSelected?: (tract: CensusTractFeature) => void;
}

export default function EnhancedCensusIntegration({
  selectedState,
  selectedCounty,
  onTractSelected,
}: EnhancedCensusIntegrationProps) {
  const [availableStates, setAvailableStates] = useState<
    Record<string, StateInfo>
  >({});
  const [selectedStateInfo, setSelectedStateInfo] = useState<StateInfo | null>(
    null
  );
  const [censusTracts, setCensusTracts] = useState<CensusTractFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoIdInput, setGeoIdInput] = useState("");
  const [geoIdValidation, setGeoIdValidation] = useState<{
    isValid: boolean;
    components?: { state: string; county: string; tract: string };
  }>({ isValid: false });

  // Initialize available states
  useEffect(() => {
    setAvailableStates(AVAILABLE_STATES);
  }, []);

  // Update selected state info when state changes
  useEffect(() => {
    if (selectedState) {
      const stateInfo = getStateInfo(selectedState);
      setSelectedStateInfo(stateInfo);

      if (stateInfo?.hasLocalTracts) {
        loadStateTracts(selectedState);
      }
    }
  }, [selectedState]);

  // Load census tracts for a state
  const loadStateTracts = async (stateFips: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const stateTracts = await censusGeography.loadStateTracts(stateFips);
      if (stateTracts) {
        setCensusTracts(stateTracts.features);
      } else {
        setCensusTracts([]);
        setError("No local census tract data available for this state");
      }
    } catch (err) {
      setError(
        `Error loading census tracts: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setCensusTracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load census tracts for a specific county
  const loadCountyTracts = async (stateFips: string, countyFips: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const countyTracts = await censusGeography.loadTracts(
        stateFips,
        countyFips
      );
      if (countyTracts?.features) {
        setCensusTracts(countyTracts.features);
      } else {
        setCensusTracts([]);
        setError("No census tract data available for this county");
      }
    } catch (err) {
      setError(
        `Error loading county tracts: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setCensusTracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate GEOID input
  useEffect(() => {
    if (geoIdInput.trim()) {
      const isValid = validateGeoId(geoIdInput.trim());
      if (isValid) {
        const components = parseGeoId(geoIdInput.trim());
        setGeoIdValidation({ isValid: true, components });
      } else {
        setGeoIdValidation({ isValid: false });
      }
    } else {
      setGeoIdValidation({ isValid: false });
    }
  }, [geoIdInput]);

  // Look up tract by GEOID
  const lookupTractByGeoId = async () => {
    if (!geoIdValidation.isValid || !geoIdInput.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const tract = await censusGeography.getTractByGeoId(geoIdInput.trim());
      if (tract) {
        setCensusTracts([tract]);
        onTractSelected?.(tract);
      } else {
        setError("Census tract not found for the provided GEOID");
        setCensusTracts([]);
      }
    } catch (err) {
      setError(
        `Error looking up tract: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setCensusTracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Enhanced Census Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(availableStates).length}
              </div>
              <div className="text-sm text-gray-600">
                States with Local Data
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(availableStates).reduce(
                  (sum, state) =>
                    sum +
                    state.majorCounties.reduce(
                      (countySum, county) => countySum + county.tractCount,
                      0
                    ),
                  0
                )}
              </div>
              <div className="text-sm text-gray-600">
                Census Tracts Available
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {censusTracts.length}
              </div>
              <div className="text-sm text-gray-600">Currently Loaded</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="states" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="states">Available States</TabsTrigger>
          <TabsTrigger value="lookup">GEOID Lookup</TabsTrigger>
          <TabsTrigger value="tracts">Loaded Tracts</TabsTrigger>
        </TabsList>

        {/* Available States Tab */}
        <TabsContent value="states" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                States with Local Census Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(availableStates).map((state) => (
                  <div key={state.fips} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{state.name}</h3>
                      <Badge
                        variant={state.hasLocalTracts ? "default" : "secondary"}
                      >
                        {state.hasLocalTracts ? "Available" : "API Only"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      FIPS: {state.fips} | Code: {state.code}
                    </div>
                    <div className="space-y-1">
                      {state.majorCounties.map((county) => (
                        <div
                          key={county.fips}
                          className="text-xs bg-gray-50 p-2 rounded"
                        >
                          {county.name} ({county.tractCount} tracts)
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => loadStateTracts(state.fips)}
                      disabled={isLoading || !state.hasLocalTracts}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Load Tracts
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GEOID Lookup Tab */}
        <TabsContent value="lookup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Census Tract GEOID Lookup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Enter 11-digit Census Tract GEOID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={geoIdInput}
                    onChange={(e) => setGeoIdInput(e.target.value)}
                    placeholder="e.g., 12086001200"
                    className="flex-1 px-3 py-2 border rounded-md"
                    maxLength={11}
                  />
                  <Button
                    onClick={lookupTractByGeoId}
                    disabled={!geoIdValidation.isValid || isLoading}
                  >
                    Lookup
                  </Button>
                </div>
              </div>

              {geoIdInput && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {geoIdValidation.isValid ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Valid GEOID format
                        </div>
                        {geoIdValidation.components && (
                          <div className="text-sm">
                            State: {geoIdValidation.components.state} | County:{" "}
                            {geoIdValidation.components.county} | Tract:{" "}
                            {geoIdValidation.components.tract}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Invalid GEOID format. Expected 11 digits (SSCCCTTTTTT)
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loaded Tracts Tab */}
        <TabsContent value="tracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Loaded Census Tracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <div className="mt-2 text-sm text-gray-600">
                    Loading census tracts...
                  </div>
                </div>
              ) : censusTracts.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {censusTracts.map((tract) => (
                    <div
                      key={tract.properties.GEOID}
                      className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onTractSelected?.(tract)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {tract.properties.NAME}
                          </div>
                          <div className="text-sm text-gray-600">
                            GEOID: {tract.properties.GEOID}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {tract.properties.STATEFP}-{tract.properties.COUNTYFP}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Land: {(tract.properties.ALAND / 1000000).toFixed(2)}{" "}
                        km² | Water:{" "}
                        {(tract.properties.AWATER / 1000000).toFixed(2)} km²
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No census tracts loaded. Select a state or enter a GEOID to
                  get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
