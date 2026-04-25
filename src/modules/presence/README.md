# src/modules/presence

## Назначение

Модуль `presence` отвечает за онлайн-статус пользователей:

- runtime-состояние соединений в Redis;
- durable `lastSeenAt` в PostgreSQL;
- HTTP-доступ к presence;
- адаптер для WebSocket realtime потока.

Базовый префикс маршрутов: `/api/v1/presence`.

## HTTP-контракты

- `GET /me` — presence текущего пользователя.
- `GET /users/:userId` — presence указанного пользователя.

Ответ: `{ userId, isOnline, lastSeenAt }`.

## Realtime-роль модуля

`PresenceService` реализует `PresenceRealtimeAdapter`:

- `registerRealtimeConnection`
- `unregisterRealtimeConnection`
- `touchConnection`
- `subscribeCurrentUserPresence`
- `watchUsersPresence`

Модуль биндует адаптер через `fastify.realtime.bindPresenceAdapter(service)`.

## Модель состояния

### Redis (оперативное состояние)

- Ключ на пользователя: `presence:user:<userId>:connections`
- Тип: sorted set (`connectionId` -> `expiresAtMs`)
- Операции:
  - подключение: очистка протухших + upsert текущего + `expire`
  - heartbeat touch: продление TTL
  - отключение: удаление connection + подсчёт активных

### PostgreSQL (долговременное состояние)

- `users.last_seen_at` обновляется, когда у пользователя не осталось активных соединений.

## Ключевые правила

- Пользователь считается online, если `activeConnections > 0`.
- `watchUsersPresence` всегда добавляет `currentUserId` в watch-list.
- Presence visibility сейчас глобальная для всех аутентифицированных пользователей.

## Внутренний pipeline

- `presence.routes.ts` / `presence.handlers.ts` — HTTP.
- `presence.service.ts` — доменные правила и realtime adapter.
- `presence.repository.ts` — Redis + PostgreSQL интеграция.
- `presence.schemas.ts` / `presence.types.ts` — API-контракт и DTO.

## Риски и эксплуатационные нюансы

- Логика зависит от корректности времени на узлах (TTL и expiresAt).
- При нестабильных сетях важна корректная heartbeat частота (`WS_HEARTBEAT_INTERVAL_MS`) и `PRESENCE_CONNECTION_TTL_SECONDS`.
- Ошибки Redis могут кратковременно влиять на online/offline точность; durable `lastSeenAt` остаётся в PostgreSQL.
