import { Component } from 'react';

/** Last line of defence: a render error shows a recovery card instead of a blank page. */
export default class AppBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('App crashed:', error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F5F8FF', color: '#0A1A3F', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', background: '#fff', border: '1px solid #D5E1F5', borderRadius: 24, padding: '36px 28px', boxShadow: '0 18px 50px rgba(11,11,15,0.09)' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#0E9F6E', marginBottom: 10 }}>{'// something went wrong'}</div>
          <h1 style={{ fontSize: 26, margin: '0 0 10px' }}>This page hit a snag</h1>
          <p style={{ fontSize: 14, color: '#41527A', margin: '0 0 22px', lineHeight: 1.6 }}>Please reload. If it keeps happening, tell the club admins which page you were on.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', borderRadius: 999, background: 'linear-gradient(120deg,#1F4FD8,#2E7BFF)', color: '#fff', fontWeight: 600, fontSize: 14 }}>Reload page</button>
          <div style={{ marginTop: 14 }}><a href="/" style={{ fontSize: 13, color: '#1F4FD8' }}>Back to home</a></div>
        </div>
      </div>
    );
  }
}
