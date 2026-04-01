/**
 * Utility functions for the application
 */

/**
 * Debounce function to limit how often a function can fire
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Safe number parsing with NaN handling
 */
export function safeParseInt(value: unknown, defaultValue = 0): number {
    if (value === null || value === undefined || value === '') return defaultValue;
    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safe float parsing with NaN handling
 */
export function safeParseFloat(value: unknown, defaultValue = 0): number {
    if (value === null || value === undefined || value === '') return defaultValue;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safe Math.max with empty array guard
 */
export function safeMax(values: number[], defaultValue = 0): number {
    if (!values || values.length === 0) return defaultValue;
    return Math.max(...values);
}

/**
 * Safe reduce sum with null handling
 */
export function safeSum(values: number[]): number {
    return values.reduce((acc, val) => acc + (val ?? 0), 0);
}
