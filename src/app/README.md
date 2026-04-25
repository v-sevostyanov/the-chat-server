# src/app

## Назначение

Каталог `app` отвечает за запуск процесса, сборку Fastify-инстанса и валидацию runtime-конфигурации.
Это точка входа всей backend-системы.

## Состав

- `app.ts` — фабрика `buildApp`, регистрирует плагины и модули в правильном порядке.
- `server.ts` — запуск HTTP-сервера, graceful shutdown (`SIGINT`, `SIGTERM`).
- `config.ts` — схема env-переменных (Zod), дефолты, преобразования, guard для production.
- `env.ts` — загрузка `.env` через `dotenv`.
- `fastify.d.ts` — расширение `FastifyInstance` (decorators `config`, `db`, `redis`, `realtime`, `authenticate` и readiness checks).

## Порядок сборки приложения

Порядок в `buildApp` важен:

1. `configPlugin`
2. `corsPlugin`
3. `errorsPlugin`
4. `dbPlugin`
5. `redisPlugin`
6. `authPlugin`
7. `websocketPlugin`
8. `docsPlugin`
9. `modulesPlugin`

Почему это важно:

- `config` нужен до всех остальных инфраструктурных плагинов.
- `errors` должен быть включён до доменных route, чтобы единообразно оборачивать ошибки.
- `db`/`redis` нужны до модулей, потому что модули инстанцируют репозитории при регистрации.
- `auth`/`websocket` должны быть готовы до модулей, которые публикуют realtime-события и используют `authenticate`.

## Контракты конфигурации

Критичные переменные:

- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET`, `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS`
- `WS_PATH`, `WS_MAX_PAYLOAD_BYTES`, `WS_HEARTBEAT_INTERVAL_MS`, `WS_REALTIME_CHANNEL`
- `PRESENCE_CONNECTION_TTL_SECONDS`
- `SWAGGER_ENABLED`

В production запрещён дефолтный `JWT_SECRET`, запуск в таком режиме прерывается.

## Операционные замечания

- `trustProxy: true` включён глобально: корректные proxy-заголовки важны для инфраструктуры.
- При ошибке старта процесс выставляет `exitCode = 1` и закрывает app.
- Все расширения Fastify должны быть отражены в `fastify.d.ts`, иначе типизация в модулях быстро деградирует.

## Как безопасно расширять

- Добавляя новый глобальный dependency, сначала декорируйте Fastify в плагине, затем расширьте типы в `fastify.d.ts`.
- Не добавляйте бизнес-логику в `app.ts`/`server.ts`.
- Любой новый env-параметр должен пройти через `config.ts` (валидация + явный mapping в `AppConfig`).
