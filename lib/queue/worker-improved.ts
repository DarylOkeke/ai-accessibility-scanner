import dotenv from 'dotenv';
import { Worker, Job } from 'bullmq';
import { JSDOM } from 'jsdom';
import * as axeCore from 'axe-core';
import { ScanJobData, ScanJobResult } from './scanQueue';

console.log('🚀 Worker starting - Loading environment and dependencies...');

// Load environment variables explicitly
dotenv.config({ path: '.env.local' });

// Upstash Redis connection configuration
const redisConnection = {
  url: process.env.UPSTASH_REDIS_URL,
  // BullMQ will automatically detect TLS from the rediss:// scheme
};

console.log('📡 Redis connection configured, URL:', process.env.UPSTASH_REDIS_URL ? 'Set' : 'Missing');

// Lazy-load OpenAI to avoid initialization errors
let generateFixes: ((violations: any[]) => Promise<string>) | null = null;

async function loadOpenAI() {
  if (!generateFixes) {
    try {
      const openai = await import('../openai');
      generateFixes = openai.generateFixes;
    } catch (error) {
      console.warn('OpenAI module failed to load:', error);
      generateFixes = async (violations: any[]) => {
        return "**⚠️ AI Service Unavailable**\n\nAI-powered fixes are temporarily unavailable. Please refer to the help links in the violations table for guidance on fixing these accessibility issues.";
      };
    }
  }
  return generateFixes;
}

// Create timeout helper function
function createTimeoutPromise(ms: number, jobId: string | undefined): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Job ${jobId} timed out after ${ms}ms`));
    }, ms);
  });
}

// Create the worker function that processes scan jobs
async function processScanJob(job: Job<ScanJobData>): Promise<ScanJobResult> {
  const { url, includeAIFixes, clientIP } = job.data;
  
  console.log(`🔄 Job ${job.id} STARTED - Processing scan for URL: ${url}, clientIP: ${clientIP}, includeAI: ${includeAIFixes}`);
  
  try {
    // Wrap the entire job processing in a timeout
    const jobTimeout = 120000; // 2 minutes total timeout
    const scanPromise = processScansWithTimeout(job, url, includeAIFixes);
    const timeoutPromise = createTimeoutPromise(jobTimeout, job.id);
    
    const result = await Promise.race([scanPromise, timeoutPromise]);
    
    console.log(`✅ Job ${job.id} COMPLETED successfully for URL: ${url}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Job ${job.id} FAILED with error:`, error);
    // Ensure we properly throw the error so BullMQ knows the job failed
    throw new Error(`Failed to scan URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Separate function for the actual scan processing with timeout handling
async function processScansWithTimeout(job: Job<ScanJobData>, url: string, includeAIFixes: boolean): Promise<ScanJobResult> {
  try {
    // Update job progress
    await job.updateProgress(10);
    console.log(`📊 Job ${job.id}: Updated progress to 10% - Starting fetch`);
    
    // 1. Fetch the page HTML using built-in fetch
    await job.updateProgress(20);
    console.log(`🌐 Job ${job.id}: Fetching HTML from ${url}`);
    
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
    console.log(`📄 Job ${job.id}: Fetched HTML length: ${html.length} characters`);

    // 2. Create a JSDOM window for axe-core
    await job.updateProgress(40);
    console.log(`🏗️ Job ${job.id}: Creating JSDOM environment`);
    
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
      console.log(`🔍 Job ${job.id}: Running axe-core accessibility scan...`);
      
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
      
      console.log(`📋 Job ${job.id}: Found ${results.violations.length} accessibility violations`);
      
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
      console.log(`🔄 Job ${job.id}: Restored global environment`);
    }

    // 6. Generate AI-powered fixes if requested and violations exist
    await job.updateProgress(80);
    let aiFixes = null;
    if (includeAIFixes && formattedViolations.length > 0) {
      try {
        console.log(`🤖 Job ${job.id}: Generating AI-powered fixes for ${formattedViolations.length} violations...`);
        const generateFixesFunc = await loadOpenAI();
        aiFixes = await generateFixesFunc(formattedViolations);
        console.log(`✨ Job ${job.id}: AI fixes generated successfully`);
      } catch (error) {
        console.error(`⚠️ Job ${job.id}: Error generating AI fixes:`, error);
        aiFixes = "**⚠️ AI Service Temporarily Unavailable**\n\nAI-powered fixes are temporarily unavailable due to a service error. Please refer to the help links in the violations table above for guidance on fixing these accessibility issues.";
      }
    } else if (includeAIFixes) {
      console.log(`ℹ️ Job ${job.id}: No violations found, skipping AI fixes`);
    } else {
      console.log(`ℹ️ Job ${job.id}: AI fixes disabled for this request`);
    }
    
    // 7. Prepare the final result
    await job.updateProgress(100);
    console.log(`📊 Job ${job.id}: Updated progress to 100% - Preparing final result`);
    
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
    
    console.log(`🎯 Job ${job.id}: Scan processing completed successfully`);
    return result;
    
  } catch (error) {
    console.error(`💥 Job ${job.id}: Scan processing error:`, error);
    throw error; // Re-throw to be caught by the main processor
  }
}

