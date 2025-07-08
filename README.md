# Voter Data Dashboard

A data visualization tool for voter demographics and election data.

## Features

- Upload and process voter data files
- Interactive geographic map visualization
- Demographic breakdowns by precinct
- Racial diversity visualization
- Party affiliation analysis
- Voter turnout statistics

## Local Development

To run the application locally:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at http://localhost:5000.

## Deploying to Netlify

This application is configured for easy deployment to Netlify.

### Option 1: Deploy via Netlify UI

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to your Netlify account
3. Click "New site from Git"
4. Select your repository
5. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist/public`
6. Click "Deploy site"

### Option 2: Deploy via Netlify CLI

1. Install the Netlify CLI globally (if not already installed):

   ```bash
   npm install -g netlify-cli
   ```

2. Log in to your Netlify account:

   ```bash
   netlify login
   ```

3. Initialize your site:

   ```bash
   netlify init
   ```

4. Deploy your site:
   ```bash
   netlify deploy --prod
   ```

### Testing Netlify Functions Locally

To test the Netlify Functions locally:

```bash
npm run netlify:dev
```

This will start the Netlify dev server, which will serve both the client and the serverless functions.

## Environment Variables

No environment variables are required for basic functionality. The application uses in-memory storage for data processing.

## File Structure

- `/client` - React frontend application
- `/server` - Express server for development
- `/netlify/functions` - Serverless functions for Netlify deployment
- `/shared` - Shared types and schemas

## Data Format

The application expects two JSON files:

1. **Voter Data**: An array of voter records with fields like Precinct, Party, Race, Age, etc.
2. **GeoJSON**: A GeoJSON file with precinct boundaries

## License

MIT

## Troubleshooting

### File Upload Issues

If you encounter issues when uploading files to the deployed application, try the following:

1. **Check File Size**: Ensure your JSON files are not too large. If they are, consider reducing their size by:

   - Removing unnecessary fields
   - Filtering the data to include only what's needed
   - Splitting large files into smaller chunks

2. **File Format**: Ensure your files are valid JSON and GeoJSON format. You can validate them using tools like [JSONLint](https://jsonlint.com/).

3. **Browser Console**: Check the browser console for error messages that might provide more details about the issue.

4. **Network Tab**: In your browser's developer tools, check the Network tab to see the response from the server when uploading files.

### Data Validation

Before processing large files, you can use the validation endpoint to check if your data is in the correct format:

```javascript
// Example using the dataValidator utility
import { validateData } from "./lib/dataValidator";

// Parse your JSON files
const voterData = JSON.parse(voterFileContent);
const geoData = JSON.parse(geoFileContent);

// Validate the data
const validationResult = await validateData(voterData, geoData);

if (validationResult.isValid) {
  console.log("Data is valid!");
} else {
  console.error("Data validation failed:", validationResult.issues);
  console.log("Recommendations:", validationResult.recommendations);
}
```

### Common Errors

1. **"400 Bad Request" or "Something went wrong"**: This usually means there's an issue with your data format. Use the validation endpoint to check your data format. Common issues include:

   - Missing Precinct field in voter data
   - Invalid GeoJSON format
   - Missing features array in GeoJSON
   - Empty data arrays

2. **"Request Entity Too Large"**: This means your file is too large for the server to process. Try reducing the file size by:

   - Removing unnecessary fields from voter records
   - Simplifying GeoJSON geometries
   - Splitting the data into smaller chunks

3. **"Invalid JSON Format"**: Check your JSON files for syntax errors using a tool like [JSONLint](https://jsonlint.com/).

4. **"Processing Timed Out"**: The server took too long to process your data. Try with a smaller dataset or optimize your data by removing unnecessary fields.

5. **CORS Errors**: If you see CORS-related errors, it might be an issue with the server configuration. Contact the administrator.

### Debugging Tips

1. **Check the Browser Console**: Open your browser's developer tools (F12) and check the Console tab for error messages.

2. **Inspect Network Requests**: In the Network tab of developer tools, look for failed requests and check their response bodies for error details.

3. **Validate Your Data**: Use the `/api/validate-data` endpoint to check if your data is in the correct format before processing.

4. **Try the Test Endpoint**: Use the `/api/test` endpoint to verify that the serverless functions are working correctly.

### Local Development

If the application works locally but not when deployed, it might be due to:

1. **Environment Differences**: The production environment might have different limitations than your local environment.

2. **Memory Limits**: Netlify Functions have memory limits that might be lower than your local machine.

3. **Timeout Settings**: Netlify Functions have a default timeout of 10 seconds, which might be too short for processing large files.

If you continue to experience issues, please open an issue on the repository with details about the problem, including any error messages and the size of your data files.
