import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Plotly from "plotly.js-dist-min";

interface RacialDemographicsChartProps {
  data: Record<string, number>;
}

export default function RacialDemographicsChart({ data }: RacialDemographicsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chartRef.current || !data || Object.keys(data).length === 0) return;

    const labels = Object.keys(data);
    const values = Object.values(data);

    // Generate an array of colors
    const colorScale = [
      'rgb(25, 118, 210)',
      'rgb(56, 142, 60)',
      'rgb(211, 47, 47)',
      'rgb(249, 168, 37)',
      'rgb(156, 39, 176)',
      'rgb(0, 188, 212)',
      'rgb(255, 87, 34)',
      'rgb(121, 85, 72)',
      'rgb(94, 53, 177)'
    ];

    const chartData = [{
      type: 'pie',
      labels: labels,
      values: values,
      textinfo: 'percent',
      textposition: 'inside',
      insidetextfont: {
        size: 14,
        color: '#FFFFFF'
      },
      hoverinfo: 'label+value+percent',
      marker: {
        colors: colorScale
      }
    }];

    const layout = {
      margin: { t: 10, b: 10, l: 10, r: 10 },
      height: 300,
      font: {
        family: 'Inter, sans-serif'
      },
      showlegend: true,
      legend: {
        orientation: 'h',
        y: -0.1
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
        link.download = 'racial_demographics_chart.png';
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
        <h3 className="font-medium text-neutral-900">Racial Demographics</h3>
        <button 
          className="text-neutral-500 hover:text-neutral-700"
          onClick={handleDownloadChart}
        >
          <Download className="h-5 w-5" />
        </button>
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
              <p className="text-sm text-neutral-400 mt-2">Visualization will appear here after data processing</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
