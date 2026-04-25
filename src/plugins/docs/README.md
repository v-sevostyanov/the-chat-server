# src/plugins/docs

## Назначение

Плагин OpenAPI/Swagger:

- регистрирует `@fastify/swagger`;
- поднимает UI через `@fastify/swagger-ui`.

## Условия включения

- Если `fastify.config.swaggerEnabled === false`, плагин ничего не регистрирует.
- Если `true`, документация доступна по `/docs`.

## Что формирует

- OpenAPI `3.0.3`.
- Мета-информация из `package.json` (`name`, `version`, `description`).
- Теги модулей (`auth`, `users`, `health`, `chats`, `messages`, `presence`).
- Security scheme `bearerAuth`.

## UI-настройки

- `docExpansion: "list"`
- `persistAuthorization: true`
- `staticCSP: true`

## Практика изменений

- Добавляя новый доменный модуль/теги, синхронизируйте список `tags`.
- Качество Swagger зависит от точности `schema` в `*.routes.ts`; плагин только собирает уже описанные контракты.
