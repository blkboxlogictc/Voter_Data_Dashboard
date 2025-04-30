import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Plotly from "plotly.js-dist-min";

interface TurnoutTrendChartProps {
  data: {
    years: string[];
    turnout: number[];
  };
}

export default function TurnoutTrendChart({ data }: TurnoutTrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chartRef.current || !data || !data.years || data.years.length === 0) return;

    const chartData = [{
      x: data.years,
      y: data.turnout,
      type: 'scatter',
      mode: 'lines+markers',
      marker: {
        color: 'rgb(25, 118, 210)',
        size: 8
      },
      line: {
        color: 'rgb(25, 118, 210)',
        width: 3
      }
    }];

    const layout = {
      margin: { t: 10, b: 50, l: 50, r: 20 },
      height: 300,
      font: {
        family: 'Inter, sans-serif'
      },
      yaxis: {
        title: 'Voter Turnout (%)',
        titlefont: {
          family: 'Inter, sans-serif',
          size: 12
        },
        range: [
          Math.max(0, Math.min(...data.turnout) - 10),
          Math.min(100, Math.max(...data.turnout) + 10)
        ]
      },
      xaxis: {
        title: 'Year',
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
        link.download = 'turnout_trends_chart.png';
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
        <h3 className="font-medium text-neutral-900">Turnout Trends</h3>
        <button 
          className="text-neutral-500 hover:text-neutral-700"
          onClick={handleDownloadChart}
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
      <CardContent className="p-4">
        <div ref={chartRef} className="w-full h-[300px]">
          {(!data || !data.years || data.years.length === 0) && (
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
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              <p className="text-neutral-500">Turnout Trends Line Chart</p>
              <p className="text-sm text-neutral-400 mt-2">Visualization will appear here after data processing</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
