import type {
  EventSink,
  StreamRecord,
  AsyncRingBufferOptions,
  RingBufferStats,
  RingBufferOverflowPolicy
} from './types.js';

export class AsyncRingBufferSink implements EventSink {
  readonly name = 'AsyncRingBufferSink';

  private readonly downstream: EventSink;
  private readonly capacity: number;
  private readonly mask: number;
  private readonly flushIntervalMs: number;
  private readonly batchSize: number;
  private readonly overflowPolicy: RingBufferOverflowPolicy;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerCooldownMs: number;
  private readonly onError: (err: Error, droppedCount: number) => void;

  private readonly buffer: (StreamRecord | null)[];
  private head = 0; // Index for next write
  private tail = 0; // Index for next read
  private count = 0; // Current buffered count

  // Metrics counters
  private droppedOldest = 0;
  private droppedNewest = 0;
  private circuitBreakerDrops = 0;
  private failClosedRejects = 0;
  private flushed = 0;
  private flushFailures = 0;
  private lastFlushTimestamp: string | null = null;

  // Circuit Breaker state
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;

  private flushTimer: NodeJS.Timeout | null = null;
  private isClosed = false;
  private isFlushing = false;

  constructor(options: AsyncRingBufferOptions) {
    if (!options.downstream) {
      throw new Error('[AsyncRingBufferSink] Downstream EventSink is required');
    }
    this.downstream = options.downstream;

    // Capacity must be a power of 2 for bitwise masking
    let cap = options.capacity ?? 16384;
    if (cap < 2 || (cap & (cap - 1)) !== 0) {
      // Find nearest power of 2
      let p = 2;
      while (p < cap) p <<= 1;
      cap = p;
    }
    this.capacity = cap;
    this.mask = cap - 1;

    this.flushIntervalMs = options.flushIntervalMs ?? 100;
    this.batchSize = Math.min(options.batchSize ?? 100, this.capacity);
    this.overflowPolicy = options.overflowPolicy ?? 'DROP_OLDEST';
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5;
    this.circuitBreakerCooldownMs = options.circuitBreakerCooldownMs ?? 5000;
    this.onError = options.onError ?? (() => {});

    this.buffer = new Array(this.capacity).fill(null);

    this.startTimer();
  }

  private startTimer(): void {
    if (this.flushIntervalMs > 0 && typeof setInterval !== 'undefined') {
      this.flushTimer = setInterval(() => {
        void this.flush();
      }, this.flushIntervalMs);
      if (this.flushTimer && typeof this.flushTimer.unref === 'function') {
        this.flushTimer.unref();
      }
    }
  }

  private updateCircuitBreakerOnEnqueue(now: number): boolean {
    if (this.circuitBreakerState === 'OPEN') {
      if (now - this.lastFailureTime >= this.circuitBreakerCooldownMs) {
        this.circuitBreakerState = 'HALF_OPEN';
        return true;
      }
      return false; // Still OPEN, drop event
    }
    return true; // CLOSED or HALF_OPEN
  }

  emit(record: StreamRecord): void {
    if (this.isClosed) return;

    const now = Date.now();
    if (!this.updateCircuitBreakerOnEnqueue(now)) {
      this.circuitBreakerDrops++;
      return;
    }

    if (this.count >= this.capacity) {
      // Buffer is full
      if (this.overflowPolicy === 'DROP_OLDEST') {
        // Discard oldest element at tail
        this.buffer[this.tail & this.mask] = null;
        this.tail++;
        this.count--;
        this.droppedOldest++;
      } else if (this.overflowPolicy === 'DROP_NEWEST') {
        this.droppedNewest++;
        return; // Discard incoming event
      } else if (this.overflowPolicy === 'FAIL_CLOSED') {
        this.failClosedRejects++;
        throw new Error(`[AsyncRingBufferSink] Ring buffer saturated (${this.capacity}) with FAIL_CLOSED policy`);
      }
    }

    this.buffer[this.head & this.mask] = record;
    this.head++;
    this.count++;

    // Proactive trigger if batch size reached and background flushing enabled
    if (this.flushIntervalMs > 0 && this.count >= this.batchSize) {
      void this.flush();
    }
  }

  emitBatch(records: StreamRecord[]): void {
    for (const rec of records) {
      this.emit(rec);
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.count === 0) return;
    this.isFlushing = true;

    try {
      while (this.count > 0) {
        const batchSize = Math.min(this.count, this.batchSize);
        const batch: StreamRecord[] = [];

        for (let i = 0; i < batchSize; i++) {
          const item = this.buffer[this.tail & this.mask];
          this.buffer[this.tail & this.mask] = null;
          this.tail++;
          this.count--;
          if (item) batch.push(item);
        }

        if (batch.length === 0) continue;

        try {
          if (typeof this.downstream.emitBatch === 'function') {
            await this.downstream.emitBatch(batch);
          } else {
            for (const item of batch) {
              await this.downstream.emit(item);
            }
          }

          this.flushed += batch.length;
          this.lastFlushTimestamp = new Date().toISOString();

          // Recover Circuit Breaker on successful flush
          if (this.circuitBreakerState === 'HALF_OPEN') {
            this.circuitBreakerState = 'CLOSED';
          }
          this.consecutiveFailures = 0;
        } catch (err: any) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.flushFailures++;
          this.consecutiveFailures++;

          if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
            this.circuitBreakerState = 'OPEN';
            this.lastFailureTime = Date.now();
          }

          this.onError(error, batch.length);
          break; // Stop further draining during outage
        }
      }

      if (this.downstream.flush) {
        await this.downstream.flush().catch(() => {});
      }
    } finally {
      this.isFlushing = false;
    }
  }

  stats(): RingBufferStats {
    const totalDropped =
      this.droppedOldest +
      this.droppedNewest +
      this.circuitBreakerDrops +
      this.failClosedRejects;

    return {
      buffered: this.count,
      capacity: this.capacity,
      dropped: totalDropped,
      droppedOldest: this.droppedOldest,
      droppedNewest: this.droppedNewest,
      circuitBreakerDrops: this.circuitBreakerDrops,
      failClosedRejects: this.failClosedRejects,
      flushed: this.flushed,
      flushFailures: this.flushFailures,
      circuitBreakerState: this.circuitBreakerState,
      lastFlushTimestamp: this.lastFlushTimestamp
    };
  }

  async close(): Promise<void> {
    if (this.isClosed) return;
    this.isClosed = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Drain remaining buffer
    await this.flush();

    if (this.downstream.close) {
      await this.downstream.close();
    }
  }
}
