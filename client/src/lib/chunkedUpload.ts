import { apiRequest } from './queryClient';

interface ChunkUploadOptions {
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    totalSize: number;
  };
}

export class ChunkedUploader {
  private chunkSize: number;
  private onProgress?: (progress: number) => void;

  constructor(options: ChunkUploadOptions = {}) {
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB chunks by default
    this.onProgress = options.onProgress;
  }

  async uploadFile(file: File): Promise<UploadResult> {
    const content = await file.text();
    return this.uploadContent(content, {
      fileName: file.name,
      fileType: file.type,
      totalSize: file.size
    });
  }

  async uploadContent(content: string, metadata: { fileName: string; fileType: string; totalSize: number }): Promise<UploadResult> {
    // Check if we're in development mode or if the content is small enough
    const isDevelopment = !import.meta.env.PROD;
    const isSmallFile = content.length < this.chunkSize;
    
    // In development or for small files, skip chunking and return content directly
    if (isDevelopment || isSmallFile) {
      console.log(isDevelopment ? 'Development mode detected - skipping chunked upload' : 'Small file detected - skipping chunked upload');
      if (this.onProgress) {
        this.onProgress(100);
      }
      return {
        content,
        metadata
      };
    }

    // Only use chunked upload in production for large files
    const uploadId = this.generateUploadId();
    const chunks = this.splitIntoChunks(content);
    const totalChunks = chunks.length;

    let uploadedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const chunkData = {
        uploadId,
        chunkIndex: i,
        totalChunks,
        chunk,
        ...(i === 0 ? { metadata } : {}) // Only send metadata with first chunk
      };

      const response = await apiRequest('POST', '/api/upload-chunk', chunkData);
      
      if (!response.ok) {
        throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}`);
      }

      const result = await response.json();
      uploadedChunks++;

      // Update progress
      if (this.onProgress) {
        this.onProgress((uploadedChunks / totalChunks) * 100);
      }

      // If upload is complete, return the reconstructed content
      if (result.complete) {
        return {
          content: result.content,
          metadata: result.metadata
        };
      }
    }

    throw new Error('Upload completed but no final result received');
  }

  private splitIntoChunks(content: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += this.chunkSize) {
      chunks.push(content.slice(i, i + this.chunkSize));
    }
    return chunks;
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Utility function for easy use
export async function uploadLargeFile(
  file: File, 
  options: ChunkUploadOptions = {}
): Promise<UploadResult> {
  const uploader = new ChunkedUploader(options);
  return uploader.uploadFile(file);
}

export async function uploadLargeContent(
  content: string,
  metadata: { fileName: string; fileType: string; totalSize: number },
  options: ChunkUploadOptions = {}
): Promise<UploadResult> {
  const uploader = new ChunkedUploader(options);
  return uploader.uploadContent(content, metadata);
}