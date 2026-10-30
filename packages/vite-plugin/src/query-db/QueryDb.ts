// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { AsyncLocalStorage } from "node:async_hooks";
import { canonicalJson } from "./canonicalJson";
import { defineQuery, Query, QUERY_INTERNALS, QueryContext, Reader } from "./defineQuery";
import { FileSystem, nodeFileSystem } from "./FileSystem";
import { Path } from "./Path";

export interface QueryDbOptions<Host> {
    host: Host;

    /**
     * The file system behind `readFile` and `fileExists`.
     * Defaults to the real one.
     */
    fileSystem?: FileSystem;
}

export const QUERY_DB_INTERNALS = Symbol("queryDbInternals");

/**
 * Accessors for tests.
 */
export interface QueryDbInternals {
    /**
     * The inputs of a computed entry as `Name(params)` labels, in the order the query requested them.
     * Returns `undefined` for an entry that is not in the database.
     */
    getInputs(query: AnyQuery, params: unknown): string[] | undefined;
}

export class QueryDb<Host = unknown> {
    #host: Host;

    // The built-in queries behind the file operations of the context, bound to the file system of this database.
    #fileQueries: FileQueries;

    // Contains all known query objects, and the states of individual query computations.
    #queries = new Map<AnyQuery, Map<string, Entry>>();

    // The reverse path dependencies: entries that must be invalidated when a file changes.
    #watchedPaths = new Map<Path, Set<Entry>>();

    // Bumped by every `fileChanged` call. Entries record the revisions at which they were verified and changed.
    #revision = 0;

    // Holds the currently active computation for an async task.
    // Used to detect whether a query bypasses its query context.
    #activeComputation = new AsyncLocalStorage<Computation>();

