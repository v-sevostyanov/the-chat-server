# AGENTS.md - src/plugins/redis

Redis plugin декорирует `fastify.redis`, предоставляет `checkRedisReadiness`, поддерживает injected-client режим и управляет lifecycle соединения.

Правила:

- Injected redis режим не управляет lifecycle внешнего клиента.
- Стандартный режим корректно вызывает `connect()` и `quit()`.
- Readiness основан на `ping`.
- Pub/sub subscriber cleanup не оставляет процесс висеть после shutdown.
- Retry/backoff изменения оценивайте с учетом realtime delivery.
- Не расширяйте Redis interface без необходимости.

Проверки: `npm run typecheck`, релевантные tests.
