/**
 * @file budget-guards.ts
 * Pre-Execution Request Shape and Post-Execution Response Budget Guards.
 */

import { RouteCostPolicy } from './budget-types.js';

export interface GuardValidationResult {
  valid: boolean;
  reasonCode?: string;
  message?: string;
  limits?: Record<string, number>;
}

export class RequestShapeGuard {
  public static validatePageSize(
    pageSize: number | undefined,
    policy: RouteCostPolicy
  ): GuardValidationResult {
    const defaultSize = policy.page_size_default || 25;
    const maxSize = policy.page_size_max || 50;

    if (pageSize === undefined || pageSize <= 0) {
      return { valid: true, limits: { maxPageSize: maxSize, defaultPageSize: defaultSize } };
    }

    if (pageSize > maxSize) {
      return {
        valid: false,
        reasonCode: 'PAGE_SIZE_EXCEEDED',
        message: `Requested page size '${pageSize}' exceeds the allowed limit of ${maxSize}.`,
        limits: { maxPageSize: maxSize, defaultPageSize: defaultSize }
      };
    }

    return { valid: true, limits: { maxPageSize: maxSize, defaultPageSize: defaultSize } };
  }

  public static validateDataPointBudget(
    seriesCount: number | undefined,
    timeBuckets: number | undefined,
    policy: RouteCostPolicy,
    customMax?: number
  ): GuardValidationResult {
    const maxPoints = customMax || policy.max_data_points || 10000;
    const series = Math.max(1, seriesCount || 1);
    const buckets = Math.max(1, timeBuckets || 1);
    const estimatedPoints = series * buckets;

    if (estimatedPoints > maxPoints) {
      return {
        valid: false,
        reasonCode: 'QUERY_BUDGET_EXCEEDED',
        message: `Estimated data points (${estimatedPoints.toLocaleString()}) exceed the calculation budget of ${maxPoints.toLocaleString()}.`,
        limits: { estimatedDataPoints: estimatedPoints, maxDataPoints: maxPoints }
      };
    }

    return {
      valid: true,
      limits: { estimatedDataPoints: estimatedPoints, maxDataPoints: maxPoints }
    };
  }

  public static validateBodySize(
    bodyBytes: number,
    maxBytes = 1048576
  ): GuardValidationResult {
    if (bodyBytes < 0 || bodyBytes > maxBytes) {
      return {
        valid: false,
        reasonCode: 'REQUEST_BODY_TOO_LARGE',
        message: `Request payload (${bodyBytes.toLocaleString()} bytes) exceeds the allowed size of ${maxBytes.toLocaleString()} bytes.`,
        limits: { maxBodyBytes: maxBytes }
      };
    }
    return { valid: true, limits: { maxBodyBytes: maxBytes } };
  }
}

export class ResponseBudgetGuard {
  public static validateRowCount(rowCount: number, maxRows = 1000): GuardValidationResult {
    if (rowCount > maxRows) {
      return {
        valid: false,
        reasonCode: 'RESPONSE_ROW_BUDGET_EXCEEDED',
        message: `Query returned ${rowCount.toLocaleString()} rows, exceeding the safe response budget of ${maxRows.toLocaleString()} rows.`,
        limits: { maxRows }
      };
    }
    return { valid: true, limits: { maxRows } };
  }

  public static validateResponseSize(responseBytes: number, maxBytes = 5242880): GuardValidationResult {
    if (responseBytes > maxBytes) {
      return {
        valid: false,
        reasonCode: 'RESPONSE_SIZE_BUDGET_EXCEEDED',
        message: `Generated response payload (${responseBytes.toLocaleString()} bytes) exceeds the allowed response size of ${maxBytes.toLocaleString()} bytes.`,
        limits: { maxResponseBytes: maxBytes }
      };
    }
    return { valid: true, limits: { maxResponseBytes: maxBytes } };
  }
}
