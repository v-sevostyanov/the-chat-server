# src/plugins/redis

## Назначение

Плагин подключения Redis:

- декорирует `fastify.redis`;
- добавляет `fastify.checkRedisReadiness`;
- закрывает соединение при остановке приложения.

## Типы и интерфейсы

В файле описаны облегчённые интерфейсы:

- `RedisClient`
- `RedisSubscriber`
- `RedisMulti`

Они позволяют:

- изолировать код от полной поверхности `ioredis`;
- проще писать тестовые моки.

## Режимы работы

### 1. Инъекция внешнего клиента

- Если `options.redis` передан, используется он.
- Lifecycle внешнего клиента не управляется этим плагином.

### 2. Стандартный режим

- Создаётся `new Redis(fastify.config.redisUrl, { ... })`.
- Параметры:
  - `lazyConnect: true`
  - `maxRetriesPerRequest: 1`
  - `enableOfflineQueue: false`
- Затем вызывается `redis.connect()`.
- В `onClose` вызывается `redis.quit()`.

## Контракты

- `fastify.redis`
- `fastify.checkRedisReadiness()` (`ping`)

## Что важно учитывать

- Плагин нужен не только presence, но и realtime bus (Pub/Sub в websocket-плагине).
- Изменение retry/offline параметров влияет на поведение при сетевых сбоях и latency всплесках.
