# Fail the import outside a test run

Status: ready-for-agent

Stage 4 of 6. Stop for review when done.

Blocked by: 03

## Scope

In `packages/vite-plugin/src/codegenPlugin.ts`:

- Read `process.env.VITEST === "true"` once in the `config` hook into an `isTestRun` flag.
- In `resolveId`, when the module is `test-support` and `isTestRun` is false, throw a `ReportableError`:
  `'open-pioneer:test-support' may only be imported from tests.`
  This applies to `vite dev` and `vite build` alike.
- Mark the detection with a short comment that points to issue 06.

Tests:

- Add a helper to the plugin's test utilities that runs a build with `VITEST` removed from the environment and
  restores it afterwards.
- A case in `codegenPlugin.test.ts` that imports the module from the `codegen-test-support` fixture with the variable
  removed and expects the error.

## Done when

The commands from stage 2 pass.
