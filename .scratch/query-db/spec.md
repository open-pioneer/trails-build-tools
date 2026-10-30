# Query database for the Vite plugin

Status: draft, awaiting review

The Vite plugin computes metadata for every Trails package in an app from several files and caches the results in the
`Cache` class.
That cache holds leaf values only.
Composed values, such as the dependency graph of an app, are recomputed on every virtual module load, which costs time
and leaves room for subtle bugs when a leaf changes under a composed value.

This spec defines a query database inspired by salsa and by signals.
One `QueryDb` per plugin instance holds every computed value, knows whether it is fresh, stale or in flight, tracks
what each value was computed from, and recomputes a value only when one of its inputs actually changed.

The first version lives in `packages/vite-plugin/src/query-db/` and is verified by tests only.
Replacing `MetadataRepository` with it is a later step and out of scope here.

## Vocabulary

These terms are used in the code, the tests and this document.
They are not added to `CONTEXT.md` for now.

**Query**:
A definition object created once at module level with `defineQuery`.
It holds a name and the function that computes a value from parameters.
The object reference is the identity of the query, the name is for debug output and error messages.

**Query key**:
A query together with one set of parameters.
Every value in the database belongs to exactly one query key.

**Entry**:
The stored state of one query key: the value or failure, the revisions it was verified and changed at, the inputs it
was computed from, and the job that is currently verifying or computing it.

**Input**:
Something an entry read while it was computed.
A *query input* is another entry.
A *file input* is a file operation on a path.
The word "dependency" keeps its meaning from `CONTEXT.md`, an npm dependency, and is never used for inputs.

**Fresh**:
An entry whose inputs are known to be unchanged since it was last verified.
Reading it returns the stored value without any work.

**Stale**:
An entry that must recompute before it can be read.
A file leaf becomes stale when its file is reported as changed.

**Maybe stale**:
An entry whose inputs may have changed.
Reading it verifies the inputs first and recomputes only if one of them changed.

**Reader**:
The caller of `QueryDb.get` outside of any query.
A reader receives the watch files and warnings that belong to the value it reads.

## Public API

```ts
import { AsyncLocalStorage } from "node:async_hooks";

type Path = string & { readonly [pathBrand]: true };
function toPath(input: string): Path;

interface QueryOptions<Params, Value> {
    name: string;
    query(ctx: QueryContext, params: Params): Promise<Value>;
    equals?(a: Value, b: Value): boolean;
}

interface Query<Params, Value> {
    readonly name: string;
    // The remaining members are private to the database.
}

function defineQuery<Params, Value>(options: QueryOptions<Params, Value>): Query<Params, Value>;

interface QueryContext<Host = unknown> {
    readonly host: Host;
    get<Params, Value>(query: Query<Params, Value>, params: Params): Promise<Value>;
    readFile(path: Path): Promise<string>;
    fileExists(path: Path): Promise<boolean>;
    watchFile(path: Path): void;
    warn(message: string): void;
}

interface Reader {
    addWatchFile?(path: Path): void;
    warn?(message: string): void;
}

interface FileSystem {
    readFile(path: Path): Promise<string>;
    fileExists(path: Path): Promise<boolean>;
}

class QueryDb<Host = unknown> {
    constructor(options: { host: Host; fileSystem?: FileSystem });
    get<Params, Value>(query: Query<Params, Value>, params: Params, reader?: Reader): Promise<Value>;
    fileChanged(path: Path): void;
    clear(): void;
}
```

`Path` is a branded string.
`toPath` resolves the input to an absolute path and applies Vite's `normalizePath`, without `realpath`.
Every public method that takes or hands out a file path uses `Path`, so a path that reaches the database is normalized
by construction.

Parameters are JSON data: strings, finite numbers, booleans, `null`, arrays and plain objects.
`Params` is not constrained in the type system, because a constraint would reject interface declarations, which
TypeScript does not give an implicit index signature.
The database checks the rule at runtime instead and rejects a `get` whose parameters break it.
The database looks entries up by a canonical serialization of the parameters with sorted object keys.
Two parameter objects with the same content address the same entry.
The database does not know which string parameters are paths, so a query that takes a path as parameter takes a `Path`.

