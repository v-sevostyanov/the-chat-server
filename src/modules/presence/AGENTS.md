# AGENTS.md - src/modules/presence

## Реальная ответственность директории

Модуль `presence` связывает:

- runtime online-state в Redis;
- durable `lastSeenAt` в PostgreSQL;
- HTTP presence endpoint-ы;
- realtime adapter для websocket.

## Что менять здесь уместно

- Логику online/offline расчетов.
- TTL/heartbeat обработку соединений.
- Защиту `lastSeenAt` от stale/null состояния при crash/TTL expiry.
- Watch-семантику presence.
- API контракты presence.

## Что менять здесь неуместно

- WebSocket parsing/routing и цикл соединения.
- Логику чатов/сообщений.

## Границы зависимостей

- Допустимо: `RedisClient`, `AppDb`, `shared/errors`.
- Недопустимо: прямой доступ к websocket socket-объектам.
- Интеграция наружу только через `PresenceRealtimeAdapter`.

## Куда класть новый код

- Redis/DB операции: `presence.repository.ts`.
- Presence business logic + adapter: `presence.service.ts`.
- API: `presence.routes.ts`, `presence.schemas.ts`.

## Связанные файлы

- `src/plugins/websocket/ws-connection-handler.ts`
- `src/plugins/websocket/event-router.ts`
- `src/db/schema/users.ts`

## Локальный чеклист перед завершением

1. Пользователь online, если активных connection > 0.
2. `lastSeenAt` отражает последнюю активность: connect/touch и финальный offline transition.
3. Crash/TTL expiry не оставляет пользователя "вечным online" и не делает durable `lastSeenAt` бессмысленным.
4. Очистка просроченных connection сохраняется.
5. `watchUsersPresence` включает `currentUserId`.
6. `npm run typecheck`, `npm run lint`, `npm run test`.

## Типичные ошибки будущего агента

- Обновлять `lastSeenAt` при каждом disconnect, даже если есть активные соединения.
- Убрать TTL-механику и получить "вечный online".
- Считать Redis online-state durable источником истины для audit/debug.
