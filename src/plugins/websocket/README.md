# src/plugins/websocket

## Назначение

Каталог реализует realtime-транспорт для TheChat:

- WebSocket endpoint;
- аутентификацию сокета;
- обработку входящих событий;
- fan-out исходящих событий;
- межпроцессную доставку через Redis Pub/Sub.

Это инфраструктурный слой, который подключает доменные адаптеры (`presence`, `chats`) без жесткой связки с их внутренней реализацией.

## Файлы и ответственность

- `websocket.plugin.ts` — сборка realtime подсистемы и регистрация websocket route.
- `ws-auth.ts` — извлечение и валидация access token из headers/query.
- `ws-connection-handler.ts` — lifecycle авторизованного сокета: heartbeat, FIFO обработка, disconnect cleanup.
- `contracts.ts` — Zod-контракты входящих/исходящих websocket событий.
- `event-router.ts` — маршрутизация inbound событий к адаптерам домена.
- `connection-index.ts` — in-memory индексы соединений, подписок чатов и watch-листов presence.
- `realtime-delivery.ts` — локальная доставка событий по connection index.
- `realtime-bus.ts` — Redis Pub/Sub шина между инстансами.
- `realtime.types.ts` — интерфейсы адаптеров и transport-контракт.

## Инициализация плагина

1. Создаётся `ConnectionIndex`.
2. Создаётся `RealtimeDelivery`.
3. Инициализируется `RealtimeBus` (channel из `WS_REALTIME_CHANNEL`).
4. Формируется `fastify.realtime`:
   - `publishMessageCreated`
   - `publishChatCreated`
   - `publishPresenceUpdated`
   - `bindPresenceAdapter`
   - `bindChatsAdapter`
5. В `onReady` проверяется, что оба адаптера действительно bind-нуты.
6. Регистрируется `@fastify/websocket` с лимитом payload (`WS_MAX_PAYLOAD_BYTES`).
7. Поднимается endpoint `GET <WS_PATH>` c `websocket: true`.

## Аутентификация соединения

- Access token можно передать:
  - `Authorization: Bearer <token>`
  - query `access_token` (или fallback `token`)
- Токен должен быть:
  - валидным JWT;
  - `tokenType: "access"`;
  - с непустым `sub`.
- При ошибке:
  - отправляется `server.error` с `UNAUTHORIZED`;
  - соединение закрывается кодом `1008`.

## Обработка входящих событий

Входящие payload:

- обязаны быть JSON;
- валидируются `InboundWsEventSchema`;
- обрабатываются **последовательно (FIFO) на соединение** через внутреннюю очередь Promise.

Поддерживаемые события:

- `client.ping`
- `presence.subscribe`
- `presence.watch`
- `chat.subscribe`
- `chat.unsubscribe`

Маршрутизация и проверки:

- `presence.*` работают через presence-adapter.
- `chat.subscribe` делает membership-check через chats-adapter.
- Ошибки домена (`AppError`) переводятся в `server.error` с доменным `code`.

## Presence lifecycle на соединении

- На connect вызывается `registerRealtimeConnection`, затем публикуется `presence.updated`.
- На каждое `pong` и обработанное сообщение выполняется `touchConnection`.
- На `close`:
  - connection удаляется из index;
  - вызывается `unregisterRealtimeConnection`;
  - публикуется `presence.updated`.

Таким образом online/offline сигнал распространяется в realtime без отдельного HTTP запроса.

## Доставка событий

### Локальная доставка (`realtime-delivery.ts`)

- `presence.updated` -> всем connection, которые watch-ят userId.
- `chat.created` -> всем активным connection участников чата.
- `message.created` -> только connection, которые:
  - подписаны на chatId;
  - принадлежат пользователям из recipient списка.

Есть защита от backpressure:

- если `socket.bufferedAmount > 5MB`, отправка пропускается и логируется `warn`.

### Межпроцессная доставка (`realtime-bus.ts`)

- Публикации идут в Redis channel JSON-сообщениями.
- Подписчик валидирует shape через Zod.
- Невалидные сообщения игнорируются с warn-логом.
- После валидации событие транслируется в `RealtimeDelivery`.

## Гарантии и ограничения

- Доставка best-effort (Redis Pub/Sub не durable queue).
- Глобальной упорядоченности между соединениями/инстансами нет.
- После reconnect клиент обязан resubscribe на чаты и восстановить состояние через HTTP при необходимости.

## Как безопасно расширять

- Новое ws-событие добавлять одновременно в:
  - `contracts.ts`
  - `event-router.ts`
  - `docs/websocket.md`
- Любая новая доставка должна явно определить адресацию (по connection, по user, по chat, по watch-list).
- Не добавлять тяжёлую бизнес-логику в websocket-плагин; переносить в доменные адаптеры/сервисы.
