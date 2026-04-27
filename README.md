# TheChat Backend

Backend для TheChat — приложения для чата в реальном времени. Проект построен как модульный монолит на Fastify и TypeScript: HTTP API, WebSocket realtime-слой, PostgreSQL для постоянных данных и Redis для realtime/presence-состояния.

## Стек

- Node.js 24
- TypeScript
- Fastify
- Drizzle ORM + PostgreSQL
- Redis через `ioredis`
- WebSocket через `@fastify/websocket`
- Zod и TypeBox для конфигурации и transport-схем
- Vitest для автоматических тестов

## Возможности

- Auth flows: регистрация, login, `me`, refresh rotation, logout.
- Users API: профиль и поиск пользователей.
- Chats API: direct/group chats, список чатов, получение чата по id.
- Messages API: создание сообщений, cursor pagination, получение по id.
- Идемпотентное создание сообщений через `clientMessageId`.
- Presence API и realtime tracking через состояние соединений в Redis.
- Контракты WebSocket: ping/pong, chat subscribe/unsubscribe, presence watch, fan-out сообщений.
- Health endpoints для liveness/readiness.
- Runtime-документация REST и WebSocket contracts при включенном `SWAGGER_ENABLED`.

## Локальный запуск

Установите зависимости:

```bash
npm install
```

Создайте локальный env-файл:

```bash
cp .env.example .env
```

Запустите PostgreSQL и Redis:

```bash
docker compose up -d
```

Примените миграции:

```bash
npm run db:migrate
```

Запустите backend в watch mode:

```bash
npm run dev
```

По умолчанию сервер доступен на `http://localhost:3000`.

## Конфигурация

Пример переменных окружения находится в `.env.example`. Файл `.env` предназначен только для локальной разработки и не должен попадать в git.

Основные переменные:

- `DATABASE_URL` — строка подключения PostgreSQL.
- `REDIS_URL` — строка подключения Redis.
- `JWT_SECRET` — секрет подписи JWT; в production должен быть уникальным и сильным.
- `CORS_ALLOWED_ORIGINS` — список browser origins для credentialed CORS.
- `TRUST_PROXY` — включайте только при запуске за доверенным proxy.
- `SWAGGER_ENABLED` — включает runtime-документацию.
- `WS_PATH`, `WS_MAX_PAYLOAD_BYTES`, `WS_HEARTBEAT_INTERVAL_MS` — настройки WebSocket слоя.

## Документация API

Когда `SWAGGER_ENABLED=true`, доступны:

- REST + realtime hub: `http://localhost:3000/docs`
- REST Swagger UI: `http://localhost:3000/docs/rest`
- REST OpenAPI JSON: `http://localhost:3000/docs/openapi.json`
- WebSocket realtime docs: `http://localhost:3000/docs/realtime`
- WebSocket AsyncAPI JSON: `http://localhost:3000/docs/asyncapi.json`

Полный WebSocket-контракт также описан в [`docs/websocket.md`](docs/websocket.md).

## Проверки

Основные команды перед изменениями и pull request:

```bash
npm run check:encoding
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

GitHub Actions повторяет эти проверки на push в `main` и на pull request.

## Архитектура

Код организован по принципу модульного монолита:

```text
src/
  app/        bootstrap, app factory, server entrypoint, env/config
  plugins/    инфраструктурные Fastify plugins
  modules/    доменные модули: auth, users, chats, messages, presence
  db/         Drizzle schema, migrations и db client
  shared/     общие ошибки, transport-схемы и utilities
```

Архитектурные правила зафиксированы в [`architecture.md`](architecture.md), правила проверки изменений — в [`testing.md`](testing.md).

## Текущие ограничения

Некоторые production-hardening элементы намеренно оставлены для следующих итераций:

- read states и delivery acknowledgements;
- typing indicators и более богатый websocket event set;
- durable replay/recovery для пропущенных realtime events;
- модули notifications/files;
- rate limiting, abuse controls и более глубокая observability.

## Безопасность перед публикацией

Перед публикацией проверьте, что в git не попадают:

- `.env` и другие локальные env-файлы;
- IDE/OS artifacts вроде `.idea/` и `.DS_Store`;
- `node_modules/`, `dist/`, coverage и локальные cache/build artifacts;
- реальные приватные ключи, токены, production connection strings или дампы данных.

## Лицензия

Проект распространяется по лицензии ISC. См. [`LICENSE`](LICENSE).
