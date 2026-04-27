# AGENTS.md - src/plugins/auth

JWT infrastructure plugin регистрирует `@fastify/jwt`, `fastify.authenticate` и единый `401 Unauthorized`.

Правила:

- `authenticate` пропускает только `tokenType=access`.
- Expired/invalid/malformed token сценарии сохраняют единый `401` контракт.
- Payload type синхронизируйте с `modules/auth` и websocket auth.
- Не размещайте здесь register/login/refresh/logout rules.

Проверки: `npm run typecheck`, релевантные auth tests.
