import React from 'react';

// TypeScript interfaces for ResultCard
export interface ResultCardProps {
  title: string;
  severity: string;
  description: string;
  fixSnippet: string;
  darkMode: boolean;
  onCopyFix: (text: string) => void;
  helpUrl?: string;
  nodes?: number;
  wcagDocsUrl?: string;
}

// Helper function to get WCAG documentation URL
const getWCAGDocsUrl = (ruleId: string): string => {
  const wcagDocsMap: { [key: string]: string } = {
    'color-contrast': 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
    'image-alt': 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
    'link-name': 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
    'button-name': 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
    'form-label-required': 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
    'heading-order': 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
    'keyboard': 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
    'focus-trap': 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
    'bypass': 'https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html',
    'document-title': 'https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html',
    'frame-title': 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
    'label': 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
    'input-image-alt': 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
    'area-alt': 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
    'meta-refresh': 'https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html',
    'object-alt': 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
    'video-caption': 'https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html',
    'audio-caption': 'https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html',
    'video-description': 'https://www.w3.org/WAI/WCAG21/Understanding/audio-description-prerecorded.html',
    'tabindex': 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
    'accesskey': 'https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html',
    'frame-focusable-content': 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
    'page-has-heading-one': 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
    'link-in-text-block': 'https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html',
    'focus-order': 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
    'focus-order-semantics': 'https://www.w3.org/WAI/WCAG21/Understanding/meaningful-sequence.html',
  };
  
  return wcagDocsMap[ruleId] || 'https://www.w3.org/WAI/WCAG21/Understanding/';
};

const ResultCard: React.FC<ResultCardProps> = ({
  title,
  severity,
  description,
  fixSnippet,
  darkMode,
  onCopyFix,
  helpUrl,
  nodes,
  wcagDocsUrl
}) => {
  const handleCopyFix = () => {
    if (fixSnippet) {
      onCopyFix(fixSnippet);
    } else {
      // Generate a basic fix suggestion if no specific snippet is available
      const basicFix = `// Fix for ${title}\n// ${description}\n// See: ${helpUrl || wcagDocsUrl || getWCAGDocsUrl(title)}`;
      onCopyFix(basicFix);
    }
  };

  const docsUrl = wcagDocsUrl || getWCAGDocsUrl(title);

  return (
    <tr className={`transition-colors ${
      darkMode 
        ? 'hover:bg-gray-700' 
        : 'hover:bg-gray-50'
    }`}>
      <td className={`px-6 py-4 text-sm font-mono font-medium ${
        darkMode ? 'text-gray-100' : 'text-gray-900'
      }`}>{title}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          severity === 'critical' ? 'text-red-800 bg-red-100' : 
          severity === 'serious' ? 'text-orange-800 bg-orange-100' :
          severity === 'moderate' ? 'text-yellow-800 bg-yellow-100' : 'text-blue-800 bg-blue-100'
        }`}>
          {severity}
        </span>
        {typeof nodes === 'number' && <div className={`text-xs mt-1 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>{nodes} elements affected</div>}
      </td>
      <td className={`px-6 py-4 text-sm max-w-md ${
        darkMode ? 'text-gray-100' : 'text-gray-900'
      }`}>
        <div className="line-clamp-3">{description}</div>
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center space-x-2">
          {/* Copy Fix Button */}
          <button
            onClick={handleCopyFix}
            aria-label={`Copy suggested fix for ${title}`}
            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              darkMode
                ? 'bg-blue-900 hover:bg-blue-800 text-blue-100 border border-blue-700'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'
            }`}
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Fix
          </button>
          
          {/* View Docs Button */}
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View WCAG documentation for ${title}`}
            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              darkMode
                ? 'bg-green-900 hover:bg-green-800 text-green-100 border border-green-700'
                : 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300'
            }`}
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            WCAG Docs
          </a>
          
          {/* Original Help Link */}
          {helpUrl && (
            <a 
              href={helpUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label={`Learn more about ${title}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Learn more
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </td>
    </tr>
  );
};

export default ResultCard;
