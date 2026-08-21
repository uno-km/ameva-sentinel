import type { EventSink, StreamRecord } from './types.js';

export class NullSink implements EventSink {
  readonly name = 'NullSink';
  public emittedCount = 0;

  emit(record: StreamRecord): void {
    this.emittedCount++;
  }

  emitBatch(records: StreamRecord[]): void {
    this.emittedCount += records.length;
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  reset(): void {
    this.emittedCount = 0;
  }
}
