# src/plugins

## Назначение

`plugins` содержит инфраструктурный слой Fastify.
Каждый плагин изолирован и декорирует инстанс только своей ответственностью.

## Подкаталоги

- `config` — декорирует `fastify.config`.
- `cors` — CORS-поведение для локальной/private-сети.
- `errors` — единый not-found и error handler.
- `db` — подключение PostgreSQL + readiness check.
- `redis` — подключение Redis + readiness check.
- `auth` — JWT и preHandler `authenticate`.
- `websocket` — realtime транспорт, connection lifecycle, Redis bus.
- `docs` — Swagger/OpenAPI, включается флагом.

## Контракты decorators

После регистрации плагинов приложение получает:

- `fastify.config`
- `fastify.db`
- `fastify.redis`
- `fastify.authenticate`
- `fastify.realtime`
- `fastify.checkDatabaseReadiness`
- `fastify.checkRedisReadiness`

## Почему плагины выделены отдельно

- Снижается связность доменных модулей с инфраструктурой.
- Проще тестировать: dependencies можно подменять на уровне сборки app.
- Удобнее контролировать жизненный цикл ресурсов (`onClose`, `onReady`).

## Практика изменений

- Новый infrastructure concern оформлять отдельным плагином, не добавлять "скрытую магию" в route/service.
- Любой новый decorator должен быть добавлен в `src/app/fastify.d.ts`.
- Проверять порядок регистрации в `src/app/app.ts`, особенно если плагин зависит от другого decorator-а.
