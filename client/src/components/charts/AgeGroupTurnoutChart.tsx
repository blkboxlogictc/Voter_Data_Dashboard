import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Plotly from "plotly.js-dist-min";

interface AgeGroupTurnoutChartProps {
  data: {
    ageGroups: string[];
    voted: number[];
    notVoted: number[];
  };
}

export default function AgeGroupTurnoutChart({ data }: AgeGroupTurnoutChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chartRef.current || !data || !data.ageGroups || data.ageGroups.length === 0) return;

    const trace1 = {
      x: data.ageGroups,
      y: data.voted,
      name: 'Voted',
      type: 'bar',
      marker: {
        color: 'rgba(56, 142, 60, 0.8)'
      }
    };
    
    const trace2 = {
      x: data.ageGroups,
      y: data.notVoted,
      name: 'Did Not Vote',
      type: 'bar',
      marker: {
        color: 'rgba(211, 47, 47, 0.8)'
      }
    };
    
    const chartData = [trace1, trace2];
    
    const layout = {
      barmode: 'stack',
      margin: { t: 10, b: 50, l: 50, r: 20 },
      height: 300,
      legend: {
        x: 0,
        y: 1,
        orientation: 'h'
      },
      font: {
        family: 'Inter, sans-serif'
      },
      yaxis: {
        title: 'Number of Voters',
        titlefont: {
          family: 'Inter, sans-serif',
          size: 12
        }
      },
      xaxis: {
        title: 'Age Group',
        titlefont: {
          family: 'Inter, sans-serif',
          size: 12
        }
      }
    };
    
    Plotly.newPlot(chartRef.current, chartData, layout, { responsive: true });

    return () => {
      if (chartRef.current) Plotly.purge(chartRef.current);
    };
  }, [data]);

  const handleDownloadChart = () => {
    if (!chartRef.current) return;
    
    Plotly.toImage(chartRef.current, { format: 'png', width: 800, height: 450 })
      .then(function(dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'age_group_turnout_chart.png';
        link.click();
      })
      .catch(function(error) {
        toast({
          title: "Download failed",
          description: error.message || "Failed to download chart",
          variant: "destructive"
        });
      });
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="font-medium text-neutral-900">Voter Turnout by Age Group</h3>
        <button 
          className="text-neutral-500 hover:text-neutral-700"
          onClick={handleDownloadChart}
        >
          <Download className="h-5 w-5" />
        </button>
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
              <p className="text-neutral-500">Age Group Turnout Stacked Bar Chart</p>
              <p className="text-sm text-neutral-400 mt-2">Visualization will appear here after data processing</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
