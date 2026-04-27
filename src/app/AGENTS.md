# AGENTS.md - src/app

`src/app` отвечает за env/config, сборку Fastify, порядок регистрации plugin/module и lifecycle процесса.

Уместно менять `config.ts`, `app.ts`, `server.ts`, `fastify.d.ts`. Не размещайте здесь бизнес-правила, SQL/Redis use-case логику или route handlers.

Правила:

- Читайте env только в `config.ts`; модули используют `fastify.config`.
- Порядок регистрации должен учитывать зависимости decorators.
- Новый decorator обязательно объявляйте в `fastify.d.ts`.
- Production-sensitive defaults (`JWT_SECRET`, CORS, Swagger, proxy) покрывайте тестом или явно проверяйте.

Проверки: `npm run typecheck`; для runtime-изменений также `npm run lint` и релевантные tests.
