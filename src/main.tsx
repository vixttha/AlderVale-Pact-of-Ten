import { Component, type ReactNode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class GameErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" className="grid min-h-screen place-content-center gap-4 bg-[#182033] px-6 text-center text-[#f7f0e2]">
        <h1 className="font-display text-2xl font-bold">The game stopped unexpectedly</h1>
        <button className="mx-auto rounded-lg bg-[#f4c98b] px-4 py-2 text-[#241b16]" onClick={() => window.location.reload()}>Reload AlderVale</button>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(<GameErrorBoundary><App /></GameErrorBoundary>);