`QueryContext.host` is the object passed to the constructor.
The database has no opinion about its members.
The plugin will later pass a resolver built with `createIdResolver(config)` from Vite in `configResolved`, and tests
pass whatever their queries need.

The query function receives an explicit `ctx` and reaches other entries and files only through it.
It does not receive the `QueryDb`.
`get` always returns a promise, also for a fresh entry.

## Values, equality and failures

Values are treated as immutable by convention.
The database hands out the stored object itself and never clones or freezes it.

Every query may define `equals`.
The default is `deepEqual` from the `fast-equals` package, which compares plain objects, arrays, `Map` and `Set`
structurally.
A value containing class instances or functions needs its own `equals`, otherwise it counts as changed on every
recomputation.

A query that throws produces a failed entry.
The failure is stored with the inputs that were recorded up to the throw.
Readers and dependent queries receive the original error object, rethrown unchanged, so a `ReportableError` thrown
inside a query reaches the plugin as is.
A failed entry recomputes only when one of its inputs changes.
A failed entry is never equal to a previous value, so its dependents always recompute after it recovers.
This also means that an error caused by a bug in a query function stays until a file changes or `clear()` is called.
That is acceptable in a dev server, and the decision may be reversed later.

## File inputs

Files enter the database only through the three file operations on the context.
Each pair of operation and path is a built-in leaf entry.
The operations run against the `FileSystem` passed to the constructor.
The default reads the real file system, and tests pass an in-memory one, so no test touches the disk.

- `readFile(path)` reads the file as UTF-8 text and stores the text as the leaf's value.
  A missing file makes the leaf a failed entry under the rules above.
- `fileExists(path)` stores a boolean.
- `watchFile(path)` declares the file as an input without reading it.
  Its value is the revision at which the file was last reported, so it counts as changed after every `fileChanged`.
  It exists for files that a query reads by other means, such as `build.config.mjs`, which is loaded with `import()`.
  A query that wants cut-off for such a file calls `readFile` on the same path first.

`fileChanged(path)` is the only way to invalidate anything.
It marks every leaf of that path stale.
When a stale `readFile` or `fileExists` leaf is verified, it re-runs the operation and compares the result with the
stored one.
A save that did not change the content, or a `touch`, therefore re-reads one file and recomputes nothing above it.

More operations, such as `stat` or a `Buffer` overload of `readFile`, are added when a query needs them, each as its own
kind of leaf.

The database only sees what a query declares.
A query must route every read whose result influenced its value through the context, including an existence check and
the `package.json` that a resolver such as `findDepPkgJsonPath` found.
Directory listings, symlink targets and resolver configuration stay invisible, as they are today.
There is no escape hatch such as a query that always recomputes.

## Freshness and verification

The database keeps one global revision counter.
Every `fileChanged` call bumps it.
The counter throws a plain `Error` when it reaches `Number.MAX_SAFE_INTEGER`, which is a theoretical limit.

Every entry records two revisions.
`verifiedAt` is the revision at which its inputs were last confirmed unchanged.
`changedAt` is the revision at which its value last differed from the value before.
Every entry also records its inputs in the order in which they were requested, and the database keeps the reverse
index from an entry to the entries that use it.

`fileChanged` marks the leaves of the path stale and walks the reverse index, marking every transitive dependent maybe
stale.
This is a flag flip only.
Nothing is recomputed at this point.

Reading a fresh entry returns the stored value.
Reading a maybe stale entry verifies its inputs one at a time, in recorded order.
Each input is verified first, which may recompute it.
An input counts as changed when its `changedAt` is greater than the entry's `verifiedAt`.
At the first changed input the entry recomputes.
When no input changed, the entry's `verifiedAt` moves to the current revision and the stored value is returned without
running the query.
When the entry recomputes and `equals` says the new value matches the old one, the old value stays, `changedAt` stays,
and the entries above are not touched.

The order matters because a later input may only have been requested because of the result of an earlier one.
Inputs requested concurrently with `Promise.all` inside a query body are recorded in call-start order.
That is still a valid order, because inputs requested at the same time cannot depend on each other's results.

The reverse index is rebuilt for an entry after every recomputation, because the set of inputs may change.

