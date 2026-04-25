# WebSocket API (TheChat Backend)

Этот документ описывает текущий realtime-контракт backend TheChat.

## 1. Endpoint и транспорт

- Протокол: `ws://` или `wss://`
- Путь: `WS_PATH` (по умолчанию: `/ws`)
- Максимальный payload входящего frame: `WS_MAX_PAYLOAD_BYTES` (по умолчанию: `65536`)
- Формат сообщения: JSON-объект с обязательным полем `type`
- WebSocket endpoint скрыт из Swagger (`schema.hide = true`)

### Связанная конфигурация

- `WS_PATH`: публичный websocket path
- `WS_MAX_PAYLOAD_BYTES`: максимальный размер входящего frame
- `WS_HEARTBEAT_INTERVAL_MS`: интервал server ping для idle websocket-соединений
- `WS_REALTIME_CHANNEL`: внутренний Redis pub/sub channel (не публичный клиентский контракт)
- `PRESENCE_CONNECTION_TTL_SECONDS`: TTL-окно для активного websocket presence-состояния

## 2. Аутентификация и безопасность

Соединение требует JWT access token, переданного одним из способов:

1. Заголовок `Authorization` (предпочтительно для non-browser клиентов)
2. Query-параметр для browser-native клиентов (`access_token`, fallback: `token`)

Пример заголовка:

```http
Authorization: Bearer <access_token>
```

Пример browser URL:

```text
ws://localhost:3000/ws?access_token=<access_token>
```

Важно:
- принимаются только токены с `tokenType = "access"`

### Поведение при неавторизованном соединении

1. Сервер отправляет:

```json
{
  "type": "server.error",
  "code": "UNAUTHORIZED",
  "message": "Invalid or missing auth token."
}
```

2. Затем сервер закрывает socket:
- close code: `1008`
- reason: `Unauthorized`

### Realtime subsystem недоступна

Если websocket adapters не привязаны:
- сервер закрывает соединение с кодом `1011`
- reason: `Realtime is unavailable`
- дополнительный event payload не гарантируется

## 3. Порядок и гарантии обработки

### Обработка входящих событий

- Входящие события клиента обрабатываются **строго последовательно (FIFO) внутри одного соединения**.
- Порядкозависимые сценарии вроде `subscribe -> unsubscribe` применяются в порядке получения.

### Обработка исходящих событий

- Ответы, сформированные для одного входящего события, отправляются в возвращённом порядке.
- Redis pub/sub события (`message.created`, `chat.created`, `presence.updated`) могут перемешиваться с прямыми ответами.
- Глобальной гарантии порядка между разными соединениями нет.

### Семантика доставки

- Realtime-доставка работает в режиме best-effort.
- Redis pub/sub не является долговечной очередью.
- Пропущенные события не воспроизводятся после reconnect.
- Клиенты должны восстанавливать состояние через HTTP API, когда это необходимо.

## 4. Контракты событий client -> server

Все ID являются UUID-строками.

### `client.ping`

Назначение: heartbeat / измерение RTT.

```json
{
  "type": "client.ping",
  "correlationId": "2eeb8d6e-8f69-40db-9b0b-97f6f60825ee"
}
```

Поля:
- `correlationId?`: UUID

---

### `presence.subscribe`

Назначение: подписать это соединение на snapshots/updates presence текущего пользователя.

```json
{
  "type": "presence.subscribe"
}
```

---

### `presence.watch`

Назначение: заменить watch-list этого соединения для presence updates.

```json
{
  "type": "presence.watch",
  "userIds": [
    "3c6b7388-a63f-4f2d-b6f8-a7f3f9a74bd3",
    "b8f4029f-377a-48c2-a4f1-20f7d2f00c92"
  ]
}
```

Валидация:
- `userIds` является массивом UUID
- `minItems = 1`
- `maxItems = 100`

Product rule в этом проекте:
- presence visibility глобален для аутентифицированных пользователей
- сервер всегда включает `currentUserId` в итоговый watch-list

---

### `chat.subscribe`

Назначение: подписать это соединение на realtime message events одного чата.

