# @ameva/sentinel

1-Line Facade Security Observability SDK for Web Applications.

## Quickstart
```javascript
import { createSentinel, MemoryFixedWindowCounterStore, LocalStorageRiskEventStore } from '@ameva/sentinel';

const sentinel = createSentinel({
  mode: 'shadow',
  counterStore: new MemoryFixedWindowCounterStore(),
  eventStore: new LocalStorageRiskEventStore()
});

const report = await sentinel.score({ signals });
```

## License
Apache-2.0 © 2026 AMEVA Open Source Ecosystem.
