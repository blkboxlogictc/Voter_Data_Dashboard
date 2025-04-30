import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import SummaryStatistics from "@/components/SummaryStatistics";
import PartyAffiliationChart from "@/components/charts/PartyAffiliationChart";
import AgeGroupTurnoutChart from "@/components/charts/AgeGroupTurnoutChart";
import RacialDemographicsChart from "@/components/charts/RacialDemographicsChart";
import TurnoutTrendChart from "@/components/charts/TurnoutTrendChart";
import GeographicMap from "@/components/GeographicMap";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { useToast } from "@/hooks/use-toast";
import useVoterData from "@/hooks/useVoterData";
import type { DistrictType } from "@shared/schema";
import { Download, HelpCircle } from "lucide-react";

export default function Dashboard() {
  const [districtType, setDistrictType] = useState<DistrictType>("precinct");
  const { 
    uploadVoterData, 
    uploadGeoData, 
    processData,
    voterFile,
    geoFile,
    processedData,
    isLoading,
    error,
    resetData
  } = useVoterData();
  
  const { toast } = useToast();

  const handleDownload = () => {
    if (!processedData) {
      toast({
        title: "No data to download",
        description: "Please upload and process data first.",
        variant: "destructive"
      });
      return;
    }
    
    // Create a blob with the processed data
    const blob = new Blob([JSON.stringify(processedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed_voter_data.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleHelp = () => {
    toast({
      title: "Help Information",
      description: "Upload voter data JSON and GeoJSON district files to visualize election data. Select different district types to filter the data.",
    });
  };

  const handleDistrictTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDistrictType(e.target.value as DistrictType);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm px-4 py-4 border-b border-neutral-200">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Voter Data Dashboard</h1>
          <div className="flex space-x-2">
            <button 
              className="bg-green-600 text-white px-4 py-2 rounded flex items-center space-x-1 hover:bg-green-700 transition" 
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
            <button 
              className="bg-primary text-white px-4 py-2 rounded flex items-center space-x-1 hover:bg-primary/90 transition" 
              onClick={handleHelp}
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-grow">
        <FileUpload 
          onVoterDataUpload={uploadVoterData}
          onGeoDataUpload={uploadGeoData}
          onProcessFiles={processData}
          voterFile={voterFile}
          geoFile={geoFile}
        />
        
        {isLoading && <LoadingState />}
        
        {error && <ErrorState error={error} onTryAgain={resetData} />}
        
        {!isLoading && !error && processedData ? (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium text-neutral-900">Visualization Dashboard</h2>
              
              <div className="flex items-center space-x-2">
                <label htmlFor="districtType" className="text-sm font-medium text-neutral-900">
                  District Type:
                </label>
                <select 
                  id="districtType" 
                  className="border border-neutral-300 rounded px-3 py-2 focus:ring-primary focus:border-primary"
                  value={districtType}
                  onChange={handleDistrictTypeChange}
                >
                  <option value="precinct">Precinct</option>
                  <option value="stateHouse">State House</option>
                  <option value="stateSenate">State Senate</option>
                  <option value="congressional">Congressional</option>
                </select>
              </div>
            </div>
            
            <SummaryStatistics stats={processedData.summaryStats} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <PartyAffiliationChart data={processedData.partyAffiliation} />
              <AgeGroupTurnoutChart data={processedData.ageGroupTurnout} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <RacialDemographicsChart data={processedData.racialDemographics} />
              <TurnoutTrendChart data={processedData.turnoutTrends} />
            </div>
            
            <GeographicMap 
              geoData={geoFile && geoFile.isValid ? JSON.parse(geoFile.content) : null}
              districtData={processedData.districtData}
              districtType={districtType}
            />
          </div>
        ) : (
          !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="mb-6">
                <svg
                  className="h-16 w-16 text-neutral-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-neutral-900 mb-2">No Data Visualized Yet</h2>
              <p className="text-neutral-500 max-w-md mb-8">
                Upload your voter data JSON file and GeoJSON district boundaries to generate visualizations and insights.
              </p>
            </div>
          )
        )}
      </main>

      <footer className="bg-white border-t border-neutral-200 py-4 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-500">
          <p>Voter Data Dashboard © 2023 - All data is processed locally and not stored on any server.</p>
        </div>
      </footer>
    </div>
  );
}
