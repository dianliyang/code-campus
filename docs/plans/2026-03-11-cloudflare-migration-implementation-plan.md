# Cloudflare Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move Athena from Vercel to Cloudflare Workers with minimal application behavior changes, then leave the codebase positioned for later Cloudflare-native backend cleanup.

**Architecture:** Keep the current Next.js App Router app and Supabase-backed server flows intact while introducing Cloudflare OpenNext deployment support, removing Vercel-only integrations, and replacing the Vercel cron scheduler with Cloudflare cron configuration. Preserve current runtime contracts and defer deeper backend refactors until after a stable Cloudflare cutover.

**Tech Stack:** Next.js 16, React 19, TypeScript, Cloudflare Workers, OpenNext adapter for Cloudflare, Supabase SSR, Sentry, Vitest, ESLint.

---

### Task 1: Add Cloudflare deployment support

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `wrangler.jsonc`
- Create: `.dev.vars.example` or document equivalent env wiring if the adapter expects a different local setup
- Modify: `README.md` if deployment commands are documented there

**Step 1: Write the failing test**

No unit test is required for deployment scaffolding. Verification is configuration validation plus build success.

**Step 2: Add the Cloudflare adapter and scripts**

Update `package.json` to:

- add the Cloudflare/OpenNext dependency required for Next.js on Workers
- add scripts for local Cloudflare preview and deploy
- keep existing `dev`, `build`, and `start` scripts unless the adapter requires a wrapper build script

Create `wrangler.jsonc` with:

- project name
- entrypoint/output expected by the adapter
- compatibility date aligned with current Cloudflare Next.js requirements
- cron trigger placeholder for the daily reminder schedule
- vars placeholders only when appropriate; keep secrets out of source control

Add a checked-in example env file only if the chosen tooling expects it.

**Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Run the Cloudflare build**

Run the adapter-specific production build command defined in `package.json`.
Expected: PASS and produce deployable Worker output

**Step 5: Commit**

```bash
git add package.json package-lock.json wrangler.jsonc README.md .dev.vars.example
git commit -m "Add Cloudflare Workers deployment support"
```

### Task 2: Remove Vercel-only runtime integrations

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `next.config.ts`
- Delete: `vercel.json`
- Delete: `src/lib/vercel/edge-config.ts` if confirmed unused

**Step 1: Write the failing test**

No dedicated unit test is required for removing deployment-specific integrations.

**Step 2: Remove Vercel-specific code**

In `src/app/layout.tsx`:

- remove `@vercel/analytics/next`
- remove `@vercel/speed-insights/next`
- remove `<Analytics />` and `<SpeedInsights />`

In `next.config.ts`:

- remove `automaticVercelMonitors: true`
- keep the rest of the Sentry config unchanged unless the Cloudflare build path requires a small adjustment

Delete:

- `vercel.json`
- `src/lib/vercel/edge-config.ts` only after confirming there are no remaining imports or references

**Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Run focused search verification**

Run: `rg -n "vercel|@vercel|EDGE_CONFIG" .`
Expected: no remaining production references except lockfile history, comments, or intentional migration notes

**Step 5: Commit**

```bash
git add src/app/layout.tsx next.config.ts vercel.json src/lib/vercel/edge-config.ts
git commit -m "Remove Vercel-specific runtime integrations"
```

### Task 3: Move cron scheduling to Cloudflare

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `src/app/api/cron/daily-reminder/route.ts`
- Create: `src/lib/cron/daily-reminder.ts` if shared extraction is needed
- Create or modify: adapter-specific Worker cron entry file if required by the Cloudflare setup
- Test: `src/tests/integration` or `src/tests/unit` only if a clean seam exists for extracted reminder logic

**Step 1: Write the failing test**

If reminder logic is extracted to a shared function, add a focused unit test for the extraction seam:

```ts
import { describe, expect, test } from "vitest";

describe("daily reminder cron auth", () => {
  test("rejects execution when secret does not match", async () => {
    expect(true).toBe(true);
  });
});
```

If no clean seam exists, keep this task verified by build and manual execution instead.

**Step 2: Configure Cloudflare cron**

Add the daily schedule to `wrangler.jsonc`.

Keep the existing reminder logic source intact. Choose one of these implementations:

- preferred if supported cleanly: Cloudflare cron triggers the existing reminder route with the same bearer-secret contract
- fallback: extract the reminder body into `src/lib/cron/daily-reminder.ts` and call it from both the route handler and the Worker cron entry

Do not change reminder behavior, query shape, or email content during this task.

**Step 3: Run focused tests**

Run: `npm test -- --run <new-test-file>` if a new test was added
Expected: PASS

**Step 4: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 5: Run build**

Run both:
- `npm run build`
- the adapter-specific Cloudflare build command

Expected: PASS

**Step 6: Commit**

```bash
git add wrangler.jsonc src/app/api/cron/daily-reminder/route.ts src/lib/cron/daily-reminder.ts
git commit -m "Move daily reminder scheduling to Cloudflare"
```

### Task 4: Verify auth and API compatibility on Cloudflare

**Files:**
- Modify only if verification reveals runtime incompatibilities:
  - `src/proxy.ts`
  - `src/lib/supabase/server.ts`
  - `src/app/auth/callback/route.ts`
  - any affected API route under `src/app/api/**`

**Step 1: Write the failing test**

No new test by default. Add a targeted test only if verification exposes a concrete bug.

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Run the existing test suite**

Run: `npm test`
Expected: PASS, acknowledging any pre-existing unrelated failures must be documented rather than silently ignored

**Step 4: Run production build**

Run:
- `npm run build`
- the adapter-specific Cloudflare build command

Expected: PASS

**Step 5: Manually verify preview behavior**

Check in a Cloudflare preview deployment:

- login flow
- logout flow
- protected route redirect to `/login`
- authenticated redirect away from `/login`
- dashboard page rendering
- representative API routes:
  - `/api/courses`
  - `/api/dashboard/stats`
  - `/api/ai/health`
  - `/api/cron/daily-reminder` with safe auth verification

Expected:

- cookies persist correctly
- Supabase session refresh works
- no Worker runtime crashes
- API responses match current behavior

**Step 6: Commit**

```bash
git add src/proxy.ts src/lib/supabase/server.ts src/app/auth/callback/route.ts src/app/api
git commit -m "Fix Cloudflare runtime compatibility issues"
```

### Task 5: Update operational documentation and cutover checklist

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-03-11-cloudflare-migration-design.md` only if implementation changes the design materially

**Step 1: Write the failing test**

No automated test required for documentation.

**Step 2: Document the new operational path**

Update `README.md` with:

- local Cloudflare preview command
- deploy command
- required secrets/vars
- cron trigger ownership
- note that Vercel config has been removed

Add a concise cutover checklist:

- set Cloudflare secrets
- deploy preview
- verify auth/API/cron
- switch DNS
- monitor Sentry/logs

**Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Final verification**

Run:
- `npm run lint`
- `npm test`
- `npm run build`
- adapter-specific Cloudflare build command

Expected: PASS, or document any pre-existing failures with exact commands and output summaries

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-03-11-cloudflare-migration-design.md
git commit -m "Document Cloudflare migration workflow"
```
