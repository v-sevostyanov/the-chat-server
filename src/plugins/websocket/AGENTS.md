# AGENTS.md - src/plugins/websocket

Realtime transport слой: websocket endpoint/auth handshake, inbound validation/dispatch, connection/subscription indexing, outbound delivery и Redis pub/sub bus.

Правила:

- Новое событие требует явный schema + routing + delivery policy.
- Входящие payload проходят Zod-валидацию.
- Сохраняйте FIFO обработку на одно соединение.
- Ошибки уходят в `server.error`, не ломая loop.
- Delivery учитывает адресацию, backpressure, retry/reconnect и duplicate tolerance.
- Домен подключается только через adapter-контракты из `realtime.types.ts`.
- Не импортируйте конкретные module services в transport-слой.
- При изменении event contract обновляйте `docs/websocket.md`.

Код: contracts - `contracts.ts`; routing - `event-router.ts`/`ws-connection-handler.ts`; fan-out - `connection-index.ts`/`realtime-delivery.ts`; cross-instance - `realtime-bus.ts`.

Проверки: `npm run typecheck`, `npm run lint`, websocket/realtime tests.
