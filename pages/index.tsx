import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useClerk, useUser } from '@clerk/nextjs';

// Define the shape of an accessibility violation
interface Violation {
  id: string;
  impact: string;
  description: string;
  help?: string;
  helpUrl?: string;
  nodes?: number;
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

export default function Home() {
  // Clerk hooks
  const { signOut, openUserProfile } = useClerk();
  const { isSignedIn, isLoaded, user } = useUser();
  
  // UI state
  const [url, setUrl] = useState('');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [aiFixesLoading, setAiFixesLoading] = useState(false);
  const [includeAIFixes, setIncludeAIFixes] = useState(true);
  const [copyToast, setCopyToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  // Trigger the scan
  async function scan() {
    // Basic URL validation
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    
    // Add protocol if missing
    let urlToScan = url.trim();
    if (!urlToScan.startsWith('http://') && !urlToScan.startsWith('https://')) {
      urlToScan = 'https://' + urlToScan;
    }
    
    try {
      new URL(urlToScan); // Validate URL format
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setLoading(true);
    setError(null);
    setViolations([]);
    setScanResult(null);

    try {
      console.log('Scanning URL:', urlToScan);
      
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: urlToScan,
          includeAIFixes: includeAIFixes 
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      console.log('Scan response:', data);
      setScanResult(data);
      setViolations(data.violations || []);
      
      if (data.violations.length === 0) {
        setError('🎉 Great! No accessibility violations found on this page.');
      }
    } catch (e: any) {
      console.error('Scan error:', e);
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
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
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                    onChange={e => setUrl(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && !loading && scan()}
                    disabled={loading}
                    className={`w-full p-4 pr-12 border-2 rounded-xl text-lg focus:outline-none transition-all duration-200 focus:shadow-lg disabled:cursor-not-allowed ${
                      darkMode 
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
                <p className={`text-sm mt-3 flex items-center ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
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
                disabled={loading || !url.trim()}
                className={`inline-flex items-center px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 transform ${
                  loading || !url.trim() 
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scanning Website...
                  </>
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

            {/* Error message */}
            {error && (
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
              <div className={`rounded-xl shadow-lg p-8 border transition-all duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-2xl font-bold mb-2 ${
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
                
                {/* PDF Report Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={generatePDFReport}
                    className={`inline-flex items-center px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl ${
                      darkMode 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white' 
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate PDF Report
                  </button>
                  <p className={`text-xs mt-2 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Download a comprehensive accessibility report
                  </p>
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

            {/* Results table */}
            {violations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-200">
                  <h4 className="text-xl font-bold text-gray-900">Accessibility Issues</h4>
                  <p className="text-gray-600 mt-1">Click on any help link to learn how to fix these issues</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rule</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Severity</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Learn More</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {violations.map((v, index) => (
                        <tr key={`${v.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-gray-900 font-medium">{v.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              v.impact === 'critical' ? 'text-red-800 bg-red-100' : 
                              v.impact === 'serious' ? 'text-orange-800 bg-orange-100' :
                              v.impact === 'moderate' ? 'text-yellow-800 bg-yellow-100' : 'text-blue-800 bg-blue-100'
                            }`}>
                              {v.impact}
                            </span>
                            {v.nodes && <div className="text-xs text-gray-500 mt-1">{v.nodes} elements affected</div>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                            <div className="line-clamp-3">{v.description}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {v.helpUrl ? (
                              <a 
                                href={v.helpUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium hover:underline"
                              >
                                {v.help || 'Learn more'}
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-gray-500 italic">{v.help || 'No additional help available'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
