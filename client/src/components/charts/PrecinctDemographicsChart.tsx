import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Plotly from "plotly.js-dist-min";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PrecinctDemographicsChartProps {
  data: {
    precincts: string[];
    registeredVoters: Record<string, number>;
    turnoutPercentage: Record<string, number>;
    partyAffiliation: Record<string, Record<string, number>>;
  };
}

type ViewType = "registered" | "turnout" | "party";

export default function PrecinctDemographicsChart({
  data,
}: PrecinctDemographicsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [viewType, setViewType] = useState<ViewType>("registered");

  useEffect(() => {
    // Debug: Log the data received by the component
    console.log("PrecinctDemographicsChart data:", data);

    if (!chartRef.current) {
      console.log("PrecinctDemographicsChart: No chart ref");
      return;
    }

    if (!data) {
      console.log("PrecinctDemographicsChart: No data provided");
      return;
    }

    if (!data.precincts) {
      console.log("PrecinctDemographicsChart: No precincts in data");
      return;
    }

    if (data.precincts.length === 0) {
      console.log("PrecinctDemographicsChart: Empty precincts array");
      return;
    }

    console.log("PrecinctDemographicsChart: Data is valid, rendering chart");

    // Sort precincts numerically if possible
    const sortedPrecincts = [...data.precincts].sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    let chartData: Plotly.Data[] = [];
    let layout: Partial<Plotly.Layout> = {
      margin: { t: 10, b: 50, l: 50, r: 20 },
      height: 300,
      font: {
        family: "Inter, sans-serif",
      },
      xaxis: {
        title: "Precinct",
        titlefont: {
          family: "Inter, sans-serif",
          size: 12,
        },
        // Limit the number of ticks shown if there are many precincts
        tickmode: sortedPrecincts.length > 10 ? "auto" : "array",
        tickvals: sortedPrecincts,
      },
      barmode: "group",
    };

    // Configure chart based on selected view
    switch (viewType) {
      case "registered":
        // Total registered voters per precinct
        const registeredValues = sortedPrecincts.map(
          (precinct) => data.registeredVoters[precinct] || 0
        );

        chartData = [
          {
            x: sortedPrecincts,
            y: registeredValues,
            type: "bar",
            marker: {
              color: "rgba(56, 142, 60, 0.8)",
            },
            text: registeredValues.map((v) => v.toLocaleString()),
            textposition: "auto",
            hovertemplate:
              "Precinct %{x}<br>Registered Voters: %{y:,}<extra></extra>",
          },
        ];

        layout.yaxis = {
          title: "Number of Registered Voters",
          titlefont: {
            family: "Inter, sans-serif",
            size: 12,
          },
        };
        break;

      case "turnout":
        // Voter turnout percentage by precinct as a stacked bar chart
        const turnoutValues = sortedPrecincts.map(
          (precinct) => data.turnoutPercentage[precinct] || 0
        );

        // Calculate the "Did Not Vote" percentages
        const notVotedValues = turnoutValues.map((turnout) => 100 - turnout);

        // Create stacked bar chart with "Voted" and "Did Not Vote" segments
        chartData = [
          {
            x: sortedPrecincts,
            y: turnoutValues,
            name: "Voted",
            type: "bar",
            marker: {
              color: "rgba(56, 142, 60, 0.8)", // Green for voted
            },
            text: turnoutValues.map((v) => `${v.toFixed(1)}%`),
            textposition: "auto",
            hovertemplate: "Precinct %{x}<br>Voted: %{y:.1f}%<extra></extra>",
          },
          {
            x: sortedPrecincts,
            y: notVotedValues,
            name: "Did Not Vote",
            type: "bar",
            marker: {
              color: "rgba(211, 47, 47, 0.8)", // Red for not voted
            },
            text: notVotedValues.map((v) => `${v.toFixed(1)}%`),
            textposition: "auto",
            hovertemplate:
              "Precinct %{x}<br>Did Not Vote: %{y:.1f}%<extra></extra>",
          },
        ];

        layout.yaxis = {
          title: "Percentage (%)",
          titlefont: {
            family: "Inter, sans-serif",
            size: 12,
          },
          range: [0, 100],
        };

        layout.barmode = "stack";
        layout.legend = {
          x: 0,
          y: 1.1,
          orientation: "h",
        };
        break;

      case "party":
        // Party affiliation distribution within each precinct as percentage stacked chart
        // Get all unique parties across all precincts
        const allParties = new Set<string>();
        sortedPrecincts.forEach((precinct) => {
          if (data.partyAffiliation[precinct]) {
            Object.keys(data.partyAffiliation[precinct]).forEach((party) => {
              allParties.add(party);
            });
          }
        });

        const parties = Array.from(allParties);

        // Define colors for common political parties - consistent with other charts
        const partyColors = {
          D: "rgba(25, 118, 210, 0.8)", // Democrat - blue
          R: "rgba(211, 47, 47, 0.8)", // Republican - red
          NP: "rgba(149, 117, 205, 0.8)", // No Party - purple
          G: "rgba(46, 125, 50, 0.8)", // Green - green
          L: "rgba(255, 167, 38, 0.8)", // Libertarian - orange
          I: "rgba(156, 39, 176, 0.8)", // Independent - purple
          O: "rgba(121, 85, 72, 0.8)", // Other - brown
        };

        // Define party labels for hover text
        const partyLabels: Record<string, string> = {
          D: "Democratic",
          R: "Republican",
          NP: "No Party",
          G: "Green",
          L: "Libertarian",
          I: "Independent",
          O: "Other",
        };

        // Calculate percentage distribution for each party within each precinct
        chartData = parties.map((party) => {
          const partyPercentages = sortedPrecincts.map((precinct) => {
            // Get total voters in this precinct
            const precinctTotal = Object.values(
              data.partyAffiliation[precinct] || {}
            ).reduce((sum, count) => sum + count, 0);

            // Get this party's count in the precinct
            const partyCount =
              (data.partyAffiliation[precinct] &&
                data.partyAffiliation[precinct][party]) ||
              0;

            // Calculate percentage (avoid division by zero)
            return precinctTotal > 0 ? (partyCount / precinctTotal) * 100 : 0;
          });

          return {
            name: partyLabels[party] || party,
            x: sortedPrecincts,
            y: partyPercentages,
            type: "bar",
            marker: {
              color:
                partyColors[party as keyof typeof partyColors] ||
                `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(
                  Math.random() * 200
                )}, ${Math.floor(Math.random() * 200)}, 0.8)`,
            },
            text: partyPercentages.map((v) => `${v.toFixed(1)}%`),
            textposition: "auto",
            hovertemplate:
              "Precinct %{x}<br>" +
              (partyLabels[party] || party) +
              ": %{y:.1f}%<extra></extra>",
          };
        });

        layout.yaxis = {
          title: "Percentage (%)",
          titlefont: {
            family: "Inter, sans-serif",
            size: 12,
          },
          range: [0, 100],
        };

        layout.barmode = "stack";
        layout.legend = {
          x: 0,
          y: 1.1,
          orientation: "h",
        };
        break;
    }

    Plotly.newPlot(chartRef.current, chartData, layout, { responsive: true });

    return () => {
      if (chartRef.current) Plotly.purge(chartRef.current);
    };
  }, [data, viewType]);

  const handleDownloadChart = () => {
    if (!chartRef.current) return;

    Plotly.toImage(chartRef.current, { format: "png", width: 800, height: 450 })
      .then(function (dataUrl: string) {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `precinct_demographics_${viewType}_chart.png`;
        link.click();
      })
      .catch(function (error: Error) {
        toast({
          title: "Download failed",
          description: error.message || "Failed to download chart",
          variant: "destructive",
        });
      });
  };

  const getViewTitle = () => {
    switch (viewType) {
      case "registered":
        return "Total Registered Voters";
      case "turnout":
        return "Voter Turnout";
      case "party":
        return "Party Affiliation (%)";
      default:
        return "Precinct Demographics";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">
          Precinct Demographics: {getViewTitle()}
        </h3>
        <div className="flex items-center space-x-2">
          <Select
            value={viewType}
            onValueChange={(value) => setViewType(value as ViewType)}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="registered">Registered Voters</SelectItem>
              <SelectItem value="turnout">Turnout Percentage</SelectItem>
              <SelectItem value="party">Party Affiliation</SelectItem>
            </SelectContent>
          </Select>
          <button
            className="text-neutral-500 hover:text-neutral-700"
            onClick={handleDownloadChart}
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>
      <CardContent className="p-4">
        <div ref={chartRef} className="w-full h-[300px]">
          {(!data || !data.precincts || data.precincts.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full bg-neutral-50 rounded border border-neutral-200">
              <svg
                className="h-10 w-10 text-neutral-300 mb-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-neutral-500">Precinct Demographics Chart</p>
              <p className="text-sm text-neutral-400 mt-2">
                Visualization will appear here after data processing
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
