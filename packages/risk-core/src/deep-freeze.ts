/**
 * @file deep-freeze.ts
 * Deep immutability and prototype pollution prevention.
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deep freezes an object or array recursively, safely handling circular references
 * and ignoring dangerous prototype properties.
 */
export function deepFreeze<T>(obj: T, visited: WeakSet<object> = new WeakSet()): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const asObj = obj as unknown as object;
  if (visited.has(asObj)) {
    return obj;
  }
  visited.add(asObj);

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      deepFreeze(obj[i], visited);
    }
    return Object.freeze(obj);
  }

  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    if (FORBIDDEN_KEYS.has(name)) {
      continue;
    }
    const prop = (obj as any)[name];
    if (prop !== null && typeof prop === 'object') {
      deepFreeze(prop, visited);
    }
  }

  return Object.freeze(obj);
}

/**
 * Strips dangerous prototype pollution keys (__proto__, constructor, prototype) from an object.
 */
export function sanitizePlainObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.has(key)) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = sanitizePlainObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean as T;
}
