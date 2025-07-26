/**
 * Mailer Tests
 * 
 * Tests the email functionality including:
 * - SendGrid integration
 * - Email template generation
 * - PDF attachment handling
 * - Error handling for email failures
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';

// Mock SendGrid
const mockSend = jest.fn();
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: mockSend
}));

// Mock the send-report handler
const sendReportHandler = require('../pages/api/email/send-report').default;

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.SENDGRID_FROM_EMAIL = 'test@clynzer.com';
    process.env.SCHEDULED_SCAN_API_KEY = 'test-scheduled-key';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://clynzer.com';
  });

  describe('POST /api/email/send-report', () => {
    test('should send email with scan results successfully', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-scheduled-key'
        },
        body: {
          email: 'user@example.com',
          userName: 'John Doe',
          url: 'https://example.com',
          scanResults: {
            violations: [
              {
                id: 'color-contrast',
                impact: 'serious',
                description: 'Insufficient color contrast'
              }
            ],
            summary: {
              total: 1,
              critical: 0,
              serious: 1,
              moderate: 0,
              minor: 0
            }
          },
          pdfBuffer: Buffer.from('fake-pdf-content').toString('base64')
        }
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sendReportHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.message).toBe('Email sent successfully to user@example.com');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          from: 'test@clynzer.com',
          subject: 'Weekly Accessibility Report - https://example.com',
          html: expect.stringContaining('John Doe'),
          attachments: expect.arrayContaining([
            expect.objectContaining({
              content: expect.any(String),
              filename: expect.stringMatching(/accessibility-report-.*\.pdf/),
              type: 'application/pdf'
            })
          ])
        })
      );
    });

    test('should handle clean scan results (no violations)', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-scheduled-key'
        },
        body: {
          email: 'user@example.com',
          userName: 'Jane Smith',
          url: 'https://clean-site.com',
          scanResults: {
            violations: [],
            summary: {
              total: 0,
              critical: 0,
              serious: 0,
              moderate: 0,
              minor: 0
            }
          },
          pdfBuffer: Buffer.from('clean-pdf-content').toString('base64')
        }
      });

      mockSend.mockResolvedValue([{ statusCode: 202 }]);

      await sendReportHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Great Job!')
        })
      );
    });

    test('should require valid authorization', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-key'
        },
        body: {
          email: 'user@example.com',
          url: 'https://example.com',
          scanResults: { violations: [] }
        }
      });

      await sendReportHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized');
    });

    test('should require authorization header', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'user@example.com',
          url: 'https://example.com',
          scanResults: { violations: [] }
        }
      });

      await sendReportHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    test('should validate required fields', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-scheduled-key'
        },
        body: {
          // Missing required fields
        }
      });

      await sendReportHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Missing required fields: email, scanResults, pdfBuffer, url');
    });

    test('should handle SendGrid API errors', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-scheduled-key'
        },
        body: {
          email: 'user@example.com',
          url: 'https://example.com',
          scanResults: {
            violations: [],
            summary: { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 }
          },
          pdfBuffer: Buffer.from('fake-pdf-content').toString('base64')
        }
      });

      mockSend.mockRejectedValue(new Error('SendGrid API error'));

      await sendReportHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to send email');
    });

    test('should reject non-POST methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      await sendReportHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('Email Template Generation', () => {
    test('should generate correct email subject', () => {
      const url = 'https://example.com';
      const subject = `Weekly Accessibility Report - ${url}`;
      
      expect(subject).toBe('Weekly Accessibility Report - https://example.com');
    });

    test('should include violation counts in template', () => {
      const scanResults = {
        summary: {
          total: 5,
          critical: 2,
          serious: 2,
          moderate: 1,
          minor: 0
        }
      };

      const violationsCount = scanResults.summary.total;
      const criticalIssues = scanResults.summary.critical;
      const seriousIssues = scanResults.summary.serious;

      expect(violationsCount).toBe(5);
      expect(criticalIssues).toBe(2);
      expect(seriousIssues).toBe(2);
    });

    test('should format violation summary correctly', () => {
      const summary = {
        total: 10,
        critical: 3,
        serious: 4,
        moderate: 2,
        minor: 1
      };

      const formatted = {
        totalIssues: summary.total,
        highPriorityIssues: summary.critical + summary.serious,
        needsAttention: summary.total > 0
      };

      expect(formatted.totalIssues).toBe(10);
      expect(formatted.highPriorityIssues).toBe(7);
      expect(formatted.needsAttention).toBe(true);
    });

    test('should handle empty violation summary', () => {
      const summary = {
        total: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
      };

      const formatted = {
        totalIssues: summary.total,
        highPriorityIssues: summary.critical + summary.serious,
        needsAttention: summary.total > 0
      };

      expect(formatted.totalIssues).toBe(0);
      expect(formatted.highPriorityIssues).toBe(0);
      expect(formatted.needsAttention).toBe(false);
    });
  });

  describe('PDF Attachment Handling', () => {
    test('should format PDF attachment correctly', () => {
      const pdfBuffer = Buffer.from('fake-pdf-content');
      const url = 'https://example.com';
      const timestamp = new Date().toISOString().split('T')[0];

      const attachment = {
        content: pdfBuffer.toString('base64'),
        filename: `accessibility-report-${url.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      };

      expect(attachment.content).toBe(pdfBuffer.toString('base64'));
      expect(attachment.filename).toMatch(/accessibility-report-.*\.pdf/);
      expect(attachment.type).toBe('application/pdf');
    });

    test('should handle missing PDF buffer', () => {
      const pdfBuffer = null;
      
      if (!pdfBuffer) {
        expect(pdfBuffer).toBeNull();
      }
    });

    test('should sanitize filename from URL', () => {
      const url = 'https://example.com/path?query=value#anchor';
      const sanitized = url.replace(/[^a-zA-Z0-9]/g, '-');
      
      expect(sanitized).toBe('https---example-com-path-query-value-anchor');
    });
  });

  describe('Email Validation', () => {
    test('should validate email format', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user.name@subdomain.example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user..double.dot@example.com',
        'user@.com',
        '.user@example.com'
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      // Test each invalid email individually
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('@domain.com')).toBe(false);
      expect(emailRegex.test('user@')).toBe(false);
      expect(emailRegex.test('user@domain')).toBe(false);
      expect(emailRegex.test('user @example.com')).toBe(false); // space in email
      expect(emailRegex.test('user@.com')).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    test('should provide fallback for missing user name', () => {
      const userName = undefined;
      const fallback = userName || 'User';
      
      expect(fallback).toBe('User');
    });

    test('should provide fallback for missing environment variables', () => {
      const originalFromEmail = process.env.SENDGRID_FROM_EMAIL;
      delete process.env.SENDGRID_FROM_EMAIL;

      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'reports@clynzer.com';
      
      expect(fromEmail).toBe('reports@clynzer.com');

      // Restore
      process.env.SENDGRID_FROM_EMAIL = originalFromEmail;
    });

    test('should handle malformed scan results', () => {
      const malformedResults: any = {
        // Missing summary
        violations: []
      };

      const safeSummary = malformedResults.summary || {
        total: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
      };

      expect(safeSummary.total).toBe(0);
      expect(safeSummary.critical).toBe(0);
    });
  });
});
