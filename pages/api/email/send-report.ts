import { NextApiRequest, NextApiResponse } from 'next';
import sgMail from '@sendgrid/mail';

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verify API key for scheduled operations
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== process.env.SCHEDULED_SCAN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email, userName, scanResults, pdfBuffer, url } = req.body;

  if (!email || !scanResults || !pdfBuffer || !url) {
    return res.status(400).json({ 
      error: 'Missing required fields: email, scanResults, pdfBuffer, url' 
    });
  }

  try {
    console.log(`Sending accessibility report email to ${email} for ${url}`);

    // Create email content
    const violationsCount = scanResults.violations?.length || 0;
    const criticalIssues = scanResults.summary?.critical || 0;
    const seriousIssues = scanResults.summary?.serious || 0;

    const emailContent = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'reports@clynzer.com',
      subject: `Weekly Accessibility Report - ${url}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Clynzer</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Weekly Accessibility Report</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hello ${userName || 'User'},</h2>
            
            <p>Your weekly accessibility scan for <strong>${url}</strong> has been completed.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="margin-top: 0; color: #333;">Scan Summary</h3>
              <div style="display: flex; justify-content: space-between; margin: 15px 0;">
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: ${violationsCount > 0 ? '#dc3545' : '#28a745'};">
                    ${violationsCount}
                  </div>
                  <div style="color: #666; font-size: 14px;">Total Issues</div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #dc3545;">
                    ${criticalIssues}
                  </div>
                  <div style="color: #666; font-size: 14px;">Critical</div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #fd7e14;">
                    ${seriousIssues}
                  </div>
                  <div style="color: #666; font-size: 14px;">Serious</div>
                </div>
              </div>
            </div>
            
            ${violationsCount > 0 ? `
              <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #856404;">⚠️ Action Required</h4>
                <p style="margin-bottom: 0; color: #856404;">
                  Your website has ${violationsCount} accessibility issue${violationsCount !== 1 ? 's' : ''} that need attention. 
                  Please review the detailed report attached to this email.
                </p>
              </div>
            ` : `
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #155724;">✅ Great Job!</h4>
                <p style="margin-bottom: 0; color: #155724;">
                  No accessibility issues were found in this scan. Keep up the excellent work!
                </p>
              </div>
            `}
            
            <p>The detailed accessibility report is attached as a PDF. You can also view your scan history and manage your preferences in your <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="color: #667eea;">Clynzer dashboard</a>.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #666; font-size: 14px;">
              <p>This is an automated weekly report from Clynzer. To modify your scan schedule or unsubscribe, please visit your dashboard.</p>
              <p>Scanned on: ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          content: pdfBuffer,
          filename: `accessibility-report-${url.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    await sgMail.send(emailContent);
    
    console.log(`✅ Successfully sent accessibility report to ${email}`);
    
    return res.status(200).json({ 
      success: true,
      message: `Email sent successfully to ${email}`,
      url: url,
      violationsCount: violationsCount
    });
    
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
