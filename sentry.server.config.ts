// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
