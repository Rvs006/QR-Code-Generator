import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', fontFamily: "'Inter', -apple-system, sans-serif", background: '#f8f9fa', color: '#1a1a2e' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '0.75rem' }}>Something went wrong</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              An unexpected error occurred. Your data is safe — try reloading the page.
            </p>
            {this.state.error && (
              <pre style={{ fontSize: '12px', color: '#9ca3af', background: '#f3f4f6', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', textAlign: 'left', maxHeight: '120px', overflow: 'auto' }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              data-testid="button-reload"
              onClick={() => window.location.reload()}
              style={{ background: '#2A5A9E', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
