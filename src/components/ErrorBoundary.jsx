import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global app crash:", error, errorInfo);
  }

  handleRestart = () => {
    window.location.assign("/setup");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-panel backdrop-blur md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-coral">
              Session Error
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-ink">
              Something went wrong — restart your session
            </h1>
            <button
              type="button"
              onClick={this.handleRestart}
              className="mt-8 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Restart session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
