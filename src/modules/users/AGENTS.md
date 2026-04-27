# AGENTS.md - src/modules/users

Модуль `users` отвечает за безопасные profile/lookup операции: `GET /me`, `PATCH /me`, `GET /:userId`, list/search.

Правила:

- `username` нормализуется через `trim + lowercase`.
- Пустые значения после trim отклоняются.
- `PATCH /me` требует хотя бы одно поле.
- Username conflict возвращает `409` и остается race-safe через DB unique violation handling.
- Public DTO не должен раскрывать лишние поля.
- Не читайте `user_credentials`/`auth_refresh_sessions`.

Код: API - `users.routes.ts`/`users.schemas.ts`; rules - `users.service.ts`; query - `users.repository.ts`; DTO - `users.mapper.ts`.

Проверки: `npm run typecheck`, `npm run lint`, релевантные tests.
