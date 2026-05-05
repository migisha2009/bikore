import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error to monitoring service in production
    if (__DEV__ === false) {
      // Example: Send to crashlytics, sentry, etc.
      // crashlytics().recordError(error);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              {__DEV__ 
                ? this.state.error?.message || 'An unexpected error occurred'
                : 'An unexpected error occurred. Please try again.'
              }
            </Text>
            
            {__DEV__ && this.state.error && (
              <Text style={styles.errorDetail}>
                {this.state.error.stack}
              </Text>
            )}
            
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={this.handleRetry}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C4A2E',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorDetail: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  actions: {
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#2C4A2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default ErrorBoundary;
