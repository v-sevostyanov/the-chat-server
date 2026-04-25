# src/modules/auth

## Назначение

Модуль `auth` реализует полный цикл сессионной JWT-аутентификации:

- регистрация пользователя;
- вход по логину/паролю;
- получение текущего пользователя (`me`);
- ротация refresh token;
- logout (отзыв refresh-сессии).

Базовый префикс маршрутов: `/api/v1/auth`.

## HTTP-контракты

- `POST /register` — создаёт пользователя и возвращает `access + refresh`.
- `POST /login` — проверяет credentials, возвращает новую пару токенов.
- `GET /me` — возвращает текущего пользователя по access token.
- `POST /refresh` — валидирует refresh token, ротирует сессию, выдаёт новую пару.
- `POST /logout` — отзывает refresh-сессию.

Схемы входа/выхода описаны в `auth.schemas.ts` (TypeBox), ошибки унифицированы через `ErrorResponseSchema`.

## Внутренний pipeline

1. `auth.routes.ts` — OpenAPI-описание и привязка handler-ов.
2. `auth.handlers.ts` — транспортный слой (status codes + envelope).
3. `auth.service.ts` — доменные правила безопасности.
4. `auth.repository.ts` — операции с `users`, `user_credentials`, `auth_refresh_sessions`.
5. `auth.tokens.ts` — выпуск/проверка токенов и хэширование refresh.
6. `auth.password.ts` — Scrypt-хэширование паролей.

## Критичные правила безопасности

- `username` нормализуется: `trim + lowercase`.
- Пароли хэшируются через `scrypt` с параметрами cost и `timingSafeEqual` на верификации.
- В access token обязателен `tokenType: "access"`.
- В refresh token обязателен `tokenType: "refresh"` и `sid`.
- В БД хранится только `sha256`-хэш refresh token, не сам токен.
- При несовпадении хэша refresh токена сессия принудительно отзывается.
- Ротация refresh-сессии делается с optimistic guard по старому хэшу, что защищает от гонок повторного использования.

## Данные и зависимости

- PostgreSQL:
  - `users`
  - `user_credentials`
  - `auth_refresh_sessions`
- Fastify dependency:
  - `fastify.jwt` из `plugins/auth`
  - `fastify.db` из `plugins/db`

## Что учитывать при изменениях

- Любая смена формата JWT должна быть синхронна с `plugins/auth/jwt.types.ts` и `ws-auth.ts`.
- Изменение политики refresh rotation влияет на безопасность всей системы, включая WebSocket auth.
- При изменении password policy обновлять и runtime-валидацию, и документацию API.
- Ошибки вида `Invalid credentials` не должны раскрывать, существует ли пользователь.
