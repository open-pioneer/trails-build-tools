// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { deepEqual } from "fast-equals";
import { Path } from "./Path";

/**
 * A query definition, created with {@link defineQuery}.
 *
 * The returned object is used as the key of the query inside the database.
 *
 * `Params` must be plain JSON data: strings, finite numbers, booleans, `null`, arrays and plain objects.
 * The database rejects anything else at runtime.
 */
export interface Query<Params, Value> {
    readonly name: string;
    readonly [QUERY_INTERNALS]: QueryInternals<Params, Value>;
}

export interface QueryOptions<Params, Value> {
    name: string;
    query(ctx: QueryContext, params: Params): Promise<Value>;
    equals?(a: Value, b: Value): boolean;
}

export function defineQuery<Params, Value>(
    options: QueryOptions<Params, Value>
): Query<Params, Value> {
    return {
        name: options.name,
        [QUERY_INTERNALS]: {
            query: options.query,
            equals: options.equals ?? deepEqual
        }
    };
}

/**
 * The operations available to a query implementation at runtime.
 *
 * These can be used to retrieve the result of other queries, to read files, etc.
 */
export interface QueryContext<Host = unknown> {
    readonly host: Host;
    get<Params, Value>(query: Query<Params, Value>, params: Params): Promise<Value>;
    readFile(path: Path): Promise<string>;
    fileExists(path: Path): Promise<boolean>;
    watchFile(path: Path): void;
    warn(message: string): void;
}

export interface Reader {
    addWatchFile?(path: Path): void;
    warn?(message: string): void;
}

export const QUERY_INTERNALS = Symbol("queryInternals");

export interface QueryInternals<Params, Value> {
    query(ctx: QueryContext, params: Params): Promise<Value>;
    equals(a: Value, b: Value): boolean;
}
