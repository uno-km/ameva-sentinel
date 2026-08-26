/**
 * @file bounded-threat-aggregator.ts
 * Bounded in-memory threat aggregation window with reservoir sampling.
 */

import {
  ThreatAggregateStore,
  RedactedThreatEvent,
  ThreatAggregateRecord
} from './budget-types.js';

export class BoundedThreatAggregator implements ThreatAggregateStore {
  private readonly windowSeconds: number;
  private readonly maxRecords: number;
  private readonly records = new Map<string, ThreatAggregateRecord>();
  private currentWindowStart: string;

  constructor(windowSeconds = 60, maxRecords = 1000) {
    this.windowSeconds = windowSeconds;
    this.maxRecords = maxRecords;
    this.currentWindowStart = new Date().toISOString().slice(0, 16);
  }

  public async increment(event: RedactedThreatEvent): Promise<void> {
    const key = `${event.signature}:${event.routeTemplate}:${event.asn}`;
    let rec = this.records.get(key);

    if (!rec) {
      if (this.records.size >= this.maxRecords) {
        return; // Bounded protection: drop if max records capacity reached
      }
      rec = {
        windowStart: this.currentWindowStart,
        windowSeconds: this.windowSeconds,
        signature: event.signature,
        routeTemplate: event.routeTemplate,
        asn: event.asn,
        count: 0,
        samples: []
      };
      this.records.set(key, rec);
    }

    rec.count += 1;
    if (rec.samples.length < 5) {
      rec.samples.push({
        timestamp: event.timestamp,
        statusCode: event.statusCode,
        evidenceCode: event.evidenceCode
      });
    }
  }

  public async flush(): Promise<ThreatAggregateRecord[]> {
    const out = Array.from(this.records.values());
    this.records.clear();
    this.currentWindowStart = new Date().toISOString().slice(0, 16);
    return out;
  }
}
