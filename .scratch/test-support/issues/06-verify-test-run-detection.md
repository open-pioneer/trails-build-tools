# Verify the test-run detection and find a stable signal

Status: needs-triage

Stage 6 of 6. Research, not implementation.

Blocked by: 04

## Question

Stage 4 detects a Vitest run through `process.env.VITEST === "true"`.
This was chosen as a first draft during the design session.
Verify it and decide whether to keep it.

Points to check:

- Vitest sets the variable in its CLI entry before loading the Vite config.
  Does the programmatic API (`startVitest`, `createVitest`) set it too?
- Browser mode: the Vite server that serves the browser tests runs in the Vitest process.
  Confirm that the plugin's `resolveId` sees the variable there as well.
- Vitest 3 and later offer the `configureVitest` plugin hook.
  Would setting the flag in that hook be more reliable, and what is the minimum Vitest version the plugin may
  require?
- A user who sets `VITEST=true` by hand can bypass the production check.
  Decide whether that matters.

Record the answer under `## Answer` and open a follow-up stage if the detection changes.
