# AGENTS.md - src/modules/auth

Модуль `auth` отвечает за регистрацию, логин, `me`, refresh rotation и logout с отзывом refresh-сессии.

Правила:

- `username` нормализуется через `trim + lowercase`.
- Refresh требует `tokenType=refresh` и `sid`.
- Refresh rotation должна защищать от повторного использования старого токена.
- Ошибки auth не раскрывают лишние данные.
- JWT payload должен быть совместим с `plugins/auth/jwt.types.ts` и websocket auth.
- Не импортируйте service/repository соседних модулей.

Код: API - `auth.routes.ts`/`auth.schemas.ts`; HTTP - `auth.handlers.ts`; rules - `auth.service.ts`; data access - `auth.repository.ts`; crypto/token helpers - `auth.password.ts`/`auth.tokens.ts`.

Проверки: для token/password изменений покрывайте expired/reused/invalid token сценарии; `npm run typecheck`, `npm run lint`, релевантные tests.
