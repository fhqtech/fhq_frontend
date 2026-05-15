import { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
    // No-op if Sentry was never initialized (DSN unset).
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background px-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted">
              We hit an unexpected error. Reload the page, and if the problem keeps happening please contact support.
            </p>
            {import.meta.env.DEV && (
              <pre className="text-left text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex justify-center gap-2">
              <button
                onClick={this.reset}
                className="px-4 py-2 rounded bg-foreground text-background text-sm"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded border border-border text-sm"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
