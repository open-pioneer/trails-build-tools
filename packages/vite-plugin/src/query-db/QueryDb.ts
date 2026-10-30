// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { canonicalJson } from "./canonicalJson";
import { Query, QUERY_INTERNALS, QueryContext, Reader } from "./defineQuery";
import { Path } from "./Path";

export interface QueryDbOptions<Host> {
    host: Host;
}

export class QueryDb<Host = unknown> {
    #host: Host;
    #tables = new Map<AnyQuery, Map<string, Entry>>();

    constructor(options: QueryDbOptions<Host>) {
        this.#host = options.host;
    }

    get<Params, Value>(
        query: Query<Params, Value>,
        params: Params,
        _reader?: Reader
    ): Promise<Value> {
        let entry: Entry;
        try {
            entry = this.#getEntry(query, params);
        } catch (e) {
            return Promise.reject(e);
        }
        return this.#read(entry) as Promise<Value>;
    }

    fileChanged(_path: Path): void {}

    clear(): void {
        this.#tables = new Map();
    }

    #getEntry(query: AnyQuery, params: unknown): Entry {
        let table = this.#tables.get(query);
        if (!table) {
            table = new Map();
            this.#tables.set(query, table);
        }

        const key = canonicalJson(params);
        let entry = table.get(key);
        if (!entry) {
            entry = { query, params, key, result: undefined, job: undefined };
            table.set(key, entry);
        }
        return entry;
    }

    #read(entry: Entry): Promise<unknown> {
        if (entry.result) {
            return resultToPromise(entry.result);
        }
        if (entry.job) {
            return entry.job;
        }

        // The query function runs in a later microtask, so `entry.job` is set before it starts.
        const job = Promise.resolve().then(() => this.#compute(entry));
        entry.job = job;
        return job;
    }

    async #compute(entry: Entry): Promise<unknown> {
        const ctx = this.#createContext();
        let result: Result;
        try {
            const value = await entry.query[QUERY_INTERNALS].query(ctx, entry.params);
            result = { type: "value", value };
        } catch (error) {
            result = { type: "failure", error };
        }

        // `clear()` may have replaced the tables while the query ran.
        if (this.#tables.get(entry.query)?.get(entry.key) === entry) {
            entry.result = result;
            entry.job = undefined;
        }
        return resultToPromise(result);
    }

    #createContext(): QueryContext<Host> {
        return {
            host: this.#host,
            get() {
                throw new Error("QueryContext.get is not implemented yet");
            },
            readFile() {
                throw new Error("QueryContext.readFile is not implemented yet");
            },
            fileExists() {
                throw new Error("QueryContext.fileExists is not implemented yet");
            },
            watchFile() {
                throw new Error("QueryContext.watchFile is not implemented yet");
            },
            warn() {
                throw new Error("QueryContext.warn is not implemented yet");
            }
        };
    }
}

type AnyQuery = Query<unknown, unknown>;

interface Entry {
    readonly query: AnyQuery;
    readonly params: unknown;
    readonly key: string;
    result: Result | undefined;
    job: Promise<unknown> | undefined;
}

type Result = { type: "value"; value: unknown } | { type: "failure"; error: unknown };

function resultToPromise(result: Result): Promise<unknown> {
    return result.type === "value" ? Promise.resolve(result.value) : Promise.reject(result.error);
}
