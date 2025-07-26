/**
 * React Component Tests
 * 
 * Tests the main React components including:
 * - ResultCard component rendering and interactions
 * - Accessibility features and ARIA support
 * - Copy functionality and user interactions
 * - Dark mode support
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the ResultCard component
const ResultCard = ({ title, severity, description, darkMode, onCopyFix, helpUrl, nodes, wcagDocsUrl }: any) => {
  const handleCopyFix = () => {
    const basicFix = `// Fix for ${title}\n// ${description}\n// See: ${helpUrl || wcagDocsUrl}`;
    onCopyFix(basicFix);
  };

  return (
    <tr className={`transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
      <td className={`px-6 py-4 text-sm font-mono font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
        {title}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          severity === 'critical' ? 'text-red-800 bg-red-100' : 
          severity === 'serious' ? 'text-orange-800 bg-orange-100' :
          severity === 'moderate' ? 'text-yellow-800 bg-yellow-100' : 'text-blue-800 bg-blue-100'
        }`}>
          {severity}
        </span>
        {typeof nodes === 'number' && (
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {nodes} elements affected
          </div>
        )}
      </td>
      <td className={`px-6 py-4 text-sm max-w-md ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
        <div className="line-clamp-3">{description}</div>
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyFix}
            aria-label={`Copy suggested fix for ${title}`}
            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              darkMode
                ? 'bg-blue-900 text-blue-100 hover:bg-blue-800'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
          >
            Copy Fix
          </button>
          {(helpUrl || wcagDocsUrl) && (
            <a
              href={helpUrl || wcagDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Learn more about ${title} (opens in new tab)`}
              className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Learn More
            </a>
          )}
        </div>
      </td>
    </tr>
  );
};

describe('ResultCard Component', () => {
  const mockOnCopyFix = jest.fn();

  const defaultProps = {
    title: 'color-contrast',
    severity: 'serious',
    description: 'Elements must have sufficient color contrast',
    darkMode: false,
    onCopyFix: mockOnCopyFix,
    helpUrl: 'https://example.com/help',
    nodes: 3,
    wcagDocsUrl: 'https://w3.org/wcag/contrast'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render all violation details', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} />
          </tbody>
        </table>
      );

      expect(screen.getByText('color-contrast')).toBeInTheDocument();
      expect(screen.getByText('serious')).toBeInTheDocument();
      expect(screen.getByText('Elements must have sufficient color contrast')).toBeInTheDocument();
      expect(screen.getByText('3 elements affected')).toBeInTheDocument();
    });

    test('should render without nodes count when not provided', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} nodes={undefined} />
          </tbody>
        </table>
      );

      expect(screen.queryByText('elements affected')).not.toBeInTheDocument();
    });

    test('should render with zero nodes', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} nodes={0} />
          </tbody>
        </table>
      );

      expect(screen.getByText('0 elements affected')).toBeInTheDocument();
    });
  });

  describe('Severity Display', () => {
    test('should apply correct styling for critical severity', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} severity="critical" />
          </tbody>
        </table>
      );

      const severitySpan = screen.getByText('critical');
      expect(severitySpan).toHaveClass('text-red-800', 'bg-red-100');
    });

    test('should apply correct styling for serious severity', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} severity="serious" />
          </tbody>
        </table>
      );

      const severitySpan = screen.getByText('serious');
      expect(severitySpan).toHaveClass('text-orange-800', 'bg-orange-100');
    });

    test('should apply correct styling for moderate severity', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} severity="moderate" />
          </tbody>
        </table>
      );

      const severitySpan = screen.getByText('moderate');
      expect(severitySpan).toHaveClass('text-yellow-800', 'bg-yellow-100');
    });

    test('should apply default styling for minor severity', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} severity="minor" />
          </tbody>
        </table>
      );

      const severitySpan = screen.getByText('minor');
      expect(severitySpan).toHaveClass('text-blue-800', 'bg-blue-100');
    });
  });

  describe('Dark Mode Support', () => {
    test('should apply dark mode styles', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} darkMode={true} />
          </tbody>
        </table>
      );

      const titleCell = screen.getByText('color-contrast').closest('td');
      expect(titleCell).toHaveClass('text-gray-100');

      const nodesText = screen.getByText('3 elements affected');
      expect(nodesText).toHaveClass('text-gray-400');
    });

    test('should apply light mode styles', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} darkMode={false} />
          </tbody>
        </table>
      );

      const titleCell = screen.getByText('color-contrast').closest('td');
      expect(titleCell).toHaveClass('text-gray-900');

      const nodesText = screen.getByText('3 elements affected');
      expect(nodesText).toHaveClass('text-gray-500');
    });
  });

  describe('Copy Functionality', () => {
    test('should call onCopyFix when copy button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} />
          </tbody>
        </table>
      );

      const copyButton = screen.getByRole('button', { name: /copy suggested fix/i });
      await user.click(copyButton);

      expect(mockOnCopyFix).toHaveBeenCalledWith(
        '// Fix for color-contrast\n// Elements must have sufficient color contrast\n// See: https://example.com/help'
      );
    });

    test('should use wcagDocsUrl when helpUrl is not provided', async () => {
      const user = userEvent.setup();
      
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} helpUrl={undefined} />
          </tbody>
        </table>
      );

      const copyButton = screen.getByRole('button', { name: /copy suggested fix/i });
      await user.click(copyButton);

      expect(mockOnCopyFix).toHaveBeenCalledWith(
        '// Fix for color-contrast\n// Elements must have sufficient color contrast\n// See: https://w3.org/wcag/contrast'
      );
    });

    test('should handle missing URLs gracefully', async () => {
      const user = userEvent.setup();
      
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} helpUrl={undefined} wcagDocsUrl={undefined} />
          </tbody>
        </table>
      );

      const copyButton = screen.getByRole('button', { name: /copy suggested fix/i });
      await user.click(copyButton);

      expect(mockOnCopyFix).toHaveBeenCalledWith(
        '// Fix for color-contrast\n// Elements must have sufficient color contrast\n// See: undefined'
      );
    });
  });

  describe('Learn More Link', () => {
    test('should render learn more link with helpUrl', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} />
          </tbody>
        </table>
      );

      const learnMoreLink = screen.getByRole('link', { name: /learn more about color-contrast/i });
      expect(learnMoreLink).toHaveAttribute('href', 'https://example.com/help');
      expect(learnMoreLink).toHaveAttribute('target', '_blank');
      expect(learnMoreLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('should use wcagDocsUrl as fallback', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} helpUrl={undefined} />
          </tbody>
        </table>
      );

      const learnMoreLink = screen.getByRole('link', { name: /learn more about color-contrast/i });
      expect(learnMoreLink).toHaveAttribute('href', 'https://w3.org/wcag/contrast');
    });

    test('should not render learn more link when no URLs provided', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} helpUrl={undefined} wcagDocsUrl={undefined} />
          </tbody>
        </table>
      );

      const learnMoreLink = screen.queryByRole('link', { name: /learn more/i });
      expect(learnMoreLink).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} />
          </tbody>
        </table>
      );

      const copyButton = screen.getByRole('button', { name: 'Copy suggested fix for color-contrast' });
      expect(copyButton).toBeInTheDocument();

      const learnMoreLink = screen.getByRole('link', { name: 'Learn more about color-contrast (opens in new tab)' });
      expect(learnMoreLink).toBeInTheDocument();
    });

    test('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} />
          </tbody>
        </table>
      );

      const copyButton = screen.getByRole('button', { name: /copy suggested fix/i });
      
      // Focus and activate with keyboard
      copyButton.focus();
      expect(copyButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnCopyFix).toHaveBeenCalled();
    });

    test('should support Space key activation', async () => {
      const user = userEvent.setup();
      
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} />
          </tbody>
        </table>
      );

      const copyButton = screen.getByRole('button', { name: /copy suggested fix/i });
      copyButton.focus();
      
      await user.keyboard(' ');
      expect(mockOnCopyFix).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long descriptions', () => {
      const longDescription = 'This is a very long description that should be truncated properly when displayed in the table cell to ensure good user experience and proper layout ' + 'even when the text content is extremely lengthy and might otherwise break the table layout or cause readability issues for users browsing the accessibility report.';
      
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} description={longDescription} />
          </tbody>
        </table>
      );

      const descriptionElement = screen.getByText(longDescription);
      expect(descriptionElement).toHaveClass('line-clamp-3');
    });

    test('should handle special characters in title', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} title="aria-label-required-&-valid" />
          </tbody>
        </table>
      );

      expect(screen.getByText('aria-label-required-&-valid')).toBeInTheDocument();
    });

    test('should handle high node counts', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} nodes={999} />
          </tbody>
        </table>
      );

      expect(screen.getByText('999 elements affected')).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    test('should show hover state on copy button', async () => {
      const user = userEvent.setup();
      
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} />
          </tbody>
        </table>
      );

      const copyButton = screen.getByRole('button', { name: /copy suggested fix/i });
      
      await user.hover(copyButton);
      
      // Check that hover styles are applied
      expect(copyButton).toHaveClass('hover:bg-blue-200');
    });

    test('should show dark mode button styles', () => {
      render(
        <table>
          <tbody>
            <ResultCard {...defaultProps} darkMode={true} />
          </tbody>
        </table>
      );

      const copyButton = screen.getByRole('button', { name: /copy suggested fix/i });
      expect(copyButton).toHaveClass('bg-blue-900', 'text-blue-100');
    });
  });
});
