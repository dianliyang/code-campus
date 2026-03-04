"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";import { Card } from "@/components/ui/card";

export default function Error({
  error,
  reset



}: {error: Error & {digest?: string;};reset: () => void;}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <Card>
          <span className="text-2xl text-red-500">!</span>
        </Card>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
          An unexpected error occurred. Our team has been notified.
        </p>
        <Button variant="outline" onClick={reset}>
          Try Again
        </Button>
      </div>
    </div>);

}