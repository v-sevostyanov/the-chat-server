# AGENTS.md - src/modules/auth

## Реальная ответственность директории

Модуль `auth` отвечает за:

- регистрацию;
- логин;
- `me`;
- refresh rotation;
- logout с отзывом refresh-сессии.

## Что менять здесь уместно

- Правила auth/session.
- Контракты auth endpoint-ов.
- Логику password hash и выдачи/проверки токенов.

## Что менять здесь неуместно

- Профильные user-операции вне auth-сценариев.
- Логику чатов/сообщений/presence.
- Инфраструктурную JWT-регистрацию плагина.

## Границы зависимостей

- Допустимо: `shared/errors`, `shared/db/errors`, `db/schema`, `fastify.jwt`.
- Недопустимо: service/repository из соседних модулей.
- JWT payload должен быть совместим с `plugins/auth/jwt.types.ts`.

## Куда класть новый код

- API: `auth.routes.ts`, `auth.schemas.ts`.
- HTTP-обвязка: `auth.handlers.ts`.
- Бизнес-правила: `auth.service.ts`.
- Доступ к данным: `auth.repository.ts`.
- Crypto/token helpers: `auth.password.ts`, `auth.tokens.ts`.

## Связанные файлы

- `src/plugins/auth/auth.plugin.ts`
- `src/plugins/websocket/ws-auth.ts`
- `src/db/schema/auth.ts`

## Локальный чеклист перед завершением

1. `username` нормализуется через `trim + lowercase`.
2. Refresh требует `tokenType=refresh` и `sid`.
3. Refresh rotation защищена от повторного использования старого токена.
4. Ошибки auth не раскрывают лишние данные.
5. Изменения password/hash/token логики покрывают expired/reused/invalid token сценарии.
6. `npm run typecheck`, `npm run lint`, `npm run test`.

## Типичные ошибки будущего агента

- Хранить refresh token в открытом виде.
- Принять refresh token как access token.
- Изменить payload JWT без синхронизации websocket auth.
- Ослабить auth error handling так, что login/register начинают раскрывать существование аккаунта.
