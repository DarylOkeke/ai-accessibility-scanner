import { Worker, Job } from 'bullmq';
import { JSDOM } from 'jsdom';
import * as axeCore from 'axe-core';
import { generateFixes } from '../openai';
import { ScanJobData, ScanJobResult, redis } from './scanQueue';

// Create the worker function that processes scan jobs
async function processScanJob(job: Job<ScanJobData>): Promise<ScanJobResult> {
  const { url, includeAIFixes, clientIP } = job.data;
  
  try {
    // Update job progress
    await job.updateProgress(10);
    console.log(`Processing scan job ${job.id} for URL: ${url}`);
    
    // 1. Fetch the page HTML using built-in fetch
    await job.updateProgress(20);
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    
    const html = await resp.text();
    console.log(`Job ${job.id}: Fetched HTML length: ${html.length}`);

    // 2. Create a JSDOM window for axe-core
    await job.updateProgress(40);
    const dom = new JSDOM(html, { 
      url: url,
      pretendToBeVisual: true,
      resources: "usable"
    });
    
    const { window } = dom;
    
    // 3. Setup global variables for axe-core
    const originalWindow = global.window;
    const originalDocument = global.document;
    
    let formattedViolations: any[] = [];
    
    try {
      // Set up a complete browser-like environment
      global.window = window as any;
      global.document = window.document;
      
      // Configure axe-core for the JSDOM environment
      axeCore.configure({
        branding: {
          brand: "Clynzer"
        }
      });
      
      // 4. Run axe-core accessibility scan
      await job.updateProgress(60);
      console.log(`Job ${job.id}: Running axe-core scan...`);
      
      // Initialize axe-core in the context and then run
      const axeSource = axeCore.source;
      window.eval(axeSource);
      
      // Now run the scan using the window's axe
      const results = await (window as any).axe.run(window.document, {
        reporter: 'v2',
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa']
        }
      });
      
      console.log(`Job ${job.id}: Found ${results.violations.length} violations`);
      
      // 5. Format the violations
      formattedViolations = results.violations.map((violation: any) => ({
        id: violation.id,
        impact: violation.impact || 'unknown',
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.length
      }));
      
    } finally {
      // Restore global variables
      global.window = originalWindow;
      global.document = originalDocument;
    }

    // 6. Generate AI-powered fixes if requested and violations exist
    await job.updateProgress(80);
    let aiFixes = null;
    if (includeAIFixes && formattedViolations.length > 0) {
      try {
        console.log(`Job ${job.id}: Generating AI-powered fixes...`);
        aiFixes = await generateFixes(formattedViolations);
        console.log(`Job ${job.id}: AI fixes generated successfully`);
      } catch (error) {
        console.error(`Job ${job.id}: Error generating AI fixes:`, error);
        
        // Check if it's a quota exceeded error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('exceeded your current quota')) {
          aiFixes = "**⚠️ OpenAI API Quota Exceeded**\n\nThe AI-powered fix recommendations are currently unavailable because the OpenAI API quota has been exceeded. To restore AI functionality:\n\n1. **Add billing/credits** to your OpenAI account at [platform.openai.com/billing](https://platform.openai.com/billing)\n2. **Update your API key** in the `.env.local` file\n3. **Contact support** if you believe this is an error\n\nIn the meantime, please refer to the help links in the violations table above for manual fix guidance.";
        } else {
          aiFixes = "**⚠️ AI Service Temporarily Unavailable**\n\nAI-powered fixes are temporarily unavailable due to a service error. Please refer to the help links in the violations table above for guidance on fixing these accessibility issues.";
        }
      }
    }
    
    // 7. Prepare the final result
    await job.updateProgress(100);
    const result: ScanJobResult = {
      violations: formattedViolations,
      url: url,
      timestamp: new Date().toISOString(),
      aiFixes: aiFixes,
      summary: {
        total: formattedViolations.length,
        critical: formattedViolations.filter((v: any) => v.impact === 'critical').length,
        serious: formattedViolations.filter((v: any) => v.impact === 'serious').length,
        moderate: formattedViolations.filter((v: any) => v.impact === 'moderate').length,
        minor: formattedViolations.filter((v: any) => v.impact === 'minor').length
      }
    };
    
    console.log(`Job ${job.id}: Scan completed successfully`);
    return result;
    
  } catch (error) {
    console.error(`Job ${job.id}: Scan error:`, error);
    throw new Error(`Failed to scan URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create and export the worker
export const scanWorker = new Worker<ScanJobData, ScanJobResult>(
  'accessibility-scan',
  processScanJob,
  {
    connection: redis,
    concurrency: 3, // Process up to 3 jobs concurrently
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

// Worker event handlers
scanWorker.on('completed', (job, result) => {
  console.log(`✅ Scan job ${job.id} completed for URL: ${job.data.url}`);
});

scanWorker.on('failed', (job, err) => {
  console.error(`❌ Scan job ${job?.id} failed:`, err.message);
});

scanWorker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down scan worker...');
  await scanWorker.close();
  await redis.disconnect();
  process.exit(0);
});

console.log('🚀 Scan worker started successfully');
