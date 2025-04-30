import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

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
      
      // Process the data
      const processedData = await storage.processVoterData(voterData, geoData);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
