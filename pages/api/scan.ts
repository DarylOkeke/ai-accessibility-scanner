import { NextApiRequest, NextApiResponse } from 'next';
import { addScanJob, ScanJobData } from '../../lib/queue/scanQueue';

// In-memory rate limiting storage
const rateLimitMap = new Map<string, number>();

// Helper function to get client IP
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim()
    : req.socket.remoteAddress || '127.0.0.1';
  return ip;
}

// Rate limiting middleware (1 request per IP per minute)
function checkRateLimit(req: NextApiRequest): boolean {
  const clientIP = getClientIP(req);
  const now = Date.now();
  const lastRequest = rateLimitMap.get(clientIP);
  
  // If no previous request or more than 60 seconds have passed
  if (!lastRequest || now - lastRequest >= 60000) {
    rateLimitMap.set(clientIP, now);
    return true; // Allow request
  }
  
  return false; // Rate limit exceeded
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Skip authentication for debugging
  // const { userId } = getAuth(req);
  // if (!userId) {
  //   return res.status(401).json({ error: 'Unauthorized. Please sign in to scan websites.' });
  // }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check rate limiting (1 request per IP per minute)
  if (!checkRateLimit(req)) {
    return res.status(429).json({ 
      error: 'Too many scan requests—please wait a minute.' 
    });
  }

  const { url, includeAIFixes = true } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing URL in request body' });
  }

  try {
    console.log('Enqueuing scan job for URL:', url);
    
    // Create the job data
    const jobData: ScanJobData = {
      url,
      includeAIFixes: includeAIFixes !== false, // Default to true
      clientIP: getClientIP(req),
      timestamp: new Date().toISOString()
    };
    
    // Add the job to the queue
    const jobId = await addScanJob(jobData);
    
    // Return the job ID immediately
    return res.status(202).json({ 
      message: 'Scan job started successfully',
      jobId: jobId,
      statusUrl: `/api/scan/status?jobId=${jobId}`,
      url: url
    });
    
  } catch (err: any) {
    console.error('Failed to enqueue scan job:', err);
    return res.status(500).json({ 
      error: 'Failed to start scan job', 
      details: err.message,
      url: url
    });
  }
}
