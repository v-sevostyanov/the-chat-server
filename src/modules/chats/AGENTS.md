# AGENTS.md - src/modules/chats

## Реальная ответственность директории

Модуль `chats` управляет:

- direct/group chat creation;
- получением списка чатов;
- получением деталей чата;
- membership-проверкой для realtime adapter.

## Что менять здесь уместно

- Инварианты создания чатов.
- DB-enforced инварианты direct/group формы.
- Роли участников.
- Контракты chats API.
- Логику list/get с проверкой доступа.

## Что менять здесь неуместно

- Логику сообщений (это `modules/messages`).
- Логику presence.
- WebSocket transport internals.

## Границы зависимостей

- Допустимо: `db/schema`, `shared/errors`, `shared/db/errors`, `fastify.realtime`.
- Недопустимо: прямой импорт `messages.service`/`presence.service`.

## Куда класть новый код

- API: `chats.routes.ts`, `chats.schemas.ts`.
- Rules: `chats.service.ts`.
- Query/SQL: `chats.repository.ts`.
- DTO mapping: `chats.mapper.ts`.

## Связанные файлы

- `src/db/schema/chats.ts`
- `src/db/schema/chat-members.ts`
- `src/plugins/websocket/event-router.ts`

## Локальный чеклист перед завершением

1. Нельзя создать direct чат с собой.
2. Уникальность direct пары не нарушена (`direct_user_low/high`).
3. Форма direct/group совпадает между service rules, Drizzle schema и SQL constraints.
4. Перед чтением чата проверяется membership.
5. `chat.created` realtime не ломает HTTP flow при ошибке публикации.
6. `npm run typecheck`, `npm run lint`, `npm run test`.

## Типичные ошибки будущего агента

- Удалить обработку race-condition unique violation.
- Отдать данные чата пользователю вне membership.
- Изменить nullable поля direct-чата без синхронизации DB constraints.
