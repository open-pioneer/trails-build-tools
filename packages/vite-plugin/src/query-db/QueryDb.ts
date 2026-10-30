// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { AsyncLocalStorage } from "node:async_hooks";
import { canonicalJson } from "./canonicalJson";
import { Query, QUERY_INTERNALS, QueryContext, Reader } from "./defineQuery";
import { Path } from "./Path";

export interface QueryDbOptions<Host> {
    host: Host;
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

    // Contains all known query objects, and the states of individual query computations.
    #queries = new Map<AnyQuery, Map<string, Entry>>();

    // Holds the currently active computation for an async task.
    // Used to detect whether a query bypasses its query context.
    #activeComputation = new AsyncLocalStorage<Computation>();

    constructor(options: QueryDbOptions<Host>) {
        this.#host = options.host;
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

    fileChanged(_path: Path): void {}

    clear(): void {
        this.#queries = new Map();
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
            entry = { query, params, key, result: undefined, inputs: [], computation: undefined };
            table.set(key, entry);
        }
        return entry;
    }

    #getValue(entry: Entry): Promise<unknown> {
        if (entry.computation) {
            return entry.computation.job;
        }
        if (entry.result) {
            return resultToPromise(entry.result);
        }

        const computation: Computation = {
            entry,
            inputs: [],
            waitingOn: new Set(),
            finished: false,
            // The query function runs in a later microtask, so the computation is registered before it starts.
            job: Promise.resolve().then(() => this.#compute(entry))
        };
        entry.computation = computation;
        return computation.job;
    }

    async #compute(entry: Entry): Promise<unknown> {
        const computation = entry.computation;
        if (!computation) {
            throw new Error(`Internal error: ${describeEntry(entry)} has no running computation`);
        }

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
        computation.finished = true;
        entry.computation = undefined;

        // `clear()` may have replaced the tables while the query ran.
        if (this.#queries.get(entry.query)?.get(entry.key) === entry) {
            entry.result = result;
            entry.inputs = computation.inputs;
        }
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
                const target = this.#getEntry(query, params);
                computation.inputs.push(target);
                this.#checkCycle(computation, target);

                computation.waitingOn.add(target);
                try {
                    return (await this.#getValue(target)) as Value;
                } finally {
                    computation.waitingOn.delete(target);
                }
            },
            readFile: () => {
                this.#checkContext(computation, "readFile");
                throw new Error("QueryContext.readFile is not implemented yet");
            },
            fileExists: () => {
                this.#checkContext(computation, "fileExists");
                throw new Error("QueryContext.fileExists is not implemented yet");
            },
            watchFile: () => {
                this.#checkContext(computation, "watchFile");
                throw new Error("QueryContext.watchFile is not implemented yet");
            },
            warn: () => {
                this.#checkContext(computation, "warn");
                throw new Error("QueryContext.warn is not implemented yet");
            }
        };
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

type AnyQuery = Query<unknown, unknown>;

interface Entry {
    readonly query: AnyQuery;
    readonly params: unknown;
    readonly key: string;

    // The query result once it has completed, a value or an error.
    result: Result | undefined;

    // References to other queries used during the computation.
    // TODO: Can/should this contain duplicates?
    inputs: Entry[];

    // The in-progress computation (if any).
    computation: Computation | undefined;
}

type Result = { type: "value"; value: unknown } | { type: "failure"; error: unknown };

interface Computation {
    readonly entry: Entry;
    readonly job: Promise<unknown>;
    readonly inputs: Entry[];
    readonly waitingOn: Set<Entry>;
    finished: boolean;
}

function resultToPromise(result: Result): Promise<unknown> {
    return result.type === "value" ? Promise.resolve(result.value) : Promise.reject(result.error);
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
