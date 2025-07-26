import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useClerk, useUser } from '@clerk/nextjs';
import { saveAs } from 'file-saver';
import { useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import ResultCard from '../components/ResultCard';

// Define the shape of an accessibility violation
interface Violation {
  id: string;
  impact: string;
  description: string;
  help?: string;
  helpUrl?: string;
  nodes?: number;
  fixSnippet?: string;
}

interface ScanResult {
  violations: Violation[];
  url: string;
  timestamp: string;
  aiFixes?: string;
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

// ErrorCard component for displaying scan errors with retry functionality
interface ErrorCardProps {
  message: string;
  onRetry: () => void;
  darkMode: boolean;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ message, onRetry, darkMode }) => {
  return (
    <div 
      role="alert"
      className={`p-6 rounded-xl border-l-4 shadow-lg transition-all duration-300 ${
        darkMode 
          ? 'text-red-200 bg-red-900/30 border-red-400' 
          : 'text-red-800 bg-red-50 border-red-400'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <svg className="w-6 h-6 mr-3 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{message}</span>
        </div>
        <button
          onClick={onRetry}
          className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 ${
            darkMode
              ? 'bg-red-800 hover:bg-red-700 text-red-100 border border-red-600'
              : 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300'
          }`}
        >
          Retry
        </button>
      </div>
    </div>
  );
};

// ConfirmationModal component for success messages with focus management
interface ConfirmationModalProps {
  message: string;
  onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ message, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;
    
    // Focus the modal when it mounts
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Trap focus within the modal
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabKey);
      
      // Return focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <div 
        ref={modalRef}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all"
      >
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h3 
            id="confirmation-title"
            className="text-lg font-semibold text-center text-gray-900 dark:text-gray-100 mb-4"
          >
            Success!
          </h3>
          
          <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>
          
          <div className="flex justify-center">
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Function to generate WCAG documentation URL for a rule
const getWCAGDocsUrl = (ruleId: string): string => {
  // Map common accessibility rules to their WCAG documentation
  const wcagDocsMap: { [key: string]: string } = {
    'color-contrast': 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
    'image-alt': 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
    'button-name': 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
    'link-name': 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
    'form-label-required': 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
    'html-has-lang': 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html',
    'landmark-unique': 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
    'heading-order': 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
    'focus-order': 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
    'keyboard': 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html'
  };
  
  // Try to find exact match first
  if (wcagDocsMap[ruleId]) {
    return wcagDocsMap[ruleId];
  }
  
  // Try to find partial match
  for (const [key, url] of Object.entries(wcagDocsMap)) {
    if (ruleId.includes(key) || key.includes(ruleId)) {
      return url;
    }
  }
  
  // Default to WCAG overview if no specific documentation found
  return 'https://www.w3.org/WAI/WCAG21/Understanding/';
};

// WCAG principle categorization mapping
const wcagCategories = {
  perceivable: {
    title: 'Perceivable',
    description: 'Information must be presentable in ways users can perceive',
    rules: ['color-contrast', 'image-alt', 'video-caption', 'audio-caption', 'focus-order-semantics', 'link-name', 'button-name', 'form-label-required', 'label', 'input-image-alt', 'area-alt', 'document-title', 'frame-title', 'meta-refresh', 'object-alt', 'video-description']
  },
  operable: {
    title: 'Operable',
    description: 'Interface components must be operable',
    rules: ['keyboard', 'focus-trap', 'bypass', 'page-has-heading-one', 'heading-order', 'link-in-text-block', 'focus-order', 'tabindex', 'accesskey', 'frame-focusable-content']
  },
  understandable: {
    title: 'Understandable',
    description: 'Information and UI operation must be understandable',
    rules: ['html-has-lang', 'html-lang-valid', 'valid-lang', 'autocomplete-valid', 'form-field-multiple-labels', 'identical-links-same-purpose', 'navigation-order', 'consistent-navigation']
  },
  robust: {
    title: 'Robust',
    description: 'Content must be robust enough for interpretation by assistive technologies',
    rules: ['valid-html', 'duplicate-id', 'landmark-unique', 'region', 'html-xml-lang-mismatch', 'landmark-banner-is-top-level', 'landmark-contentinfo-is-top-level', 'landmark-main-is-top-level', 'landmark-no-duplicate-banner', 'landmark-no-duplicate-contentinfo', 'landmark-no-duplicate-main']
  }
};

// Function to categorize violations by WCAG principle
const categorizeViolationsByWCAG = (violations: Violation[]) => {
  const categorized = {
    perceivable: [] as Violation[],
    operable: [] as Violation[],
    understandable: [] as Violation[],
    robust: [] as Violation[],
    other: [] as Violation[]
  };

  violations.forEach(violation => {
    let categorized_flag = false;
    for (const [principle, data] of Object.entries(wcagCategories)) {
      if (data.rules.some(rule => violation.id.includes(rule))) {
        categorized[principle as keyof typeof categorized].push(violation);
        categorized_flag = true;
        break;
      }
    }
    if (!categorized_flag) {
      categorized.other.push(violation);
    }
  });

  return categorized;
};

// Virtualized Result Card for react-window (card-style layout)
interface VirtualizedResultCardProps {
  index: number;
  style: React.CSSProperties;
  data: {
    violations: Violation[];
    darkMode: boolean;
    onCopyFix: (text: string) => void;
  };
}

const VirtualizedResultCard: React.FC<VirtualizedResultCardProps> = ({ index, style, data }) => {
  const { violations, darkMode, onCopyFix } = data;
  const violation = violations[index];
  const wcagDocsUrl = getWCAGDocsUrl(violation.id);
  
  const handleCopyFix = () => {
    if (violation.fixSnippet) {
      onCopyFix(violation.fixSnippet);
    } else {
      // Generate a basic fix suggestion if no specific snippet is available
      const basicFix = `// Fix for ${violation.id}\n// ${violation.description}\n// See: ${violation.helpUrl || wcagDocsUrl}`;
      onCopyFix(basicFix);
    }
  };
  
  return (
    <div style={style} className={`px-6 py-4 border-b transition-colors ${
      darkMode 
        ? 'border-gray-700 hover:bg-gray-700' 
        : 'border-gray-200 hover:bg-gray-50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <span className={`font-mono text-sm font-medium ${
              darkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{violation.id}</span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              violation.impact === 'critical' ? 'text-red-800 bg-red-100' : 
              violation.impact === 'serious' ? 'text-orange-800 bg-orange-100' :
              violation.impact === 'moderate' ? 'text-yellow-800 bg-yellow-100' : 'text-blue-800 bg-blue-100'
            }`}>
              {violation.impact}
            </span>
            {violation.nodes && (
              <span className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>{violation.nodes} elements affected</span>
            )}
          </div>
          <p className={`text-sm line-clamp-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {violation.description}
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleCopyFix}
            className={`p-2 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 ${
              darkMode 
                ? 'bg-purple-900/50 hover:bg-purple-900/70 text-purple-200 border border-purple-700'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
            }`}
            aria-label={`Copy suggested fix for ${violation.id}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy Fix</span>
          </button>
          <a
            href={wcagDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 ${
              darkMode 
                ? 'bg-blue-900/50 hover:bg-blue-900/70 text-blue-200 border border-blue-700'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
            }`}
            aria-label={`View WCAG documentation for ${violation.id}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Docs</span>
          </a>
        </div>
      </div>
    </div>
  );
};

// ResultsList component with WCAG grouping
interface ResultsListProps {
  violations: Violation[];
  darkMode: boolean;
  onCopyFix: (text: string) => void;
  scrollPositions: { [key: string]: number };
  listRefs: React.MutableRefObject<{ [key: string]: any }>;
  onScrollPositionChange: (key: string, position: number) => void;
}

const ResultsList: React.FC<ResultsListProps> = ({ 
  violations, 
  darkMode, 
  onCopyFix, 
  scrollPositions, 
  listRefs, 
  onScrollPositionChange 
}) => {
  const categorizedViolations = categorizeViolationsByWCAG(violations);
  
  const renderViolationGroup = (
    principle: string, 
    violations: Violation[], 
    title: string, 
    description: string,
    defaultOpen: boolean = false
  ) => {
    if (violations.length === 0) return null;

    const hasErrors = violations.some(v => v.impact === 'critical' || v.impact === 'serious');
    const isOpenByDefault = defaultOpen || hasErrors;
    const shouldVirtualize = violations.length > 20;
    const listKey = `${principle}-list`;

    // Preserve scroll position
    const handleScroll = (scrollTop: number) => {
      onScrollPositionChange(listKey, scrollTop);
    };

    return (
      <details 
        key={principle}
        open={isOpenByDefault}
        className={`result-card rounded-xl border shadow-lg transition-all duration-300 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-100'
        }`}
      >
        <summary className={`px-6 py-4 cursor-pointer hover:bg-opacity-50 transition-all duration-200 rounded-t-xl ${
          darkMode 
            ? 'hover:bg-gray-700 text-gray-100' 
            : 'hover:bg-gray-50 text-gray-900'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold">{title}</h4>
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>{description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                hasErrors 
                  ? 'text-red-800 bg-red-100' 
                  : 'text-yellow-800 bg-yellow-100'
              }`}>
                {violations.length} issue{violations.length !== 1 ? 's' : ''}
                {shouldVirtualize && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Virtualized
                  </span>
                )}
              </span>
              <svg className="w-5 h-5 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </summary>
        
        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {shouldVirtualize ? (
            // Virtualized rendering for large datasets
            <div className="p-4">
              <div className={`text-sm mb-4 p-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-800'
              }`}>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Showing {violations.length} violations with virtual scrolling for optimal performance
                </div>
              </div>
              <div style={{ height: '400px', width: '100%' }}>
                <List
                  ref={(ref) => {
                    if (ref) {
                      listRefs.current[listKey] = ref;
                      // Restore scroll position
                      if (scrollPositions[listKey]) {
                        ref.scrollTo(scrollPositions[listKey]);
                      }
                    }
                  }}
                  height={400}
                  width="100%"
                  itemCount={violations.length}
                  itemSize={120} // Increased height for card-style layout
                  itemData={{
                    violations,
                    darkMode,
                    onCopyFix
                  }}
                  onScroll={({ scrollTop }: any) => handleScroll(scrollTop)}
                >
                  {VirtualizedResultCard}
                </List>
              </div>
            </div>
          ) : (
            // Standard rendering for smaller datasets
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Rule</th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Severity</th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Description</th>
                    <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  darkMode 
                    ? 'bg-gray-800 divide-gray-700' 
                    : 'bg-white divide-gray-200'
                }`}>
                  {violations.map((v, index) => (
                    <ResultCard
                      key={`${v.id}-${index}`}
                      title={v.id}
                      severity={v.impact}
                      description={v.description}
                      fixSnippet={v.fixSnippet || ''}
                      darkMode={darkMode}
                      onCopyFix={onCopyFix}
                      helpUrl={v.helpUrl}
                      nodes={v.nodes}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>
    );
  };

  return (
    <div className="space-y-4">
      <div className={`result-card px-6 py-4 rounded-xl ${
        darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-100'
      }`}>
        <h4 className={`text-xl font-bold ${
          darkMode ? 'text-gray-100' : 'text-gray-900'
        }`}>Accessibility Issues by WCAG Principle</h4>
        <p className={`mt-1 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>Issues are grouped by Web Content Accessibility Guidelines (WCAG) principles. Critical and serious errors are expanded by default.</p>
      </div>

      {renderViolationGroup(
        'perceivable', 
        categorizedViolations.perceivable, 
        wcagCategories.perceivable.title, 
        wcagCategories.perceivable.description
      )}
      
      {renderViolationGroup(
        'operable', 
        categorizedViolations.operable, 
        wcagCategories.operable.title, 
        wcagCategories.operable.description
      )}
      
      {renderViolationGroup(
        'understandable', 
        categorizedViolations.understandable, 
        wcagCategories.understandable.title, 
        wcagCategories.understandable.description
      )}
      
      {renderViolationGroup(
        'robust', 
        categorizedViolations.robust, 
        wcagCategories.robust.title, 
        wcagCategories.robust.description
      )}
      
      {categorizedViolations.other.length > 0 && renderViolationGroup(
        'other', 
        categorizedViolations.other, 
        'Other Issues', 
        'Issues that don\'t clearly fit into a specific WCAG principle'
      )}
    </div>
  );
};

export default function Home() {
  // Clerk hooks
  const { signOut, openUserProfile } = useClerk();
  const { isSignedIn, isLoaded, user } = useUser();
  
  // UI state
  const [url, setUrl] = useState('');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [aiFixesLoading, setAiFixesLoading] = useState(false);
  const [includeAIFixes, setIncludeAIFixes] = useState(true);
  const [copyToast, setCopyToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  
  // URL validation state
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isUrlValid, setIsUrlValid] = useState(false);

  // Scroll position preservation for virtualized lists
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({});
  const listRefs = useRef<{ [key: string]: any }>({});

  // URL validation function
  const validateUrl = (url: string): boolean => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return false;
    
    // Allow URLs with or without protocol (since scan function adds protocol automatically)
    const urlWithProtocol = /^https?:\/\/\S+/;
    const urlWithoutProtocol = /^[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9]\.[a-zA-Z]{2,}(\/.*)?$/;
    
    return urlWithProtocol.test(trimmedUrl) || urlWithoutProtocol.test(trimmedUrl);
  };

  // Handle URL input changes
  const handleUrlChange = (value: string) => {
    setUrl(value);
    const isValid = validateUrl(value);
    setIsUrlValid(isValid);
    
    // Clear error when user is typing
    if (urlError) {
      setUrlError(null);
    }
  };

  // Handle URL input blur
  const handleUrlBlur = () => {
    const trimmedUrl = url.trim();
    if (trimmedUrl && !validateUrl(trimmedUrl)) {
      setUrlError('Please enter a valid URL.');
    }
  };

  // Handle scroll position changes for virtualized lists
  const handleScrollPositionChange = (key: string, position: number) => {
    setScrollPositions(prev => ({
      ...prev,
      [key]: position
    }));
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast({ show: true, message: 'Copied!' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
    } catch (err) {
      setCopyToast({ show: true, message: 'Failed to copy' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
    }
  };

  // Generate PDF report
  const generatePDFReport = async () => {
    if (!scanResult || !violations.length) {
      setCopyToast({ show: true, message: 'No scan data available for report' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
      return;
    }

    try {
      setCopyToast({ show: true, message: 'Generating PDF report...' });
      
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          violations,
          fixes: scanResult.aiFixes || '',
          url: scanResult.url,
          user: user || { firstName: 'Clynzer', username: 'User' }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `clynzer-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setCopyToast({ show: true, message: 'PDF report downloaded!' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
    } catch (error) {
      console.error('PDF generation error:', error);
      setCopyToast({ show: true, message: 'Failed to generate PDF report' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
    }
  };

  // Generate CSV export
  const generateCSVReport = () => {
    if (!scanResult || !violations.length) {
      setCopyToast({ show: true, message: 'No scan data available for CSV export' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
      return;
    }

    try {
      setCopyToast({ show: true, message: 'Generating CSV report...' });
      
      // Create CSV header
      const headers = ['Rule ID', 'Severity', 'Description', 'Help', 'Help URL', 'Elements Affected'];
      
      // Create CSV rows
      const rows = violations.map(violation => [
        violation.id,
        violation.impact,
        violation.description.replace(/"/g, '""'), // Escape quotes
        violation.help || '',
        violation.helpUrl || '',
        violation.nodes || 0
      ]);
      
      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const filename = `clynzer-report-${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, filename);
      
      setCopyToast({ show: true, message: 'CSV report downloaded!' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
    } catch (error) {
      console.error('CSV generation error:', error);
      setCopyToast({ show: true, message: 'Failed to generate CSV report' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
    }
  };

  // Email report function
  const sendEmailReport = async () => {
    if (!scanResult || !violations.length) {
      setCopyToast({ show: true, message: 'No scan data available to email' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
      return;
    }

    if (!emailAddress.trim()) {
      setCopyToast({ show: true, message: 'Please enter an email address' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
      return;
    }

    setEmailSending(true);
    try {
      // Generate HTML report content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h1 style="color: #1e40af;">Clynzer Accessibility Report</h1>
          <p><strong>Scanned URL:</strong> ${scanResult.url}</p>
          <p><strong>Scan Date:</strong> ${new Date(scanResult.timestamp).toLocaleDateString()}</p>
          
          <h2 style="color: #1e40af;">Summary</h2>
          <div style="display: flex; gap: 20px; margin: 20px 0;">
            <div style="background: #fee2e2; padding: 15px; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${scanResult.summary.critical}</div>
              <div style="color: #991b1b;">Critical</div>
            </div>
            <div style="background: #fed7aa; padding: 15px; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #ea580c;">${scanResult.summary.serious}</div>
              <div style="color: #c2410c;">Serious</div>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #d97706;">${scanResult.summary.moderate}</div>
              <div style="color: #b45309;">Moderate</div>
            </div>
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${scanResult.summary.minor}</div>
              <div style="color: #1d4ed8;">Minor</div>
            </div>
          </div>
          
          <h2 style="color: #1e40af;">Issues Found</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Rule ID</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Severity</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Description</th>
              </tr>
            </thead>
            <tbody>
              ${violations.map(v => `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 12px; font-family: monospace;">${v.id}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                      ${v.impact === 'critical' ? 'background: #fee2e2; color: #dc2626;' :
                        v.impact === 'serious' ? 'background: #fed7aa; color: #ea580c;' :
                        v.impact === 'moderate' ? 'background: #fef3c7; color: #d97706;' : 
                        'background: #dbeafe; color: #2563eb;'}">
                      ${v.impact.toUpperCase()}
                    </span>
                  </td>
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${v.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This report was generated by <strong>Clynzer</strong> - AI-powered accessibility scanning platform.
              Visit <a href="https://clynzer.com" style="color: #2563eb;">clynzer.com</a> for more information.
            </p>
          </div>
        </div>
      `;

      const response = await fetch('/api/email/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          html: htmlContent,
          subject: `Clynzer Accessibility Report - ${scanResult.url}`,
          url: scanResult.url
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email report');
      }

      // Show confirmation modal instead of toast
      setConfirmationMessage(`Email sent to ${emailAddress}. Check your inbox.`);
      setShowConfirmationModal(true);
      setShowEmailModal(false);
      setEmailAddress('');
    } catch (error) {
      console.error('Email sending error:', error);
      setCopyToast({ show: true, message: 'Failed to send email report' });
      setTimeout(() => setCopyToast({ show: false, message: '' }), 2000);
    } finally {
      setEmailSending(false);
    }
  };

  // Trigger the scan
  async function scan() {
    // Validate URL using the new validation function
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    
    if (!isUrlValid) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }
    
    // Add protocol if missing
    let urlToScan = url.trim();
    if (!urlToScan.startsWith('http://') && !urlToScan.startsWith('https://')) {
      urlToScan = 'https://' + urlToScan;
    }

    setLoading(true);
    setError(null);
    setScanError(false); // Clear scan error state
    setUrlError(null); // Clear URL validation error
    setViolations([]);
    setScanResult(null);
    
    // Clear scroll positions for new scan
    setScrollPositions({});
    listRefs.current = {};

    try {
      console.log('Starting scan job for URL:', urlToScan);
      
      // 1. Start the scan job
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: urlToScan,
          includeAIFixes: includeAIFixes 
        }),
      });

      const jobData = await res.json();
      
      if (!res.ok) {
        throw new Error(jobData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      console.log('Scan job started:', jobData);
      const jobId = jobData.jobId;
      
      // 2. Poll for job completion
      const pollInterval = 2000; // Poll every 2 seconds
      const maxAttempts = 60; // Maximum 2 minutes
      let attempts = 0;
      
      const pollStatus = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          throw new Error('Scan job timed out after 2 minutes');
        }
        
        attempts++;
        
        try {
          const statusRes = await fetch(`/api/scan/status?jobId=${jobId}`);
          const statusData = await statusRes.json();
          
          if (!statusRes.ok) {
            throw new Error(statusData.error || 'Failed to check job status');
          }
          
          console.log(`Job ${jobId} status:`, statusData.status, `(${statusData.progress}%)`);
          
          switch (statusData.status) {
            case 'completed':
              // Job completed successfully
              console.log('Scan completed:', statusData.result);
              setScanResult(statusData.result);
              setViolations(statusData.result.violations || []);
              
              if (statusData.result.violations.length === 0) {
                setError('🎉 Great! No accessibility violations found on this page.');
              }
              break;
              
            case 'failed':
              // Job failed
              throw new Error(statusData.error || 'Scan job failed');
              
            case 'active':
            case 'waiting':
              // Job is still processing, continue polling
              setTimeout(pollStatus, pollInterval);
              break;
              
            default:
              // Unknown status, continue polling
              setTimeout(pollStatus, pollInterval);
              break;
          }
        } catch (pollError) {
          console.error('Error polling job status:', pollError);
          throw pollError;
        }
      };
      
      // Start polling
      await pollStatus();
      
    } catch (e: any) {
      console.error('Scan error:', e);
      setScanError(true); // Set scan error state
      setError(e.message || 'An error occurred during scanning');
    } finally {
      setLoading(false);
    }
  }

  // Retry function for the ErrorCard
  const handleRetry = () => {
    setScanError(false);
    scan();
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
      {/* Skip to content link */}
      <a 
        href="#main" 
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to content
      </a>

      {/* CSS for focus-visible styles */}
      <style jsx>{`
        .result-card:focus-visible,
        button:focus-visible,
        a:focus-visible {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }
        
        .bg-white:focus-visible {
          outline-color: #3b82f6 !important;
        }
        
        .bg-purple-600:focus-visible,
        .bg-purple-700:focus-visible {
          outline-color: #fbbf24 !important;
        }
        
        details:focus-visible > summary {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }
      `}</style>
      
      {/* Header with Authentication */}
      <header className={`backdrop-blur-sm border-b sticky top-0 z-50 transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-800/90 border-gray-700/50' 
          : 'bg-white/80 border-gray-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <img 
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTEgMTRMMTkgNk0yMSAxMkEzIDMgMCAwMTEyIDNBMTAuOTc0IDEwLjk3NCAwIDAwMTIgM0EyMSAyMSAwIDAwMTIgM1oiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+"
                  alt="Clynzer logo"
                  className="w-6 h-6"
                />
              </div>
              <h1 className={`text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${
                darkMode ? 'opacity-90' : ''
              }`}>
                Clynzer
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                {/* Dashboard Link */}
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 border ${
                    darkMode 
                      ? 'text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/40 border-blue-600/30' 
                      : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Dashboard
                </Link>

                {/* New Scan Button */}
                <button
                  onClick={() => {
                    setUrl('');
                    setError(null);
                    setViolations([]);
                    setScanResult(null);
                    document.getElementById('url-input')?.focus();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Scan
                </button>

                {/* User Avatar with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    {(user?.firstName || user?.username || 'U')[0].toUpperCase()}
                  </button>
                  
                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-2 z-50 transition-all duration-200 ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-700' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className={`px-4 py-2 border-b ${
                        darkMode ? 'border-gray-700' : 'border-gray-100'
                      }`}>
                        <p className={`text-sm font-medium ${
                          darkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>{user?.firstName || user?.username || 'User'}</p>
                        <p className={`text-xs ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>debuguser@example.com</p>
                      </div>
                      <button 
                        onClick={() => openUserProfile()}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          darkMode 
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </button>
                      <button 
                        onClick={() => signOut()}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          darkMode 
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main" aria-labelledby="results-heading" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main app content - directly accessible for debugging */}
        <div className="space-y-8">
            {/* Hero section for authenticated users */}
            <div className="text-center py-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-2xl">
              <h2 className="text-3xl font-bold mb-4">Scan Any Website for Accessibility</h2>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Enter a URL below to discover accessibility issues and get detailed recommendations for improvements
              </p>
            </div>

            {/* URL input section */}
            <div className={`rounded-xl shadow-lg p-8 border relative transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-100'
            }`}>
              {/* Loading overlay */}
              {loading && (
                <div className={`absolute inset-0 bg-opacity-90 rounded-xl flex items-center justify-center z-10 ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                      <svg className="animate-spin w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <p className={`text-lg font-medium mb-2 ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>Scanning Website...</p>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {includeAIFixes ? 'Analyzing accessibility issues and generating AI-powered fixes' : 'Analyzing accessibility issues'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className={`max-w-2xl mx-auto ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                <label htmlFor="url-input" className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Website URL
                </label>
                <div className="relative">
                  <input
                    id="url-input"
                    type="text"
                    placeholder="Enter website URL (e.g., https://example.com or google.com)"
                    value={url}
                    onChange={e => handleUrlChange(e.target.value)}
                    onBlur={handleUrlBlur}
                    onKeyPress={e => e.key === 'Enter' && !loading && isUrlValid && url.trim() && scan()}
                    disabled={loading}
                    aria-invalid={urlError ? 'true' : 'false'}
                    aria-describedby={urlError ? 'url-error' : 'url-help'}
                    className={`w-full p-4 pr-12 border-2 rounded-xl text-lg focus:outline-none transition-all duration-200 focus:shadow-lg disabled:cursor-not-allowed ${
                      urlError
                        ? darkMode 
                          ? 'border-red-500 bg-gray-700 text-gray-100 placeholder-gray-400 focus:border-red-400'
                          : 'border-red-500 bg-white text-gray-900 placeholder-gray-500 focus:border-red-400'
                        : darkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 focus:border-blue-400 disabled:bg-gray-600'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 disabled:bg-gray-100'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className={`w-5 h-5 ${
                      darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                  </div>
                </div>
                
                {/* URL Error Message */}
                {urlError && (
                  <div 
                    id="url-error"
                    role="alert"
                    aria-live="polite"
                    className={`text-sm mt-2 flex items-center ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {urlError}
                  </div>
                )}
                
                {/* Help Text */}
                <p 
                  id="url-help"
                  className={`text-sm mt-3 flex items-center ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Try: google.com, github.com, or any website you want to test
                </p>
              </div>
            </div>

            {/* AI Fixes Toggle */}
            <div className="text-center">
              <div className={`inline-flex items-center rounded-xl p-4 shadow-lg border transition-all duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-100'
              } ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAIFixes}
                    onChange={(e) => setIncludeAIFixes(e.target.checked)}
                    disabled={loading}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${includeAIFixes ? 'bg-purple-600' : 'bg-gray-200'} ${loading ? 'opacity-50' : ''}`}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${includeAIFixes ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <div className="ml-3">
                    <span className={`text-sm font-medium flex items-center ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Generate AI-Powered Fix Recommendations
                    </span>
                    <span className={`text-xs block ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Uses OpenAI to provide detailed code examples and solutions
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Scan button */}
            <div className="text-center">
              <button
                onClick={scan}
                disabled={loading || !url.trim() || !isUrlValid}
                className={`inline-flex items-center px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 transform ${
                  loading || !url.trim() || !isUrlValid
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1'
                }`}
              >
                {loading ? (
                  <div 
                    className="flex flex-col items-center w-full"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="w-full max-w-xs mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-ping opacity-50"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      Scanning your site… this may take 20–30 seconds.
                    </span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Run Accessibility Scan
                  </>
                )}
              </button>
            </div>

            {/* Error messages */}
            {scanError && (
              <ErrorCard 
                message="Oops—couldn't reach that site. Check your URL and try again."
                onRetry={handleRetry}
                darkMode={darkMode}
              />
            )}
            
            {error && !scanError && (
              <div className={`p-6 rounded-xl border-l-4 shadow-lg transition-all duration-300 ${
                error.includes('🎉') 
                  ? darkMode 
                    ? 'text-green-200 bg-green-900/30 border-green-400' 
                    : 'text-green-800 bg-green-50 border-green-400'
                  : darkMode 
                    ? 'text-red-200 bg-red-900/30 border-red-400' 
                    : 'text-red-800 bg-red-50 border-red-400'
              }`}>
                <div className="flex items-center">
                  {error.includes('🎉') ? (
                    <svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Summary */}
            {scanResult && (
              <div className={`result-card rounded-xl shadow-lg p-8 border transition-all duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 id="results-heading" className={`text-2xl font-bold mb-2 ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>Scan Results</h3>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      <span className="font-medium">{scanResult.url}</span> • Scanned {new Date(scanResult.timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>{scanResult.summary.total}</div>
                    <div className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Total Issues</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {scanResult.summary.critical > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{scanResult.summary.critical}</div>
                      <div className="text-sm font-medium text-red-700">Critical</div>
                    </div>
                  )}
                  {scanResult.summary.serious > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{scanResult.summary.serious}</div>
                      <div className="text-sm font-medium text-orange-700">Serious</div>
                    </div>
                  )}
                  {scanResult.summary.moderate > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{scanResult.summary.moderate}</div>
                      <div className="text-sm font-medium text-yellow-700">Moderate</div>
                    </div>
                  )}
                  {scanResult.summary.minor > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{scanResult.summary.minor}</div>
                      <div className="text-sm font-medium text-blue-700">Minor</div>
                    </div>
                  )}
                </div>
                
                {/* Export Buttons */}
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* PDF Export Button */}
                    <button
                      onClick={generatePDFReport}
                      className={`inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl ${
                        darkMode 
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white' 
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export PDF
                    </button>

                    {/* CSV Export Button */}
                    <button
                      onClick={generateCSVReport}
                      className={`inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl ${
                        darkMode 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>

                    {/* Email Report Button */}
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className={`inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl ${
                        darkMode 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email Report
                    </button>
                  </div>
                  
                  <div className="text-center">
                    <p className={`text-xs ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Download comprehensive accessibility reports or email them directly
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI-Powered Fixes Section */}
            {scanResult && scanResult.aiFixes && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-lg border border-purple-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-purple-200 bg-gradient-to-r from-purple-600 to-indigo-600">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">🤖 AI-Powered Fix Recommendations</h4>
                      <p className="text-purple-100 mt-1">Detailed solutions generated by AI to help you fix these accessibility issues</p>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6 bg-white">
                  <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
                    <ReactMarkdown 
                      components={{
                        code: ({children, ...props}) => {
                          const isInline = !props.className;
                          return isInline ? (
                            <code className="bg-gray-100 text-purple-600 px-2 py-1 rounded text-sm font-mono" {...props}>
                              {children}
                            </code>
                          ) : (
                            <details className="bg-gray-50 border border-gray-200 rounded-lg mb-4 overflow-hidden">
                              <summary className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 cursor-pointer hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium">
                                🔧 How to Fix - Click to Expand Code Example
                              </summary>
                              <div className="p-4">
                                <div className="relative">
                                  <button
                                    onClick={() => copyToClipboard(String(children))}
                                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                                    title="Copy code to clipboard"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                  </button>
                                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                                    <code className="text-sm font-mono" {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                </div>
                              </div>
                            </details>
                          );
                        },
                        h1: ({children}) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4">{children}</h1>,
                        h2: ({children}) => <h2 className="text-xl font-bold text-gray-800 mt-5 mb-3">{children}</h2>,
                        h3: ({children}) => <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">{children}</h3>,
                        p: ({children}) => <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700">{children}</ol>,
                        li: ({children}) => <li className="ml-4">{children}</li>,
                        strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      }}
                    >
                      {scanResult.aiFixes}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">💡 How to use these recommendations:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Copy the code examples and adapt them to your website</li>
                          <li>Test each fix to ensure it resolves the issue</li>
                          <li>Re-scan your website to verify the fixes work</li>
                          <li>Consider implementing these fixes across your entire website</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results list with WCAG grouping */}
            {violations.length > 0 && (
              <ResultsList 
                violations={violations} 
                darkMode={darkMode} 
                onCopyFix={copyToClipboard}
                scrollPositions={scrollPositions}
                listRefs={listRefs}
                onScrollPositionChange={handleScrollPositionChange}
              />
            )}
          </div>
      </main>

      {/* Copy Toast Notification */}
      {copyToast.show && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {copyToast.message}
        </div>
      )}

      {/* Email Report Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl shadow-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>Email Accessibility Report</h3>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailAddress('');
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter email address"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              
              <div className={`mb-4 p-3 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  The report will include a summary of all accessibility issues found and detailed recommendations for fixes.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailAddress('');
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={sendEmailReport}
                  disabled={emailSending || !emailAddress.trim()}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {emailSending ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    'Send Report'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <ConfirmationModal 
          message={confirmationMessage}
          onClose={() => setShowConfirmationModal(false)}
        />
      )}

      {/* Sticky Footer */}
      <footer className={`sticky top-[100vh] border-t mt-16 transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <a href="#" className={`text-sm transition-colors ${
                darkMode 
                  ? 'text-gray-400 hover:text-blue-400' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}>
                Docs
              </a>
              <a href="/pricing" className={`text-sm transition-colors ${
                darkMode 
                  ? 'text-gray-400 hover:text-blue-400' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}>
                Pricing
              </a>
              <a href="#" className={`text-sm transition-colors ${
                darkMode 
                  ? 'text-gray-400 hover:text-blue-400' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}>
                Support
              </a>
            </div>
            <div className={`text-sm ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              © 2025 Clynzer. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
