# AGENTS.md - src/plugins/auth

## Реальная ответственность директории

JWT infrastructure plugin:

- регистрация `@fastify/jwt`;
- decorator `fastify.authenticate`;
- единое поведение `401 Unauthorized`.

## Что менять здесь уместно

- Правила проверки access token.
- JWT plugin configuration.
- Типизацию payload в `jwt.types.ts`.

## Что менять здесь неуместно

- Register/login/refresh/logout use-case правила.
- WebSocket token extraction.

## Границы зависимостей

- Допустимо: `@fastify/jwt`, `shared/errors`.
- Недопустимо: доменные service/repository.

## Куда класть новый код

- Runtime plugin: `auth.plugin.ts`.
- Payload typing: `jwt.types.ts`.

## Связанные файлы

- `src/modules/auth/auth.tokens.ts`
- `src/plugins/websocket/ws-auth.ts`
- `src/app/fastify.d.ts`

## Локальный чеклист перед завершением

1. `authenticate` пропускает только `tokenType=access`.
2. Ошибки auth consistently маппятся в `UnauthorizedError`.
3. Тип payload синхронизирован с auth/websocket кодом.
4. Expired/invalid/malformed token сценарии сохраняют единый `401` контракт.
5. `npm run typecheck`, `npm run test`.

## Типичные ошибки будущего агента

- Разрешить refresh token для защищенных HTTP route.
- Изменить payload type и забыть websocket-слой.
