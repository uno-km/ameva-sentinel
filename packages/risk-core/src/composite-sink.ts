import type { EventSink, StreamRecord, CompositeSinkOptions } from './types.js';

export class CompositeSink implements EventSink {
  readonly name = 'CompositeSink';
  private readonly sinks: EventSink[];
  private readonly timeoutMs: number;

  constructor(sinks: EventSink[], options: CompositeSinkOptions = {}) {
    this.sinks = [...sinks];
    this.timeoutMs = options.emitTimeoutMs ?? 5000;
  }

  get downstreamSinks(): readonly EventSink[] {
    return this.sinks;
  }

  private async withTimeout<T>(promise: Promise<T> | void, sinkName: string): Promise<T | void> {
    if (!promise || typeof (promise as Promise<T>).then !== 'function') {
      return promise;
    }
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`[CompositeSink] Downstream sink "${sinkName}" timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([promise as Promise<T>, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async emit(record: StreamRecord): Promise<void> {
    await Promise.allSettled(
      this.sinks.map(sink => this.withTimeout(Promise.resolve(sink.emit(record)), sink.name))
    );
  }

  async emitBatch(records: StreamRecord[]): Promise<void> {
    await Promise.allSettled(
      this.sinks.map(sink => this.withTimeout(Promise.resolve(sink.emitBatch(records)), sink.name))
    );
  }

  async flush(): Promise<void> {
    await Promise.allSettled(
      this.sinks.map(sink => sink.flush ? this.withTimeout(sink.flush(), sink.name) : Promise.resolve())
    );
  }

  async close(): Promise<void> {
    await Promise.allSettled(
      this.sinks.map(sink => sink.close ? this.withTimeout(sink.close(), sink.name) : Promise.resolve())
    );
  }
}
