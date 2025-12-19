import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{
            background: 'hsl(260 100% 3%)',
            backgroundImage: 'radial-gradient(circle at 15% 50%, hsl(239 84% 67% / 0.15) 0%, transparent 35%), radial-gradient(circle at 85% 30%, hsl(187 94% 43% / 0.12) 0%, transparent 35%)',
          }}
        >
          <div className="glass-card max-w-md w-full p-8 text-center">
            <div 
              className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'linear-gradient(135deg, hsl(0 84% 60% / 0.2), hsl(30 84% 60% / 0.2))',
              }}
            >
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              We encountered an unexpected error. Please try refreshing the page or return to the home screen.
            </p>
            
            {this.state.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-destructive font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                Go Home
              </Button>
              <Button 
                onClick={this.handleRefresh}
                className="flex-1"
                style={{
                  background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))',
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
