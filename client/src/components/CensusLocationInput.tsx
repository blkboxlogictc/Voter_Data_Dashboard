import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// List of US states with FIPS codes
const US_STATES = [
  { name: "Alabama", code: "AL", fips: "01" },
  { name: "Alaska", code: "AK", fips: "02" },
  { name: "Arizona", code: "AZ", fips: "04" },
  { name: "Arkansas", code: "AR", fips: "05" },
  { name: "California", code: "CA", fips: "06" },
  { name: "Colorado", code: "CO", fips: "08" },
  { name: "Connecticut", code: "CT", fips: "09" },
  { name: "Delaware", code: "DE", fips: "10" },
  { name: "District of Columbia", code: "DC", fips: "11" },
  { name: "Florida", code: "FL", fips: "12" },
  { name: "Georgia", code: "GA", fips: "13" },
  { name: "Hawaii", code: "HI", fips: "15" },
  { name: "Idaho", code: "ID", fips: "16" },
  { name: "Illinois", code: "IL", fips: "17" },
  { name: "Indiana", code: "IN", fips: "18" },
  { name: "Iowa", code: "IA", fips: "19" },
  { name: "Kansas", code: "KS", fips: "20" },
  { name: "Kentucky", code: "KY", fips: "21" },
  { name: "Louisiana", code: "LA", fips: "22" },
  { name: "Maine", code: "ME", fips: "23" },
  { name: "Maryland", code: "MD", fips: "24" },
  { name: "Massachusetts", code: "MA", fips: "25" },
  { name: "Michigan", code: "MI", fips: "26" },
  { name: "Minnesota", code: "MN", fips: "27" },
  { name: "Mississippi", code: "MS", fips: "28" },
  { name: "Missouri", code: "MO", fips: "29" },
  { name: "Montana", code: "MT", fips: "30" },
  { name: "Nebraska", code: "NE", fips: "31" },
  { name: "Nevada", code: "NV", fips: "32" },
  { name: "New Hampshire", code: "NH", fips: "33" },
  { name: "New Jersey", code: "NJ", fips: "34" },
  { name: "New Mexico", code: "NM", fips: "35" },
  { name: "New York", code: "NY", fips: "36" },
  { name: "North Carolina", code: "NC", fips: "37" },
  { name: "North Dakota", code: "ND", fips: "38" },
  { name: "Ohio", code: "OH", fips: "39" },
  { name: "Oklahoma", code: "OK", fips: "40" },
  { name: "Oregon", code: "OR", fips: "41" },
  { name: "Pennsylvania", code: "PA", fips: "42" },
  { name: "Rhode Island", code: "RI", fips: "44" },
  { name: "South Carolina", code: "SC", fips: "45" },
  { name: "South Dakota", code: "SD", fips: "46" },
  { name: "Tennessee", code: "TN", fips: "47" },
  { name: "Texas", code: "TX", fips: "48" },
  { name: "Utah", code: "UT", fips: "49" },
  { name: "Vermont", code: "VT", fips: "50" },
  { name: "Virginia", code: "VA", fips: "51" },
  { name: "Washington", code: "WA", fips: "53" },
  { name: "West Virginia", code: "WV", fips: "54" },
  { name: "Wisconsin", code: "WI", fips: "55" },
  { name: "Wyoming", code: "WY", fips: "56" },
];

interface CensusLocationInputProps {
  onLocationSelected: (
    state: string,
    county: string,
    stateName: string,
    countyName: string
  ) => void;
  isLoading?: boolean;
}

export default function CensusLocationInput({
  onLocationSelected,
  isLoading = false,
}: CensusLocationInputProps) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [countyName, setCountyName] = useState<string>("");
  const [countyFips, setCountyFips] = useState<string>("");
  const [countyOptions, setCountyOptions] = useState<
    Array<{ name: string; fips: string }>
  >([]);
  const [isLoadingCounties, setIsLoadingCounties] = useState<boolean>(false);
  const { toast } = useToast();

  // When a state is selected, fetch its counties
  const handleStateChange = async (stateCode: string) => {
    setSelectedState(stateCode);
    setCountyOptions([]);
    setCountyName("");
    setCountyFips("");

    if (!stateCode) return;

    setIsLoadingCounties(true);

    try {
      // Get the state FIPS code
      const stateFips = US_STATES.find(
        (state) => state.code === stateCode
      )?.fips;

      if (!stateFips) {
        throw new Error("Invalid state selected");
      }

      // Fetch counties for the selected state from Census API
      const response = await fetch(
        `https://api.census.gov/data/2019/pep/population?get=NAME&for=county:*&in=state:${stateFips}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch counties");
      }

      const data = await response.json();

      // First row contains headers, so we start from index 1
      const counties = data.slice(1).map((row: string[]) => {
        // Format: [NAME, state, county]
        const name = row[0].replace(`, ${stateCode}`, "");
        return {
          name,
          fips: row[2],
        };
      });

      setCountyOptions(counties);
    } catch (error) {
      console.error("Error fetching counties:", error);
      toast({
        title: "Error",
        description: "Failed to fetch counties. Using sample data instead.",
        variant: "destructive",
      });

      // Provide some sample counties as fallback
      setCountyOptions([
        { name: "Sample County 1", fips: "001" },
        { name: "Sample County 2", fips: "003" },
        { name: "Sample County 3", fips: "005" },
      ]);
    } finally {
      setIsLoadingCounties(false);
    }
  };

  // When a county is selected from dropdown
  const handleCountySelect = (countyFips: string) => {
    const selectedCounty = countyOptions.find(
      (county) => county.fips === countyFips
    );
    if (selectedCounty) {
      setCountyFips(countyFips);
      setCountyName(selectedCounty.name);
    }
  };

  // When the form is submitted
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedState || !countyFips) {
      toast({
        title: "Missing Information",
        description: "Please select both a state and county.",
        variant: "destructive",
      });
      return;
    }

    const stateFips =
      US_STATES.find((state) => state.code === selectedState)?.fips || "";
    const stateName =
      US_STATES.find((state) => state.code === selectedState)?.name || "";

    onLocationSelected(stateFips, countyFips, stateName, countyName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Census Location</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="state" className="text-sm font-medium">
                State
              </label>
              <Select
                value={selectedState}
                onValueChange={handleStateChange}
                disabled={isLoading}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="county" className="text-sm font-medium">
                County
              </label>
              <Select
                value={countyFips}
                onValueChange={handleCountySelect}
                disabled={
                  isLoading ||
                  isLoadingCounties ||
                  !selectedState ||
                  countyOptions.length === 0
                }
              >
                <SelectTrigger id="county">
                  <SelectValue
                    placeholder={
                      isLoadingCounties
                        ? "Loading counties..."
                        : "Select a county"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {countyOptions.map((county) => (
                    <SelectItem key={county.fips} value={county.fips}>
                      {county.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || !selectedState || !countyFips}
            >
              {isLoading ? "Loading..." : "Fetch Census Data"}
            </Button>
          </div>

          {selectedState && countyName && (
            <div className="text-sm text-gray-500 mt-2">
              Selected location: {countyName}, {selectedState}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