    constructor(options: QueryDbOptions<Host>) {
        this.#host = options.host;
        this.#fileQueries = createFileQueries(
            options.fileSystem ?? nodeFileSystem,
            () => this.#revision
        );
    }

    get<Params, Value>(
        query: Query<Params, Value>,
        params: Params,
        _reader?: Reader
    ): Promise<Value> {
        const active = this.#activeComputation.getStore();
        if (active) {
            return Promise.reject(
                new Error(
                    `QueryDb.get was called inside the query ${describeEntry(active.entry)}. ` +
                        "A query must use the context to read other queries."
                )
            );
        }

        let entry: Entry;
        try {
            entry = this.#getEntry(query, params);
        } catch (e) {
            return Promise.reject(e);
        }
        return this.#getValue(entry) as Promise<Value>;
    }

    fileChanged(path: Path): void {
        if (this.#revision >= MAX_REVISION) {
            throw new Error(`The query database reached its revision limit of ${MAX_REVISION}.`);
        }
        this.#revision += 1;

        for (const entry of this.#watchedPaths.get(path) ?? []) {
            this.#markStale(entry);
        }
    }

    clear(): void {
        this.#queries = new Map();
        this.#watchedPaths = new Map();
    }

    readonly [QUERY_DB_INTERNALS]: QueryDbInternals = {
        getInputs: (query, params) => {
            const entry = this.#queries.get(query)?.get(canonicalJson(params));
            return entry?.inputs.map(describeEntry);
        }
    };

    #getEntry(query: AnyQuery, params: unknown): Entry {
        let table = this.#queries.get(query);
        if (!table) {
            table = new Map();
            this.#queries.set(query, table);
        }

        const key = canonicalJson(params);
        let entry = table.get(key);
        if (!entry) {
            entry = {
                query,
                params,
                key,
                result: undefined,
                status: "fresh",
                verifiedAt: 0,
                changedAt: 0,
                inputs: [],
                dependents: new Set(),
                computation: undefined
            };
            table.set(key, entry);
        }
        return entry;
    }

    #watchPath(query: AnyQuery, path: Path): Entry {
        const leaf = this.#getEntry(query, path);
        let leaves = this.#watchedPaths.get(path);
        if (!leaves) {
            leaves = new Set();
            this.#watchedPaths.set(path, leaves);
        }
        leaves.add(leaf);
        return leaf;
    }

    // Marks `entry` stale and every transitive dependency maybe stale.
    #markStale(entry: Entry): void {
        entry.status = "stale";

        const pending = [entry];
        while (pending.length) {
            const current = pending.pop();
            for (const dependent of current?.dependents ?? []) {
                if (dependent.status === "fresh") {
                    dependent.status = "maybe-stale";
                    pending.push(dependent);
                }
            }
        }
    }

    #getValue(entry: Entry): Promise<unknown> {
        if (entry.computation) {
            return entry.computation.job;
        }
        if (entry.result && entry.status === "fresh") {
            return resultToPromise(entry.result);
        }

        const computation: Computation = {
            entry,
            startRevision: this.#revision,
            inputs: [],
            waitingOn: new Set(),
            finished: false,
            // The job runs in a later microtask, so the computation is registered before it starts.
            job: Promise.resolve().then(() => this.#run(entry))
        };
        entry.computation = computation;
        return computation.job;
    }

    // The job of an entry: verify the inputs, recompute when one of them changed, and store the outcome.
    async #run(entry: Entry): Promise<unknown> {
        const computation = entry.computation;
        if (!computation) {
            throw new Error(`Internal error: ${describeEntry(entry)} has no running computation`);
        }

        try {
            const needsRecompute = entry.status === "stale";
            // A `fileChanged` during the job flips the status again, which the job keeps.
            entry.status = "fresh";
            const stored = entry.result;
            if (stored && !needsRecompute && !(await this.#inputsChanged(computation))) {
                entry.verifiedAt = computation.startRevision;
                return resultToPromise(stored);
            }
            return await this.#recompute(computation);
        } finally {
            computation.finished = true;
            entry.computation = undefined;
        }
    }

    // Verifies the inputs in recorded order and stops at the first one that changed.
    // A later input may only have been requested because of an earlier input's value.
    async #inputsChanged(computation: Computation): Promise<boolean> {
        const entry = computation.entry;
        for (const input of entry.inputs) {
            computation.waitingOn.add(input);
            try {
                // A failed input counts as changed through its `changedAt`, so the error itself is irrelevant here.
                // oxlint-disable-next-line no-await-in-loop
                await this.#getValue(input).catch(() => undefined);
            } finally {
                computation.waitingOn.delete(input);
            }
            if (input.changedAt > entry.verifiedAt) {
                return true;
            }
        }
        return false;
    }

    async #recompute(computation: Computation): Promise<unknown> {
        const entry = computation.entry;
        const ctx = this.#createContext(computation);
        let result: Result;
        try {
            const value = await this.#activeComputation.run(computation, () =>
                entry.query[QUERY_INTERNALS].query(ctx, entry.params)
            );
            result = { type: "value", value };
        } catch (error) {
            result = { type: "failure", error };
        }

        // `clear()` may have replaced the tables while the query ran.
        if (this.#queries.get(entry.query)?.get(entry.key) !== entry) {
            for (const input of computation.inputs) {
                input.dependents.delete(entry);
            }
            return resultToPromise(result);
        }

        const previous = entry.result;
        if (previous && isEqualValue(entry.query, previous, result)) {
            // Early cut-off: the old value stays, and the entries above see no change.
            result = previous;
        } else {
            entry.result = result;
            entry.changedAt = this.#revision;
        }
        entry.verifiedAt = computation.startRevision;

        const newInputs = new Set(computation.inputs);
        for (const oldInput of entry.inputs) {
            if (!newInputs.has(oldInput)) {
                oldInput.dependents.delete(entry);
            }
        }
        entry.inputs = computation.inputs;
        return resultToPromise(result);
    }

    #createContext(computation: Computation): QueryContext<Host> {
        return {
            host: this.#host,
            get: async <Params, Value>(
                query: Query<Params, Value>,
                params: Params
            ): Promise<Value> => {
                this.#checkContext(computation, "get");
                const value = await this.#readInput(computation, this.#getEntry(query, params));
                return value as Value;
            },
            readFile: async (path) => {
                this.#checkContext(computation, "readFile");
                const value = await this.#readInput(
                    computation,
                    this.#watchPath(this.#fileQueries.readFile, path)
                );
                return value as string;
            },
            fileExists: async (path) => {
                this.#checkContext(computation, "fileExists");
                const value = await this.#readInput(
                    computation,
                    this.#watchPath(this.#fileQueries.fileExists, path)
                );
                return value as boolean;
            },
            watchFile: (path) => {
                this.#checkContext(computation, "watchFile");
                const leaf = this.#watchPath(this.#fileQueries.watchFile, path);
                // A declaration, not a computation: the leaf gets its first value here, synchronously.
                if (!leaf.result) {
                    leaf.result = { type: "value", value: this.#revision };
                    leaf.changedAt = this.#revision;
                    leaf.verifiedAt = this.#revision;
                }
                this.#recordInput(computation, leaf);
            },
            warn: () => {
                this.#checkContext(computation, "warn");
                throw new Error("QueryContext.warn is not implemented yet");
            }
        };
    }

    // Records `target` as an input of the running computation and reads it, joining its job when one runs.
    async #readInput(computation: Computation, target: Entry): Promise<unknown> {
        this.#recordInput(computation, target);
        this.#checkCycle(computation, target);

        computation.waitingOn.add(target);
        try {
            return await this.#getValue(target);
        } finally {
            computation.waitingOn.delete(target);
        }
    }

    #recordInput(computation: Computation, target: Entry): void {
        computation.inputs.push(target);
        target.dependents.add(computation.entry);
    }

    #checkContext(computation: Computation, method: string): void {
        const owner = describeEntry(computation.entry);
        if (computation.finished) {
            throw new Error(
                `QueryContext.${method} was called after the computation of ${owner} finished.`
            );
        }
        if (this.#activeComputation.getStore() !== computation) {
            throw new Error(
                `QueryContext.${method} of ${owner} was called outside of its computation.`
            );
        }
    }

    #checkCycle(computation: Computation, target: Entry): void {
        const chain = findWaitChain(target, computation.entry);
        if (chain) {
            const names = [computation.entry, ...chain].map(describeEntry).join(" -> ");
            throw new Error(`Query cycle detected: ${names}`);
        }
    }
}

