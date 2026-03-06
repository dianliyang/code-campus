"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
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
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-100 bg-rose-50/10">
        <AlertCircle className="h-5 w-5 text-rose-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-foreground">
        Something went wrong
      </h3>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600/70">
        Fatal sequence error
      </p>
      <p className="mt-3 max-w-[280px] text-sm leading-6 text-muted-foreground">
        An unexpected error occurred. Our team has been notified. Ref: {error.digest || "unknown"}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button 
          variant="outline" 
          onClick={reset}
          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Try Again
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/overview">Return Home</Link>
        </Button>
      </div>
    </div>
  );
}
