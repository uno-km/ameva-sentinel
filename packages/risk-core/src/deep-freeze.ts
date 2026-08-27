/**
 * @file deep-freeze.ts
 * Side-effect-free deep immutability and defensive cloning.
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Creates an isolated, side-effect-free deep clone of plain objects, primitives, and arrays.
 * Strictly forbids accessor properties (getters/setters), cyclic inputs, non-finite numbers,
 * symbol keys, and prototype pollution keys.
 */
export function defensiveClone(
  value: unknown,
  seen = new WeakMap<object, unknown>()
): unknown {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Non-finite numbers are not allowed');
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new TypeError('Cyclic input is not allowed');
    }

    const cloned: unknown[] = [];
    seen.set(value, cloned);

    for (const item of value) {
      cloned.push(defensiveClone(item, seen));
    }

    return cloned;
  }

  if (
    typeof value !== 'object' ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError('Only plain objects and arrays are allowed');
  }

  if (seen.has(value)) {
    throw new TypeError('Cyclic input is not allowed');
  }

  const output: Record<string, unknown> = Object.create(null);
  seen.set(value, output);

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      throw new TypeError('Symbol keys are not allowed');
    }

    if (FORBIDDEN_KEYS.has(key)) {
      throw new TypeError(`Forbidden object key: ${key}`);
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) {
      continue;
    }

    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError('Accessor properties are not allowed');
    }

    output[key] = defensiveClone(descriptor.value, seen);
  }

  return output;
}

/**
 * Deep freezes an object or array recursively using property descriptors,
 * guaranteeing getters are NEVER invoked and accessor properties are rejected.
 */
export function deepFreeze<T>(
  value: T,
  visited = new WeakSet<object>()
): Readonly<T> {
  if (value === null || typeof value !== 'object') {
    return value as Readonly<T>;
  }

  const objectValue = value as unknown as object;
  if (visited.has(objectValue)) {
    return value as Readonly<T>;
  }

  visited.add(objectValue);

  for (const key of Reflect.ownKeys(objectValue)) {
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
    if (!descriptor) {
      continue;
    }

    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError('Accessor properties are not allowed');
    }

    if ('value' in descriptor && descriptor.value !== null && typeof descriptor.value === 'object') {
      deepFreeze(descriptor.value, visited);
    }
  }

  return Object.freeze(value);
}

/**
 * Backward-compatible helper that defensively clones and strips prototype pollution.
 */
export function sanitizePlainObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  return defensiveClone(obj) as T;
}
