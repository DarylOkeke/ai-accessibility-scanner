#!/usr/bin/env node

/**
 * Scheduled Accessibility Scanning Script
 * 
 * This script runs on GitHub Actions every Monday at 09:00 UTC
 * It fetches all user URLs, scans them, generates reports, and emails users
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.SCHEDULED_SCAN_API_KEY;
const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

// Logging utility
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  console.log(logEntry);
  if (data) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
  
  // Also write to file for GitHub Actions artifact
  const logFile = path.join(LOG_DIR, `scan-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFile(logFile, logEntry + (data ? '\nData: ' + JSON.stringify(data, null, 2) : '') + '\n')
    .catch(err => console.error('Failed to write log:', err));
}

// HTTP request utility
async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers
    }
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch all users configured for scheduled scans
async function fetchUserScanList() {
  log('info', 'Fetching user scan list...');
  
  try {
    const data = await makeRequest(`${BASE_URL}/api/users/scan-list`);
    log('info', `Found ${data.total} users configured for scheduled scans`);
    return data.users;
  } catch (error) {
    log('error', 'Failed to fetch user scan list', { error: error.message });
    throw error;
  }
}

// Perform accessibility scan for a URL
async function scanUrl(url, includeAIFixes = true) {
  log('info', `Scanning URL: ${url}`);
  
  try {
    const scanData = await makeRequest(`${BASE_URL}/api/scan`, {
      method: 'POST',
      body: JSON.stringify({ 
        url: url,
        includeAIFixes: includeAIFixes 
      })
    });
    
    log('info', `Scan completed for ${url}`, {
      violations: scanData.violations?.length || 0,
      url: url
    });
    
    return scanData;
  } catch (error) {
    log('error', `Failed to scan ${url}`, { error: error.message });
    throw error;
  }
}

// Generate PDF report
async function generateReport(scanResults, url, userId) {
  log('info', `Generating PDF report for ${url}`);
  
  try {
    const reportData = await makeRequest(`${BASE_URL}/api/report`, {
      method: 'POST',
      body: JSON.stringify({
        violations: scanResults.violations,
        fixes: scanResults.aiFixes,
        url: url,
        user: userId
      })
    });
    
    log('info', `PDF report generated for ${url}`);
    return reportData;
  } catch (error) {
    log('error', `Failed to generate report for ${url}`, { error: error.message });
    throw error;
  }
}

// Send email with report
async function sendEmailReport(email, userName, scanResults, pdfBuffer, url) {
  log('info', `Sending email report to ${email} for ${url}`);
  
  try {
    const emailResult = await makeRequest(`${BASE_URL}/api/email/send-report`, {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        userName: userName,
        scanResults: scanResults,
        pdfBuffer: pdfBuffer,
        url: url
      })
    });
    
    log('info', `Email sent successfully to ${email}`, emailResult);
    return emailResult;
  } catch (error) {
    log('error', `Failed to send email to ${email}`, { error: error.message });
    throw error;
  }
}

// Process a single user's scans
async function processUserScans(user) {
  const results = [];
  
  log('info', `Processing scans for user: ${user.email}`);
  
  for (const url of user.urls) {
    try {
      // 1. Scan the URL
      const scanResults = await scanUrl(url, user.preferences.includeAIFixes);
      
      // 2. Generate PDF report
      const reportBuffer = await generateReport(scanResults, url, user.userId);
      
      // 3. Send email if user has email notifications enabled
      if (user.preferences.emailReports) {
        await sendEmailReport(
          user.email,
          user.name || user.email.split('@')[0],
          scanResults,
          reportBuffer,
          url
        );
      }
      
      results.push({
        url: url,
        success: true,
        violations: scanResults.violations?.length || 0,
        emailSent: user.preferences.emailReports
      });
      
      // Add delay between scans to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      log('error', `Failed to process scan for ${url}`, { 
        user: user.email,
        error: error.message 
      });
      
      results.push({
        url: url,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Main execution function
async function main() {
  await ensureLogDir();
  
  log('info', '🚀 Starting scheduled accessibility scans');
  log('info', `Base URL: ${BASE_URL}`);
  
  if (!API_KEY) {
    log('error', 'SCHEDULED_SCAN_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const startTime = new Date();
  const results = {
    startTime: startTime.toISOString(),
    users: [],
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    emailsSent: 0
  };
  
  try {
    // 1. Fetch all users configured for scheduled scans
    const users = await fetchUserScanList();
    
    if (users.length === 0) {
      log('info', 'No users configured for scheduled scans');
      return;
    }
    
    // 2. Process each user's scans
    for (const user of users) {
      try {
        const userResults = await processUserScans(user);
        
        results.users.push({
          email: user.email,
          userId: user.userId,
          scans: userResults
        });
        
        // Update totals
        results.totalScans += userResults.length;
        results.successfulScans += userResults.filter(r => r.success).length;
        results.failedScans += userResults.filter(r => !r.success).length;
        results.emailsSent += userResults.filter(r => r.emailSent).length;
        
      } catch (error) {
        log('error', `Failed to process user: ${user.email}`, { error: error.message });
        
        results.users.push({
          email: user.email,
          userId: user.userId,
          error: error.message,
          scans: []
        });
      }
    }
    
  } catch (error) {
    log('error', 'Failed to complete scheduled scans', { error: error.message });
    results.error = error.message;
  }
  
  // 3. Finalize and save results
  const endTime = new Date();
  results.endTime = endTime.toISOString();
  results.duration = `${Math.round((endTime - startTime) / 1000)}s`;
  
  // Save results to file for GitHub Actions artifact
  const resultsFile = path.join(LOG_DIR, 'scan-results.json');
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
  
  // Print summary
  log('info', '📊 Scheduled scan summary', {
    duration: results.duration,
    totalUsers: results.users.length,
    totalScans: results.totalScans,
    successfulScans: results.successfulScans,
    failedScans: results.failedScans,
    emailsSent: results.emailsSent
  });
  
  log('info', '✅ Scheduled accessibility scans completed');
  
  // Exit with error code if there were failures
  if (results.failedScans > 0 || results.error) {
    process.exit(1);
  }
}

// Execute if running directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
