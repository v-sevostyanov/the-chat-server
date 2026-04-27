# AGENTS.md - src/modules/messages

Модуль `messages` отвечает за создание сообщений, retry-safe `clientMessageId`, историю с cursor-пагинацией, чтение сообщения с проверкой доступа и публикацию `message.created`.

Правила:

- Пустой `body` после trim отклоняется.
- История и сообщение недоступны не-участнику чата.
- Cursor требует пару `beforeCreatedAt + beforeMessageId`.
- Сортировка стабильна: `createdAt desc, id desc`.
- Retry с тем же `clientMessageId` возвращает тот же логический message.
- Повторный retry не публикует второй `message.created`.
- Не переносите websocket internals или chat-management сюда.

Код: API - `messages.routes.ts`/`messages.schemas.ts`; rules - `messages.service.ts`; query - `messages.repository.ts`; mapping - `messages.mapper.ts`.

Проверки: `npm run typecheck`, `npm run lint`, релевантные tests.