// A theoretical limit: past it, `+= 1` would no longer produce a distinct integer.
const MAX_REVISION = Number.MAX_SAFE_INTEGER;

type AnyQuery = Query<unknown, unknown>;

// Each pair of operation and path is one leaf entry, and `fileChanged` invalidates the leaves of a path.
interface FileQueries {
    readonly readFile: Query<Path, string>;
    readonly fileExists: Query<Path, boolean>;
    readonly watchFile: Query<Path, number>;
}

function createFileQueries(fileSystem: FileSystem, revision: () => number): FileQueries {
    return {
        readFile: defineQuery({
            name: "readFile",
            query: (_ctx, path) => fileSystem.readFile(path)
        }),
        fileExists: defineQuery({
            name: "fileExists",
            query: (_ctx, path) => fileSystem.fileExists(path)
        }),
        // The value is the revision of the last report, and it never cuts off.
        watchFile: defineQuery({
            name: "watchFile",
            query: async () => revision(),
            equals: () => false
        })
    };
}

interface Entry {
    readonly query: AnyQuery;
    readonly params: unknown;
    readonly key: string;

    // The query result once it has completed, a value or an error.
    result: Result | undefined;

    // Whether the stored result can be returned as is, needs its inputs verified, or must be recomputed.
    // Only file leaves become stale, because only they have no inputs to verify.
    status: Status;

    // The revision at which the inputs were last confirmed unchanged.
    verifiedAt: number;

    // The revision at which the result last differed from the result before.
    changedAt: number;

    // References to other queries used during the computation.
    // TODO: Can/should this contain duplicates?
    inputs: Entry[];

    // The entries that recorded this entry as an input.
    dependents: Set<Entry>;

    // The in-progress computation (if any).
    computation: Computation | undefined;
}

type Status = "fresh" | "maybe-stale" | "stale";

type Result = { type: "value"; value: unknown } | { type: "failure"; error: unknown };

interface Computation {
    readonly entry: Entry;
    readonly startRevision: number;
    readonly job: Promise<unknown>;
    readonly inputs: Entry[];
    readonly waitingOn: Set<Entry>;
    finished: boolean;
}

function resultToPromise(result: Result): Promise<unknown> {
    return result.type === "value" ? Promise.resolve(result.value) : Promise.reject(result.error);
}

// A failure is never equal to a previous result, so dependents always recompute after one.
function isEqualValue(query: AnyQuery, previous: Result, next: Result): boolean {
    return (
        previous.type === "value" &&
        next.type === "value" &&
        query[QUERY_INTERNALS].equals(previous.value, next.value)
    );
}

function describeEntry(entry: Entry): string {
    return `${entry.query.name}(${entry.key})`;
}

/**
 * Follows the entries that running computations wait on, from `start` to `target`.
 * Returns the path including both ends, or `undefined` when `target` is not reachable.
 */
function findWaitChain(start: Entry, target: Entry): Entry[] | undefined {
    if (start === target) {
        return [start];
    }
    // The common case: a stored or just created entry waits on nothing, so no path can start there.
    if (!start.computation?.waitingOn.size) {
        return undefined;
    }

    const visited = new Set<Entry>();
    const path: Entry[] = [];
    const walk = (current: Entry): boolean => {
        if (current === target) {
            path.push(current);
            return true;
        }
        if (visited.has(current)) {
            return false;
        }
        visited.add(current);
        path.push(current);
        for (const next of current.computation?.waitingOn ?? []) {
            if (walk(next)) {
                return true;
            }
        }
        path.pop();
        return false;
    };
    return walk(start) ? path : undefined;
}
