# Domain docs

How the agent workflow skills should read, and add to, the domain documentation of this repository.

## Before exploring the code, read these

- **`CONTEXT.md`** at the repository root.
  It defines the vocabulary the project uses for its own concepts.
- **`docs/adr/`** contains the architecture decision records.
  Read the ones that touch the area you are about to change.

This repository uses the single-context layout: one `CONTEXT.md` at the root and one `docs/adr/` directory.
There is no `CONTEXT-MAP.md` and there are no per-package `CONTEXT.md` files.
The packages under `packages/` share one vocabulary (build config, package metadata, virtual modules, entry points), so
terms belong in the root glossary even when only one package uses them today.

`docs/adr/` does not exist yet.
Proceed without it and do not suggest creating it upfront.
The `domain-modeling` skill creates it when a decision actually gets settled.

## Use the vocabulary from the glossary

When your output names a concept from this project, in an issue title, a proposal, a hypothesis, or a test name, use
the term as `CONTEXT.md` defines it, and avoid the synonyms it lists under _Avoid_.

If the concept you need is missing from the glossary, treat that as a signal.
Either you are inventing language that the project does not use, in which case reconsider, or there is a real gap, in
which case note it for the `domain-modeling` skill.

## Point out conflicts with a decision record

If what you are proposing contradicts an existing record, say so plainly rather than quietly overriding it:

> This contradicts ADR-0002, which settled on generating the `exports` field at build time.
> It may still be worth reopening, because …

## Writing style for `CONTEXT.md` and the decision records

Both documents are read by people, and both follow the Writing section of `AGENTS.md`, including one sentence per line.
A decision record in particular is written for a colleague who opens it in two years and needs to understand why the
code looks the way it does.
Write it the way you would write API documentation or a user manual: ordinary, unhurried English prose.

Three rules matter more here than elsewhere:

- **Write complete sentences.**
  No telegraphic fragments, and no dropped articles.
  A heading may be a phrase; body text may not.
- **Say what is true, including the awkward parts.**
  If a decision has a cost, name the cost.
  If an alternative was rejected for a reason that will not age well, say that too.
  Records that read like advertising are worthless.
- **Bullets are for genuine lists.**
  An argument belongs in paragraphs.

`CONTEXT.md` is read by agents on nearly every task, so it may be denser than a decision record: short definitions,
tables, and code identifiers in backticks are all welcome there.

### Information written for agents

A decision record is for humans.
On the rare occasion that a record also needs to tell agents something, a rule they must follow when touching the
affected code, put it at the end of the file under a heading that says so:

```md
## For agents

...
```

Keep this section short, and leave it out entirely unless there is a concrete instruction to give.
Most records will not have one.

## Format of the two documents

Follow the formats defined by the `domain-modeling` skill:

- `CONTEXT.md`: a short description of the project, then a `## Language` section of terms.
  Each term gets one or two sentences saying what it **is**, and an `_Avoid_` line when the project has rejected
  synonyms.
  Only concepts specific to the Trails build tooling belong there; general programming concepts do not.
- Decision records: `docs/adr/NNNN-slug.md`, numbered sequentially from `0001`.
  A record may be a single paragraph.
  Create one only when the decision is hard to reverse, surprising without the context, and the result of a real
  trade-off.
