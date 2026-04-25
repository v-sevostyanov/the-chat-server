# AGENTS.md - src/modules/users

## Реальная ответственность директории

Модуль `users` отвечает за безопасные profile/lookup операции:

- `GET /me`;
- `PATCH /me`;
- `GET /:userId`;
- `GET /` с пагинацией и поиском.

## Что менять здесь уместно

- Нормализацию и валидацию `username`/`displayName`.
- Правила `PATCH /me`.
- Пагинацию/поиск users.
- Публичный DTO пользователя.

## Что менять здесь неуместно

- Password/refresh session логику (`modules/auth`).
- Presence runtime логику (`modules/presence`).

## Границы зависимостей

- Допустимо: `db/schema/users`, `shared/errors`, `shared/db/errors`.
- Недопустимо: чтение `user_credentials`/`auth_refresh_sessions`.

## Куда класть новый код

- API: `users.routes.ts`, `users.schemas.ts`.
- Business rules: `users.service.ts`.
- Query layer: `users.repository.ts`.
- DTO mapping: `users.mapper.ts`.

## Связанные файлы

- `src/modules/auth/auth.repository.ts`
- `src/db/schema/users.ts`

## Локальный чеклист перед завершением

1. `username` нормализуется (`trim + lowercase`).
2. Пустые значения после trim отклоняются.
3. `PATCH /me` требует хотя бы одно поле.
4. Username conflict возвращает `409`.
5. Search/list endpoints сохраняют limit/pagination границы.
6. Username conflict остается race-safe через DB unique violation handling.
7. `npm run typecheck`, `npm run lint`, `npm run test`.

## Типичные ошибки будущего агента

- Случайно расширить users-модуль до auth-ответственности.
- Вернуть в API лишние поля, не входящие в public DTO.
