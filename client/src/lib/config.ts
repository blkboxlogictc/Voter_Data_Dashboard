/**
 * Configuration for the client application
 * This allows us to handle different environments (development, production)
 */

interface Config {
  apiBaseUrl: string;
  censusApiKey?: string;
}

// Default configuration for development
const devConfig: Config = {
  apiBaseUrl: '/api',
  censusApiKey: import.meta.env.VITE_CENSUS_API_KEY || 'f0b106758e077c8e0d3dbd117d83cce29ffe0f11',
};

// Configuration for production (Netlify)
const prodConfig: Config = {
  apiBaseUrl: '/.netlify/functions',
  censusApiKey: import.meta.env.VITE_CENSUS_API_KEY || 'f0b106758e077c8e0d3dbd117d83cce29ffe0f11',
};

// Determine which configuration to use based on the environment
const isProduction = import.meta.env.PROD;
const config: Config = isProduction ? prodConfig : devConfig;

export default config;