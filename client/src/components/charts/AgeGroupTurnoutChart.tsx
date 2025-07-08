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

interface AgeGroupTurnoutChartProps {
  data: {
    ageGroups: string[];
    voted: number[];
    notVoted: number[];
  };
}

type ViewType = "total" | "percentage" | "distribution";

export default function AgeGroupTurnoutChart({
  data,
}: AgeGroupTurnoutChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [viewType, setViewType] = useState<ViewType>("total");

  useEffect(() => {
    if (
      !chartRef.current ||
      !data ||
      !data.ageGroups ||
      data.ageGroups.length === 0
    )
      return;

    // Define consistent colors for all chart types
    const votedColor = "rgba(56, 142, 60, 0.8)";
    const notVotedColor = "rgba(211, 47, 47, 0.8)";

    let chartData: any[] = [];
    let layout: Partial<Plotly.Layout> = {
      margin: { t: 10, b: 50, l: 50, r: 20 },
      height: 300,
      font: {
        family: "Inter, sans-serif",
      },
    };

    switch (viewType) {
      case "total":
        // Total Count - Stacked bar chart showing absolute numbers
        const trace1 = {
          x: data.ageGroups,
          y: data.voted,
          name: "Voted",
          type: "bar",
          marker: {
            color: votedColor,
          },
          hovertemplate: "%{x}<br>Voted: %{y:,}<extra></extra>",
        };

        const trace2 = {
          x: data.ageGroups,
          y: data.notVoted,
          name: "Did Not Vote",
          type: "bar",
          marker: {
            color: notVotedColor,
          },
          hovertemplate: "%{x}<br>Did Not Vote: %{y:,}<extra></extra>",
        };

        chartData = [trace1, trace2];

        layout = {
          ...layout,
          barmode: "stack",
          legend: {
            x: 0,
            y: 1.1,
            orientation: "h",
          },
          yaxis: {
            title: "Number of Voters",
            titlefont: {
              family: "Inter, sans-serif",
              size: 12,
            },
          },
          xaxis: {
            title: "Age Group",
            titlefont: {
              family: "Inter, sans-serif",
              size: 12,
            },
          },
        };
        break;

      case "percentage":
        // Percentage - Stacked percentage chart
        // Calculate percentages for each age group
        const votedPercentages = data.ageGroups.map((_, i) => {
          const total = data.voted[i] + data.notVoted[i];
          return total > 0 ? Math.round((data.voted[i] / total) * 100) : 0;
        });

        const notVotedPercentages = data.ageGroups.map((_, i) => {
          const total = data.voted[i] + data.notVoted[i];
          return total > 0 ? Math.round((data.notVoted[i] / total) * 100) : 0;
        });

        const traceVotedPct = {
          x: data.ageGroups,
          y: votedPercentages,
          name: "Voted",
          type: "bar",
          marker: {
            color: votedColor,
          },
          text: votedPercentages.map((v) => `${v}%`),
          textposition: "auto",
          hovertemplate: "%{x}<br>Voted: %{y}%<extra></extra>",
        };

        const traceNotVotedPct = {
          x: data.ageGroups,
          y: notVotedPercentages,
          name: "Did Not Vote",
          type: "bar",
          marker: {
            color: notVotedColor,
          },
          text: notVotedPercentages.map((v) => `${v}%`),
          textposition: "auto",
          hovertemplate: "%{x}<br>Did Not Vote: %{y}%<extra></extra>",
        };

        chartData = [traceVotedPct, traceNotVotedPct];

        layout = {
          ...layout,
          barmode: "stack",
          legend: {
            x: 0,
            y: 1.1,
            orientation: "h",
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
            title: "Age Group",
            titlefont: {
              family: "Inter, sans-serif",
              size: 12,
            },
          },
        };
        break;

      case "distribution":
        // Distribution - Pie chart showing proportion of voters by age group
        // Calculate total voters (voted only) for each age group
        const totalVoters = data.voted.reduce((sum, val) => sum + val, 0);
        const percentages = data.voted.map((v) =>
          totalVoters > 0 ? (v / totalVoters) * 100 : 0
        );

        // Create a color scale for the pie chart
        const colors = data.ageGroups.map((_, i) => {
          // Generate a gradient of colors from blue to green
          const hue = 200 + ((i * 20) % 160); // Hue between 200 (blue) and 120 (green)
          return `hsla(${hue}, 70%, 50%, 0.8)`;
        });

        chartData = [
          {
            labels: data.ageGroups,
            values: data.voted,
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

    console.log("Rendering chart with viewType:", viewType);
    console.log("Chart data:", chartData);

    // First purge any existing chart
    if (chartRef.current) {
      Plotly.purge(chartRef.current);
    }

    // Add a small delay to ensure the DOM is ready
    setTimeout(() => {
      if (chartRef.current) {
        try {
          Plotly.newPlot(chartRef.current, chartData, layout, {
            responsive: true,
          });
          console.log("Chart rendered successfully");
        } catch (error) {
          console.error("Error rendering chart:", error);
        }
      }
    }, 100);

    return () => {
      if (chartRef.current) Plotly.purge(chartRef.current);
    };
  }, [data, viewType]); // Add viewType to the dependency array to re-render when it changes

  const handleDownloadChart = () => {
    if (!chartRef.current) return;

    Plotly.toImage(chartRef.current, { format: "png", width: 800, height: 450 })
      .then(function (dataUrl) {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `voter_age_${viewType}_chart.png`;
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
      case "total":
        return "Total Count";
      case "percentage":
        return "Turnout Percentage";
      case "distribution":
        return "Age Distribution";
      default:
        return "Voter Age";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">
          Voter Age: {getViewTitle()}
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
              <SelectItem value="percentage">Turnout Percentage</SelectItem>
              <SelectItem value="distribution">Age Distribution</SelectItem>
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
          {(!data || !data.ageGroups || data.ageGroups.length === 0) && (
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
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-neutral-500">
                Age Group Turnout Stacked Bar Chart
              </p>
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
