import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import censusProxy from "./censusProxy";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to process uploaded files
  app.post('/api/process-data', async (req: Request, res: Response) => {
    try {
      // Validate incoming request body
      const requestSchema = z.object({
        voterData: z.any(),
        geoData: z.any()
      });
      
      const validationResult = requestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: 'Invalid request format',
          errors: validationResult.error.errors
        });
      }
      
      const { voterData, geoData } = req.body;
      
      // Log the incoming data for debugging
      console.log("Received voterData sample:",
        Array.isArray(voterData) && voterData.length > 0
          ? JSON.stringify(voterData[0], null, 2)
          : "No voter data");
      
      // Process the data
      const processedData = await storage.processVoterData(voterData, geoData);
      
      // Log the processed data structure
      console.log("Processed data keys:", Object.keys(processedData));
      console.log("Has precinctDemographics:", !!processedData.precinctDemographics);
      
      return res.status(200).json(processedData);
    } catch (error) {
      console.error('Error processing data:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  });

  // API endpoint to get processed data
  app.get('/api/processed-data', async (req: Request, res: Response) => {
    try {
      const processedData = await storage.getProcessedData();
      
      if (!processedData) {
        return res.status(404).json({
          message: 'No processed data found'
        });
      }
      
      return res.status(200).json(processedData);
    } catch (error) {
      console.error('Error retrieving processed data:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  });

  // API endpoint for chunked uploads (for compatibility with production)
  app.post('/api/upload-chunk', async (req: Request, res: Response) => {
    try {
      // In development, we don't actually need chunked uploads
      // This endpoint exists for compatibility but shouldn't be called
      console.log('Chunked upload endpoint called in development mode');
      
      const { uploadId, chunkIndex, totalChunks, chunk, metadata } = req.body;
      
      // For development, just return the chunk as complete
      return res.status(200).json({
        complete: true,
        uploadId,
        content: chunk,
        metadata: metadata || {}
      });
    } catch (error) {
      console.error('Error in chunked upload:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  });

  // Add census proxy routes
  app.use('/api/census', censusProxy);

  const httpServer = createServer(app);
  return httpServer;
}
