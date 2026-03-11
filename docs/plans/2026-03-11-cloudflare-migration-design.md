# Cloudflare Migration Design

## Summary

Migrate Athena off Vercel onto Cloudflare by keeping the existing Next.js application intact for the first production cutover, then incrementally replacing platform-specific concerns with Cloudflare-native equivalents.

This keeps the current App Router, route handlers, auth/session flow, Supabase integration, and PWA behavior stable while removing explicit Vercel dependencies and introducing a Cloudflare Workers deployment path.

## Recommended Approach

Use a hybrid migration in two phases:

1. Phase 1: deploy the current Next.js app to Cloudflare Workers using the Cloudflare OpenNext adapter.
2. Phase 2: move operational concerns such as cron execution and any edge/runtime-specific helpers to native Cloudflare Worker patterns where it improves portability or operational clarity.

This is the lowest-risk option for this repo because the existing Vercel-specific surface area is small while the application itself relies on server-rendered Next.js behavior throughout the dashboard and API routes.

## Existing Vercel Coupling

The repo currently has a small number of explicit Vercel dependencies:

- `vercel.json` configures build commands and a daily cron.
- `src/app/layout.tsx` mounts `@vercel/analytics` and `@vercel/speed-insights`.
- `next.config.ts` enables `automaticVercelMonitors` in the Sentry plugin.
- `src/lib/vercel/edge-config.ts` contains a Vercel Edge Config helper.

The Edge Config helper appears unused in the current app code, which makes it a good candidate for deletion in Phase 1 after verifying there are no dynamic imports or out-of-tree consumers.

## Target Architecture

### Runtime

The production runtime becomes Cloudflare Workers, not Vercel and not Cloudflare Pages Functions. The application remains a Next.js app deployed with Cloudflare's supported Next-on-Workers path.

### Application

The current Next.js structure remains in place:

- App Router pages continue to render through Next.js SSR/RSC.
- Route handlers under `src/app/api/**` continue to handle application APIs.
- Auth/session refresh behavior continues to run through `src/proxy.ts`.
- Supabase remains the system of record and auth backend.

### Platform services

Phase 1 should not introduce unnecessary Cloudflare products. Only the deployment/runtime layer changes immediately. Later phases can move operational concerns to native Cloudflare services only when there is a concrete benefit.

## Component Design

### 1. Deployment and build

Add Cloudflare deployment configuration:

- `wrangler.jsonc` or `wrangler.toml`
- Cloudflare-compatible build and deploy scripts in `package.json`
- OpenNext adapter dependency and output wiring

The goal is to produce a repeatable local build and production deploy path without changing application behavior.

### 2. Platform-specific cleanup

Remove or replace explicit Vercel integrations:

- remove Vercel Analytics and Speed Insights from `src/app/layout.tsx`
- remove `automaticVercelMonitors` from `next.config.ts`
- retire `vercel.json`
- delete `src/lib/vercel/edge-config.ts` if final verification confirms it is unused

### 3. Environment and secrets

Preserve the existing environment contract where possible:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- AI provider keys
- Resend/email configuration
- `CRON_SECRET`
- Sentry secrets if used in CI/build

Cloudflare should provide these via vars/secrets so app code can keep reading `process.env.*` in Phase 1.

### 4. Scheduled jobs

The current Vercel cron calls `GET /api/cron/daily-reminder` in `src/app/api/cron/daily-reminder/route.ts`.

Phase 1 should preserve the existing reminder business logic and move only the scheduler:

- configure a Cloudflare Cron Trigger on the same daily schedule
- trigger the reminder logic with the same authorization assumptions

If the trigger cannot call the Next route cleanly inside the Worker deployment model, Phase 2 should extract the reminder logic into a shared function that both the route and a Worker cron handler can call.

### 5. Observability

Sentry should remain in place if the build/runtime path supports it, but Vercel-specific cron monitor integration must be removed. Error reporting matters more than preserving identical metrics tooling.

If equivalent analytics are still needed after cutover, add Cloudflare-native or vendor-neutral analytics later rather than coupling Phase 1 to replacement telemetry work.

## Data Flow

The primary request and background flows remain the same after Phase 1:

1. Browser requests hit Cloudflare Workers.
2. Next.js renders pages or route handlers in the Worker runtime.
3. Auth/session state is refreshed through the existing Supabase SSR integration.
4. App reads and writes continue to go directly to Supabase and external APIs.
5. Daily reminder execution is initiated by Cloudflare Cron instead of Vercel Cron.

This means database shape, Supabase policies, API contracts, and page/component boundaries should not change during the first migration cutover.

## Error Handling

The migration should explicitly guard against these failure modes:

- missing Cloudflare vars/secrets causing runtime crashes
- unsupported Node APIs in the Worker runtime
- auth/session cookie behavior changing under Cloudflare
- cron trigger authorization drift
- broken asset or PWA manifest delivery
- build-time failures from adapter or bundling differences

Mitigations:

- keep business logic changes minimal in Phase 1
- preserve existing env names
- verify login, logout, protected-page redirects, and API routes in preview before DNS cutover
- verify cron execution in a non-production environment before enabling the production trigger

## Testing Strategy

Phase 1 verification should include:

- `npm run lint`
- `npm test`
- `npm run build`
- Cloudflare production-style build command for the adapter
- manual auth smoke tests
- manual API route smoke tests
- manual PWA/static asset checks
- manual cron execution test with safe instrumentation

The existing repo already has a substantial test suite, but runtime compatibility issues are more likely to show up in build and smoke testing than in unit tests alone.

## Rollout Plan

1. Add Cloudflare deployment support in parallel with existing Vercel support.
2. Deploy preview builds on Cloudflare Workers.
3. Verify auth, APIs, dashboard navigation, and cron behavior.
4. Remove Vercel-specific code/config after Cloudflare preview passes.
5. Cut DNS/production traffic to Cloudflare.
6. Monitor errors and cron execution after cutover.
7. Start Phase 2 cleanup to move cron and any remaining platform hooks to native Worker patterns.

## Files

- `package.json`
- `package-lock.json`
- `next.config.ts`
- `src/app/layout.tsx`
- `src/app/api/cron/daily-reminder/route.ts`
- `src/lib/vercel/edge-config.ts`
- `vercel.json`
- `wrangler.jsonc` or `wrangler.toml`
- optional Cloudflare worker entry/config files introduced by the adapter
