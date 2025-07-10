import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProcessedVoterData } from "@shared/schema";
import { uploadLargeFile } from "@/lib/chunkedUpload";
import { uploadFileClientOnly } from "@/lib/clientOnlyUpload";
import { processVoterData as smartProcessVoterData } from "@/lib/smartDataProcessor";

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
  const [processingProgress, setProcessingProgress] = useState<{ progress: number; stage: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ progress: number; stage: string } | null>(null);
  const [censusLocation, setCensusLocation] = useState<{
    stateFips: string;
    countyFips: string;
    stateName: string;
    countyName: string;
  } | null>(null);
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
      setUploadProgress({ progress: 0, stage: 'Starting voter data upload...' });
      
      // Check file size and use appropriate upload method
      const fileSizeMB = file.size / (1024 * 1024);
      const isDevelopment = !import.meta.env.PROD;
      let fileContent: string;
      
      // In development, always use client-only upload
      // In production, try chunked upload first, fallback to client-only
      if (isDevelopment || fileSizeMB <= 5) {
        if (fileSizeMB > 5) {
          toast({
            title: "Large File Detected",
            description: "Processing large file locally...",
          });
        }
        
        setUploadProgress({ progress: 10, stage: 'Reading voter data file...' });
        
        const result = await uploadFileClientOnly(file, {
          onProgress: (progress) => {
            setUploadProgress({
              progress: 10 + (progress * 0.8), // Scale to 10-90%
              stage: `Uploading voter data: ${progress.toFixed(1)}%`
            });
          },
          maxFileSize: 100 // 100MB limit for client-side processing
        });
        fileContent = result.content;
      } else {
        // Production with large files - try chunked upload, fallback to client-only
        try {
          toast({
            title: "Large File Detected",
            description: "Uploading large file in chunks...",
          });
          
          setUploadProgress({ progress: 10, stage: 'Preparing chunked upload...' });
          
          const result = await uploadLargeFile(file, {
            onProgress: (progress) => {
              setUploadProgress({
                progress: 10 + (progress * 0.8), // Scale to 10-90%
                stage: `Uploading voter data chunks: ${progress.toFixed(1)}%`
              });
            }
          });
          fileContent = result.content;
        } catch (chunkError) {
          console.warn('Chunked upload failed, falling back to client-only:', chunkError);
          toast({
            title: "Fallback Processing",
            description: "Using client-side processing for large file...",
          });
          
          setUploadProgress({ progress: 10, stage: 'Switching to client-side upload...' });
          
          const result = await uploadFileClientOnly(file, {
            onProgress: (progress) => {
              setUploadProgress({
                progress: 10 + (progress * 0.8), // Scale to 10-90%
                stage: `Uploading voter data: ${progress.toFixed(1)}%`
              });
            },
            maxFileSize: 100
          });
          fileContent = result.content;
        }
      }
      
      setUploadProgress({ progress: 95, stage: 'Validating voter data...' });
      const isValid = validateJson(fileContent);
      
      setVoterFile({
        name: file.name,
        content: fileContent,
        isValid
      });
      
      setUploadProgress({ progress: 100, stage: 'Voter data upload complete!' });
      
      if (!isValid) {
        throw new Error("Invalid voter data JSON format");
      }
      
      // Clear upload progress after a short delay
      setTimeout(() => setUploadProgress(null), 1000);
    } catch (error) {
      setUploadProgress(null);
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  const uploadGeoData = async (file: File): Promise<void> => {
    try {
      setUploadProgress({ progress: 0, stage: 'Starting geographic data upload...' });
      
      // Check file size and use appropriate upload method
      const fileSizeMB = file.size / (1024 * 1024);
      const isDevelopment = !import.meta.env.PROD;
      let fileContent: string;
      
      // In development, always use client-only upload
      // In production, try chunked upload first, fallback to client-only
      if (isDevelopment || fileSizeMB <= 5) {
        if (fileSizeMB > 5) {
          toast({
            title: "Large File Detected",
            description: "Processing large GeoJSON file locally...",
          });
        }
        
        setUploadProgress({ progress: 10, stage: 'Reading geographic data file...' });
        
        const result = await uploadFileClientOnly(file, {
          onProgress: (progress) => {
            setUploadProgress({
              progress: 10 + (progress * 0.8), // Scale to 10-90%
              stage: `Uploading geographic data: ${progress.toFixed(1)}%`
            });
          },
          maxFileSize: 100 // 100MB limit for client-side processing
        });
        fileContent = result.content;
      } else {
        // Production with large files - try chunked upload, fallback to client-only
        try {
          toast({
            title: "Large File Detected",
            description: "Uploading large GeoJSON file in chunks...",
          });
          
          setUploadProgress({ progress: 10, stage: 'Preparing chunked upload...' });
          
          const result = await uploadLargeFile(file, {
            onProgress: (progress) => {
              setUploadProgress({
                progress: 10 + (progress * 0.8), // Scale to 10-90%
                stage: `Uploading geographic data chunks: ${progress.toFixed(1)}%`
              });
            }
          });
          fileContent = result.content;
        } catch (chunkError) {
          console.warn('Chunked upload failed, falling back to client-only:', chunkError);
          toast({
            title: "Fallback Processing",
            description: "Using client-side processing for large GeoJSON file...",
          });
          
          setUploadProgress({ progress: 10, stage: 'Switching to client-side upload...' });
          
          const result = await uploadFileClientOnly(file, {
            onProgress: (progress) => {
              setUploadProgress({
                progress: 10 + (progress * 0.8), // Scale to 10-90%
                stage: `Uploading geographic data: ${progress.toFixed(1)}%`
              });
            },
            maxFileSize: 100
          });
          fileContent = result.content;
        }
      }
      
      setUploadProgress({ progress: 95, stage: 'Validating geographic data...' });
      const isValid = validateJson(fileContent);
      
      setGeoFile({
        name: file.name,
        content: fileContent,
        isValid
      });
      
      setUploadProgress({ progress: 100, stage: 'Geographic data upload complete!' });
      
      if (!isValid) {
        throw new Error("Invalid GeoJSON format");
      }
      
      // Clear upload progress after a short delay
      setTimeout(() => setUploadProgress(null), 1000);
    } catch (error) {
      setUploadProgress(null);
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
    setProcessingProgress({ progress: 0, stage: 'Initializing...' });
    
    try {
      // Parse the JSON data
      let parsedVoterData;
      let parsedGeoData;
      
      try {
        parsedVoterData = JSON.parse(voterFile.content);
        parsedGeoData = JSON.parse(geoFile.content);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        throw new Error("Invalid JSON format. Please check your files.");
      }
      
      // Use smart data processor
      const result = await smartProcessVoterData(
        parsedVoterData,
        parsedGeoData,
        undefined, // No census location for basic processing
        {
          onProgress: (progress, stage) => {
            setProcessingProgress({ progress, stage });
          }
        }
      );
      
      console.log(`Processing completed using ${result.processingMethod} method in ${result.processingTime}ms`);
      setProcessedData(result.data);
      
      toast({
        title: "Data Processed Successfully",
        description: `Your data has been processed using ${result.processingMethod} processing and visualizations are ready.`
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
      setProcessingProgress(null);
    }
  };

  const resetData = () => {
    setVoterFile(null);
    setGeoFile(null);
    setProcessedData(null);
    setError(null);
  };
  
  // Handle census location selection
  const setCensusLocationData = (
    stateFips: string,
    countyFips: string,
    stateName: string,
    countyName: string
  ) => {
    setCensusLocation({
      stateFips,
      countyFips,
      stateName,
      countyName
    });
    
    toast({
      title: "Location Selected",
      description: `Census data will be fetched for ${countyName}, ${stateName}`,
    });
  };
  
  // Process data with census integration
  const processDataWithCensus = async (): Promise<void> => {
    if (!voterFile || !geoFile) {
      throw new Error("Both voter data and GeoJSON files are required");
    }
    
    if (!censusLocation) {
      throw new Error("Please select a location for census data");
    }
    
    setIsLoading(true);
    setError(null);
    setProcessingProgress({ progress: 0, stage: 'Initializing census integration...' });
    
    try {
      // Parse the JSON data
      const parsedVoterData = JSON.parse(voterFile.content);
      const parsedGeoData = JSON.parse(geoFile.content);
      
      // Use smart data processor with census integration
      const result = await smartProcessVoterData(
        parsedVoterData,
        parsedGeoData,
        {
          state: censusLocation.stateFips,
          county: censusLocation.countyFips,
          stateName: censusLocation.stateName,
          countyName: censusLocation.countyName
        },
        {
          onProgress: (progress, stage) => {
            setProcessingProgress({ progress, stage });
          }
        }
      );
      
      console.log(`Census processing completed using ${result.processingMethod} method in ${result.processingTime}ms`);
      setProcessedData(result.data);
      
      toast({
        title: "Data Processed Successfully",
        description: `Your data has been processed with census integration using ${result.processingMethod} processing.`
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
      setProcessingProgress(null);
    }
  };

  return {
    voterFile,
    geoFile,
    processedData,
    isLoading,
    error,
    censusLocation,
    processingProgress,
    uploadProgress,
    uploadVoterData,
    uploadGeoData,
    processData,
    processDataWithCensus,
    setCensusLocationData,
    resetData
  };
}
