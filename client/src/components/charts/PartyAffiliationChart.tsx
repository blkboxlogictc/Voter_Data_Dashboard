import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Plotly from "plotly.js-dist-min";

interface PartyAffiliationChartProps {
  data: Record<string, number>;
}

export default function PartyAffiliationChart({ data }: PartyAffiliationChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chartRef.current || !data || Object.keys(data).length === 0) return;

    const labels = Object.keys(data);
    const values = Object.values(data);

    // Define colors for common political parties
    const colors = labels.map(label => {
      const lowerLabel = label.toLowerCase();
      if (lowerLabel.includes("democrat")) return "rgba(25, 118, 210, 0.8)";
      if (lowerLabel.includes("republican")) return "rgba(211, 47, 47, 0.8)";
      if (lowerLabel.includes("green")) return "rgba(46, 125, 50, 0.8)";
      if (lowerLabel.includes("libertarian")) return "rgba(255, 167, 38, 0.8)";
      if (lowerLabel.includes("independent")) return "rgba(149, 117, 205, 0.8)";
      return `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 0.8)`;
    });

    const chartData = [{
      x: labels,
      y: values,
      type: 'bar',
      marker: {
        color: colors
      },
      text: values.map(v => v.toLocaleString()),
      textposition: 'auto',
    }];

    const layout = {
      margin: { t: 10, b: 50, l: 50, r: 20 },
      height: 300,
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
        title: 'Party',
        titlefont: {
          family: 'Inter, sans-serif',
          size: 12
        }
      },
      bargap: 0.3
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
        link.download = 'party_affiliation_chart.png';
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
        <h3 className="font-medium text-neutral-900">Party Affiliation</h3>
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-neutral-500">Party Affiliation Bar Chart</p>
              <p className="text-sm text-neutral-400 mt-2">Visualization will appear here after data processing</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
