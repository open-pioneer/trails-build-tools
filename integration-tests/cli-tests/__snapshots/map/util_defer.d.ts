export interface DeferredExecution {
    /**
     * Re-schedule execution of `func` (if it was not already executed).
     * Returns true on success, false otherwise.
     */
    reschedule(): boolean;
    /**
     * Cancels the pending execution (if it is still pending).
     */
    cancel(): void;
}
/**
 * Calls `func` at a slightly later time.
 *
 * The returned object can be used to re-schedule or cancel the execution of `func`.
 * However, `func` will be executed at most once.
 */
export declare function defer(func: () => void): DeferredExecution;
