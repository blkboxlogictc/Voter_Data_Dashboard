/**
 * Client-only file upload solution
 * This bypasses the need for server-side chunking by processing everything in the browser
 */

interface ClientUploadOptions {
  onProgress?: (progress: number) => void;
  maxFileSize?: number; // in MB
}

interface UploadResult {
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    totalSize: number;
  };
}

export class ClientOnlyUploader {
  private onProgress?: (progress: number) => void;
  private maxFileSize: number;

  constructor(options: ClientUploadOptions = {}) {
    this.onProgress = options.onProgress;
    this.maxFileSize = options.maxFileSize || 100; // 100MB default limit
  }

  async uploadFile(file: File): Promise<UploadResult> {
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Check file size limit
    if (fileSizeMB > this.maxFileSize) {
      throw new Error(`File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed size (${this.maxFileSize}MB)`);
    }

    // Update progress
    if (this.onProgress) {
      this.onProgress(10);
    }

    try {
      // Read file content
      const content = await this.readFileContent(file);
      
      // Update progress
      if (this.onProgress) {
        this.onProgress(50);
      }

      // Validate JSON
      try {
        JSON.parse(content);
      } catch (error) {
        throw new Error('Invalid JSON format');
      }

      // Update progress
      if (this.onProgress) {
        this.onProgress(100);
      }

      return {
        content,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          totalSize: file.size
        }
      };
    } catch (error) {
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File reading error'));
      };
      
      reader.onprogress = (event) => {
        if (event.lengthComputable && this.onProgress) {
          const progress = 10 + (event.loaded / event.total) * 40; // 10-50% for reading
          this.onProgress(progress);
        }
      };
      
      reader.readAsText(file);
    });
  }
}

// Utility function for easy use
export async function uploadFileClientOnly(
  file: File, 
  options: ClientUploadOptions = {}
): Promise<UploadResult> {
  const uploader = new ClientOnlyUploader(options);
  return uploader.uploadFile(file);
}