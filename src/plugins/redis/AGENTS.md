# AGENTS.md - src/plugins/redis

## Реальная ответственность директории

Redis plugin:

- декорирует `fastify.redis`;
- предоставляет `checkRedisReadiness`;
- поддерживает injected-client режим;
- управляет lifecycle соединения.

## Что менять здесь уместно

- Настройки подключения/retry.
- Узкий типовой контракт `RedisClient/RedisSubscriber/RedisMulti`.
- Поведение startup/shutdown.
- Lifecycle pub/sub subscriber соединений.

## Что менять здесь неуместно

- Presence бизнес-правила.
- WebSocket event routing.

## Границы зависимостей

- Допустимо: `ioredis`, Fastify plugin API.
- Недопустимо: зависимости на `modules/*`.

## Куда класть новый код

- В `redis.plugin.ts`.

## Связанные файлы

- `src/modules/presence/presence.repository.ts`
- `src/plugins/websocket/realtime-bus.ts`
- `src/modules/health/health.service.ts`

## Локальный чеклист перед завершением

1. Injected redis режим не ломает lifecycle внешнего клиента.
2. Стандартный режим корректно вызывает `connect()` и `quit()`.
3. Readiness основан на `ping`.
4. Pub/sub subscriber cleanup не оставляет процесс висеть после shutdown.
5. Retry/backoff изменения оценены с учетом realtime delivery.
6. `npm run typecheck`.

## Типичные ошибки будущего агента

- Увеличить поверхность Redis интерфейса без необходимости и усложнить тесты.
- Менять retry-поведение без оценки влияния на realtime.
