# src/modules/chats

## Назначение

Модуль `chats` управляет чатами и membership:

- создание direct-чата;
- создание group-чата;
- выдача списка чатов пользователя;
- получение деталей чата.

Базовый префикс маршрутов: `/api/v1/chats`.

## HTTP-контракты

- `POST /direct` — создать или получить существующий direct-чат между двумя пользователями.
- `POST /group` — создать групповой чат.
- `GET /` — список чатов текущего пользователя с пагинацией `limit/offset`.
- `GET /:chatId` — детали чата (только для участника).

## Ключевые доменные правила

- Нельзя создать direct-чат с самим собой.
- `targetUserId` обязан существовать.
- Для direct-чата пара пользователей нормализуется лексикографически (`direct_user_low/high`), чтобы обеспечить единственность пары.
- При race-condition на создание direct-чата обрабатывается `unique violation` и возвращается уже существующий чат.
- В group-чате:
  - создатель получает роль `owner`;
  - участники дедуплицируются;
  - несуществующие `participantUserIds` вызывают ошибку с деталями.

## Realtime-интеграция

- `ChatsHandlers` публикует `chat.created` через `fastify.realtime`.
- `ChatsService` реализует адаптер `isUserChatMember` для WebSocket `chat.subscribe` проверок.
- Модуль bind-ит adapter в `index.ts` через `fastify.realtime.bindChatsAdapter(service)`.

## Внутренний pipeline

1. `chats.routes.ts` — контракт API.
2. `chats.handlers.ts` — транспорт + публикация realtime-событий.
3. `chats.service.ts` — бизнес-правила создания/чтения чатов.
4. `chats.repository.ts` — SQL/Drizzle-доступ к `chats`, `chat_members`, `users`.
5. `chats.mapper.ts` — преобразование DB row -> DTO.

## Что важно для аналитика

- `created` флаг в результате direct-create определяет код ответа `201` (новый) или `200` (уже существовал).
- Порядок `list` фиксирован: `created_at desc, id desc`.
- `membersCount` считается в SQL через агрегирование `chat_members`.

## Риски и точки внимания

- При расширении ролей (`owner/member/...`) нужно синхронно обновить бизнес-правила доступа.
- Любые изменения direct uniqueness должны быть согласованы с уникальным индексом в миграциях.
- Публикация realtime-событий намеренно не ломает HTTP-path при ошибке доставки (логируется как non-blocking ошибка).