// Test Redis connection before starting worker
async function testRedisConnection() {
  console.log('🔗 Testing Redis connection...');
  try {
    // Create a temporary ioredis connection to test connectivity
    const Redis = (await import('ioredis')).default;
    const testRedis = new Redis(process.env.UPSTASH_REDIS_URL!);
    
    await testRedis.ping();
    await testRedis.disconnect();
    
    console.log('✅ Upstash Redis connection successful');
    return true;
  } catch (error) {
    console.error('❌ Upstash Redis connection failed:', error);
    console.log('Please check your UPSTASH_REDIS_URL environment variable');
    return false;
  }
}

// Initialize worker
async function initializeWorker() {
  console.log('🚀 Starting Clynzer accessibility scan worker...');
  
  // Test Redis connection
  console.log('🔍 Testing Redis connection before starting worker...');
  const redisConnected = await testRedisConnection();
  if (!redisConnected) {
    console.error('❌ Cannot start worker without Redis connection');
    process.exit(1);
  }
  
  console.log('⚙️ Creating BullMQ worker instance...');
  
  // Create and export the worker
  const scanWorker = new Worker<ScanJobData, ScanJobResult>(
    'accessibility-scan',
    processScanJob,
    {
      connection: redisConnection,
      concurrency: 2, // Process up to 2 jobs concurrently
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  console.log('📊 Setting up worker event handlers...');

  // Enhanced worker event handlers with detailed logging
  scanWorker.on('completed', (job, result) => {
    console.log(`✅ WORKER EVENT - Job ${job.id} completed successfully`);
    console.log(`📈 Job ${job.id} results: ${result.violations.length} violations found for URL: ${job.data.url}`);
  });

  scanWorker.on('failed', (job, err) => {
    console.error(`❌ WORKER EVENT - Job ${job?.id} failed with error:`, err.message);
    console.error(`💥 Job ${job?.id} failure details:`, {
      url: job?.data?.url,
      error: err.message,
      stack: err.stack?.substring(0, 200) + '...'
    });
  });

  scanWorker.on('error', (err) => {
    console.error('🚨 WORKER ERROR:', err.message);
    console.error('📍 Worker error details:', err);
  });

  scanWorker.on('active', (job) => {
    console.log(`🏃 WORKER EVENT - Job ${job.id} became active (started processing)`);
  });

  scanWorker.on('stalled', (jobId) => {
    console.warn(`⏰ WORKER EVENT - Job ${jobId} stalled (took too long)`);
  });

  scanWorker.on('ready', () => {
    console.log('🎯 WORKER EVENT - Worker is ready and waiting for jobs');
  });

  // Enhanced graceful shutdown with better cleanup
  process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT - Shutting down scan worker gracefully...');
    try {
      console.log('⏳ Closing worker and waiting for active jobs to complete...');
      await scanWorker.close();
      console.log('✅ Worker closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during worker shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM - Shutting down scan worker gracefully...');
    try {
      await scanWorker.close();
      console.log('✅ Worker closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during worker shutdown:', error);
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  console.log('🎯 Worker initialized successfully, waiting for jobs...');
  console.log('📋 Worker configuration:');
  console.log(`   - Queue name: accessibility-scan`);
  console.log(`   - Concurrency: 2 jobs`);
  console.log(`   - Redis URL: ${process.env.UPSTASH_REDIS_URL ? 'Connected' : 'Missing'}`);
  console.log('🚀 Worker is now ready to process accessibility scan jobs!');
}

// Start the worker with enhanced error handling
console.log('🎬 Initializing worker startup sequence...');

initializeWorker().catch((error) => {
  console.error('💥 FATAL: Failed to initialize worker:', error);
  console.error('📍 Startup error details:', {
    message: error.message,
    stack: error.stack,
    env: {
      UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL ? 'Set' : 'Missing',
      NODE_ENV: process.env.NODE_ENV
    }
  });
  process.exit(1);
});

console.log('📱 Worker startup sequence completed successfully');
