import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

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
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
          <AlertTriangle size={40} className="text-destructive" />
          <div>
            <h2 className="text-base font-semibold mb-1">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {this.state.error.message}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            onClick={() => this.setState({ error: null })}
          >
            <RotateCcw size={14} />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
