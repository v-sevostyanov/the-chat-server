# AGENTS.md - src/modules/messages

## Реальная ответственность директории

Модуль `messages` отвечает за:

- создание сообщения в чате;
- идемпотентное создание сообщения при повторе `clientMessageId`;
- чтение истории сообщений с cursor-пагинацией;
- чтение сообщения по id с проверкой доступа;
- публикацию `message.created` в realtime transport.

## Что менять здесь уместно

- Правила валидации `body`.
- Правила `clientMessageId` и retry-safe idempotency.
- Пагинацию и сортировку истории.
- Membership-проверки доступа.
- Контракты messages API.

## Что менять здесь неуместно

- Создание/управление чатами.
- Transport internals websocket.
- Presence-логику.

## Границы зависимостей

- Допустимо: `db/schema`, `shared/errors`, `fastify.realtime`.
- Недопустимо: прямой импорт бизнес-логики из `chats`.

## Куда класть новый код

- API: `messages.routes.ts`, `messages.schemas.ts`.
- Business rules: `messages.service.ts`.
- Query/SQL: `messages.repository.ts`.
- DTO/page mapping: `messages.mapper.ts`.

## Связанные файлы

- `src/plugins/websocket/realtime-delivery.ts`
- `src/plugins/websocket/contracts.ts`
- `src/db/schema/messages.ts`

## Локальный чеклист перед завершением

1. Пустой `body` после trim отклоняется.
2. История/сообщение недоступны не-участнику чата.
3. Cursor требует пару `beforeCreatedAt + beforeMessageId`.
4. Сортировка стабильна: `createdAt desc, id desc`.
5. Retry с тем же `clientMessageId` возвращает тот же логический message.
6. Повторный retry не публикует второй `message.created`.
7. `npm run typecheck`, `npm run lint`, `npm run test`.

## Типичные ошибки будущего агента

- Сломать cursor-семантику при изменении сортировки.
- Публиковать realtime событие до подтверждения записи в БД.
- Сделать idempotency только на уровне service без уникального DB constraint.
