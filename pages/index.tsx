import { useState } from 'react';

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
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

export default function Home() {
  // UI state
  const [url, setUrl] = useState('');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

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
        body: JSON.stringify({ url: urlToScan }),
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
    <div style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>AI Accessibility Scanner</h1>

      {/* URL input */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Enter website URL (e.g., https://example.com or google.com)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && !loading && scan()}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '0.5rem',
            border: '2px solid #ccc',
            borderRadius: 6,
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
        />
        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
          Try: google.com, github.com, or any website you want to test
        </p>
      </div>

      {/* Scan button */}
      <button
        onClick={scan}
        disabled={loading || !url.trim()}
        style={{
          padding: '0.75rem 1.5rem',
          marginBottom: '1rem',
          backgroundColor: loading || !url.trim() ? '#ccc' : '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          fontSize: '16px',
          cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Scanning... Please wait' : 'Run Accessibility Scan'}
      </button>

      {/* Error message */}
      {error && (
        <div style={{ 
          color: violations.length === 0 && error.includes('No accessibility violations') ? 'green' : 'red',
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: violations.length === 0 && error.includes('No accessibility violations') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${violations.length === 0 && error.includes('No accessibility violations') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: 4
        }}>
          {error}
        </div>
      )}

      {/* Summary */}
      {scanResult && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: 6,
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Scan Summary for {scanResult.url}</h3>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '14px', color: '#666' }}>
            Scanned on {new Date(scanResult.timestamp).toLocaleString()}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span><strong>Total Issues:</strong> {scanResult.summary.total}</span>
            {scanResult.summary.critical > 0 && <span style={{ color: '#dc3545' }}><strong>Critical:</strong> {scanResult.summary.critical}</span>}
            {scanResult.summary.serious > 0 && <span style={{ color: '#fd7e14' }}><strong>Serious:</strong> {scanResult.summary.serious}</span>}
            {scanResult.summary.moderate > 0 && <span style={{ color: '#ffc107' }}><strong>Moderate:</strong> {scanResult.summary.moderate}</span>}
            {scanResult.summary.minor > 0 && <span style={{ color: '#6f42c1' }}><strong>Minor:</strong> {scanResult.summary.minor}</span>}
          </div>
        </div>
      )}

      {/* Results table */}
      {violations.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ccc', padding: '0.75rem', textAlign: 'left' }}>Rule</th>
              <th style={{ border: '1px solid #ccc', padding: '0.75rem', textAlign: 'left' }}>Impact</th>
              <th style={{ border: '1px solid #ccc', padding: '0.75rem', textAlign: 'left' }}>Description</th>
              <th style={{ border: '1px solid #ccc', padding: '0.75rem', textAlign: 'left' }}>Help</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v, index) => (
              <tr key={`${v.id}-${index}`}>
                <td style={{ border: '1px solid #ccc', padding: '0.75rem', fontFamily: 'monospace' }}>{v.id}</td>
                <td style={{ 
                  border: '1px solid #ccc', 
                  padding: '0.75rem',
                  color: v.impact === 'critical' ? '#dc3545' : 
                         v.impact === 'serious' ? '#fd7e14' :
                         v.impact === 'moderate' ? '#ffc107' : '#6f42c1',
                  fontWeight: 'bold'
                }}>
                  {v.impact}
                  {v.nodes && ` (${v.nodes} elements)`}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '0.75rem' }}>{v.description}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.75rem' }}>
                  {v.helpUrl ? (
                    <a href={v.helpUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007acc' }}>
                      {v.help || 'Learn more'}
                    </a>
                  ) : (
                    v.help || 'No additional help available'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
