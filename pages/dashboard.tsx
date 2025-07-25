import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScanHistory {
  id: string;
  url: string;
  timestamp: string;
  violationCount: number;
  status: 'completed' | 'failed';
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

export default function Dashboard() {
  // Mock authentication state for debugging
  const isSignedIn = true;
  const isLoaded = true;
  const user = { firstName: 'Debug', username: 'debuguser' };
  
  const router = useRouter();
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ScanHistory[]>([]);
  const [filterUrl, setFilterUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScans: 0,
    totalViolations: 0,
    averageViolations: 0,
    lastScanDate: null as string | null,
  });

  // Load user's scan history (mock data for now)
  useEffect(() => {
    if (isSignedIn && user) {
      // Simulate loading scan history
      setTimeout(() => {
        const mockHistory: ScanHistory[] = [
          {
            id: '1',
            url: 'https://example.com',
            timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            violationCount: 5,
            status: 'completed',
            summary: {
              total: 5,
              critical: 1,
              serious: 2,
              moderate: 1,
              minor: 1,
            },
          },
          {
            id: '2',
            url: 'https://github.com',
            timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            violationCount: 12,
            status: 'completed',
            summary: {
              total: 12,
              critical: 3,
              serious: 4,
              moderate: 3,
              minor: 2,
            },
          },
          {
            id: '3',
            url: 'https://google.com',
            timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
            violationCount: 2,
            status: 'completed',
            summary: {
              total: 2,
              critical: 0,
              serious: 1,
              moderate: 1,
              minor: 0,
            },
          },
          {
            id: '4',
            url: 'https://stackoverflow.com',
            timestamp: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
            violationCount: 8,
            status: 'completed',
            summary: {
              total: 8,
              critical: 2,
              serious: 3,
              moderate: 2,
              minor: 1,
            },
          },
          {
            id: '5',
            url: 'https://reddit.com',
            timestamp: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
            violationCount: 15,
            status: 'completed',
            summary: {
              total: 15,
              critical: 4,
              serious: 6,
              moderate: 3,
              minor: 2,
            },
          },
          {
            id: '6',
            url: 'https://npmjs.com',
            timestamp: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
            violationCount: 3,
            status: 'completed',
            summary: {
              total: 3,
              critical: 0,
              serious: 1,
              moderate: 1,
              minor: 1,
            },
          },
          {
            id: '7',
            url: 'https://medium.com',
            timestamp: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
            violationCount: 7,
            status: 'completed',
            summary: {
              total: 7,
              critical: 1,
              serious: 3,
              moderate: 2,
              minor: 1,
            },
          },
        ];

        setScanHistory(mockHistory);
        setFilteredHistory(mockHistory);
        
        // Calculate stats
        const totalScans = mockHistory.length;
        const totalViolations = mockHistory.reduce((sum, scan) => sum + scan.violationCount, 0);
        const averageViolations = totalScans > 0 ? Math.round(totalViolations / totalScans) : 0;
        const lastScanDate = mockHistory.length > 0 ? mockHistory[0].timestamp : null;

        setStats({
          totalScans,
          totalViolations,
          averageViolations,
          lastScanDate,
        });

        setLoading(false);
      }, 1000);
    }
  }, [isSignedIn, user]);

  // Filter effect
  useEffect(() => {
    if (filterUrl.trim() === '') {
      setFilteredHistory(scanHistory);
    } else {
      const filtered = scanHistory.filter(scan => 
        scan.url.toLowerCase().includes(filterUrl.toLowerCase())
      );
      setFilteredHistory(filtered);
    }
  }, [filterUrl, scanHistory]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'serious': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'minor': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                New Scan
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(user.firstName || user.username || 'U')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-8 shadow-2xl">
            <h2 className="text-3xl font-bold mb-3">
              Welcome back, {user?.firstName || user?.username || 'User'}! 👋
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl">
              Here's an overview of your accessibility scanning activity and insights.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Scans</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats.totalScans}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Issues</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats.totalViolations}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg. Issues</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats.averageViolations}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Last Scan</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {stats.lastScanDate ? formatDate(stats.lastScanDate).split(',')[0] : 'Never'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Input */}
        <div className="bg-white shadow-xl rounded-2xl border border-gray-100 mb-6">
          <div className="p-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter scans by URL..."
                value={filterUrl}
                onChange={(e) => setFilterUrl(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {filterUrl && (
                <button
                  onClick={() => setFilterUrl('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {filterUrl && (
              <p className="mt-2 text-sm text-gray-600">
                {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
        </div>

        {/* Recent Scans */}
        <div className="bg-white shadow-2xl rounded-2xl border border-gray-100 mb-12">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Recent Scans</h3>
                <p className="text-gray-600 mt-1">Your latest accessibility scan results</p>
              </div>
              {filterUrl && (
                <button
                  onClick={() => setFilterUrl('')}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                  title="Clear filter to view all scans"
                >
                  Clear filter
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 opacity-20 animate-pulse"></div>
                </div>
                <p className="mt-6 text-gray-600 font-medium">Loading scan history...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {filterUrl ? 'No matching scans found' : 'No scans yet'}
                </h3>
                <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                  {filterUrl ? `No scans found matching "${filterUrl}". Try a different search term.` : 'Get started by scanning your first website for accessibility issues.'}
                </p>
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-1"
                  >
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Start Your First Scan
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((scan) => (
                  <div key={scan.id} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-6 transition-all duration-200 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex-shrink-0">
                            <div className={`w-3 h-3 rounded-full ${
                              scan.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 truncate">{scan.url}</h4>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            scan.status === 'completed' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {scan.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                          📅 {formatDate(scan.timestamp)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {scan.violationCount}
                          </div>
                          <div className="text-sm text-gray-500">issues found</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {scan.summary.critical > 0 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-red-800 bg-red-100 border border-red-200">
                              🔴 {scan.summary.critical} Critical
                            </span>
                          )}
                          {scan.summary.serious > 0 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-orange-800 bg-orange-100 border border-orange-200">
                              🟠 {scan.summary.serious} Serious
                            </span>
                          )}
                          {scan.summary.moderate > 0 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-200">
                              🟡 {scan.summary.moderate} Moderate
                            </span>
                          )}
                          {scan.summary.minor > 0 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-800 bg-blue-100 border border-blue-200">
                              🔵 {scan.summary.minor} Minor
                            </span>
                          )}
                        </div>
                        <button className="text-gray-400 hover:text-blue-600 transition-colors p-2 hover:bg-white rounded-lg">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Issues Over Time Chart */}
        <div className="bg-white shadow-2xl rounded-2xl border border-gray-100 mb-12">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Issues Over Time</h3>
                <p className="text-gray-600 mt-1">Track your accessibility improvements</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Total Issues</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Critical Issues</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                <p className="mt-6 text-gray-600 font-medium">Loading chart data...</p>
              </div>
            ) : scanHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No data available</h3>
                <p className="text-gray-600">Run some scans to see your progress over time</p>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={scanHistory
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((scan) => ({
                        date: new Date(scan.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        totalIssues: scan.violationCount,
                        criticalIssues: scan.summary.critical,
                        url: scan.url,
                      }))
                    }
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      }}
                      labelFormatter={(value) => `Date: ${value}`}
                      formatter={(value, name) => [
                        value,
                        name === 'totalIssues' ? 'Total Issues' : 'Critical Issues'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalIssues" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: 'white' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="criticalIssues" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#ef4444', strokeWidth: 2, fill: 'white' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Link href="/" className="group">
            <div className="bg-white overflow-hidden shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="p-8">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-6">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      New Scan
                    </h3>
                    <p className="text-sm text-gray-600">
                      Scan a website for accessibility issues and get detailed insights
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <div className="relative">
            <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 opacity-60">
              <div className="p-8">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Detailed Reports
                    </h3>
                    <p className="text-sm text-gray-600">
                      View comprehensive accessibility reports with trends
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-orange-800 bg-orange-100 border border-orange-200">
                🚧 Coming Soon
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 opacity-60">
              <div className="p-8">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Settings
                    </h3>
                    <p className="text-sm text-gray-600">
                      Configure scan preferences and notification settings
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-orange-800 bg-orange-100 border border-orange-200">
                🚧 Coming Soon
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
