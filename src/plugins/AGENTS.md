# AGENTS.md - src/plugins

`src/plugins` - инфраструктурные Fastify-плагины: config, cors, errors, db, redis, auth, websocket, docs.

Правила:

- Плагины управляют decorators, lifecycle и cross-cutting инфраструктурой, но не доменными use-case rules.
- Не импортируйте доменные `service/repository`.
- Новый decorator объявляйте в `src/app/fastify.d.ts`.
- Type-only DTO imports из модулей допустимы только как явные adapter contracts; при росте связности выносите контракт в `shared`.
- `config` plugin только публикует валидированный `AppConfig`; env parsing остается в `src/app/config.ts`.
- `docs` plugin содержит только общую Swagger/OpenAPI инфраструктуру; endpoint contracts меняются в модульных schemas/routes.

Проверки: порядок регистрации decorators, cleanup в `onClose` для ресурсов, `npm run typecheck`, `npm run lint`.
