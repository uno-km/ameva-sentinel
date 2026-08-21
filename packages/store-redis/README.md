# @ameva/sentinel-store-redis

Enterprise Distributed Redis, Valkey, KeyDB, Upstash, and Dragonfly Storage Adapters and Streams Pipeline for AMEVA Sentinel.

## Features
- **RedisNonceStore**: Atomic distributed replay attack defense (`SET NX EX`).
- **RedisFixedWindowCounterStore**: Atomic Lua-based rate limiting with TTL drift recovery.
- **RedisRiskEventStore**: High-throughput distributed event store using Redis Streams & Capped Lists.
- **RedisStreamSink**: 0ms non-blocking batch stream forwarder (`XADD MAXLEN ~`).
