#!/usr/bin/env node

/**
 * Netlify build script
 * This script is run during the Netlify build process to prepare the site for deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log with timestamp
function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
}

// Execute a command and log its output
function execute(command) {
  log(`Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log(`Error executing command: ${error.message}`);
    process.exit(1);
  }
}

// Main build process
async function build() {
  log('Starting build process for Netlify deployment');
  
  // Install dependencies
  log('Installing dependencies...');
  execute('npm install');
  
  // Build the client
  log('Building client...');
  execute('npm run build');
  
  // Ensure the functions directory exists
  const functionsDir = path.join(__dirname, 'functions');
  if (!fs.existsSync(functionsDir)) {
    log('Creating functions directory...');
    fs.mkdirSync(functionsDir, { recursive: true });
  }
  
  log('Build process completed successfully');
}

// Run the build process
build().catch(error => {
  log(`Build failed: ${error.message}`);
  process.exit(1);
});