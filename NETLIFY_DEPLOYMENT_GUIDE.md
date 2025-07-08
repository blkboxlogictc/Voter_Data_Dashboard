# Netlify Deployment Guide - Large File Upload Solutions

This guide explains the solutions implemented to handle large JSON file uploads on Netlify, overcoming the platform's form submission limitations.

## The Problem

Netlify has several limitations that can cause issues with large file uploads:

1. **Function payload limits**: 6MB for synchronous functions, 10MB for background functions
2. **Form submission limits**: Traditional form submissions are limited to smaller sizes
3. **Function execution time limits**: 10 seconds for synchronous, 15 minutes for background functions

## Solutions Implemented

### 1. Chunked File Upload System

**Files:**

- `netlify/functions/upload-chunk.ts` - Handles chunked file uploads
- `client/src/lib/chunkedUpload.ts` - Client-side chunking utility

**How it works:**

- Large files are split into 1MB chunks on the client
- Each chunk is uploaded separately to the `upload-chunk` function
- The function reconstructs the complete file when all chunks are received
- Supports progress tracking for better user experience

### 2. Background Processing

**Files:**

- `netlify/functions/process-data-background.ts` - Extended processing with 15-minute timeout
- `netlify/functions/process-data.ts` - Original synchronous processing (for smaller files)

**How it works:**

- Background functions have higher payload limits (10MB vs 6MB)
- Extended execution time (15 minutes vs 10 seconds)
- Better suited for complex data processing operations

### 3. Smart Data Processor

**Files:**

- `client/src/lib/smartDataProcessor.ts` - Intelligent processing strategy selection

**How it works:**

- Automatically analyzes data size and chooses the best processing method:
  - **< 5MB**: Synchronous processing (fastest)
  - **5MB - 50MB**: Background processing (reliable)
  - **> 50MB**: Chunked upload + background processing (handles very large files)

### 4. Enhanced User Experience

**Files:**

- `client/src/hooks/useVoterData.ts` - Updated to use smart processing
- `client/src/components/FileUpload.tsx` - Added progress indicators

**Features:**

- Real-time progress tracking during upload and processing
- Automatic method selection based on file size
- Clear status messages and error handling
- Loading states and progress bars

## Configuration

### Netlify Configuration (`netlify.toml`)

```toml
[functions]
  node_bundler = "esbuild"
  external_node_modules = ["@shared/schema"]

[functions.process-data]
  included_files = ["shared/schema.ts"]

[functions.process-data-background]
  included_files = ["shared/schema.ts"]

[functions.upload-chunk]
  included_files = ["shared/schema.ts"]
```

### Environment Variables

No additional environment variables are required for the chunked upload system.

## Usage Examples

### Basic File Processing

```typescript
import { processVoterData } from "@/lib/smartDataProcessor";

const result = await processVoterData(
  voterData,
  geoData,
  undefined, // No census location
  {
    onProgress: (progress, stage) => {
      console.log(`${stage}: ${progress}%`);
    },
  }
);
```

### With Census Integration

```typescript
const result = await processVoterData(
  voterData,
  geoData,
  {
    state: "06",
    county: "075",
    stateName: "California",
    countyName: "San Francisco",
  },
  {
    onProgress: (progress, stage) => {
      setProcessingProgress({ progress, stage });
    },
  }
);
```

### Manual Chunked Upload

```typescript
import { uploadLargeFile } from "@/lib/chunkedUpload";

const result = await uploadLargeFile(file, {
  chunkSize: 1024 * 1024, // 1MB chunks
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress}%`);
  },
});
```

## File Size Limits

| Processing Method    | File Size Limit      | Execution Time | Best For                            |
| -------------------- | -------------------- | -------------- | ----------------------------------- |
| Synchronous          | < 5MB                | 10 seconds     | Small datasets, quick processing    |
| Background           | < 50MB               | 15 minutes     | Medium datasets, complex processing |
| Chunked + Background | No practical limit\* | 15 minutes     | Very large datasets                 |

\*Limited by available memory and processing time

## Deployment Steps

1. **Deploy to Netlify:**

   ```bash
   npm run build
   # Deploy the dist/public folder to Netlify
   ```

2. **Verify Functions:**

   - Check that all three functions are deployed:
     - `/.netlify/functions/process-data`
     - `/.netlify/functions/process-data-background`
     - `/.netlify/functions/upload-chunk`

3. **Test with Different File Sizes:**
   - Small file (< 5MB): Should use synchronous processing
   - Medium file (5-50MB): Should use background processing
   - Large file (> 50MB): Should use chunked upload

## Monitoring and Debugging

### Function Logs

Monitor function execution in the Netlify dashboard:

- Go to Functions tab in your site dashboard
- Click on individual functions to see logs
- Look for processing method selection and timing information

### Client-Side Debugging

The smart processor logs which method it selects:

```javascript
console.log(
  `Processing completed using ${result.processingMethod} method in ${result.processingTime}ms`
);
```

### Error Handling

Common errors and solutions:

1. **"Request timed out"**: File too large for selected method

   - Solution: Increase chunk size or use background processing

2. **"Function payload too large"**: Synchronous function hit 6MB limit

   - Solution: Smart processor should automatically use background processing

3. **"Invalid JSON format"**: File corruption during chunked upload
   - Solution: Verify chunk reconstruction logic

## Performance Optimization

### Client-Side Optimizations

1. **Chunk Size Tuning:**

   ```typescript
   const uploader = new ChunkedUploader({
     chunkSize: 2 * 1024 * 1024, // 2MB chunks for faster upload
   });
   ```

2. **Data Preprocessing:**
   ```typescript
   // Remove unnecessary fields before upload
   const optimizedData = voterData.map((record) => ({
     id: record.id,
     district: record.district,
     // Only include essential fields
   }));
   ```

### Server-Side Optimizations

1. **Memory Management:**

   - Process data in streams when possible
   - Clear large objects after processing
   - Use efficient data structures

2. **Caching:**
   - Cache processed results for repeated requests
   - Use CDN for static assets

## Security Considerations

1. **Input Validation:**

   - All uploaded data is validated using Zod schemas
   - File size limits prevent abuse
   - JSON parsing errors are handled gracefully

2. **CORS Configuration:**

   - Proper CORS headers are set for all functions
   - Origin restrictions can be added for production

3. **Rate Limiting:**
   - Consider implementing rate limiting for upload endpoints
   - Monitor function usage to prevent abuse

## Troubleshooting

### Common Issues

1. **Chunks not reassembling correctly:**

   - Check chunk order and indexing
   - Verify all chunks are received before reconstruction

2. **Background function timeout:**

   - Optimize data processing algorithms
   - Consider breaking large operations into smaller steps

3. **Memory issues:**
   - Monitor function memory usage
   - Implement streaming for very large files

### Debug Mode

Enable debug logging by setting environment variable:

```bash
NODE_ENV=development
```

This will include stack traces in error responses.

## Future Enhancements

1. **Persistent Storage:**

   - Use external storage (S3, etc.) for very large files
   - Implement file cleanup after processing

2. **Real-time Processing:**

   - WebSocket connections for live progress updates
   - Streaming data processing

3. **Advanced Chunking:**
   - Parallel chunk uploads
   - Resume interrupted uploads
   - Compression before chunking

## Support

For issues related to this implementation:

1. Check function logs in Netlify dashboard
2. Verify file sizes and processing methods
3. Test with smaller files to isolate issues
4. Review client-side console logs for detailed error information
