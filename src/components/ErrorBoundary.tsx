import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCcw, ShieldAlert } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Boundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-red-100 shadow-sm animate-in fade-in zoom-in duration-500 max-w-lg mx-auto my-12">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-bank-navy mb-2">Terminal Interaction Error</h2>
                    <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                        The requested module encountered a runtime exception. This incident has been logged for administrative review.
                    </p>
                    <div className="p-4 bg-gray-50 rounded-xl mb-8 text-left border border-gray-100 font-mono text-[10px] text-red-600 overflow-auto max-h-32">
                        {this.state.error?.message}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="w-full bg-bank-navy text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-opacity-90 transition-all shadow-lg"
                    >
                        <RefreshCcw size={18} />
                        <span>Restart Module</span>
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
