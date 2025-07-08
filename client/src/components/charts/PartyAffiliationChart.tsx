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

interface PartyAffiliationChartProps {
  data: Record<string, number>;
  rawVoterData?: any[] | null;
}

type ViewType = "total" | "turnout" | "distribution";

export default function PartyAffiliationChart({
  data,
  rawVoterData,
}: PartyAffiliationChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [viewType, setViewType] = useState<ViewType>("total");

  useEffect(() => {
    if (!chartRef.current || !data || Object.keys(data).length === 0) return;

    // Debug: Log the data being used
    console.log("PartyAffiliationChart data:", data);
    if (rawVoterData) {
      console.log("Raw voter data sample:", rawVoterData.slice(0, 3));

      // Count voted vs not voted in raw data
      const votedCount = rawVoterData.filter((v: any) => v.Voted === 1).length;
      const notVotedCount = rawVoterData.filter(
        (v: any) => v.Voted === 0
      ).length;
      console.log(
        `Raw voter data: ${rawVoterData.length} total, ${votedCount} voted, ${notVotedCount} not voted`
      );
    }

    // For turnout view, we'll extract party codes directly from the raw data
    // For other views, we'll use the data prop
    let labels: string[] = [];
    let values: number[] = [];

    if (
      viewType === "turnout" &&
      rawVoterData &&
      Array.isArray(rawVoterData) &&
      rawVoterData.length > 0
    ) {
      // Extract unique party codes from the raw voter data
      const uniqueParties = new Set<string>();
      rawVoterData.forEach((voter: any) => {
        if (voter.Party) {
          uniqueParties.add(voter.Party);
        }
      });

      // Sort parties in a logical order: R, D, NP, I, L, G, O
      const partyOrder: Record<string, number> = {
        R: 1, // Republican
        D: 2, // Democratic
        NP: 3, // No Party
        I: 4, // Independent
        L: 5, // Libertarian
        G: 6, // Green
        O: 7, // Other
      };

      labels = Array.from(uniqueParties).sort((a, b) => {
        return (partyOrder[a] || 999) - (partyOrder[b] || 999);
      });

      // Count voters by party
      const partyCounts: Record<string, number> = {};
      labels.forEach((party) => {
        partyCounts[party] = 0;
      });

      rawVoterData.forEach((voter: any) => {
        if (voter.Party && partyCounts[voter.Party] !== undefined) {
          partyCounts[voter.Party]++;
        }
      });

      values = labels.map((party) => partyCounts[party] || 0);
      console.log("Using party codes from raw data:", labels);
    } else {
      // For other views, use the data prop
      labels = Object.keys(data);
      values = Object.values(data);
    }

    const total = values.reduce((sum, val) => sum + val, 0);

    // Define colors for common political parties - consistent across all views
    const getPartyColors = (labels: string[]) => {
      return labels.map((label) => {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes("democrat")) return "rgba(25, 118, 210, 0.8)";
        if (lowerLabel.includes("republican")) return "rgba(211, 47, 47, 0.8)";
        if (lowerLabel.includes("green")) return "rgba(46, 125, 50, 0.8)";
        if (lowerLabel.includes("libertarian"))
          return "rgba(255, 167, 38, 0.8)";
        if (lowerLabel.includes("independent"))
          return "rgba(149, 117, 205, 0.8)";
        return `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(
          Math.random() * 200
        )}, ${Math.floor(Math.random() * 200)}, 0.8)`;
      });
    };

    const colors = getPartyColors(labels);

    let chartData: any[] = [];
    let layout: Partial<Plotly.Layout> = {
      margin: { t: 10, b: 50, l: 50, r: 20 },
      height: 300,
      font: {
        family: "Inter, sans-serif",
      },
      bargap: 0.3,
    };

    switch (viewType) {
      case "total":
        // Total Count - Bar chart showing absolute numbers
        chartData = [
          {
            x: labels,
            y: values,
            type: "bar",
            marker: {
              color: colors,
            },
            text: values.map((v) => v.toLocaleString()),
            textposition: "auto",
            hovertemplate: "%{x}<br>Voters: %{y:,}<extra></extra>",
          },
        ];

        layout.yaxis = {
          title: "Number of Voters",
          titlefont: {
            family: "Inter, sans-serif",
            size: 12,
          },
        };
        layout.xaxis = {
          title: "Party",
          titlefont: {
            family: "Inter, sans-serif",
            size: 12,
          },
        };
        break;

      case "turnout":
        // Voter Turnout - Stacked percentage chart using actual voter data
        let votedPercentages: number[] = [];
        let notVotedPercentages: number[] = [];

        if (
          rawVoterData &&
          Array.isArray(rawVoterData) &&
          rawVoterData.length > 0
        ) {
          console.log("Processing actual voter turnout data");

          // Create counters for voted and not voted by party
          const partyVotedCounts: Record<string, number> = {};
          const partyNotVotedCounts: Record<string, number> = {};
          const partyTotalCounts: Record<string, number> = {};

          // Initialize counts for each party
          labels.forEach((party) => {
            partyVotedCounts[party] = 0;
            partyNotVotedCounts[party] = 0;
            partyTotalCounts[party] = 0;
          });

          // Count voters by party and voted status
          rawVoterData.forEach((voter: any) => {
            const party = voter.Party;

            // If this party is in our labels, count it
            if (partyVotedCounts[party] !== undefined) {
              partyTotalCounts[party]++;

              // Check if the voter voted (Voted field is 1 for voted, 0 for not voted)
              if (voter.Voted === 1) {
                partyVotedCounts[party]++;
              } else if (voter.Voted === 0) {
                partyNotVotedCounts[party]++;
              }
            }
          });

          console.log("Party voted counts:", partyVotedCounts);
          console.log("Party not voted counts:", partyNotVotedCounts);
          console.log("Party total counts:", partyTotalCounts);

          // We're only using actual data from the JSON file, no fallbacks
          console.log(
            "Using only actual data from the JSON file for turnout calculation"
          );

          // Calculate percentages for each party based on actual counts
          votedPercentages = labels.map((party) => {
            return partyTotalCounts[party] > 0
              ? Math.round(
                  (partyVotedCounts[party] / partyTotalCounts[party]) * 100
                )
              : 0;
          });

          notVotedPercentages = labels.map((party) => {
            return partyTotalCounts[party] > 0
              ? Math.round(
                  (partyNotVotedCounts[party] / partyTotalCounts[party]) * 100
                )
              : 0;
          });

          // Ensure percentages add up to 100%
          labels.forEach((party, index) => {
            const total = votedPercentages[index] + notVotedPercentages[index];
            if (total > 0 && total !== 100) {
              // Adjust to ensure they sum to 100%
              votedPercentages[index] = Math.round(
                (partyVotedCounts[party] / partyTotalCounts[party]) * 100
              );
              notVotedPercentages[index] = 100 - votedPercentages[index];
            }
          });

          console.log("Voted percentages:", votedPercentages);
          console.log("Not voted percentages:", notVotedPercentages);
        } else {
          console.warn("Raw voter data not available");

          // If no raw data is available, just use empty arrays
          // This ensures we don't display any simulated data
          votedPercentages = [];
          notVotedPercentages = [];
        }

        // Make sure we have valid data for the chart
        if (labels.length === 0) {
          console.error("No labels found for turnout chart");
        }

        if (votedPercentages.length === 0 || notVotedPercentages.length === 0) {
          console.error("No percentage data found for turnout chart");
        }

        // Create chart data with explicit values to ensure it's working
        chartData = [
          {
            x: labels,
            y: votedPercentages,
            type: "bar",
            name: "Voted",
            marker: {
              color: "rgba(56, 142, 60, 0.8)",
            },
            text: votedPercentages.map((v) => `${v}%`),
            textposition: "auto",
            hovertemplate: "%{x}<br>Voted: %{y}%<extra></extra>",
          },
          {
            x: labels,
            y: notVotedPercentages,
            type: "bar",
            name: "Did Not Vote",
            marker: {
              color: "rgba(211, 47, 47, 0.8)",
            },
            text: notVotedPercentages.map((v) => `${v}%`),
            textposition: "auto",
            hovertemplate: "%{x}<br>Did Not Vote: %{y}%<extra></extra>",
          },
        ];

        console.log("Turnout chart data:", chartData);

        // Ensure the layout is properly configured for a stacked bar chart
        layout = {
          ...layout,
          barmode: "stack",
          yaxis: {
            title: "Percentage (%)",
            titlefont: {
              family: "Inter, sans-serif",
              size: 12,
            },
            range: [0, 100],
          },
          xaxis: {
            title: "Party",
            titlefont: {
              family: "Inter, sans-serif",
              size: 12,
            },
          },
          legend: {
            orientation: "h",
            y: 1.1,
          },
        };
        break;

      case "distribution":
        // Registration Distribution - Pie chart
        chartData = [
          {
            labels: labels,
            values: values,
            type: "pie",
            textinfo: "label+percent",
            hoverinfo: "label+value+percent",
            marker: {
              colors: colors,
            },
            hovertemplate:
              "%{label}<br>Voters: %{value:,}<br>Percentage: %{percent}<extra></extra>",
          },
        ];

        layout = {
          margin: { t: 10, b: 10, l: 10, r: 10 },
          height: 300,
          font: {
            family: "Inter, sans-serif",
          },
          showlegend: false,
        };
        break;
    }

    console.log("Final chart data:", chartData);
    console.log("Final layout:", layout);

    try {
      // First purge any existing chart
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }

      // Add a small delay to ensure the DOM is ready
      setTimeout(() => {
        if (chartRef.current) {
          Plotly.newPlot(chartRef.current, chartData, layout, {
            responsive: true,
          });
          console.log("Chart plotted successfully");
        }
      }, 100);
    } catch (error) {
      console.error("Error plotting chart:", error);
    }

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
        link.download = `party_affiliation_${viewType}_chart.png`;
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
      case "total":
        return "Total Count";
      case "turnout":
        return "Voter Turnout";
      case "distribution":
        return "Registration Distribution";
      default:
        return "Party Affiliation";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">
          Party Affiliation: {getViewTitle()}
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
              <SelectItem value="total">Total Count</SelectItem>
              <SelectItem value="turnout">Voter Turnout</SelectItem>
              <SelectItem value="distribution">
                Registration Distribution
              </SelectItem>
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
          {(!data || Object.keys(data).length === 0) && (
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
              <p className="text-neutral-500">Party Affiliation Bar Chart</p>
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
