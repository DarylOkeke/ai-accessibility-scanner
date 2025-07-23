import { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';
import * as axeCore from 'axe-core';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing URL in request body' });
  }

  try {
    console.log('Scanning URL:', url);
    
    // 1. Fetch the page HTML using built-in fetch
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    
    const html = await resp.text();
    console.log('Fetched HTML length:', html.length);

    // 2. Create a JSDOM window for axe-core
    const dom = new JSDOM(html, { 
      url: url,
      pretendToBeVisual: true,
      resources: "usable"
    });
    
    const { window } = dom;
    
    // 3. Setup global variables for axe-core
    const originalWindow = global.window;
    const originalDocument = global.document;
    
    try {
      // Set up a complete browser-like environment
      global.window = window as any;
      global.document = window.document;
      
      // Configure axe-core for the JSDOM environment
      axeCore.configure({
        branding: {
          brand: "AI Accessibility Scanner"
        }
      });
      
      // 4. Run axe-core accessibility scan
      console.log('Running axe-core scan...');
      
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
      
      console.log('Found violations:', results.violations.length);
      
      // 5. Return the violations with better formatting
      const formattedViolations = results.violations.map((violation: any) => ({
        id: violation.id,
        impact: violation.impact || 'unknown',
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.length
      }));
      
      return res.status(200).json({ 
        violations: formattedViolations,
        url: url,
        timestamp: new Date().toISOString(),
        summary: {
          total: formattedViolations.length,
          critical: formattedViolations.filter((v: any) => v.impact === 'critical').length,
          serious: formattedViolations.filter((v: any) => v.impact === 'serious').length,
          moderate: formattedViolations.filter((v: any) => v.impact === 'moderate').length,
          minor: formattedViolations.filter((v: any) => v.impact === 'minor').length
        }
      });
      
    } finally {
      // Restore global variables
      global.window = originalWindow;
      global.document = originalDocument;
    }
    
  } catch (err: any) {
    console.error('Scan error:', err);
    return res.status(500).json({ 
      error: 'Failed to scan URL', 
      details: err.message,
      url: url
    });
  }
}
