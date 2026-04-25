# AGENTS.md - src/plugins/websocket

## Реальная ответственность директории

Realtime transport слой:

- websocket endpoint и auth handshake;
- inbound event validation/dispatch;
- connection/subscription indexing;
- outbound delivery;
- redis pub/sub bus между инстансами.

## Что менять здесь уместно

- Контракты ws-событий (`contracts.ts`).
- Event routing (`event-router.ts`).
- Connection lifecycle (`ws-connection-handler.ts`).
- Delivery/bus (`realtime-delivery.ts`, `realtime-bus.ts`).

## Что менять здесь неуместно

- Доменные бизнес-правила чатов/сообщений/presence.
- SQL/redis use-case логику модулей.

## Границы зависимостей

- Внешний домен подключается только через adapter-контракты из `realtime.types.ts`.
- Нельзя импортировать конкретные module services в transport-слой.
- Type-only DTO imports из модулей допустимы только в adapter contracts; runtime validation остается в websocket contracts/shared schemas.
- Новое событие обязано иметь явный schema + routing + delivery policy.

## Куда класть новый код

- Новый inbound/outbound контракт: `contracts.ts`.
- Обработчик inbound: `event-router.ts`/`ws-connection-handler.ts`.
- Адресация и fan-out: `connection-index.ts`, `realtime-delivery.ts`.
- Cross-instance доставка: `realtime-bus.ts`.

## Связанные файлы

- `src/plugins/websocket/websocket.plugin.ts`
- `src/modules/presence/index.ts`
- `src/modules/chats/index.ts`
- `docs/websocket.md`

## Локальный чеклист перед завершением

1. Входящие payload проходят Zod-валидацию.
2. Сохраняется FIFO обработка на одно соединение.
3. Ошибки уходят в `server.error`, не ломая loop.
4. Delivery учитывает адресацию и backpressure.
5. Изменения delivery semantics учитывают retry/reconnect/duplicate tolerance.
6. При изменении контракта обновлен `docs/websocket.md`.
7. `npm run typecheck`, `npm run lint`, `npm run test`.

## Типичные ошибки будущего агента

- Добавить событие без схемы.
- Нарушить последовательность обработки сообщений.
- Перенести доменные правила в websocket transport.
- Спрятать breaking change события без обновления docs и тестов.
