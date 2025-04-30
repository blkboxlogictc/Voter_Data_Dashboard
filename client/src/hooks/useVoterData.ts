import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProcessedVoterData } from "@shared/schema";

interface FileData {
  name: string;
  content: string;
  isValid: boolean;
}

export default function useVoterData() {
  const [voterFile, setVoterFile] = useState<FileData | null>(null);
  const [geoFile, setGeoFile] = useState<FileData | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedVoterData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const validateJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const uploadVoterData = async (file: File): Promise<void> => {
    try {
      const fileContent = await file.text();
      const isValid = validateJson(fileContent);
      
      setVoterFile({
        name: file.name,
        content: fileContent,
        isValid
      });
      
      if (!isValid) {
        throw new Error("Invalid voter data JSON format");
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  const uploadGeoData = async (file: File): Promise<void> => {
    try {
      const fileContent = await file.text();
      const isValid = validateJson(fileContent);
      
      setGeoFile({
        name: file.name,
        content: fileContent,
        isValid
      });
      
      if (!isValid) {
        throw new Error("Invalid GeoJSON format");
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  const processData = async (): Promise<void> => {
    if (!voterFile || !geoFile) {
      throw new Error("Both voter data and GeoJSON files are required");
    }
    
    if (!voterFile.isValid || !geoFile.isValid) {
      throw new Error("Invalid file format. Please upload valid JSON files");
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('voterData', new Blob([voterFile.content], { type: 'application/json' }), voterFile.name);
      formData.append('geoData', new Blob([geoFile.content], { type: 'application/json' }), geoFile.name);
      
      const response = await apiRequest('POST', '/api/process-data', {
        voterData: JSON.parse(voterFile.content),
        geoData: JSON.parse(geoFile.content)
      });
      
      const data = await response.json();
      setProcessedData(data);
      
      toast({
        title: "Data Processed Successfully",
        description: "Your data has been processed and visualizations are ready."
      });
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Failed to process data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetData = () => {
    setVoterFile(null);
    setGeoFile(null);
    setProcessedData(null);
    setError(null);
  };

  return {
    voterFile,
    geoFile,
    processedData,
    isLoading,
    error,
    uploadVoterData,
    uploadGeoData,
    processData,
    resetData
  };
}
