# src/plugins/db

## Назначение

Плагин подключения PostgreSQL:

- декорирует `fastify.db`;
- добавляет `fastify.checkDatabaseReadiness`;
- управляет lifecycle пула соединений.

## Режимы работы

### 1. Инъекция внешнего `db` (обычно тесты)

- Если передан `options.db`, плагин использует его напрямую.
- Пул не создаётся и не закрывается.

### 2. Стандартный режим

- Создаётся `DbClient` через `createDbClient(fastify.config.databaseUrl)`.
- В `onClose` вызывается `pool.end()`.

## Контракты

- `fastify.db: AppDb`
- `fastify.checkDatabaseReadiness(): Promise<void>`

Readiness-check выполняет `select 1`.

## Практика изменений

- Не добавлять в плагин доменные SQL-запросы.
- Если меняется создание клиента, учитывать impact на graceful shutdown и тестовую подмену dependency.
