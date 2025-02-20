// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

/**
 * A simple cache implementing read-through semantics.
 *
 * The {@link CacheProvider} passed to the cache's constructor
 * implements the actual computation of values.
 *
 * The cache deduplicates computations and caches their results
 * until they are invalidated.
 */
export class Cache<Key, Value, Context extends unknown[] = []> {
    private values = new Map<string, Value>();
    private jobs = new Map<string, Promise<Value>>();
    private provider: CacheProvider<Key, Value, Context>;

    constructor(provider: CacheProvider<Key, Value, Context>) {
        this.provider = provider;
    }

    /**
     * Removes an entry associated with the given key.
     */
    invalidate(key: Key): void {
        const id = this.provider.getId(key);
        const oldValue = this.values.get(id);
        this.values.delete(id);
        this.jobs.delete(id);
        if (oldValue) {
            this.provider.onInvalidate?.(key, oldValue);
        }
    }

    /**
     * Retrieves the value associated with `key`.
     * A cached result will be used if present, otherwise the
     * cache provider will be called.
     *
     * Note: computations may throw errors.
     * Errors will not be cached.
     *
     * @param key the lookup key
     * @param context an arbitrary set of values that will be forwarded to the provider
     *                should be provider be called.
     * @returns the value associated with `key`
     */
    async get(key: Key, ...context: Context): Promise<Value> {
        const provider = this.provider;
        const id = provider.getId(key);

        const values = this.values;
        const existingValue = values.get(id);
        if (existingValue) {
            provider.onCachedReturn?.(key, existingValue);
            return Promise.resolve(existingValue);
        }

        const jobs = this.jobs;
        const existingJob = jobs.get(id);
        if (existingJob) {
            return existingJob;
        }

        const job = provider.getValue(key, ...context);
        jobs.set(id, job);
        try {
            const value = await job;
            if (jobs.get(id) === job) {
                values.set(id, value);
            }
            return value;
        } finally {
            if (jobs.get(id) === job) {
                jobs.delete(id);
            }
        }
    }
}

export interface CacheProvider<Key, Value, Context extends unknown[] = []> {
    /**
     * Maps the `key` to a unique id.
     * The id is used internally to store the result values.
     *
     * Keys mapping to the same `id` are treated as equivalent.
     */
    getId(key: Key): string;

    /**
     * Given a `key`, compute its associated `value`.
     * Only one computation for each `key` is started at a time.
     */
    getValue(key: Key, ...context: Context): Promise<Value>;

    /**
     * Called when the cache successfully invalidated an old value.
     */
    onInvalidate?(key: Key, oldValue: Value): void;

    /**
     * Called when the cache successfully returns a cached result.
     */
    onCachedReturn?(key: Key, value: Value): void;
}
