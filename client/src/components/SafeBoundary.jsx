import { Component } from 'react';

export default class SafeBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn('Decorative layer disabled:', err.message); }
  render() { return this.state.failed ? null : this.props.children; }
}
