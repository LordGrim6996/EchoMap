import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('EchoMap Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-brand-dark via-slate-900 to-black">
                    <div className="max-w-md w-full bg-brand-surface/80 backdrop-blur-xl p-8 rounded-3xl border border-red-500/20 shadow-2xl text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                        <p className="text-slate-400 text-sm mb-6">
                            EchoMap encountered an unexpected error. Please try reloading the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-violet-500 text-white font-semibold hover:brightness-110 active:scale-95 transition shadow-lg shadow-brand-primary/20"
                        >
                            Reload App
                        </button>
                        {this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                                    Technical details
                                </summary>
                                <pre className="mt-2 text-xs text-red-300/70 bg-black/30 p-3 rounded-lg overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
