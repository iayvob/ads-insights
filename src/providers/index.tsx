"use client";
import { ReactNode } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Toaster } from "../components/ui/toaster";

interface ProvidersProps {
  children: ReactNode;
}

// Simple error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert" className="error-fallback">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
    </div>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary errorComponent={ErrorFallback}>
      {children}
      <Toaster />
    </ErrorBoundary>
  );
}
