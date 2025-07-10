import { useRef, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  LayersControl,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DistrictType } from "@shared/schema";
import { MapPin, Layers, Grid, Download, Home } from "lucide-react";
import L from "leaflet";
// Remove hardcoded sample data import - we'll use actual processed data

// Fix Leaflet default icon issues
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

type MapDataType =
  | "density"
  | "turnout"
  | "party"
  | "race"
  | "racialDistribution";

interface GeographicMapProps {
  geoData: any | null;
  districtData: Record<string, any>;
  districtType: DistrictType;
}

// Helper function to normalize district data for visualization
const normalizeDistrictData = (
  districtData: Record<string, any>,
  precinctDemographics: any
) => {
  const normalized: Record<string, any> = {};

  // Get all precinct IDs
  const precinctIds = precinctDemographics?.precincts || [];

  precinctIds.forEach((precinctId: string) => {
    normalized[precinctId] = {
      // Basic data
      registeredVoters: precinctDemographics.registeredVoters[precinctId] || 0,

      // Turnout data - convert from percentage to decimal
      turnout: (precinctDemographics.turnoutPercentage[precinctId] || 0) / 100,

      // Party data
      partyAffiliation: precinctDemographics.partyAffiliation[precinctId] || {},

      // Calculate party majority strength
      partyMajorityStrength: calculatePartyMajorityStrength(
        precinctDemographics.partyAffiliation[precinctId] || {}
      ),

      // Calculate racial diversity index using Simpson's Diversity Index
      // If racialDemographics is not available in precinctDemographics, use a default value
      racialDiversityIndex: calculateRacialDiversityIndex(
        precinctDemographics.racialDemographics?.[precinctId] || {}
      ),

      // Store racial demographics for this precinct
      racialDemographics:
        precinctDemographics.racialDemographics?.[precinctId] || {},

      // Get racial data from the district data
      racialData: districtData.districtData?.[precinctId] || {},

      // Determine predominant race - use the majorityRace from districtData
      // This is calculated directly from the voter records
      predominantRace:
        districtData.districtData?.[precinctId]?.majorityRace || "Unknown",

      // Calculate voter density (normalized by max precinct size)
      voterDensity: calculateVoterDensity(
        precinctDemographics.registeredVoters[precinctId] || 0,
        precinctDemographics.registeredVoters
      ),

      // Add majority party
      majorityParty: findMajorityParty(
        precinctDemographics.partyAffiliation[precinctId] || {}
      ),
    };
  });

  return normalized;
};

// Calculate party majority strength (how dominant the majority party is)
const calculatePartyMajorityStrength = (partyData: Record<string, number>) => {
  const total = Object.values(partyData).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  const counts = Object.values(partyData).sort((a, b) => b - a);
  const largest = counts[0] || 0;

  return largest / total; // Returns a value between 0 and 1
};

// Calculate voter density as a percentage of the maximum voter count
const calculateVoterDensity = (
  voterCount: number,
  allPrecincts: Record<string, number>
) => {
  // Get all voter counts as an array
  const voterCounts = Object.values(allPrecincts);

  if (voterCounts.length === 0) return 0;

  // Find the maximum voter count as the baseline (100%)
  const maxVoterCount = Math.max(...voterCounts);

  if (maxVoterCount === 0) return 0;

  // Calculate this precinct's density as a percentage of the maximum
  const relativePercentage = voterCount / maxVoterCount;

  // Return the raw percentage (0.0 to 1.0) for precise categorization in getColor
  return relativePercentage;
};

// Calculate racial diversity index using Simpson's Diversity Index
const calculateRacialDiversityIndex = (racialData: Record<string, number>) => {
  // If no racial data, return 0
  if (Object.keys(racialData).length === 0) return 0;

  // Get total population
  const totalPopulation = Object.values(racialData).reduce(
    (sum, count) => sum + count,
    0
  );
  if (totalPopulation === 0) return 0;

  // Calculate Simpson's Diversity Index: 1 - Σ(n/N)²
  // where n is the number of individuals of a particular race
  // and N is the total number of individuals of all races
  let sumSquaredProportions = 0;

  Object.values(racialData).forEach((count) => {
    const proportion = count / totalPopulation;
    sumSquaredProportions += proportion * proportion;
  });

  // Simpson's index ranges from 0 (no diversity) to 1 (maximum diversity)
  return 1 - sumSquaredProportions;
};

