'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Home, ArrowLeft, Bug } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto text-center space-y-8"
      >
        {/* Main Error Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-24 h-24 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center mb-4"
            >
              <Bug className="w-12 h-12 text-white" />
            </motion.div>

            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Something went wrong!
            </CardTitle>

            <CardDescription className="text-lg text-gray-600 mt-2">
              We encountered an unexpected error. Don't worry, it's not your
              fault.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Details */}
            <div className="text-center">
              <Badge
                variant="destructive"
                className="text-lg px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500"
              >
                Application Error
              </Badge>
            </div>

            {/* Error Message (if not sensitive) */}
            {process.env.NODE_ENV === 'development' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <div className="text-left">
                  <h4 className="font-medium text-red-800 mb-2">
                    Error Details (Development Mode)
                  </h4>
                  <p className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-red-600 mt-2">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Troubleshooting Tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <h4 className="font-medium text-blue-800 mb-2">
                What you can try:
              </h4>
              <ul className="text-sm text-blue-700 text-left space-y-1">
                <li>• Refresh the page to try again</li>
                <li>• Check your internet connection</li>
                <li>• Clear your browser cache and cookies</li>
                <li>• Try again in a few minutes</li>
              </ul>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button
                onClick={reset}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button
                variant="outline"
                onClick={handleGoHome}
                className="border-gray-300 hover:bg-gray-50 transition-all duration-300"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>

              <Button
                variant="ghost"
                onClick={handleGoBack}
                className="hover:bg-gray-50 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-500 text-sm space-y-2"
        >
          <p>
            If this problem persists, please{' '}
            <button
              onClick={() =>
                (window.location.href =
                  'mailto:support@adinsights.com?subject=Application Error&body=' +
                  encodeURIComponent(
                    `Error: ${error.message}\nTime: ${new Date().toISOString()}\nPage: ${window.location.href}`
                  ))
              }
              className="text-blue-600 hover:text-blue-800 underline"
            >
              contact our support team
            </button>
          </p>
          <p className="text-xs text-gray-400">
            Include the error details and steps to reproduce the issue
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
