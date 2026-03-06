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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Something interrupted the dashboard
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            The page could not finish loading. Try again, or return to your courses and continue from there.
          </p>
        </div>
        {error.digest ? (
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
            Ref {error.digest}
          </p>
        ) : null}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