// Find the majority party
const findMajorityParty = (partyData: Record<string, number>) => {
  if (Object.keys(partyData).length === 0) return "Unknown";

  let majorityParty = "";
  let maxCount = 0;

  Object.entries(partyData).forEach(([party, count]) => {
    if (count > maxCount) {
      maxCount = count;
      majorityParty = party;
    }
  });

  // Map party codes to full names
  const partyNames: Record<string, string> = {
    R: "Republican",
    D: "Democratic",
    NP: "No Party",
    I: "Independent",
    L: "Libertarian",
    G: "Green",
    O: "Other",
  };

  return partyNames[majorityParty] || majorityParty;
};

// Find the predominant race in a district
const findPredominantRace = (racialData: Record<string, number>) => {
  if (Object.keys(racialData).length === 0) return "Unknown";

  let predominantRace = "";
  let maxCount = 0;

  Object.entries(racialData).forEach(([race, count]) => {
    if (count > maxCount) {
      maxCount = count;
      predominantRace = race;
    }
  });

  return predominantRace;
};

export default function GeographicMap({
  geoData,
  districtData,
  districtType,
}: GeographicMapProps) {
  const mapRef = useRef<L.Map>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const { toast } = useToast();
  const [mapDataType, setMapDataType] = useState<MapDataType>("density");
  const [normalizedData, setNormalizedData] = useState<Record<string, any>>({});

  // Helper function to add a legend item
  const addLegendItem = (
    container: HTMLElement,
    color: string,
    label: string
  ) => {
    const item = document.createElement("div");
    item.className = "flex items-center";

    const colorBox = document.createElement("div");
    colorBox.className = "w-4 h-4 rounded";
    colorBox.style.backgroundColor = color;

    const text = document.createElement("span");
    text.className = "ml-2 text-xs text-neutral-700";
    text.textContent = label;

    item.appendChild(colorBox);
    item.appendChild(text);
    container.appendChild(item);
  };

  // Function to update the legend based on the selected data type
  const updateLegend = (dataType: MapDataType) => {
    const legendTitle = document.getElementById("legend-title");
    const legendItems = document.getElementById("legend-items");

    if (!legendTitle || !legendItems) return;

    // Update the legend title
    switch (dataType) {
      case "density":
        legendTitle.textContent = "Voter Density (% of Maximum)";
        break;
      case "turnout":
        legendTitle.textContent = "Voter Turnout";
        break;
      case "party":
        legendTitle.textContent = "Party Majority Strength";
        break;
      case "race":
        legendTitle.textContent = "Racial Diversity";
        break;
      case "racialDistribution":
        legendTitle.textContent = "Predominant Racial Group";
        break;
    }

    // Clear existing legend items
    legendItems.innerHTML = "";

    // Add new legend items based on data type
    if (dataType === "density") {
      addLegendItem(
        legendItems,
        "#e8f5e0",
        "Low Density (0-40% of max): Sparse voter population"
      );
      addLegendItem(
        legendItems,
        "#83c75d",
        "Medium Density (40-60% of max): Moderate voter concentration"
      );
      addLegendItem(
        legendItems,
        "#2e6b26",
        "High Density (60-80% of max): Dense voter population"
      );
      addLegendItem(
        legendItems,
        "#1a4314",
        "Very High Density (80-100% of max): Highest voter concentration"
      );
    } else if (dataType === "turnout") {
      addLegendItem(legendItems, "#9fa8da", "Low Turnout (<40%)");
      addLegendItem(legendItems, "#5c6bc0", "Medium Turnout (40-60%)");
      addLegendItem(legendItems, "#303f9f", "High Turnout (60-80%)");
      addLegendItem(legendItems, "#1a237e", "Very High Turnout (>80%)");
    } else if (dataType === "party") {
      addLegendItem(legendItems, "#ffcdd2", "Weak Majority (<50%)");
      addLegendItem(legendItems, "#ef5350", "Moderate Majority (50-60%)");
      addLegendItem(legendItems, "#e53935", "Strong Majority (60-75%)");
      addLegendItem(legendItems, "#b71c1c", "Very Strong Majority (>75%)");
    } else if (dataType === "race") {
      addLegendItem(
        legendItems,
        "#e1bee7",
        "Low Diversity (0-0.25): Predominantly one racial group"
      );
      addLegendItem(
        legendItems,
        "#ab47bc",
        "Moderate Diversity (0.25-0.5): Some racial diversity"
      );
      addLegendItem(
        legendItems,
        "#7b1fa2",
        "High Diversity (0.5-0.75): Significant racial diversity"
      );
      addLegendItem(
        legendItems,
        "#4a148c",
        "Very High Diversity (0.75-1.0): Maximum racial diversity"
      );
    } else if (dataType === "racialDistribution") {
      addLegendItem(legendItems, "#F5F5F5", "White");
      addLegendItem(legendItems, "#795548", "Black");
      addLegendItem(legendItems, "#FF9800", "Hispanic");
      addLegendItem(legendItems, "#4CAF50", "Asian");
      addLegendItem(legendItems, "#F44336", "Native American");
      addLegendItem(legendItems, "#9C27B0", "Multiracial");
      addLegendItem(legendItems, "#BDBDBD", "Unknown/Other");
    }
  };

  // Debug function to log GeoJSON structure
  useEffect(() => {
    if (geoData) {
      console.log("GeoJSON structure:", geoData);
      // Check if features exist and log the first feature
      if (geoData.features && geoData.features.length > 0) {
        console.log("First feature:", geoData.features[0]);
        console.log(
          "First feature properties:",
          geoData.features[0].properties
        );
      }
    }
  }, [geoData]);

  // Debug function to log district data structure and load racial data if needed
  useEffect(() => {
    if (districtData) {
      console.log("District data structure:", districtData);
      // Log the keys to see what precincts are available
      console.log("District data keys:", Object.keys(districtData));

      // Check if districtData has the districtData field
      if (districtData.districtData) {
        console.log("District data sample:", districtData.districtData["1"]);

        // Log all majorityRace values
        const races = Object.entries(districtData.districtData).map(
          ([id, data]: [string, any]) => ({
            id,
            race: data.majorityRace,
          })
        );
        console.log("All district races:", races);

        // Check if we have racialDemographics in precinctDemographics
        if (
          districtData.precinctDemographics &&
          districtData.precinctDemographics.racialDemographics
        ) {
          console.log("Racial demographics found in precinctDemographics");
        } else {
          console.log(
            "No racial demographics found in precinctDemographics, will calculate from raw voter data"
          );
        }
      }
    }
  }, [districtData, normalizedData]);

  // Process and normalize the district data when it changes
  useEffect(() => {
    console.log("District data:", districtData);
    console.log("GeoJSON data:", geoData);

    if (districtData) {
      // Check if we have precinctDemographics data
      if (districtData.precinctDemographics) {
        // Check if we need to add racial demographics from the uploaded data
        if (!districtData.precinctDemographics.racialDemographics) {
          console.log("Adding racial demographics from uploaded data");

          // Create racial demographics object if it doesn't exist
          districtData.precinctDemographics.racialDemographics = {};

          // Get the raw voter data from the uploaded file
          const voterData = districtData.rawVoterData || [];

          if (voterData.length > 0) {
            console.log("Using uploaded voter data for racial demographics");

            // Process each precinct
            districtData.precinctDemographics.precincts.forEach(
              (precinctId: string) => {
                // Filter voters for this precinct
                const precinctVoters = voterData.filter(
                  (voter: any) => String(voter.Precinct) === precinctId
                );

                if (precinctVoters.length > 0) {
                  // Count races
                  const racialBreakdown: Record<string, number> = {};

                  precinctVoters.forEach((voter: any) => {
                    const race = voter.Race || "Unknown";
                    racialBreakdown[race] = (racialBreakdown[race] || 0) + 1;
                  });

                  // Store racial demographics for this precinct
                  districtData.precinctDemographics.racialDemographics[
                    precinctId
                  ] = racialBreakdown;
                }
              }
            );
          }
        }

        const normalized = normalizeDistrictData(
          districtData,
          districtData.precinctDemographics
        );

        // Debug: Log voter density values for each precinct
        Object.entries(normalized).forEach(([precinctId, data]) => {
          console.log(
            `Precinct ${precinctId} voter density: ${data.voterDensity}`
          );
        });

        console.log("Normalized data from precinctDemographics:", normalized);
        setNormalizedData(normalized);
      }
      // If not, try to use districtData directly
      else if (typeof districtData === "object") {
        console.log("Using districtData directly");
        setNormalizedData(districtData);
      }

      // Update the map if it's already rendered
      if (geoJsonLayerRef.current) {
        geoJsonLayerRef.current.setStyle(getFeatureStyle);
      }
    }
  }, [districtData, geoData]);

  // Update map when mapDataType changes
  useEffect(() => {
    console.log("Map data type changed to:", mapDataType);
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.setStyle(getFeatureStyle);
    }
  }, [mapDataType]);

  // Get color based on value and selected data type
  const getColor = (value: number | string, dataType: MapDataType): string => {
    if (dataType === "density") {
      // Color gradient based on percentage of maximum voter count
      if (typeof value === "number") {
        if (value > 0.8) return "#1a4314"; // Very High (80-100% of max)
        if (value > 0.6) return "#2e6b26"; // High (60-80% of max)
        if (value > 0.4) return "#83c75d"; // Medium (40-60% of max)
        return "#e8f5e0"; // Low (0-40% of max)
      }
      return "#e8f5e0"; // Default for non-numeric values
    } else if (dataType === "turnout") {
      if (typeof value === "number") {
        if (value > 0.8) return "#1a237e"; // Very High
        if (value > 0.6) return "#303f9f"; // High
        if (value > 0.4) return "#5c6bc0"; // Medium
        return "#9fa8da"; // Low
      }
      return "#9fa8da"; // Default for non-numeric values
    } else if (dataType === "party") {
      // Party majority strength (how dominant the majority party is)
      if (typeof value === "number") {
        if (value > 0.75) return "#b71c1c"; // Very Strong
        if (value > 0.6) return "#e53935"; // Strong
        if (value > 0.5) return "#ef5350"; // Moderate
        return "#ffcdd2"; // Weak
      }
      return "#ffcdd2"; // Default for non-numeric values
    } else if (dataType === "race") {
      // Racial diversity index
      if (typeof value === "number") {
        if (value > 0.75) return "#4a148c"; // Very Diverse
        if (value > 0.5) return "#7b1fa2"; // Diverse
        if (value > 0.25) return "#ab47bc"; // Moderately Diverse
        return "#e1bee7"; // Less Diverse
      }
      return "#e1bee7"; // Default for non-numeric values
    } else if (dataType === "racialDistribution") {
      // Colors for different racial groups
      if (typeof value === "string") {
        console.log(`Getting color for race: "${value}"`);
        // Standardize race categories to match the ones in the data
        const race = value.trim();

        // Log all inputs and outputs for debugging
        console.log(`Race after trimming: "${race}"`);

        let color = "#BDBDBD"; // Default gray

        switch (race) {
          case "White":
            color = "#F5F5F5"; // Light gray
            break;
          case "Black":
            color = "#795548"; // Brown
            break;
          case "Hispanic":
            color = "#FF9800"; // Orange
            break;
          case "Asian":
            color = "#4CAF50"; // Green
            break;
          case "Native":
          case "Native American":
            color = "#F44336"; // Red
            break;
          case "Multiracial":
            color = "#9C27B0"; // Purple
            break;
          default:
            console.log(`Unknown race: "${race}", using default color`);
            color = "#BDBDBD"; // Gray for Unknown/Other
        }

        console.log(`Selected color for race "${race}": ${color}`);
        return color;
      }

      console.log(`Non-string race value: ${value}, using default color`);
      return "#BDBDBD"; // Default for non-string values
    }

    return "#cccccc"; // Default gray
  };

  // Style function for GeoJSON features
  const getFeatureStyle = (feature: any) => {
    // Extract district ID from feature properties
    // Martin_County_Synced.geojson uses "id" in properties
    const districtId = String(
      feature.properties?.id ||
        feature.properties?.PRECINCT ||
        feature.properties?.DISTRICT_ID ||
        feature.properties?.districtId ||
        feature.properties?.precinct
    );

    console.log("Styling feature with ID:", districtId);

    // Check if we have data for this district
    if (!districtId || !normalizedData[districtId]) {
      console.log("No data for district:", districtId);
      return {
        fillColor: "#cccccc",
        weight: 1,
        opacity: 1,
        color: "white",
        fillOpacity: 0.7,
      };
    }

    const district = normalizedData[districtId];
    console.log("District data for styling:", district);
    let value: number | string = 0;

    // Get the appropriate value based on selected data type
    switch (mapDataType) {
      case "density":
        value = district.voterDensity || 0;
        // Recalculate density directly to ensure accuracy
        if (district.registeredVoters) {
          const allVoterCounts = Object.values(normalizedData).map(
            (d) => d.registeredVoters || 0
          );
          const maxVoterCount = Math.max(...allVoterCounts);
          if (maxVoterCount > 0) {
            value = district.registeredVoters / maxVoterCount;
          }
        }
        break;
      case "turnout":
        value = district.turnout || 0;
        break;
      case "party":
        value = district.partyMajorityStrength || 0;
        break;
      case "race":
        value = district.racialDiversityIndex || 0;
        break;
      case "racialDistribution":
        // Get the predominant race directly from the district data
        // This ensures we're using the actual racial data from the voter records
        console.log(
          `Processing racial distribution for district ${districtId}`
        );

        // First try to get from normalized data
        if (
          district.predominantRace &&
          district.predominantRace !== "Unknown"
        ) {
          value = district.predominantRace;
          console.log(`Using predominantRace from normalized data: ${value}`);
        }
        // Then try to get from districtData
        else if (
          districtData.districtData &&
          districtData.districtData[districtId] &&
          districtData.districtData[districtId].majorityRace
        ) {
          value = districtData.districtData[districtId].majorityRace;
          console.log(`Using majorityRace from districtData: ${value}`);
        }
        // If still not available, calculate from raw voter data if available
        else if (
          districtData.rawVoterData &&
          Array.isArray(districtData.rawVoterData)
        ) {
          console.log(`Calculating predominant race from raw voter data`);

          // Filter voters for this district
          const districtVoters = districtData.rawVoterData.filter(
            (voter: any) => String(voter.Precinct) === districtId
          );

          if (districtVoters.length > 0) {
            // Count races
            const raceCounts: Record<string, number> = {};

            districtVoters.forEach((voter: any) => {
              let race = voter.Race || "Unknown";

              // Standardize race categories
              if (race.toLowerCase().includes("white")) race = "White";
              else if (race.toLowerCase().includes("black")) race = "Black";
              else if (
                race.toLowerCase().includes("hispanic") ||
                race.toLowerCase().includes("latino")
              )
                race = "Hispanic";
              else if (race.toLowerCase().includes("asian")) race = "Asian";
              else if (race.toLowerCase().includes("native")) race = "Native";
              else if (race.toLowerCase().includes("multi"))
                race = "Multiracial";
              else race = "Unknown";

              raceCounts[race] = (raceCounts[race] || 0) + 1;
            });

            // Find predominant race
            let predominantRace = "Unknown";
            let maxCount = 0;

            Object.entries(raceCounts).forEach(([race, count]) => {
              if (count > maxCount) {
                maxCount = count;
                predominantRace = race;
              }
            });

            value = predominantRace;
            console.log(
              `Calculated predominant race: ${value} (${districtVoters.length} voters)`
            );
          } else {
            value = "Unknown";
            console.log(`No voters found for district ${districtId}`);
          }
        } else {
          value = "Unknown";
          console.log(`No raw voter data available for district ${districtId}`);
        }

        console.log(`Final predominant race for ${districtId}: ${value}`);
        break;
    }

    console.log(`Value for ${districtId} (${mapDataType}):`, value);

    return {
      fillColor: getColor(value, mapDataType),
      weight: 1,
      opacity: 1,
      color: "white",
      fillOpacity: 0.7,
    };
  };

  // Handle hovering and clicking on districts
  const onEachFeature = (feature: any, layer: L.Layer) => {
    // Extract district ID from feature properties
    // Martin_County_Synced.geojson uses "id" in properties
    const districtId = String(
      feature.properties?.id ||
        feature.properties?.PRECINCT ||
        feature.properties?.DISTRICT_ID ||
        feature.properties?.districtId ||
        feature.properties?.precinct
    );

    console.log("Setting up interactions for district:", districtId);

    // Always bind a tooltip with the precinct name from the GeoJSON
    const precinctName = feature.properties?.name || `Precinct ${districtId}`;
    layer.bindTooltip(precinctName);

    // Check if we have data for this district
    if (districtId && normalizedData[districtId]) {
      const district = normalizedData[districtId];
      console.log("District data for popup:", district);

      // Add popup with detailed district info - improved spacing and formatting
      // Calculate percentage of max voter count for display
      const maxVoterCount = Math.max(
        ...Object.values(normalizedData).map((d) => d.registeredVoters || 0)
      );
      const percentOfMax =
        maxVoterCount > 0
          ? ((district.registeredVoters / maxVoterCount) * 100).toFixed(1)
          : "N/A";

      const popupContent = `
        <div class="p-2" style="min-width: 220px;">
          <h4 class="font-medium text-sm border-b pb-1 mb-3" style="margin-bottom: 8px;">
            ${precinctName}
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
            <div style="color: #6b7280; padding-right: 8px;">Registered Voters:</div>
            <div style="font-weight: 500; text-align: right;">
              ${district.registeredVoters?.toLocaleString() || "N/A"}
            </div>
            
            <div style="color: #6b7280; padding-right: 8px;">% of Max Density:</div>
            <div style="font-weight: 500; text-align: right;">
              ${percentOfMax}%
            </div>
            
            <div style="color: #6b7280; padding-right: 8px;">Predominant Race:</div>
            <div style="font-weight: 500; text-align: right;">
              ${(() => {
                // First try to get from normalized data
                if (
                  district.predominantRace &&
                  district.predominantRace !== "Unknown"
                ) {
                  return district.predominantRace;
                }
                // Then try to get from districtData
                else if (
                  districtData.districtData &&
                  districtData.districtData[districtId] &&
                  districtData.districtData[districtId].majorityRace
                ) {
                  return districtData.districtData[districtId].majorityRace;
                }
                // If still not available, calculate from raw voter data if available
                else if (
                  districtData.rawVoterData &&
                  Array.isArray(districtData.rawVoterData)
                ) {
                  // Filter voters for this district
                  const districtVoters = districtData.rawVoterData.filter(
                    (voter: any) => String(voter.Precinct) === districtId
                  );

                  if (districtVoters.length > 0) {
                    // Count races
                    const raceCounts: Record<string, number> = {};

                    districtVoters.forEach((voter: any) => {
                      let race = voter.Race || "Unknown";

                      // Standardize race categories
                      if (race.toLowerCase().includes("white")) race = "White";
                      else if (race.toLowerCase().includes("black"))
                        race = "Black";
                      else if (
                        race.toLowerCase().includes("hispanic") ||
                        race.toLowerCase().includes("latino")
                      )
                        race = "Hispanic";
                      else if (race.toLowerCase().includes("asian"))
                        race = "Asian";
                      else if (race.toLowerCase().includes("native"))
                        race = "Native";
                      else if (race.toLowerCase().includes("multi"))
                        race = "Multiracial";
                      else race = "Unknown";

                      raceCounts[race] = (raceCounts[race] || 0) + 1;
                    });

                    // Find predominant race
                    let predominantRace = "Unknown";
                    let maxCount = 0;

                    Object.entries(raceCounts).forEach(([race, count]) => {
                      if (count > maxCount) {
                        maxCount = count;
                        predominantRace = race;
                      }
                    });

                    return predominantRace;
                  }

                  return "Unknown";
                } else {
                  return "Unknown";
                }
              })()}
            </div>
            
            <div style="color: #6b7280; padding-right: 8px;">Turnout:</div>
            <div style="font-weight: 500; text-align: right;">
              ${
                district.turnout
                  ? `${(district.turnout * 100).toFixed(1)}%`
                  : "N/A"
              }
            </div>
            
            <div style="color: #6b7280; padding-right: 8px;">Party Majority:</div>
            <div style="font-weight: 500; text-align: right;">
              ${district.majorityParty || "N/A"}
            </div>
          </div>
        </div>
      `;

      layer.bindPopup(popupContent);
    } else {
      // If no data, still show a popup with basic info - improved spacing
      const popupContent = `
        <div class="p-2" style="min-width: 220px;">
          <h4 class="font-medium text-sm border-b pb-1 mb-3" style="margin-bottom: 8px;">
            ${precinctName}
          </h4>
          <div style="font-size: 12px; color: #6b7280; padding: 4px 0;">
            No voter data available for this precinct
          </div>
        </div>
      `;

      layer.bindPopup(popupContent);
    }

    // Change style on hover
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 2,
          color: "#000",
          fillOpacity: 0.7,
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.resetStyle(e.target);
        }
      },
    });
  };

  // Reset map view to show all districts
  const handleResetMapView = () => {
    if (mapRef.current && geoJsonLayerRef.current) {
      try {
        const bounds = geoJsonLayerRef.current.getBounds();
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.error("Error resetting view:", error);
      }
    }
  };

  // Toggle heatmap
  const handleToggleHeatmap = () => {
    toast({
      title: "Toggle Heatmap",
      description: "Heatmap functionality would be implemented here",
    });
  };

  // Show all districts
  const handleShowAllDistricts = () => {
    handleResetMapView();
  };

  // Download map as image
  const handleDownloadMapImage = () => {
    toast({
      title: "Export Map",
      description:
        "This feature would allow exporting the map as an image. Currently using Leaflet which doesn't support this natively.",
    });
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">Voter Demographics Map</h3>
        <div className="flex items-center space-x-2">
          <select
            className="border border-neutral-300 rounded px-2 py-1 text-sm focus:ring-primary focus:border-primary"
            defaultValue="density"
            onChange={(e) => {
              setMapDataType(e.target.value as MapDataType);
              // Update the map when data type changes
              if (geoJsonLayerRef.current) {
                geoJsonLayerRef.current.setStyle(getFeatureStyle);
                // Update the legend
                updateLegend(e.target.value as MapDataType);
              }
            }}
          >
            <option value="density">Voter Density</option>
            <option value="turnout">Voter Turnout</option>
            <option value="party">Party Majority</option>
            <option value="race">Racial Diversity</option>
            <option value="racialDistribution">Racial Distribution</option>
          </select>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="w-full h-[500px] bg-gray-100 rounded relative">
          {!geoData || !districtData ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <MapPin className="h-10 w-10 text-neutral-300 mb-2" />
              <p className="text-neutral-500">Interactive Geographic Map</p>
              <p className="text-sm text-neutral-400 mt-2">
                Upload and process data files to generate the map
              </p>
            </div>
          ) : (
            <MapContainer
              center={[39.8283, -98.5795]}
              zoom={4}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              ref={mapRef}
            >
              <ZoomControl position="topright" />
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                  <TileLayer
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                    errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="CartoDB Positron">
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    maxZoom={19}
                    errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                    maxZoom={19}
                    errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {geoData && (
                <GeoJSON
                  key={`geo-json-${mapDataType}-${Date.now()}-improved`} // Force re-render with unique key
                  data={geoData}
                  style={getFeatureStyle}
                  onEachFeature={onEachFeature}
                  ref={(layer) => {
                    if (layer) {
                      geoJsonLayerRef.current = layer;
                      setTimeout(() => {
                        handleResetMapView();
                      }, 100);
                    }
                  }}
                />
              )}
            </MapContainer>
          )}
        </div>

        {/* Map Legend - Dynamic based on selected data type */}
        <div
          className="mt-4 p-3 bg-neutral-50 rounded border border-neutral-200"
          id="map-legend"
        >
          <h4 className="text-sm font-medium mb-2 text-neutral-900">
            Legend: <span id="legend-title">Voter Density</span>
          </h4>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4"
            id="legend-items"
          >
            {/* Legend items will be dynamically updated */}
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#c5e8b7" }}
              ></div>
              <span className="ml-2 text-xs text-neutral-700">Low Density</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#83c75d" }}
              ></div>
              <span className="ml-2 text-xs text-neutral-700">
                Medium Density
              </span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#4d9636" }}
              ></div>
              <span className="ml-2 text-xs text-neutral-700">
                High Density
              </span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: "#255c1a" }}
              ></div>
              <span className="ml-2 text-xs text-neutral-700">
                Very High Density
              </span>
            </div>
          </div>
        </div>

        {/* Map Controls */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="bg-white border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-sm flex items-center"
            onClick={handleResetMapView}
          >
            <Home className="h-4 w-4 mr-1" />
            Reset View
          </button>
          <button
            className="bg-white border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-sm flex items-center"
            onClick={handleToggleHeatmap}
          >
            <Layers className="h-4 w-4 mr-1" />
            Toggle Heatmap
          </button>
          <button
            className="bg-white border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-sm flex items-center"
            onClick={handleShowAllDistricts}
          >
            <Grid className="h-4 w-4 mr-1" />
            Show All Districts
          </button>
          <button
            className="bg-white border border-neutral-300 text-neutral-700 px-3 py-1.5 rounded text-sm flex items-center"
            onClick={handleDownloadMapImage}
          >
            <Download className="h-4 w-4 mr-1" />
            Export Map
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
