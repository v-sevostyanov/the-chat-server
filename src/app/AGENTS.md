# AGENTS.md - src/app

## Реальная ответственность директории

`src/app` отвечает за bootstrap приложения:

- загрузка env;
- валидация конфигурации;
- сборка Fastify;
- порядок регистрации plugin/module;
- lifecycle процесса.

## Что менять здесь уместно

- `AppConfig` и env-мэппинг.
- Порядок регистрации зависимостей.
- Startup/shutdown поведение.

## Что менять здесь неуместно

- Бизнес-правила модулей.
- SQL/Redis use-case логику.
- Логику route handlers.

## Границы зависимостей

- Можно импортировать плагины и `modulesPlugin`.
- Нельзя импортировать `service/repository` из модулей напрямую.
- Любой новый decorator должен быть добавлен в `fastify.d.ts`.
- Базовый порядок регистрации: config -> cors/errors -> db/redis -> auth/websocket/docs -> modules.

## Куда класть новый код

- Конфиг: `config.ts`.
- Entry/runtime: `server.ts`.
- Сборка app: `app.ts`.
- Типизация decorators: `fastify.d.ts`.

## Связанные файлы

- `src/app/app.ts`
- `src/app/config.ts`
- `src/modules/index.ts`
- `src/plugins/*/*.plugin.ts`

## Локальный чеклист перед завершением

1. Порядок регистрации не нарушает зависимости decorators.
2. Новые env-поля валидируются в `config.ts`.
3. Production-sensitive defaults (`JWT_SECRET`, CORS, Swagger, proxy) покрыты тестом или явно проверены.
4. `npm run typecheck`.
5. Для runtime-изменений: `npm run lint` и `npm run test`.

## Типичные ошибки будущего агента

- Читать `process.env` напрямую в модулях вместо `fastify.config`.
- Добавить decorator и забыть объявление в `fastify.d.ts`.