## Concurrency

Verification and recomputation of one entry run as a single job.
A reader or query that needs an entry whose job is running joins the job and receives the same result.
Readers may call `get` concurrently, and query bodies may request several inputs at once.

Each computation runs in its own `AsyncLocalStorage` scope.
The scope holds the active computation and is used only for two checks.
`QueryDb.get` throws when it is called inside a computation, so a query cannot bypass input tracking.
Every context method throws when the context does not belong to the active computation.
That catches a context captured in a closure and used from another query, and a context used after its computation
finished.
A host call such as a resolver may run other Vite plugins' hooks inside this scope.
That only matters if one of them calls `QueryDb.get`, and none does.

Cycles are an error.
Each running computation records which entry it is waiting on.
A `ctx.get` that would make a computation wait on itself, directly or through other waiting computations, throws an
error that names the chain, for example `PackageGraph({"directory":"a"}) -> PackageGraph({"directory":"b"}) -> ...`.
A query that needs a closure over a graph that may contain cycles, such as npm packages that depend on each other,
computes the closure iteratively inside one query, as `MetadataRepository` does today.

`fileChanged` for a file that a running computation already declared does not cancel the computation.
The computation finishes, every waiter receives its result, and the entry is stored marked maybe stale, so the next
read verifies and recomputes.
This is safe because every waiter already received the watch file, and Vite reloads on the change anyway.

`clear()` empties the database.
Running computations finish and their waiters receive the result, but nothing is stored.
There is no eviction and no size limit.
The number of query keys is bounded by the number of packages and message locales of an app, and entries live until
`clear()`.

## Watch files and warnings

A reader receives watch files and warnings through the optional `Reader` argument of `get`.
This is the only channel.
The result of `get` is the value alone.

Every entry stores the set of files declared by itself and, transitively, by its query inputs, and the warnings
recorded the same way.
A read that returns a stored value, whether it was fresh or verified fresh, replays that set to the reader
synchronously, before the promise resolves.

A running job keeps the list of readers waiting for it.
A file declared during the computation, at any depth, is pushed to every waiting reader at once.
A reader that joins later first receives everything declared so far, then everything that follows.
`readFile` and `fileExists` push the path before they touch the file system, which keeps the "watch before load"
behavior that today's `MetadataRepository` relies on.

`ctx.warn(message)` is recorded on the entry and delivered the same way as a watch file.
A cached return therefore replays the warnings of the computation that produced it, which today's cache drops.

## Observability

The database logs through `createDebugger("open-pioneer:query-db")`.
It logs when an entry recomputes, when it is verified fresh, when a recomputation produced an equal value, when a
computation failed, and when a cycle is detected.
`DEBUG="open-pioneer:*"` shows these lines together with the rest of the plugin's output.

## Delivery

- The code lives in `packages/vite-plugin/src/query-db/`: `QueryDb.ts`, `defineQuery.ts`, `canonicalJson.ts`,
  `FileSystem.ts`, `Path.ts`, and the tests next to them.
  Types are declared as named interfaces, never inline.
- `fast-equals` is added to the `catalog:` section of `pnpm-workspace.yaml` and to the dependencies of the Vite plugin.
- Tests define their queries in the test file.
  Tests that need files use the in-memory `FileSystem` defined in the test file and drive `fileChanged` by hand.
  They do not use `test-data/` or `temp/`.
  Concurrency cases use manually resolved promises inside test queries.
- Implementation tickets go to `.scratch/query-db/issues/`, one per reviewable step.
  The user reviews the working tree after every ticket before the next one starts, so each ticket ends with a stop.
- No agent commits to the branch or changes the git stage unless the user asks for it explicitly.
  All work stays in the working tree.
- No decision record is written until the database replaces `MetadataRepository`, because the trade-off becomes real
  only then.

## Open points for integration

These are known and deliberately left for the integration step.

- The duplicate package check in `MetadataRepository` keeps a map across cache entries.
  Per-package queries cannot share mutable state, so the check moves into the query that computes the whole graph.
- `resolveLocalFile` becomes a host member built from `createIdResolver(config)`.
- `buildStart` calls `reset()` today.
  Whether `clear()` is still needed there is decided at integration.
