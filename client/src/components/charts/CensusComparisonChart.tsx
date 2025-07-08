import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessedVoterData } from "@shared/schema";
import DemographicMap from "@/components/DemographicMap";
import BestNeighborhoodMap from "@/components/BestNeighborhoodMap";
import PlotlyDemographicMap from "@/components/PlotlyDemographicMap";
import CensusGeographicMap from "@/components/CensusGeographicMap";
import CensusLocationInput from "@/components/CensusLocationInput";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";

interface CensusComparisonChartProps {
  data: ProcessedVoterData;
}

export default function CensusComparisonChart({
  data,
}: CensusComparisonChartProps) {
  const [activeTab, setActiveTab] = useState("unregistered");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [countyName, setCountyName] = useState<string>("");
  const [isLoadingCensus, setIsLoadingCensus] = useState<boolean>(false);

  // Handle location selection from CensusLocationInput
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
    setIsLoadingCensus(true);

    // Simulate loading delay
    setTimeout(() => {
      setIsLoadingCensus(false);
    }, 1000);
  };

  // Check if census data is available
  const hasCensusData = data.censusData && data.censusData.countyLevel;

  if (!hasCensusData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Census Data Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>
              Census data not available. Upload voter data with census
              integration enabled.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for unregistered voters chart
  const prepareUnregisteredVotersData = () => {
    if (!data.censusData?.unregisteredVoters || !data.precinctDemographics) {
      return [];
    }

    const precincts = data.precinctDemographics.precincts;

    return precincts
      .map((precinct) => {
        const registeredVoters =
          data.precinctDemographics.registeredVoters[precinct] || 0;
        const unregisteredVoters =
          data.censusData?.unregisteredVoters?.[precinct] || 0;

        return {
          name: `Precinct ${precinct}`,
          registered: registeredVoters,
          unregistered: unregisteredVoters,
          total: registeredVoters + unregisteredVoters,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Show top 10 precincts by population
  };

  // Prepare data for socioeconomic correlation chart
  const prepareSocioeconomicData = () => {
    if (!data.censusData?.socioeconomicCorrelations) {
      return {
        income: [],
        education: [],
      };
    }

    const incomeData =
      data.censusData?.socioeconomicCorrelations?.incomeVsTurnout;
    const educationData =
      data.censusData?.socioeconomicCorrelations?.educationVsTurnout;

    const income = incomeData
      ? incomeData.precincts.map((precinct, index) => ({
          x: incomeData.income[index],
          y: incomeData.turnout[index] * 100, // Convert to percentage
          z: 1,
          name: `Precinct ${precinct}`,
        }))
      : [];

    const education = educationData
      ? educationData.precincts.map((precinct, index) => ({
          x: educationData.education[index] * 100, // Convert to percentage
          y: educationData.turnout[index] * 100, // Convert to percentage
          z: 1,
          name: `Precinct ${precinct}`,
        }))
      : [];

    return { income, education };
  };

  // Get correlation values
  const getCorrelationValues = () => {
    const incomeCorrelation =
      data.censusData?.socioeconomicCorrelations?.incomeVsTurnout
        ?.correlation || 0;
    const educationCorrelation =
      data.censusData?.socioeconomicCorrelations?.educationVsTurnout
        ?.correlation || 0;

    return { incomeCorrelation, educationCorrelation };
  };

  const unregisteredData = prepareUnregisteredVotersData();
  const socioeconomicData = prepareSocioeconomicData();
  const correlationValues = getCorrelationValues();

  // Calculate county-wide statistics
  const countyStats = {
    totalPopulation:
      data.censusData?.countyLevel?.totalPopulation?.toLocaleString() || "N/A",
    votingAgePopulation:
      data.censusData?.countyLevel?.votingAgePopulation?.toLocaleString() ||
      "N/A",
    medianIncome: data.censusData?.countyLevel?.medianIncome
      ? `$${data.censusData.countyLevel.medianIncome.toLocaleString()}`
      : "N/A",
    homeownershipRate: data.censusData?.countyLevel?.homeownershipRate
      ? `${(data.censusData.countyLevel.homeownershipRate * 100).toFixed(1)}%`
      : "N/A",
  };

  // Calculate total registered and unregistered voters
  const totalRegistered = Object.values(
    data.precinctDemographics.registeredVoters
  ).reduce((sum, count) => sum + count, 0);

  const totalUnregistered = data.censusData?.unregisteredVoters
    ? Object.values(data.censusData.unregisteredVoters).reduce(
        (sum, count) => sum + count,
        0
      )
    : 0;

  const registrationRate =
    totalRegistered + totalUnregistered > 0
      ? (
          (totalRegistered / (totalRegistered + totalUnregistered)) *
          100
        ).toFixed(1)
      : "N/A";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Census Data Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Total Population</div>
            <div className="text-xl font-semibold">
              {countyStats.totalPopulation}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Voting Age Population</div>
            <div className="text-xl font-semibold">
              {countyStats.votingAgePopulation}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Median Income</div>
            <div className="text-xl font-semibold">
              {countyStats.medianIncome}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Homeownership Rate</div>
            <div className="text-xl font-semibold">
              {countyStats.homeownershipRate}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="text-lg font-medium mb-2">
            Voter Registration Rate
          </div>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full"
                style={{ width: `${registrationRate}%` }}
              ></div>
            </div>
            <span className="ml-3 font-semibold">{registrationRate}%</span>
          </div>
          <div className="mt-2 text-sm text-gray-600 flex justify-between">
            <span>Registered: {totalRegistered.toLocaleString()}</span>
            <span>Unregistered: {totalUnregistered.toLocaleString()}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="unregistered">Unregistered Voters</TabsTrigger>
            <TabsTrigger value="socioeconomic">
              Socioeconomic Factors
            </TabsTrigger>
            <TabsTrigger value="demographic-map">Demographic Map</TabsTrigger>
            <TabsTrigger value="bestneighborhood">
              BestNeighborhood Style
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unregistered" className="mt-4">
            <div className="text-sm text-gray-500 mb-2">
              Top 10 precincts by total voting age population
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={unregisteredData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                <Bar
                  dataKey="registered"
                  stackId="a"
                  fill="#4f46e5"
                  name="Registered Voters"
                />
                <Bar
                  dataKey="unregistered"
                  stackId="a"
                  fill="#ef4444"
                  name="Unregistered Voters"
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="socioeconomic" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-2">
                  Income vs. Voter Turnout
                  <span className="ml-2 font-medium">
                    (r = {correlationValues.incomeCorrelation.toFixed(2)})
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Income"
                      unit="$"
                      domain={["auto", "auto"]}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Turnout"
                      unit="%"
                      domain={[0, 100]}
                    />
                    <ZAxis type="number" range={[60, 60]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value: any, name) => {
                        if (name === "Income")
                          return [`$${value.toLocaleString()}`, name];
                        return [
                          `${
                            typeof value === "number" ? value.toFixed(1) : value
                          }%`,
                          name,
                        ];
                      }}
                      labelFormatter={(value) =>
                        socioeconomicData.income[value]?.name || ""
                      }
                    />
                    <Scatter
                      name="Income vs. Turnout"
                      data={socioeconomicData.income}
                      fill="#8884d8"
                    >
                      {socioeconomicData.income.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#4f46e5" />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">
                  Education vs. Voter Turnout
                  <span className="ml-2 font-medium">
                    (r = {correlationValues.educationCorrelation.toFixed(2)})
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Education"
                      unit="%"
                      domain={[0, 100]}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Turnout"
                      unit="%"
                      domain={[0, 100]}
                    />
                    <ZAxis type="number" range={[60, 60]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value: any, name) => [
                        `${
                          typeof value === "number" ? value.toFixed(1) : value
                        }%`,
                        name,
                      ]}
                      labelFormatter={(value) =>
                        socioeconomicData.education[value]?.name || ""
                      }
                    />
                    <Scatter
                      name="Education vs. Turnout"
                      data={socioeconomicData.education}
                      fill="#82ca9d"
                    >
                      {socioeconomicData.education.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#10b981" />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p className="mb-2">
                <strong>Insights:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Income correlation (
                  {correlationValues.incomeCorrelation.toFixed(2)}):
                  {correlationValues.incomeCorrelation > 0.7
                    ? " Strong positive correlation between income and voter turnout."
                    : correlationValues.incomeCorrelation > 0.4
                    ? " Moderate positive correlation between income and voter turnout."
                    : " Weak correlation between income and voter turnout."}
                </li>
                <li>
                  Education correlation (
                  {correlationValues.educationCorrelation.toFixed(2)}):
                  {correlationValues.educationCorrelation > 0.7
                    ? " Strong positive correlation between education level and voter turnout."
                    : correlationValues.educationCorrelation > 0.4
                    ? " Moderate positive correlation between education level and voter turnout."
                    : " Weak correlation between education level and voter turnout."}
                </li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="demographic-map" className="mt-4">
            <div className="space-y-6">
              <div className="text-sm text-gray-500 mb-4">
                Interactive demographic mapping using American Community Survey
                (ACS) data. Select a location to view detailed demographic
                breakdowns similar to Bestneighborhood.org.
              </div>

              <CensusLocationInput
                onLocationSelected={handleLocationSelected}
                isLoading={isLoadingCensus}
              />

              {selectedState && (
                <DemographicMap
                  selectedState={selectedState}
                  selectedCounty={selectedCounty}
                  stateName={stateName}
                  countyName={countyName}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="bestneighborhood" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-gray-500 mb-4">
                Interactive demographic mapping in the style of
                BestNeighborhood.org. Explore income, education, age, and other
                demographic data with color-coded maps.
              </div>

              <CensusLocationInput
                onLocationSelected={handleLocationSelected}
                isLoading={isLoadingCensus}
              />

              {selectedState && (
                <CensusGeographicMap
                  selectedState={selectedState}
                  selectedCounty={selectedCounty}
                  stateName={stateName}
                  countyName={countyName}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
