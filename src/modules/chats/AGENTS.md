# AGENTS.md - src/modules/chats

Модуль `chats` отвечает за direct/group chat creation, список/детали чатов и membership-проверку для realtime adapter.

Правила:

- Нельзя создать direct чат с собой.
- Уникальность direct пары (`direct_user_low/high`) должна оставаться race-safe.
- Форма direct/group должна совпадать между service rules, Drizzle schema и SQL constraints.
- Перед чтением чата проверяйте membership.
- `chat.created` realtime не должен ломать HTTP flow при ошибке публикации.
- Не импортируйте `messages.service` или `presence.service` напрямую.

Код: API - `chats.routes.ts`/`chats.schemas.ts`; rules - `chats.service.ts`; query - `chats.repository.ts`; DTO - `chats.mapper.ts`.

Проверки: `npm run typecheck`, `npm run lint`, релевантные tests.
