# AGENTS.md - src/modules/presence

Модуль `presence` связывает runtime online-state в Redis, durable `lastSeenAt` в PostgreSQL, HTTP endpoint-ы и realtime adapter.

Правила:

- Пользователь online, если активных connections больше 0.
- `lastSeenAt` отражает последнюю активность: connect/touch и финальный offline transition.
- Crash/TTL expiry не должен оставлять пользователя вечным online.
- Очистка просроченных connections сохраняется.
- `watchUsersPresence` включает `currentUserId`.
- Интеграция наружу только через `PresenceRealtimeAdapter`; не работайте с websocket socket-объектами напрямую.

Код: Redis/DB - `presence.repository.ts`; logic/adapter - `presence.service.ts`; API - `presence.routes.ts`/`presence.schemas.ts`.

Проверки: `npm run typecheck`, `npm run lint`, релевантные tests.