```json
{
  "type": "chat.subscribe",
  "chatId": "4a3a41a7-36f8-4323-b6ef-8c2e5f238f3f"
}
```

Проверки:
- requester должен быть участником чата
- иначе сервер возвращает `server.error` с `code = "FORBIDDEN"`

---

### `chat.unsubscribe`

Назначение: отписать это соединение от чата.

```json
{
  "type": "chat.unsubscribe",
  "chatId": "4a3a41a7-36f8-4323-b6ef-8c2e5f238f3f"
}
```

Семантика:
- операция идемпотентна
- сервер возвращает `chat.unsubscribed`, даже если активной подписки не было

## 5. Контракты событий server -> client

### `server.pong`

Ответ на `client.ping`.

```json
{
  "type": "server.pong",
  "correlationId": "2eeb8d6e-8f69-40db-9b0b-97f6f60825ee",
  "serverTime": "2026-04-07T15:00:00.000Z"
}
```

Поля:
- `correlationId?`: копируется из ping, если был передан
- `serverTime`: ISO datetime string

---

### `presence.subscribed`

Snapshot presence текущего пользователя после `presence.subscribe`.

```json
{
  "type": "presence.subscribed",
  "userId": "3c6b7388-a63f-4f2d-b6f8-a7f3f9a74bd3",
  "isOnline": true,
  "lastSeenAt": "2026-04-07T14:58:00.000Z"
}
```

---

### `presence.watched`

Подтверждает обновлённый watch-list.

```json
{
  "type": "presence.watched",
  "userIds": [
    "3c6b7388-a63f-4f2d-b6f8-a7f3f9a74bd3",
    "b8f4029f-377a-48c2-a4f1-20f7d2f00c92"
  ]
}
```

---

### `presence.updated`

Realtime presence update для watched user.

```json
{
  "type": "presence.updated",
  "userId": "b8f4029f-377a-48c2-a4f1-20f7d2f00c92",
  "isOnline": false,
  "lastSeenAt": "2026-04-07T14:59:10.000Z"
}
```

Триггеры:
- переходы user connect/disconnect
- initial snapshots, возвращённые после обновления watch-list

---

### `chat.subscribed`

Подтверждение подписки.

```json
{
  "type": "chat.subscribed",
  "chatId": "4a3a41a7-36f8-4323-b6ef-8c2e5f238f3f"
}
```

---

### `chat.created`

Realtime-уведомление о том, что чат стал видимым подключённому пользователю
(например, direct chat создан другим участником).

```json
{
  "type": "chat.created",
  "chat": {
    "id": "4a3a41a7-36f8-4323-b6ef-8c2e5f238f3f",
    "type": "direct",
    "title": null,
    "createdBy": "3c6b7388-a63f-4f2d-b6f8-a7f3f9a74bd3",
    "createdAt": "2026-04-07T15:01:01.000Z",
    "membersCount": 2,
    "members": [
      {
        "userId": "3c6b7388-a63f-4f2d-b6f8-a7f3f9a74bd3",
        "username": "alice",
        "displayName": "Alice",
        "role": "member",
        "joinedAt": "2026-04-07T15:01:01.000Z"
      }
    ]
  }
}
```

Условия доставки:
- пользователь входит в `recipientUserIds` созданного чата
- доставка user-level (`chat.subscribe` не требуется)

---

### `chat.unsubscribed`

Подтверждение отписки.

```json
{
  "type": "chat.unsubscribed",
  "chatId": "4a3a41a7-36f8-4323-b6ef-8c2e5f238f3f"
}
```

---

### `message.created`

Realtime event для нового сообщения в чате.

```json
{
  "type": "message.created",
  "chatId": "4a3a41a7-36f8-4323-b6ef-8c2e5f238f3f",
  "message": {
    "id": "dd349651-cf9d-4fbd-a7a7-14c12d4fdb37",
    "chatId": "4a3a41a7-36f8-4323-b6ef-8c2e5f238f3f",
    "clientMessageId": "37b399f2-f20c-4b76-af15-78c68763f76b",
    "sender": {
      "id": "3c6b7388-a63f-4f2d-b6f8-a7f3f9a74bd3",
      "username": "alice",
      "displayName": "Alice"
    },
    "body": "hello",
    "createdAt": "2026-04-07T15:01:01.000Z",
    "editedAt": null
  }
}
```

