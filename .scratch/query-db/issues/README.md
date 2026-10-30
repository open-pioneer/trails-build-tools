# Working on the query database issues

Rules for every agent that picks up an issue in this directory.

- **Never commit and never touch the git stage.**
  No `git commit`, `git add`, `git rm`, `git restore --staged`, `git stash` or any other command that changes the index
  or the history, unless the user asks for it explicitly in the current conversation.
  Leave all changes in the working tree.
- **One issue at a time, then stop.**
  The issues are reviewed by the user after each one.
  Implement the issue, run the checks it lists, set its `Status:` to `done`, report what changed and what is open, and
  wait.
  Do not start the next issue in the same run.
- **Stay inside the issue.**
  Each issue names the files it may create or change.
  Something that belongs to a later issue is left out, even when it would be easy.
  A problem with the spec is reported in the final message, not fixed silently.
- **Read first.**
  `.scratch/query-db/spec.md` is the design.
  `AGENTS.md` holds the code style and the writing rules.
