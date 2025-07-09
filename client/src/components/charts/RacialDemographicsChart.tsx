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

interface RacialDemographicsChartProps {
  data: Record<string, number>;
  rawVoterData?: any[] | null;
}

type ViewType = "distribution" | "turnout";

export default function RacialDemographicsChart({
  data,
  rawVoterData,
}: RacialDemographicsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [viewType, setViewType] = useState<ViewType>("distribution");

  useEffect(() => {
    if (!chartRef.current || !data || Object.keys(data).length === 0) return;

    const labels = Object.keys(data);
    const values = Object.values(data);

    // Generate an array of colors - consistent across all views
    const colorScale = [
      "rgb(25, 118, 210)", // Blue
      "rgb(56, 142, 60)", // Green
      "rgb(211, 47, 47)", // Red
      "rgb(249, 168, 37)", // Amber
      "rgb(156, 39, 176)", // Purple
      "rgb(0, 188, 212)", // Cyan
      "rgb(255, 87, 34)", // Deep Orange
      "rgb(121, 85, 72)", // Brown
      "rgb(94, 53, 177)", // Deep Purple
    ];

    let chartData: any[] = [];
    let layout: Partial<Plotly.Layout> = {
      height: 300,
      font: {
        family: "Inter, sans-serif",
      },
    };

    switch (viewType) {
      case "distribution":
        // Distribution - Pie chart showing proportional distribution of racial groups
        chartData = [
          {
            type: "pie",
            labels: labels,
            values: values,
            textinfo: "percent",
            textposition: "inside",
            insidetextfont: {
              size: 14,
              color: "#FFFFFF",
            },
            hoverinfo: "label+value+percent",
            marker: {
              colors: colorScale,
            },
            hovertemplate:
              "%{label}<br>Voters: %{value:,}<br>Percentage: %{percent}<extra></extra>",
          },
        ];

        layout = {
          ...layout,
          margin: { t: 10, b: 10, l: 10, r: 10 },
          showlegend: true,
          legend: {
            orientation: "h",
            y: -0.1,
          },
        };
        break;

      case "turnout":
        // Turnout - Stacked bar chart showing voter turnout by racial category
        if (
          rawVoterData &&
          Array.isArray(rawVoterData) &&
          rawVoterData.length > 0
        ) {
          console.log("Processing racial turnout data");

          // Create counters for voted and not voted by race
          const raceVotedCounts: Record<string, number> = {};
          const raceNotVotedCounts: Record<string, number> = {};
          const raceTotalCounts: Record<string, number> = {};

          // Initialize counts for each race
          labels.forEach((race) => {
            raceVotedCounts[race] = 0;
            raceNotVotedCounts[race] = 0;
            raceTotalCounts[race] = 0;
          });

          // Count voters by race and voted status
          rawVoterData.forEach((voter: any) => {
            let race = voter.Race || "Unknown";

            // Standardize race categories to match the processed data
            if (race.toLowerCase().includes("white")) race = "White";
            else if (race.toLowerCase().includes("black")) race = "Black";
            else if (
              race.toLowerCase().includes("hispanic") ||
              race.toLowerCase().includes("latino")
            )
              race = "Hispanic";
            else if (race.toLowerCase().includes("asian")) race = "Asian";
            else if (race.toLowerCase().includes("native")) race = "Native";
            else if (race.toLowerCase().includes("multi")) race = "Multiracial";
            else race = "Unknown";

            // If this race is in our labels, count it
            if (raceVotedCounts[race] !== undefined) {
              raceTotalCounts[race]++;

              // Check if the voter voted (Voted field is 1 for voted, 0 for not voted)
              if (
                voter.Voted === 1 ||
                voter.Voted === true ||
                voter.Voted === "1"
              ) {
                raceVotedCounts[race]++;
              } else if (
                voter.Voted === 0 ||
                voter.Voted === false ||
                voter.Voted === "0"
              ) {
                raceNotVotedCounts[race]++;
              }
            }
          });

          console.log("Race voted counts:", raceVotedCounts);
          console.log("Race not voted counts:", raceNotVotedCounts);
          console.log("Race total counts:", raceTotalCounts);

          // Calculate percentages for each race
          const votedPercentages = labels.map((race) => {
            return raceTotalCounts[race] > 0
              ? Math.round(
                  (raceVotedCounts[race] / raceTotalCounts[race]) * 100
                )
              : 0;
          });

          const notVotedPercentages = labels.map((race) => {
            return raceTotalCounts[race] > 0
              ? Math.round(
                  (raceNotVotedCounts[race] / raceTotalCounts[race]) * 100
                )
              : 0;
          });

          // Create the stacked bar chart
          chartData = [
            {
              x: labels,
              y: votedPercentages,
              name: "Voted",
              type: "bar",
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
              name: "Did Not Vote",
              type: "bar",
              marker: {
                color: "rgba(211, 47, 47, 0.8)",
              },
              text: notVotedPercentages.map((v) => `${v}%`),
              textposition: "auto",
              hovertemplate: "%{x}<br>Did Not Vote: %{y}%<extra></extra>",
            },
          ];

          layout = {
            ...layout,
            barmode: "stack",
            margin: { t: 10, b: 50, l: 50, r: 20 },
            legend: {
              orientation: "h",
              y: 1.1,
            },
            yaxis: {
              title: "Percentage (%)",
              titlefont: {
                family: "Inter, sans-serif",
                size: 12,
              },
              range: [0, 100],
            },
            xaxis: {
              title: "Racial Group",
              titlefont: {
                family: "Inter, sans-serif",
                size: 12,
              },
            },
          };
        } else {
          // If no raw voter data is available, show a message
          console.warn("Raw voter data not available for racial turnout chart");
          chartData = [
            {
              type: "scatter",
              x: [0],
              y: [0],
              mode: "text",
              text: ["No voter data available for turnout analysis"],
              textposition: "middle center",
              hoverinfo: "none",
            },
          ];

          layout = {
            ...layout,
            margin: { t: 10, b: 10, l: 10, r: 10 },
            xaxis: {
              showgrid: false,
              zeroline: false,
              showticklabels: false,
            },
            yaxis: {
              showgrid: false,
              zeroline: false,
              showticklabels: false,
            },
          };
        }
        break;
    }

    console.log("Rendering racial demographics chart with viewType:", viewType);

    try {
      // First purge any existing chart
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }

      // Render the new chart
      if (chartRef.current) {
        Plotly.newPlot(chartRef.current, chartData, layout, {
          responsive: true,
        });
        console.log("Racial demographics chart rendered successfully");
      }
    } catch (error) {
      console.error("Error rendering racial demographics chart:", error);
    }

    return () => {
      if (chartRef.current) Plotly.purge(chartRef.current);
    };
  }, [data, viewType, rawVoterData]); // Include viewType and rawVoterData in dependencies

  const handleDownloadChart = () => {
    if (!chartRef.current) return;

    Plotly.toImage(chartRef.current, { format: "png", width: 800, height: 450 })
      .then(function (dataUrl) {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `racial_demographics_${viewType}_chart.png`;
        link.click();
      })
      .catch(function (error) {
        toast({
          title: "Download failed",
          description: error.message || "Failed to download chart",
          variant: "destructive",
        });
      });
  };

  const getViewTitle = () => {
    switch (viewType) {
      case "distribution":
        return "Distribution";
      case "turnout":
        return "Turnout";
      default:
        return "Demographics";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">
          Racial Demographics: {getViewTitle()}
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
              <SelectItem value="distribution">Distribution</SelectItem>
              <SelectItem value="turnout">Turnout</SelectItem>
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
                  d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                />
              </svg>
              <p className="text-neutral-500">Racial Demographics Pie Chart</p>
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
