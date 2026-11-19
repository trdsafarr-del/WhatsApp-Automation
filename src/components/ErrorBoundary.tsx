import React from 'react';
import { rtdbProjectMeta } from '../lib/rtdb';

function isPermissionDeniedError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('permission_denied') || lower.includes('permission denied');
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('OrderPulse ErrorBoundary caught error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isPerm = isPermissionDeniedError(this.state.message);

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/35 bg-slate-900/90 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">
            {isPerm ? 'Firebase Realtime Database Rules Required' : 'Application Error'}
          </p>
          <h1 className="mt-1.5 text-lg font-semibold text-white">
            {isPerm
              ? 'Realtime Database is still in Locked Mode'
              : 'Something went wrong while syncing data'}
          </h1>
          <p className="mt-2 break-words text-xs leading-relaxed text-slate-300">
            {isPerm
              ? 'Publish the admin-only Realtime Database Rules in Firebase Console (shopify-9351f) so your signed-in admin Google account can read and sync OrderPulse data.'
              : this.state.message}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {isPerm && (
              <a
                href={rtdbProjectMeta.rulesConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Open Firebase RTDB Rules
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
