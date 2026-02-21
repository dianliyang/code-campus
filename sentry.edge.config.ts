// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const sendConsoleErrors = process.env.SENTRY_CAPTURE_CONSOLE_ERRORS === "true";

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: isProd ? 0.1 : 1,
  integrations: sendConsoleErrors ? [Sentry.consoleLoggingIntegration({ levels: ["error"] })] : [],
  enableLogs: sendConsoleErrors,
  sendDefaultPii: false,
});
