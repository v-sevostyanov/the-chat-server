# AGENTS.md - src/plugins/db

## Реальная ответственность директории

DB plugin:

- декорирует `fastify.db`;
- предоставляет `checkDatabaseReadiness`;
- закрывает pool в `onClose` (если клиент создан плагином).

## Что менять здесь уместно

- Инициализацию/инъекцию DB клиента.
- Поведение readiness check.
- Lifecycle cleanup.
- Timeout/error behavior readiness check.

## Что менять здесь неуместно

- Domain SQL use-case запросы.
- Бизнес-валидацию.

## Границы зависимостей

- Допустимо: `src/db/client.ts`, Fastify plugin API.
- Недопустимо: импорты `modules/*`.

## Куда класть новый код

- В `db.plugin.ts`.

## Связанные файлы

- `src/db/client.ts`
- `src/modules/health/health.service.ts`
- `src/app/fastify.d.ts`

## Локальный чеклист перед завершением

1. Injected db режим не управляет чужим pool lifecycle.
2. Стандартный режим закрывает pool на shutdown.
3. Readiness использует реальный ping/select.
4. Readiness failure не раскрывает чувствительные connection details.
5. `npm run typecheck`.

## Типичные ошибки будущего агента

- Добавить доменные SQL side effects в plugin registration.
- Потерять cleanup и получить зависание shutdown.
