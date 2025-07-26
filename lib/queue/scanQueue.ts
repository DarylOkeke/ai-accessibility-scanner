import { Queue, Worker, Job } from 'bullmq';

// Upstash Redis connection configuration
const redisConnection = {
  url: process.env.UPSTASH_REDIS_URL,
  // BullMQ will automatically detect TLS from the rediss:// scheme
};

// Define job data interface
export interface ScanJobData {
  url: string;
  includeAIFixes: boolean;
  clientIP: string;
  timestamp: string;
}

// Define job result interface
export interface ScanJobResult {
  violations: any[];
  url: string;
  timestamp: string;
  aiFixes: string | null;
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

// Create the scan queue
export const scanQueue = new Queue<ScanJobData, ScanJobResult>('accessibility-scan', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,           // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job status enum for type safety
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

// Helper function to get job status
export async function getJobStatus(jobId: string) {
  try {
    const job = await Job.fromId(scanQueue, jobId);
    
    if (!job) {
      return { status: 'not_found', error: 'Job not found' };
    }

    const state = await job.getState();
    
    switch (state) {
      case 'completed':
        return {
          status: JobStatus.COMPLETED,
          result: job.returnvalue,
          progress: 100,
        };
      case 'failed':
        return {
          status: JobStatus.FAILED,
          error: job.failedReason,
          progress: 0,
        };
      case 'active':
        return {
          status: JobStatus.ACTIVE,
          progress: job.progress || 0,
        };
      case 'waiting':
        return {
          status: JobStatus.WAITING,
          progress: 0,
        };
      case 'delayed':
        return {
          status: JobStatus.DELAYED,
          progress: 0,
        };
      default:
        return {
          status: JobStatus.WAITING, // Default to waiting for unknown states
          progress: 0,
        };
    }
  } catch (error) {
    console.error('Error getting job status:', error);
    return {
      status: 'error',
      error: 'Failed to get job status',
    };
  }
}

// Helper function to add a scan job
export async function addScanJob(data: ScanJobData): Promise<string> {
  const job = await scanQueue.add('scan-accessibility', data, {
    // Job-specific options
    delay: 0,
    priority: 1,
  });
  
  return job.id!;
}

// Helper function to get job details
export async function getJob(jobId: string) {
  try {
    const job = await Job.fromId(scanQueue, jobId);
    if (!job) return null;
    
    const state = await job.getState();
    const progress = job.progress || 0;
    
    return {
      id: jobId,
      status: mapBullStateToJobStatus(state),
      progress: typeof progress === 'number' ? progress : 0,
      result: job.returnvalue as ScanJobResult | undefined,
      error: job.failedReason
    };
  } catch (error) {
    console.error(`Error getting job ${jobId}:`, error);
    return null;
  }
}

// Helper function to map BullMQ job states to our JobStatus enum
function mapBullStateToJobStatus(bullState: string): JobStatus {
  switch (bullState) {
    case 'waiting':
      return JobStatus.WAITING;
    case 'delayed':
      return JobStatus.DELAYED;
    case 'active':
      return JobStatus.ACTIVE;
    case 'completed':
      return JobStatus.COMPLETED;
    case 'failed':
      return JobStatus.FAILED;
    case 'paused':
      return JobStatus.PAUSED;
    default:
      return JobStatus.WAITING;
  }
}
