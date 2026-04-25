# src/plugins/auth

## Назначение

Плагин аутентификации Fastify:

- регистрирует `@fastify/jwt`;
- добавляет preHandler `fastify.authenticate` для защищённых route.

## Основное поведение

- JWT secret берётся из `fastify.config.jwtSecret`.
- В `authenticate` выполняется `request.jwtVerify<JwtUserPayload>()`.
- Дополнительно проверяется `payload.tokenType === "access"`.
- При любой ошибке выбрасывается `UnauthorizedError("Invalid or missing auth token.")`.

## Публичный контракт

- Decorator: `fastify.authenticate`.
- Типы JWT-полезной нагрузки описаны в `jwt.types.ts`:
  - `sub`
  - `sid?`
  - `jti?`
  - `tokenType: "access" | "refresh"`

## Почему это важно

- Защищает API от использования refresh token там, где нужен access token.
- Держит единое поведение 401 для всех модулей.
- Создаёт общую типизацию payload для HTTP и WebSocket слоёв.

## Практика изменений

- Любые изменения payload-полей должны быть согласованы с `modules/auth` и `plugins/websocket/ws-auth.ts`.
- Не добавлять в payload чувствительные данные, которые не нужны на стороне сервера.
