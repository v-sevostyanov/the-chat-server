# src/modules/messages

## Назначение

Модуль `messages` отвечает за запись и чтение сообщений в чатах, включая cursor-пагинацию истории и публикацию realtime-событий.

Базовый префикс маршрутов: `/api/v1/messages`.

## HTTP-контракты

- `POST /` — создать сообщение в чате.
- `GET /chat/:chatId` — получить историю сообщений чата.
- `GET /:messageId` — получить конкретное сообщение (если пользователь имеет доступ).

## Ключевые бизнес-правила

- `body` нормализуется через `trim`, пустое сообщение запрещено.
- Сообщение может создать только участник чата.
- История доступна только участнику чата.
- Cursor-пагинация требует **оба** поля вместе:
  - `beforeCreatedAt`
  - `beforeMessageId`
- Порядок выдачи истории: `createdAt desc, id desc`.

## Cursor-семантика

- Если передан cursor, выбираются записи "старше" пары `(beforeCreatedAt, beforeMessageId)`.
- `nextCursor` формируется по "хвосту" текущей страницы.
- Если записей меньше `limit`, `nextCursor = null`.

## Realtime-интеграция

- После успешного создания сообщения handler публикует `message.created` через `fastify.realtime`.
- В событие передаются:
  - `chatId`
  - `recipientUserIds` (все участники чата)
  - `message` DTO
- Ошибка публикации логируется, но HTTP-ответ `201` сохраняется.

## Внутренний pipeline

1. `messages.routes.ts` — API и схемы.
2. `messages.handlers.ts` — HTTP + realtime publish.
3. `messages.service.ts` — валидация и orchestration.
4. `messages.repository.ts` — SQL/Drizzle-операции.
5. `messages.mapper.ts` — row -> DTO + page DTO.
6. `messages.types.ts` / `messages.schemas.ts` — типы и контракты.

## Что важно для аналитика

- `createMessageForMember` использует SQL `insert ... select ... where exists` для атомарной проверки membership.
- На чтении `getMessageByIdForUser` и `listChatMessagesForUser` join-ят `chat_members`, исключая утечку сообщений неучастнику.
- Формат message DTO единый для HTTP и WebSocket контрактов.

## Риски и ограничения

- Модуль пока не реализует edit/delete сообщений и delivery/read receipts.
- Для клиентского стабильного порядка следует опираться на `(createdAt, id)`.
- При изменении cursor-логики обязательно проверить обратную пагинацию в UI-клиенте.
