import { NextApiRequest, NextApiResponse } from 'next';
import { getJob, JobStatus } from '../../../lib/queue/scanQueue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId } = req.query;
    
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get the job status
    const jobStatus = await getJob(jobId);
    
    if (!jobStatus) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Return appropriate response based on job status
    if (jobStatus.status === JobStatus.COMPLETED) {
      return res.status(200).json({
        status: jobStatus.status,
        progress: 100,
        result: jobStatus.result
      });
    } else if (jobStatus.status === JobStatus.FAILED) {
      return res.status(200).json({
        status: jobStatus.status,
        progress: 0,
        error: jobStatus.error
      });
    } else {
      // Job is still pending or active
      return res.status(200).json({
        status: jobStatus.status,
        progress: jobStatus.progress || 0
      });
    }

  } catch (error) {
    console.error('Error checking job status:', error);
    return res.status(500).json({
      error: 'Failed to check job status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
