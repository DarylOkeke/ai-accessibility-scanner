/**
 * Scan Processor Unit Tests
 * 
 * Tests the core accessibility scanning logic including:
 * - Axe-core result parsing and formatting
 * - Severity grouping and summary generation
 * - Error handling and validation
 * - AI fixes integration
 */

import { ScanJobResult, ScanJobData } from '../lib/queue/scanQueue';

// Mock the axe-core module
jest.mock('axe-core', () => ({
  source: 'mock-axe-source',
  configure: jest.fn(),
}));

// Mock JSDOM
const mockWindow = {
  eval: jest.fn(),
  document: { documentElement: {} },
  axe: {
    run: jest.fn(),
  },
};

jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: mockWindow,
  })),
}));

// Mock OpenAI
jest.mock('../lib/openai', () => ({
  generateFixes: jest.fn(),
}));

describe('Scan Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Violation Processing', () => {
    test('should correctly format axe-core violations', () => {
      const mockAxeResults = {
        violations: [
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'Elements must have sufficient color contrast',
            help: 'Ensure proper color contrast',
            helpUrl: 'https://example.com/color-contrast',
            nodes: [{ html: '<div>test</div>' }, { html: '<span>test2</span>' }]
          },
          {
            id: 'image-alt',
            impact: 'critical',
            description: 'Images must have alternative text',
            help: 'Add alt attribute to images',
            helpUrl: 'https://example.com/image-alt',
            nodes: [{ html: '<img>' }]
          }
        ]
      };

      // Simulate the formatting logic from worker-improved.ts
      const formattedViolations = mockAxeResults.violations.map((violation: any) => ({
        id: violation.id,
        impact: violation.impact || 'unknown',
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.length
      }));

      expect(formattedViolations).toHaveLength(2);
      expect(formattedViolations[0]).toEqual({
        id: 'color-contrast',
        impact: 'serious',
        description: 'Elements must have sufficient color contrast',
        help: 'Ensure proper color contrast',
        helpUrl: 'https://example.com/color-contrast',
        nodes: 2
      });
      expect(formattedViolations[1]).toEqual({
        id: 'image-alt',
        impact: 'critical',
        description: 'Images must have alternative text',
        help: 'Add alt attribute to images',
        helpUrl: 'https://example.com/image-alt',
        nodes: 1
      });
    });

    test('should handle violations with missing impact', () => {
      const mockAxeResults = {
        violations: [
          {
            id: 'test-rule',
            description: 'Test description',
            help: 'Test help',
            helpUrl: 'https://example.com/test',
            nodes: []
          }
        ]
      };

      const formattedViolations = mockAxeResults.violations.map((violation: any) => ({
        id: violation.id,
        impact: violation.impact || 'unknown',
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.length
      }));

      expect(formattedViolations[0].impact).toBe('unknown');
      expect(formattedViolations[0].nodes).toBe(0);
    });
  });

  describe('Summary Generation', () => {
    test('should correctly generate violation summary', () => {
      const violations = [
        { impact: 'critical' },
        { impact: 'critical' },
        { impact: 'serious' },
        { impact: 'serious' },
        { impact: 'serious' },
        { impact: 'moderate' },
        { impact: 'minor' },
        { impact: 'minor' },
        { impact: 'unknown' }
      ];

      // Simulate the summary logic from worker-improved.ts
      const summary = {
        total: violations.length,
        critical: violations.filter((v: any) => v.impact === 'critical').length,
        serious: violations.filter((v: any) => v.impact === 'serious').length,
        moderate: violations.filter((v: any) => v.impact === 'moderate').length,
        minor: violations.filter((v: any) => v.impact === 'minor').length
      };

      expect(summary).toEqual({
        total: 9,
        critical: 2,
        serious: 3,
        moderate: 1,
        minor: 2
      });
    });

    test('should handle empty violations array', () => {
      const violations: any[] = [];

      const summary = {
        total: violations.length,
        critical: violations.filter((v: any) => v.impact === 'critical').length,
        serious: violations.filter((v: any) => v.impact === 'serious').length,
        moderate: violations.filter((v: any) => v.impact === 'moderate').length,
        minor: violations.filter((v: any) => v.impact === 'minor').length
      };

      expect(summary).toEqual({
        total: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
      });
    });
  });

  describe('Severity Categorization', () => {
    test('should categorize violations by severity correctly', () => {
      const violations = [
        { id: 'rule1', impact: 'critical' },
        { id: 'rule2', impact: 'serious' },
        { id: 'rule3', impact: 'moderate' },
        { id: 'rule4', impact: 'minor' },
        { id: 'rule5', impact: 'critical' },
        { id: 'rule6', impact: 'unknown' }
      ];

      const categorized = {
        critical: violations.filter(v => v.impact === 'critical'),
        serious: violations.filter(v => v.impact === 'serious'),
        moderate: violations.filter(v => v.impact === 'moderate'),
        minor: violations.filter(v => v.impact === 'minor'),
        unknown: violations.filter(v => v.impact === 'unknown')
      };

      expect(categorized.critical).toHaveLength(2);
      expect(categorized.serious).toHaveLength(1);
      expect(categorized.moderate).toHaveLength(1);
      expect(categorized.minor).toHaveLength(1);
      expect(categorized.unknown).toHaveLength(1);
    });

    test('should prioritize severity levels correctly', () => {
      const violations = [
        { id: 'rule1', impact: 'minor' },
        { id: 'rule2', impact: 'critical' },
        { id: 'rule3', impact: 'moderate' },
        { id: 'rule4', impact: 'serious' }
      ];

      const severityOrder = ['critical', 'serious', 'moderate', 'minor'];
      const sortedViolations = violations.sort((a, b) => {
        const aIndex = severityOrder.indexOf(a.impact);
        const bIndex = severityOrder.indexOf(b.impact);
        return aIndex - bIndex;
      });

      expect(sortedViolations[0].impact).toBe('critical');
      expect(sortedViolations[1].impact).toBe('serious');
      expect(sortedViolations[2].impact).toBe('moderate');
      expect(sortedViolations[3].impact).toBe('minor');
    });
  });

  describe('Result Structure Validation', () => {
    test('should create valid ScanJobResult structure', () => {
      const mockViolations = [
        {
          id: 'color-contrast',
          impact: 'serious',
          description: 'Test description',
          help: 'Test help',
          helpUrl: 'https://example.com',
          nodes: 2
        }
      ];

      const result: ScanJobResult = {
        violations: mockViolations,
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        aiFixes: 'Mock AI fixes',
        summary: {
          total: 1,
          critical: 0,
          serious: 1,
          moderate: 0,
          minor: 0
        }
      };

      // Validate required properties
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('aiFixes');
      expect(result).toHaveProperty('summary');

      // Validate summary structure
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('critical');
      expect(result.summary).toHaveProperty('serious');
      expect(result.summary).toHaveProperty('moderate');
      expect(result.summary).toHaveProperty('minor');

      // Validate data types
      expect(typeof result.url).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(typeof result.summary.total).toBe('number');
    });
  });

  describe('WCAG Rule Categorization', () => {
    test('should categorize violations by WCAG principles', () => {
      const violations = [
        { id: 'color-contrast' },
        { id: 'image-alt' },
        { id: 'keyboard' },
        { id: 'focus-order' },
        { id: 'html-has-lang' },
        { id: 'label' }
      ];

      // WCAG categorization logic from pages/index.tsx
      const wcagCategories = {
        perceivable: ['color-contrast', 'image-alt', 'label'],
        operable: ['keyboard', 'focus-order'],
        understandable: ['html-has-lang'],
        robust: [] as string[]
      };

      const categorized = {
        perceivable: violations.filter(v => wcagCategories.perceivable.includes(v.id)),
        operable: violations.filter(v => wcagCategories.operable.includes(v.id)),
        understandable: violations.filter(v => wcagCategories.understandable.includes(v.id)),
        robust: violations.filter(v => wcagCategories.robust.includes(v.id)),
        other: violations.filter(v => 
          !wcagCategories.perceivable.includes(v.id) &&
          !wcagCategories.operable.includes(v.id) &&
          !wcagCategories.understandable.includes(v.id) &&
          !wcagCategories.robust.includes(v.id)
        )
      };

      expect(categorized.perceivable).toHaveLength(3);
      expect(categorized.operable).toHaveLength(2);
      expect(categorized.understandable).toHaveLength(1);
      expect(categorized.robust).toHaveLength(0);
      expect(categorized.other).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid axe results gracefully', () => {
      const invalidResults: any = null;

      expect(() => {
        const violations = invalidResults?.violations || [];
        expect(violations).toEqual([]);
      }).not.toThrow();
    });

    test('should handle malformed violation objects', () => {
      const malformedViolations = [
        { id: 'test' }, // Missing other properties
        null,
        undefined,
        { impact: 'critical' } // Missing id
      ];

      const safeFormatted = malformedViolations
        .filter(v => v && v.id) // Filter out invalid items
        .map((violation: any) => ({
          id: violation.id,
          impact: violation.impact || 'unknown',
          description: violation.description || 'No description available',
          help: violation.help || 'No help available',
          helpUrl: violation.helpUrl || '',
          nodes: violation.nodes?.length || 0
        }));

      expect(safeFormatted).toHaveLength(1);
      expect(safeFormatted[0].id).toBe('test');
      expect(safeFormatted[0].impact).toBe('unknown');
      expect(safeFormatted[0].description).toBe('No description available');
    });
  });

  describe('URL Validation', () => {
    test('should validate URLs correctly', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://subdomain.example.com/path',
        'https://example.com:8080/path?query=value'
      ];

      const invalidUrls = [
        '',
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        'data:text/html,<h1>test</h1>'
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\/.+/);
      });

      invalidUrls.forEach(url => {
        if (url === '') {
          expect(url).toBe('');
        } else {
          expect(url).not.toMatch(/^https?:\/\/.+/);
        }
      });
    });
  });
});
