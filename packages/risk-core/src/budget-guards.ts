/**
 * @file budget-guards.ts
 * Strict Request and Policy Validation Guards.
 * Protects against path traversal, encoding ambiguities, semicolon matrix parameters, and parameter pollution.
 */

import { RouteCostPolicy } from './budget-types.js';

export interface ValidationResult {
  valid: boolean;
  message?: string;
  reasonCode?: string;
}

export class RequestShapeGuard {
  public static validatePath(rawPath: string): ValidationResult {
    if (typeof rawPath !== 'string' || rawPath.length === 0 || rawPath.length > 2048) {
      return { valid: false, message: 'PATH_LENGTH_INVALID' };
    }

    if (!rawPath.startsWith('/')) {
      return { valid: false, message: 'PATH_MUST_START_WITH_SLASH' };
    }

    // ASCII control characters (0x00-0x1F, 0x7F)
    if (/[\u0000-\u001f\u007f]/.test(rawPath)) {
      return { valid: false, message: 'ASCII_CONTROL_CHAR_IN_PATH' };
    }

    // Malformed percent encoding
    if (/%(?![0-9a-fA-F]{2})/.test(rawPath)) {
      return { valid: false, message: 'MALFORMED_PERCENT_ENCODING' };
    }

    // Double percent encodings (%252e, %252f, %255c, %2525)
    if (/%25(?:2e|2f|5c|25)/i.test(rawPath)) {
      return { valid: false, message: 'DOUBLE_ENCODING_IN_PATH' };
    }

    // Dot segments (. or ..)
    if (/(^|\/)\.\.?($|\/)/.test(rawPath)) {
      return { valid: false, message: 'DOT_SEGMENT_IN_PATH' };
    }

    // Repeated slashes (//+)
    if (/\/{2,}/.test(rawPath)) {
      return { valid: false, message: 'REPEATED_SLASHES_IN_PATH' };
    }

    // Semicolon matrix parameter ambiguity
    if (/(^|\/)[^/?#]*;/.test(rawPath)) {
      return { valid: false, message: 'SEMICOLON_IN_PATH' };
    }

    // Backslash or encoded backslash
    if (/\\|%5c/i.test(rawPath)) {
      return { valid: false, message: 'BACKSLASH_IN_PATH' };
    }

    // Null byte or encoded null byte
    if (/\0|%00/i.test(rawPath)) {
      return { valid: false, message: 'NULL_BYTE_IN_PATH' };
    }

    // Encoded dot segments (%2e%2e, %2e., .%2e)
    if (/%2e%2e|%2e\.|\.%2e/i.test(rawPath)) {
      return { valid: false, message: 'ENCODED_DOT_SEGMENT_IN_PATH' };
    }

    return { valid: true };
  }

  public static validateMethod(method: string): ValidationResult {
    const standardMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!method || typeof method !== 'string' || !standardMethods.includes(method.toUpperCase())) {
      return { valid: false, message: `INVALID_HTTP_METHOD: ${method}` };
    }
    return { valid: true };
  }

  public static validatePageSize(pageSize: number | undefined, policyOrMax: number | RouteCostPolicy): ValidationResult {
    if (pageSize === undefined) return { valid: true };
    const maxAllowed = typeof policyOrMax === 'number' ? policyOrMax : (policyOrMax.page_size_max ?? 1000);
    if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
      return { valid: false, message: 'Page size must be a positive integer', reasonCode: 'REQUEST_SHAPE_EXCEEDED' };
    }
    if (pageSize > maxAllowed) {
      return { valid: false, message: `Page size ${pageSize} exceeds maximum allowed limit ${maxAllowed}`, reasonCode: 'REQUEST_SHAPE_EXCEEDED' };
    }
    return { valid: true };
  }

  public static validateDataPointBudget(seriesCount = 1, timeBuckets = 1, policyOrMax?: number | RouteCostPolicy): ValidationResult {
    if (!Number.isSafeInteger(seriesCount) || seriesCount < 1 || !Number.isSafeInteger(timeBuckets) || timeBuckets < 1) {
      return { valid: false, message: 'Series and bucket counts must be positive integers', reasonCode: 'REQUEST_SHAPE_EXCEEDED' };
    }
    const maxPoints = typeof policyOrMax === 'number' ? policyOrMax : (policyOrMax?.max_data_points ?? 50000);
    const totalPoints = seriesCount * timeBuckets;
    if (totalPoints > maxPoints) {
      return { valid: false, message: `Requested data point matrix (${seriesCount}x${timeBuckets}=${totalPoints}) exceeds maximum limit (${maxPoints})`, reasonCode: 'REQUEST_SHAPE_EXCEEDED' };
    }
    return { valid: true };
  }

  public static validateBodySize(contentLength: number | undefined, policyOrMax?: number | RouteCostPolicy): ValidationResult {
    if (contentLength === undefined) return { valid: true };
    const maxAllowedBytes = typeof policyOrMax === 'number' ? policyOrMax : (policyOrMax?.max_request_body_bytes ?? 1048576);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return { valid: false, message: 'Content-Length must be a non-negative integer', reasonCode: 'REQUEST_SHAPE_EXCEEDED' };
    }
    if (contentLength > maxAllowedBytes) {
      return { valid: false, message: `Request body size ${contentLength} bytes exceeds limit of ${maxAllowedBytes} bytes`, reasonCode: 'REQUEST_SHAPE_EXCEEDED' };
    }
    return { valid: true };
  }
}

export class ResponseBudgetGuard {
  public static validateRowCount(rowCount: number, maxRows = 10000): ValidationResult {
    if (!Number.isSafeInteger(rowCount) || rowCount < 0) {
      return { valid: false, message: 'Row count must be a non-negative integer', reasonCode: 'RESPONSE_ROW_BUDGET_EXCEEDED' };
    }
    if (rowCount > maxRows) {
      return { valid: false, message: `Result row count ${rowCount} exceeds maximum allowed budget ${maxRows}`, reasonCode: 'RESPONSE_ROW_BUDGET_EXCEEDED' };
    }
    return { valid: true };
  }
}
