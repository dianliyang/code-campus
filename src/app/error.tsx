"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-red-100">
          <span className="text-2xl text-red-500">!</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase mb-4">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
          An unexpected error occurred. Our team has been notified.
        </p>
        <button
          onClick={reset}
          className="btn-primary px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-widest"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
