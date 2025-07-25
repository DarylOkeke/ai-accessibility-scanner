# Scheduled Scans & Email Alerts

This document explains the automated weekly accessibility scanning and email reporting system.

## Overview

The scheduled scanning system automatically:
- Runs every Monday at 09:00 UTC via GitHub Actions
- Scans all configured user URLs for accessibility issues
- Generates PDF reports with AI-powered fix recommendations
- Emails users their weekly accessibility reports
- Logs all activities for monitoring and debugging

## System Architecture

### 1. GitHub Actions Workflow (`.github/workflows/schedule-scans.yml`)
- **Trigger**: Cron schedule `0 9 * * 1` (every Monday at 9 AM UTC)
- **Environment**: Ubuntu latest with Node.js 18
- **Process**: Installs dependencies and runs `npm run scan:all`

### 2. API Endpoints

#### `/api/users/scan-list`
- **Method**: GET
- **Auth**: Requires `SCHEDULED_SCAN_API_KEY` in Authorization header
- **Purpose**: Returns list of users configured for scheduled scans
- **Response**: User emails, URLs, and preferences

#### `/api/email/send-report` 
- **Method**: POST
- **Auth**: Requires `SCHEDULED_SCAN_API_KEY` in Authorization header
- **Purpose**: Sends accessibility report via email with PDF attachment
- **Dependencies**: SendGrid for email delivery

### 3. Scheduled Scanning Script (`scripts/scheduled-scans.js`)
- **Entry Point**: `npm run scan:all`
- **Process Flow**:
  1. Fetch user scan configurations
  2. For each user and URL:
     - Run accessibility scan via `/api/scan`
     - Generate PDF report via `/api/report`
     - Send email with report attachment
  3. Log all results and upload artifacts

## Required Environment Variables

### GitHub Secrets (for Actions)
```bash
# Application
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# OpenAI (for AI-powered fixes)
OPENAI_API_KEY=sk-...

# SendGrid (for email delivery)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=reports@your-domain.com

# Clerk (for user management)
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# Internal API Security
SCHEDULED_SCAN_API_KEY=your-secure-random-key
```

### Local Development
Add to `.env.local`:
```bash
SCHEDULED_SCAN_API_KEY=your-secure-random-key
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=reports@your-domain.com
```

## Email Template Features

The automated emails include:
- **Professional Design**: Branded Clynzer template with gradients
- **Scan Summary**: Total issues, critical/serious counts
- **Status Indicators**: Visual feedback (red for issues, green for clean)
- **PDF Attachment**: Detailed accessibility report
- **Action Items**: Clear next steps for users
- **Dashboard Link**: Direct link to manage preferences

## Testing the System

### 1. Test User Scan List API
```bash
curl -H "Authorization: Bearer your-api-key" \
     http://localhost:3000/api/users/scan-list
```

### 2. Test Email Sending
```bash
curl -X POST \
     -H "Authorization: Bearer your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","userName":"Test User","scanResults":{"violations":[],"summary":{"critical":0,"serious":0}},"pdfBuffer":"base64-pdf-data","url":"example.com"}' \
     http://localhost:3000/api/email/send-report
```

### 3. Run Full Scheduled Scan Locally
```bash
npm run scan:all
```

### 4. Trigger GitHub Action Manually
- Go to Actions tab in your GitHub repository
- Select "Scheduled Accessibility Scans" workflow
- Click "Run workflow" button

## Monitoring & Logs

### GitHub Actions Artifacts
- **Scan Logs**: Detailed execution logs for each run
- **Results JSON**: Machine-readable summary of all scan results
- **Retention**: Logs kept for 30 days

### Log Locations
- **GitHub Actions**: Available in Actions tab under each workflow run
- **Local Testing**: `logs/scan-YYYY-MM-DD.log`
- **Results Summary**: `logs/scan-results.json`

### Key Metrics Tracked
- Total users processed
- Successful vs failed scans
- Emails sent successfully
- Execution duration
- Error details and stack traces

## Customization Options

### Scan Frequency
Modify the cron schedule in `.github/workflows/schedule-scans.yml`:
```yaml
# Daily at 9 AM UTC
- cron: '0 9 * * *'

# Twice weekly (Monday and Thursday)
- cron: '0 9 * * 1,4'

# Monthly (first Monday of each month)
- cron: '0 9 1-7 * 1'
```

### Email Template
Customize the email content in `pages/api/email/send-report.ts`:
- Update HTML template
- Modify subject line format
- Add custom branding elements
- Include additional scan metrics

### User Configuration
Extend the user scan list API to include:
- Custom scan schedules per user
- URL-specific preferences
- Priority levels for different sites
- Custom email templates per user tier

## Production Considerations

### Rate Limiting
- 2-second delay between scans to avoid overwhelming target sites
- Consider implementing exponential backoff for failed requests

### Scalability
- Current implementation supports ~100 users
- For larger scale, consider:
  - Parallel processing with job queues
  - Database storage for user configurations
  - Separate worker processes for email sending

### Error Handling
- Individual scan failures don't stop the entire process
- Comprehensive error logging for debugging
- Email delivery failures are logged but don't fail the workflow

### Security
- API key authentication for all internal endpoints
- No sensitive data logged in GitHub Actions
- PDF reports generated server-side only

## Troubleshooting

### Common Issues

#### "SCHEDULED_SCAN_API_KEY required"
- Ensure the environment variable is set in GitHub Secrets
- Verify the API key matches between workflow and API endpoints

#### "Failed to fetch user scan list"
- Check Clerk configuration and credentials
- Verify the `/api/users/scan-list` endpoint is accessible

#### "SendGrid delivery failed"
- Validate SendGrid API key and from email address
- Check SendGrid account status and sending limits
- Verify recipient email addresses are valid

#### "PDF generation failed"
- Ensure pdf-lib package is installed
- Check memory limits for large reports
- Verify scan results data structure

### Debug Mode
Enable detailed logging by adding to environment:
```bash
DEBUG=scheduled-scans:*
```

### Manual Intervention
If automated scans fail, you can:
1. Check GitHub Actions logs for error details
2. Run the script locally with debugging enabled
3. Test individual API endpoints separately
4. Review user configuration data

## Future Enhancements

### Planned Features
- **Dashboard Integration**: User-configurable scan schedules
- **Webhook Support**: Real-time notifications for scan completion
- **Trend Analysis**: Historical accessibility score tracking
- **Team Management**: Organization-level reporting and management
- **API Rate Optimization**: Smart scheduling based on site response times
- **Custom Report Templates**: User-defined report formats and branding
