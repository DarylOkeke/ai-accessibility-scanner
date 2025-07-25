import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface Violation {
  id: string;
  impact: string;
  description: string;
  help?: string;
}

interface ReportData {
  violations: Violation[];
  fixes: string;
  url: string;
  user: {
    firstName?: string;
    username?: string;
    email?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { violations, fixes, url, user }: ReportData = req.body;

    if (!violations || !url) {
      return res.status(400).json({ error: 'Missing required fields: violations and url' });
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard US Letter size
    const { width, height } = page.getSize();

    // Load fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const primaryColor = rgb(0.2, 0.4, 0.8); // Blue
    const darkGray = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.9, 0.9, 0.9);
    const redColor = rgb(0.8, 0.2, 0.2);
    const orangeColor = rgb(0.9, 0.5, 0.1);
    const yellowColor = rgb(0.9, 0.8, 0.1);

    let yPosition = height - 60;

    // Header
    page.drawRectangle({
      x: 0,
      y: yPosition - 10,
      width: width,
      height: 80,
      color: primaryColor,
    });

    page.drawText('Clynzer', {
      x: 50,
      y: yPosition + 30,
      size: 28,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText('Accessibility Compliance Report', {
      x: 50,
      y: yPosition + 5,
      size: 16,
      font: regularFont,
      color: rgb(1, 1, 1),
    });

    yPosition -= 100;

    // Scan details
    page.drawText('Scan Details', {
      x: 50,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: darkGray,
    });

    yPosition -= 25;

    page.drawText(`Website: ${url}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: regularFont,
      color: darkGray,
    });

    yPosition -= 15;

    page.drawText(`Scan Date: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: regularFont,
      color: darkGray,
    });

    yPosition -= 15;

    if (user?.firstName || user?.username) {
      page.drawText(`Scanned by: ${user.firstName || user.username}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: regularFont,
        color: darkGray,
      });
      yPosition -= 15;
    }

    page.drawText(`Total Issues Found: ${violations.length}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: violations.length > 0 ? redColor : rgb(0.2, 0.6, 0.2),
    });

    yPosition -= 40;

    // Summary by impact
    const impactCounts = violations.reduce((acc, violation) => {
      acc[violation.impact] = (acc[violation.impact] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(impactCounts).length > 0) {
      page.drawText('Issues by Severity', {
        x: 50,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: darkGray,
      });

      yPosition -= 25;

      Object.entries(impactCounts).forEach(([impact, count]) => {
        const impactColor = impact === 'critical' ? redColor :
                           impact === 'serious' ? orangeColor :
                           impact === 'moderate' ? yellowColor : darkGray;

        page.drawText(`${impact.charAt(0).toUpperCase() + impact.slice(1)}: ${count}`, {
          x: 70,
          y: yPosition,
          size: 12,
          font: regularFont,
          color: impactColor,
        });

        yPosition -= 18;
      });

      yPosition -= 20;
    }

    // Violations table header
    page.drawText('Detailed Issues', {
      x: 50,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: darkGray,
    });

    yPosition -= 30;

    // Table header
    page.drawRectangle({
      x: 40,
      y: yPosition - 5,
      width: width - 80,
      height: 25,
      color: lightGray,
    });

    page.drawText('Issue ID', {
      x: 50,
      y: yPosition + 5,
      size: 11,
      font: boldFont,
      color: darkGray,
    });

    page.drawText('Impact', {
      x: 200,
      y: yPosition + 5,
      size: 11,
      font: boldFont,
      color: darkGray,
    });

    page.drawText('Description', {
      x: 280,
      y: yPosition + 5,
      size: 11,
      font: boldFont,
      color: darkGray,
    });

    yPosition -= 25;

    // Violations rows
    violations.forEach((violation, index) => {
      if (yPosition < 100) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = height - 60;
        
        // Continue on new page
        page.drawText('Issue ID', {
          x: 50,
          y: yPosition + 5,
          size: 11,
          font: boldFont,
          color: darkGray,
        });
        // ... repeat headers on new page
      }

      // Alternate row colors
      if (index % 2 === 0) {
        page.drawRectangle({
          x: 40,
          y: yPosition - 5,
          width: width - 80,
          height: 20,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      const impactColor = violation.impact === 'critical' ? redColor :
                         violation.impact === 'serious' ? orangeColor :
                         violation.impact === 'moderate' ? yellowColor : darkGray;

      page.drawText(violation.id.substring(0, 20), {
        x: 50,
        y: yPosition + 2,
        size: 9,
        font: regularFont,
        color: darkGray,
      });

      page.drawText(violation.impact, {
        x: 200,
        y: yPosition + 2,
        size: 9,
        font: regularFont,
        color: impactColor,
      });

      // Wrap long descriptions
      const description = violation.description || violation.help || 'No description available';
      const maxWidth = 250;
      let text = description.substring(0, 60);
      if (description.length > 60) text += '...';

      page.drawText(text, {
        x: 280,
        y: yPosition + 2,
        size: 9,
        font: regularFont,
        color: darkGray,
      });

      yPosition -= 20;
    });

    yPosition -= 30;

    // AI Fixes section
    if (fixes) {
      if (yPosition < 150) {
        // Add new page for fixes
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = height - 60;
      }

      page.drawText('AI-Generated Fix Recommendations', {
        x: 50,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: darkGray,
      });

      yPosition -= 25;

      // Draw background for fixes section
      page.drawRectangle({
        x: 40,
        y: yPosition - 100,
        width: width - 80,
        height: 120,
        color: rgb(0.95, 0.95, 0.95),
      });

      // Simple text wrapping for fixes
      const fixesLines = fixes.split('\n').slice(0, 8); // Limit to first 8 lines
      fixesLines.forEach((line, index) => {
        if (yPosition > 100) {
          page.drawText(line.substring(0, 80), {
            x: 50,
            y: yPosition - (index * 12),
            size: 10,
            font: regularFont,
            color: darkGray,
          });
        }
      });

      yPosition -= 140;
    }

    // Footer
    page.drawText('Generated by Clynzer - AI-Powered Accessibility Scanner', {
      x: 50,
      y: 50,
      size: 10,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(`Report generated on ${new Date().toISOString()}`, {
      x: 50,
      y: 35,
      size: 8,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();

    // Set response headers for PDF download
    const fileName = `clynzer-report-${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);

    // Send the PDF
    res.status(200).send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
}
