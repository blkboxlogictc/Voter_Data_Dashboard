import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Check,
  UploadCloud,
  Database,
  Globe2,
  FileCode,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import sampleVoterData from "@/assets/SampleVoterData.json";
import sampleDistrictsData from "@/assets/SampleDistricts.json";

type FileData = {
  name: string;
  content: string;
  isValid: boolean;
};

interface FileUploadProps {
  onVoterDataUpload: (file: File) => Promise<void>;
  onGeoDataUpload: (file: File) => Promise<void>;
  onProcessFiles: () => Promise<void>;
  voterFile: FileData | null;
  geoFile: FileData | null;
  isLoading?: boolean;
  processingProgress?: { progress: number; stage: string } | null;
}

export default function FileUpload({
  onVoterDataUpload,
  onGeoDataUpload,
  onProcessFiles,
  voterFile,
  geoFile,
  isLoading = false,
  processingProgress,
}: FileUploadProps) {
  const [voterDataDragActive, setVoterDataDragActive] = useState(false);
  const [geoDataDragActive, setGeoDataDragActive] = useState(false);
  const { toast } = useToast();

  const handleVoterDataDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setVoterDataDragActive(true);
    } else if (e.type === "dragleave") {
      setVoterDataDragActive(false);
    }
  };

  const handleGeoDataDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setGeoDataDragActive(true);
    } else if (e.type === "dragleave") {
      setGeoDataDragActive(false);
    }
  };

  const handleVoterDataDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVoterDataDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleVoterFileUpload(file);
    }
  };

  const handleGeoDataDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGeoDataDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleGeoFileUpload(file);
    }
  };

  const handleVoterFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleVoterFileUpload(file);
    }
  };

  const handleGeoFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleGeoFileUpload(file);
    }
  };

  const handleVoterFileUpload = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      toast({
        title: "Invalid file format",
        description: "Please upload a valid JSON file for voter data",
        variant: "destructive",
      });
      return;
    }

    try {
      await onVoterDataUpload(file);
    } catch (error) {
      toast({
        title: "Error uploading file",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleGeoFileUpload = async (file: File) => {
    if (!file.name.endsWith(".json") && !file.name.endsWith(".geojson")) {
      toast({
        title: "Invalid file format",
        description: "Please upload a valid GeoJSON file",
        variant: "destructive",
      });
      return;
    }

    try {
      await onGeoDataUpload(file);
    } catch (error) {
      toast({
        title: "Error uploading file",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleProcessClick = async () => {
    if (!voterFile || !geoFile) {
      toast({
        title: "Missing files",
        description:
          "Please upload both voter data and district boundaries files",
        variant: "destructive",
      });
      return;
    }

    try {
      await onProcessFiles();
    } catch (error) {
      toast({
        title: "Error processing files",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Handle loading sample data
  const handleUseSampleData = async () => {
    try {
      // Create File objects from the sample data
      const voterDataFile = new File(
        [JSON.stringify(sampleVoterData)],
        "SampleVoterData.json",
        { type: "application/json" }
      );

      const geoDataFile = new File(
        [JSON.stringify(sampleDistrictsData)],
        "SampleDistricts.json",
        { type: "application/json" }
      );

      // Upload the sample files
      await onVoterDataUpload(voterDataFile);
      await onGeoDataUpload(geoDataFile);

      toast({
        title: "Sample data loaded",
        description:
          "Sample voter and geographic data have been loaded. Click 'Process & Visualize' to continue.",
      });
    } catch (error) {
      toast({
        title: "Error loading sample data",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow mb-6">
      <CardContent className="p-6">
        <h2 className="text-xl font-medium mb-4 text-neutral-900">
          Data Upload
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Voter Data (JSON)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition ${
                voterDataDragActive
                  ? "border-primary bg-primary/5"
                  : "border-neutral-300 hover:border-primary hover:bg-primary/5"
              }`}
              onDragEnter={handleVoterDataDrag}
              onDragLeave={handleVoterDataDrag}
              onDragOver={handleVoterDataDrag}
              onDrop={handleVoterDataDrop}
              onClick={() =>
                document.getElementById("voter-file-input")?.click()
              }
            >
              <input
                id="voter-file-input"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleVoterFileInput}
              />
              <div className="py-4">
                <Database className="h-10 w-10 text-primary mx-auto mb-2" />
                <p className="text-neutral-500 mb-1">
                  Click or drag & drop your voter data file
                </p>
                <p className="text-sm text-neutral-400">Accepts JSON format</p>
              </div>
            </div>
            <div className="mt-2">
              {voterFile && (
                <div
                  className={`flex items-center text-sm ${
                    voterFile.isValid ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {voterFile.isValid ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-1" />
                  )}
                  <span>
                    {voterFile.isValid
                      ? `${voterFile.name} selected`
                      : "Invalid file format. Please upload a valid JSON file."}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              District Boundaries (GeoJSON)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition ${
                geoDataDragActive
                  ? "border-primary bg-primary/5"
                  : "border-neutral-300 hover:border-primary hover:bg-primary/5"
              }`}
              onDragEnter={handleGeoDataDrag}
              onDragLeave={handleGeoDataDrag}
              onDragOver={handleGeoDataDrag}
              onDrop={handleGeoDataDrop}
              onClick={() => document.getElementById("geo-file-input")?.click()}
            >
              <input
                id="geo-file-input"
                type="file"
                accept=".json,.geojson"
                className="hidden"
                onChange={handleGeoFileInput}
              />
              <div className="py-4">
                <Globe2 className="h-10 w-10 text-primary mx-auto mb-2" />
                <p className="text-neutral-500 mb-1">
                  Click or drag & drop your district boundaries file
                </p>
                <p className="text-sm text-neutral-400">
                  Accepts GeoJSON format
                </p>
              </div>
            </div>
            <div className="mt-2">
              {geoFile && (
                <div
                  className={`flex items-center text-sm ${
                    geoFile.isValid ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {geoFile.isValid ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-1" />
                  )}
                  <span>
                    {geoFile.isValid
                      ? `${geoFile.name} selected`
                      : "Invalid file format. Please upload a valid GeoJSON file."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Processing Progress */}
        {processingProgress && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                {processingProgress.stage}
              </span>
              <span className="text-sm text-blue-700">
                {Math.round(processingProgress.progress)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 transition flex items-center"
            onClick={handleUseSampleData}
            disabled={isLoading}
          >
            <FileCode className="h-4 w-4 mr-2" />
            <span>Use Sample Data</span>
          </Button>

          <Button
            className="bg-primary text-white px-6 py-2 rounded font-medium flex items-center space-x-2 hover:bg-primary/90 transition disabled:opacity-50"
            onClick={handleProcessClick}
            disabled={!voterFile?.isValid || !geoFile?.isValid || isLoading}
          >
            <UploadCloud className="h-5 w-5 mr-2" />
            <span>
              {isLoading ? "Processing..." : "Process & Visualize Data"}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
