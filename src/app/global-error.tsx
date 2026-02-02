"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html>
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          padding: "1rem",
        }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: 900,
              color: "#111827",
              letterSpacing: "-0.025em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}>
              Critical Error
            </h2>
            <p style={{
              fontSize: "0.875rem",
              color: "#6B7280",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}>
              A critical error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={reset}
              style={{
                background: "#111827",
                color: "#fff",
                border: "none",
                padding: "0.75rem 2rem",
                borderRadius: "0.75rem",
                fontSize: "0.75rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
