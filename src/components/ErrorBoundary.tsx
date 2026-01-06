/**
 * Error Boundary Component
 *
 * Catches React component errors and displays fallback UI.
 * Automatically reports errors to Sentry for monitoring.
 */

import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Send to Sentry with component stack trace
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full">
            <div className="glass-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>

              <p className="text-muted-foreground mb-6">
                We've been notified and are working on a fix. Try refreshing the page or going back to the dashboard.
              </p>

              {/* Show error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 rounded-lg bg-muted text-left">
                  <p className="font-mono text-xs text-destructive mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">
                        Component Stack
                      </summary>
                      <pre className="mt-2 overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  onClick={() => (window.location.href = '/dashboard')}
                  variant="electric"
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export both the Sentry-wrapped version and the raw class
export const ErrorBoundary = Sentry.withErrorBoundary(ErrorBoundaryClass, {
  fallback: ({ error, resetError }) => (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full">
        <div className="glass-card p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Critical Error
          </h1>

          <p className="text-muted-foreground mb-6">
            The application encountered a critical error. Please refresh the page.
          </p>

          {import.meta.env.DEV && (
            <div className="mb-6 p-4 rounded-lg bg-muted text-left">
              <p className="font-mono text-xs text-destructive">
                {error?.toString()}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={resetError} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="electric"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  ),
  showDialog: false, // Don't show Sentry's default dialog
});

export default ErrorBoundary;
