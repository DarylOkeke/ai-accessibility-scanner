import { NextApiRequest, NextApiResponse } from 'next';
import { clerkClient } from '@clerk/nextjs/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verify API key for scheduled operations
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== process.env.SCHEDULED_SCAN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Fetching user scan list for scheduled operations...');
    
    // Get all users from Clerk
    const client = await clerkClient();
    const users = await client.users.getUserList({
      limit: 100, // Adjust based on your needs
    });
    
    // Mock user URLs for now - in production, you'd store these in a database
    // This is a simplified version that returns mock data
    const userScanList = [
      {
        userId: 'user_demo1',
        email: 'demo1@example.com',
        urls: ['https://example.com', 'https://github.com'],
        preferences: {
          emailReports: true,
          scanFrequency: 'weekly',
          includeAIFixes: true
        }
      },
      {
        userId: 'user_demo2', 
        email: 'demo2@example.com',
        urls: ['https://google.com', 'https://microsoft.com'],
        preferences: {
          emailReports: true,
          scanFrequency: 'weekly',
          includeAIFixes: false
        }
      }
    ];

    // In a real application, you would:
    // 1. Query your database for users who have:
    //    - Active subscriptions
    //    - Email notifications enabled
    //    - URLs configured for scanning
    // 2. Filter based on scan frequency preferences
    // 3. Return actual user data and URLs
    
    // For now, return mock data structure
    const result = {
      users: userScanList,
      total: userScanList.length,
      timestamp: new Date().toISOString(),
      nextScheduledScan: getNextMondayAt9AM()
    };

    console.log(`Found ${result.total} users configured for scheduled scans`);
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Error fetching user scan list:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch user scan list',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getNextMondayAt9AM(): string {
  const now = new Date();
  const nextMonday = new Date(now);
  
  // Calculate days until next Monday
  const daysUntilMonday = (8 - now.getDay()) % 7;
  if (daysUntilMonday === 0 && now.getDay() === 1 && now.getHours() >= 9) {
    // If it's Monday after 9 AM, get next Monday
    nextMonday.setDate(now.getDate() + 7);
  } else {
    nextMonday.setDate(now.getDate() + daysUntilMonday);
  }
  
  nextMonday.setHours(9, 0, 0, 0);
  return nextMonday.toISOString();
}
