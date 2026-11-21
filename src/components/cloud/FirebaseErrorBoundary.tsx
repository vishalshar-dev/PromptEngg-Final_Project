import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class FirebaseErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application boundary caught error:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#F7F8FA] text-[#151922] flex items-center justify-center p-4">
        <div className="surface-card max-w-md w-full p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDECEC] text-[#DE5252] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#151922]">
                Something went wrong
              </h1>
              <p className="text-xs text-[#697386] mt-1 leading-relaxed break-words">
                {this.state.errorMessage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary w-full px-4 py-2.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload CartAudit</span>
          </button>
        </div>
      </div>
    );
  }
}
