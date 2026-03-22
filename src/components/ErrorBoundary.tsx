import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="text-center max-w-md">
            <h1 className="font-display text-3xl text-foreground mb-3">
              Something went wrong
            </h1>
            <p className="font-body text-muted-foreground mb-6">
              We hit an unexpected error. Please refresh the page or contact us
              at (530) 966-0752 if the problem continues.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
              className="border-2 border-accent bg-accent text-accent-foreground px-6 py-3 text-xs uppercase tracking-[0.15em] font-body hover:bg-accent/90 transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