Поля `message`:
- `id`: UUID
- `chatId`: UUID
- `clientMessageId`: UUID, переданный в HTTP create-message request, или `null`
- `sender.id`: UUID
- `sender.username`: string
- `sender.displayName`: string
- `body`: string
- `createdAt`: ISO datetime string
- `editedAt`: ISO datetime string или `null`

Условия доставки:
- пользователь входит в recipient set сообщения (является участником чата)
- это соединение подписано на чат через `chat.subscribe`

---

### `server.error`

Общая форма события ошибки:

```json
{
  "type": "server.error",
  "code": "INVALID_EVENT",
  "message": "Event payload is invalid."
}
```

## 6. Коды ошибок WebSocket

### Коды transport-level, которые используются явно

- `UNAUTHORIZED`
- `INVALID_JSON`
- `INVALID_EVENT`
- `FORBIDDEN`
- `INTERNAL_ERROR`

### Domain-level коды `AppError`, которые могут проходить наружу

Когда module services выбрасывают `AppError`, websocket возвращает его `code` и `message`.
Возможные значения включают:
- `BAD_REQUEST`
- `NOT_FOUND`
- `CONFLICT`
- `UNAUTHORIZED`

Пример:
- `presence.watch` с несуществующим user id может вернуть `NOT_FOUND` / `User was not found.`

## 7. Поведение presence

- Runtime online/offline state хранится в Redis.
- Долговечный `lastSeenAt` хранится в PostgreSQL.
- Пользователь считается online, если есть хотя бы одно активное соединение.
- Пользователь становится offline, когда закрывается последнее соединение; затем обновляется `lastSeenAt`.
- `presence.watch` заменяет предыдущий watch-list для этого соединения.

## 8. Поведение chat subscription

- Подписки привязаны к соединению, а не глобально к пользователю.
- После reconnect клиент должен заново подписаться на чаты.
- Membership проверяется на `chat.subscribe`.
- `message.created` доставляется только подписанным соединениям.

## 9. Сценарий использования third-party client

1. Получить access token через HTTP auth API.
2. Открыть websocket:
   - URL: `ws(s)://<host><WS_PATH>`
   - Token transport:
     - Header: `Authorization: Bearer <access_token>`
     - Или query: `?access_token=<access_token>`
3. После `open` отправить:
   - `chat.subscribe` для нужных чатов
   - `presence.watch` для нужных пользователей
4. Обрабатывать входящие `message.created`, `presence.updated`, `server.error`.
   - Если получен `chat.created`, подписаться на его `chat.id`, если нужны realtime-сообщения.
5. При reconnect повторить шаги 2-4.

### Пример Node.js (`ws`)

```ts
import WebSocket from "ws";

const token = "<access_token>";
const ws = new WebSocket("ws://localhost:3000/ws", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

ws.on("open", () => {
  ws.send(JSON.stringify({ type: "chat.subscribe", chatId: "<chat_uuid>" }));
  ws.send(JSON.stringify({ type: "presence.watch", userIds: ["<user_uuid>"] }));
  ws.send(JSON.stringify({ type: "client.ping" }));
});

ws.on("message", (raw) => {
  const event = JSON.parse(raw.toString("utf8"));
  console.log(event.type, event);
});
```

## 10. Известные ограничения и примечания

- Browser native WebSocket API не умеет задавать custom `Authorization` headers.
  Browser clients могут использовать query-based token transport (`access_token`) для websocket handshake.
- Query-based token transport может попадать в URL logs/proxy logs.
  Где возможно, предпочитайте header-based auth и не логируйте полные URL.
- WebSocket API не отдаёт историю сообщений.
  Для истории и восстановления состояния используйте HTTP API.
- HTTP message creation поддерживает опциональный UUID `clientMessageId` для
  идемпотентных retry. Повторное использование того же значения для того же sender и chat возвращает
  исходное сообщение и не публикует повторный `message.created`.
- Для стабильной клиентской сортировки UI используйте `message.createdAt` вместе с `message.id`.
